const AIConversation = require('../models/AIConversation');
const { validationResult } = require('express-validator');

// @desc   Get all AI conversations for user
// @route  GET /api/ai-conversations
// @access Private
const getConversations = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const conversations = await AIConversation.find({
      user: req.user.id,
    })
      .sort({ startedAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: conversations.length,
      data: conversations,
    });
  } catch (error) {
    console.error('Get conversations error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get single conversation
// @route  GET /api/ai-conversations/:id
// @access Private
const getConversation = async (req, res) => {
  try {
    const conversation = await AIConversation.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    res.json({ success: true, data: conversation });
  } catch (error) {
    console.error('Get conversation error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Create new conversation
// @route  POST /api/ai-conversations
// @access Private
const createConversation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { session, context } = req.body;

    const conversation = await AIConversation.create({
      user: req.user.id,
      session: session || generateSessionId(),
      context,
    });

    res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      data: conversation,
    });
  } catch (error) {
    console.error('Create conversation error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Add message to conversation
// @route  POST /api/ai-conversations/:id/messages
// @access Private
const addMessage = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { role, content, audioUrl, audioDuration, tokens } = req.body;

    const conversation = await AIConversation.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    conversation.messages.push({
      role,
      content,
      audioUrl,
      audioDuration,
      timestamp: new Date(),
      tokens,
    });

    if (tokens) {
      conversation.totalTokens += tokens;
    }

    await conversation.save();

    res.json({
      success: true,
      message: 'Message added successfully',
      data: conversation,
    });
  } catch (error) {
    console.error('Add message error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Update conversation
// @route  PUT /api/ai-conversations/:id
// @access Private
const updateConversation = async (req, res) => {
  try {
    const conversation = await AIConversation.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const updatedConversation = await AIConversation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Conversation updated successfully',
      data: updatedConversation,
    });
  } catch (error) {
    console.error('Update conversation error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   End conversation
// @route  PUT /api/ai-conversations/:id/end
// @access Private
const endConversation = async (req, res) => {
  try {
    const conversation = await AIConversation.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    conversation.isActive = false;
    conversation.endedAt = new Date();

    if (conversation.startedAt) {
      conversation.duration = Math.floor((conversation.endedAt - conversation.startedAt) / 1000);
    }

    await conversation.save();

    res.json({
      success: true,
      message: 'Conversation ended successfully',
      data: conversation,
    });
  } catch (error) {
    console.error('End conversation error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Delete conversation
// @route  DELETE /api/ai-conversations/:id
// @access Private
const deleteConversation = async (req, res) => {
  try {
    const conversation = await AIConversation.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    await AIConversation.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Conversation deleted successfully',
    });
  } catch (error) {
    console.error('Delete conversation error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc   Get conversation statistics
// @route  GET /api/ai-conversations/stats
// @access Private
const getConversationStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const conversations = await AIConversation.find({
      user: req.user.id,
      startedAt: { $gte: startDate },
    });

    const stats = {
      totalConversations: conversations.length,
      totalMessages: 0,
      totalTokens: 0,
      totalDuration: 0,
      averageDuration: 0,
      averageMessagesPerConversation: 0,
      moodDistribution: {
        'Very Sad': 0,
        'Sad': 0,
        'Neutral': 0,
        'Happy': 0,
        'Very Happy': 0,
      },
      sentimentDistribution: {
        'Positive': 0,
        'Neutral': 0,
        'Negative': 0,
      },
      topTopics: {},
    };

    if (conversations.length > 0) {
      conversations.forEach((conv) => {
        stats.totalMessages += conv.messages.length;
        stats.totalTokens += conv.totalTokens || 0;
        stats.totalDuration += conv.duration || 0;

        if (conv.mood) {
          stats.moodDistribution[conv.mood]++;
        }
        if (conv.sentiment) {
          stats.sentimentDistribution[conv.sentiment]++;
        }

        if (conv.topics) {
          conv.topics.forEach((topic) => {
            stats.topTopics[topic] = (stats.topTopics[topic] || 0) + 1;
          });
        }
      });

      stats.averageDuration = Math.round(stats.totalDuration / conversations.length);
      stats.averageMessagesPerConversation = Math.round(stats.totalMessages / conversations.length);
    }

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get conversation stats error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Helper function to generate session ID
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = {
  getConversations,
  getConversation,
  createConversation,
  addMessage,
  updateConversation,
  endConversation,
  deleteConversation,
  getConversationStats,
};