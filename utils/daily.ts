/**
 * Utility to provide dynamic daily content based on the current date.
 */

const MEMORY_PROMPTS = [
  "What was the most beautiful place you have ever visited in your life?",
  "What is your favorite childhood memory involving your parents?",
  "Describe your first day at your first job.",
  "What was the first dish you ever learned to cook?",
  "Tell a story about a special celebration from your youth.",
  "What was the most adventurous thing you did when you were younger?",
  "Describe a person who had a great influence on your life.",
  "What was the first movie you ever saw in a theater?",
  "Talk about a favorite hobby you've had for many years.",
  "What is the best piece of advice you've ever received?"
];

const INSPIRATIONAL_QUOTES = [
  { text: "Happiness is not something ready-made. It comes from your own action.", author: "Dalai Lama" },
  { text: "The purpose of our lives is to be happy.", author: "Dalai Lama" },
  { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
  { text: "Get busy living or get busy dying.", author: "Stephen King" },
  { text: "You only live once, but if you do it right, once is enough.", author: "Mae West" },
  { text: "Many of life's failures are people who did not realize how close they were to success when they gave up.", author: "Thomas A. Edison" },
  { text: "If you want to live a happy life, tie it to a goal, not to people or things.", author: "Albert Einstein" },
  { text: "Never let the fear of striking out keep you from playing the game.", author: "Babe Ruth" },
  { text: "Money and success don't change people; they only amplify what is already there.", author: "Will Smith" },
  { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" }
];

const MIND_GAME_CHALLENGES = [
  "Can you remember the names of 3 old friends today?",
  "What was the color of the front door of your childhood home?",
  "Try to list 5 different types of flowers from memory.",
  "Recall the name of your first elementary school teacher.",
  "What was the name of the street where you lived 20 years ago?",
  "Think of 4 words that rhyme with 'Heart'.",
  "What was the first car you ever owned?",
  "Try to remember what you had for dinner two nights ago.",
  "List 3 things you are grateful for today.",
  "Think of a song that makes you feel happy and hum it."
];

/**
 * Gets a consistent index for the current date.
 */
function getDailyIndex(length: number): number {
  const now = new Date();
  const dateString = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    hash = (hash << 5) - hash + dateString.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash) % length;
}

export function getTodaysMemoryPrompt(): string {
  const index = getDailyIndex(MEMORY_PROMPTS.length);
  return MEMORY_PROMPTS[index];
}

export function getTodaysInspiration(): { text: string; author: string } {
  const index = getDailyIndex(INSPIRATIONAL_QUOTES.length);
  return INSPIRATIONAL_QUOTES[index];
}

export function getTodaysMindChallenge(): string {
  const index = getDailyIndex(MIND_GAME_CHALLENGES.length);
  return MIND_GAME_CHALLENGES[index];
}
