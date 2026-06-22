/**
 * Centralized screen translations for all screens that were previously hardcoded in English.
 * 6 languages: English · Hindi · Gujarati · Tamil · Bengali · Marathi
 * All other languages fall back to English automatically.
 */
import type { Language } from "../context/LanguageContext";

export type AppTranslations = {
  // ── Common ───────────────────────────────────────────────────────────────────
  yes: string;
  no: string;
  save: string;
  cancel: string;
  saving: string;
  backToHome: string;
  optional: string;
  done: string;
  add: string;
  edit: string;
  update: string;
  stop: string;
  recording: string;
  tapToRecord: string;
  voiceRecorded: string;

  // ── Daily Check-In ───────────────────────────────────────────────────────────
  dailyCheckIn: string;
  allDoneToday: string;
  alreadyCheckedIn: string;
  sathiTitle: string;
  sathiSub: string;
  sathiGreeting: string;
  talkToSathi: string;
  howAreYouFeeling: string;
  quickHealthCheck: string;
  ofDone: string;
  voiceOptionalLabel: string;
  anythingToShare: string;
  recordForFamily: string;
  tapToStop: string;
  completeCheckIn: string;
  // Questions
  q1Text: string; q1Sub: string;
  q2Text: string; q2Sub: string;
  q3Text: string; q3Sub: string;
  q4Text: string; q4Sub: string;

  // ── SOS ──────────────────────────────────────────────────────────────────────
  emergencySOS: string;
  holdToActivate: string;
  emergencyAlertSent: string;
  pressFor3Sec: string;
  familyNotified: string;
  willCallBoth: string;
  emergencyContacts: string;
  addContact: string;
  editContact: string;
  whoGetsCallFirst: string;
  noPersonalContact: string;
  addInProfile: string;
  nameLabel: string;
  mobileNumber: string;
  relationLocation: string;
  fullNamePlaceholder: string;
  phonePlaceholder: string;
  rolePlaceholder: string;

  // ── Family Messages ──────────────────────────────────────────────────────────
  familyMessages: string;
  newMessagesFrom: string;
  sendMessageToFamily: string;
  talkLovedOnes: string;
  recordVoiceInstant: string;
  recordVoice: string;
  tapAndSpeak: string;
  sendPhoto: string;
  takeOrUpload: string;
  sendText: string;
  typeMessage: string;
  sendTo: string;
  allFamily: string;
  receivedMessages: string;
  noMessagesYet: string;
  voiceMessage: string;
  play: string;
  alsoOnWhatsApp: string;
  writeMessage: string;
  sendMessage: string;
  messagePlaceholder: string;
  voiceSent: string;
  photoSent: string;
  messageSent: string;

  // ── Mind Games ───────────────────────────────────────────────────────────────
  mindGames: string;
  yourBrainHealth: string;
  activateMind: string;
  totalScore: string;
  streak: string;
  rank: string;
  timeMinutes: string;
  todaysChallenge: string;
  playGames: string;
  quickGames: string;
  leaderboard: string;

  // ── Mood Lift ────────────────────────────────────────────────────────────────
  moodLift: string;
  dailyInspiration: string;
  howAreYouToday: string;
  weHaveFor: string;
  exploreMore: string;
  viewAll: string;
  whatMakesYouHappy: string;
  shareHappyThought: string;
  typeHere: string;
  skipForNow: string;
  saveThought: string;
  relaxationExercises: string;
  yourMoodSuggestions: string;

  // ── Care Calendar ────────────────────────────────────────────────────────────
  careCalendar: string;
  upcomingEvents: string;
  addEvent: string;
  noEventsToday: string;
  noEventsScheduled: string;
  tapToAddEvent: string;
  addCareEvent: string;
  selectTime: string;
  confirmTime: string;
  categoryLabel: string;
  saveEvent: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
};

const en: AppTranslations = {
  yes: "Yes", no: "No", save: "Save", cancel: "Cancel", saving: "Saving...",
  backToHome: "Back to Home", optional: "Optional", done: "Done!",
  add: "Add", edit: "Edit", update: "Update", stop: "Stop",
  recording: "Recording… tap to stop", tapToRecord: "Tap Mic to Record",
  voiceRecorded: "✓ Voice recorded",

  dailyCheckIn: "Daily Wellness",
  allDoneToday: "All done for today! 🎉",
  alreadyCheckedIn: "You've already completed today's check-in. Come back tomorrow.",
  sathiTitle: "Sathi Ai Say...", sathiSub: "Your Voice AI companion",
  sathiGreeting: "Good Morning {name}! How are you feeling today? Don't forget to take your medicines.",
  talkToSathi: "Talk to Sathi",
  howAreYouFeeling: "How are you feeling?",
  quickHealthCheck: "Quick Health Check",
  ofDone: "of 4 Done", voiceOptionalLabel: "Optional · Voice Message",
  anythingToShare: "Anything else to Share?",
  recordForFamily: "Record a Voice Message for your Family",
  tapToStop: "Tap again to stop & save",
  completeCheckIn: "Complete Check-In · Send to Family",
  q1Text: "How did you sleep last night?", q1Sub: "Did you feel rested?",
  q2Text: "Have you had breakfast?",       q2Sub: "Tea, bread, or a light meal",
  q3Text: "Drank water this morning?",     q3Sub: "At least 1 glass after waking",
  q4Text: "Any pain or discomfort today?", q4Sub: "Leg, back, chest or head",

  emergencySOS: "Emergency SOS", holdToActivate: "HOLD TO ACTIVATE",
  emergencyAlertSent: "EMERGENCY ALERT SENT", pressFor3Sec: "Press for 3 seconds",
  familyNotified: "Your family and emergency services\nhave been notified.",
  willCallBoth: "This will call your family and\nambulance at the same time",
  emergencyContacts: "Emergency Contacts", addContact: "Add Contact",
  editContact: "Edit Contact", whoGetsCallFirst: "Who gets called first",
  noPersonalContact: "No personal contact",
  addInProfile: "Add one in Profile → About You",
  nameLabel: "Name", mobileNumber: "Mobile Number", relationLocation: "Relation / Location",
  fullNamePlaceholder: "Full name", phonePlaceholder: "Phone number",
  rolePlaceholder: "e.g. Sister · City, State",

  familyMessages: "Family Messages",
  newMessagesFrom: "new messages from family",
  sendMessageToFamily: "SEND A MESSAGE TO FAMILY",
  talkLovedOnes: "Talk to Your Loved Ones",
  recordVoiceInstant: "Record voice · Send to family instantly",
  recordVoice: "Record\nVoice", tapAndSpeak: "Tap & speak",
  sendPhoto: "Send\nPhoto", takeOrUpload: "Take or\nupload",
  sendText: "Send Text", typeMessage: "Type a\nmessage",
  sendTo: "Send To", allFamily: "All Family →",
  receivedMessages: "Received Messages",
  noMessagesYet: "No messages yet. Send one!",
  voiceMessage: "Voice message", play: "Play",
  alsoOnWhatsApp: "Also on WhatsApp",
  writeMessage: "Write a Message", sendMessage: "Send Message",
  messagePlaceholder: "How are you all doing today?",
  voiceSent: "Your voice message has been sent to the family!",
  photoSent: "Your photo is on its way to your loved ones.",
  messageSent: "Your message has been shared with the family.",

  mindGames: "Brain Games", yourBrainHealth: "Your Brain Health",
  activateMind: "Activate Your Mind!", totalScore: "Total Score",
  streak: "Streak", rank: "Rank", timeMinutes: "Time (m)",
  todaysChallenge: "Today's Challenge", playGames: "Play Games",
  quickGames: "Quick Games", leaderboard: "Leaderboard",

  moodLift: "Mood Lift", dailyInspiration: "Daily Inspiration",
  howAreYouToday: "How are you feeling?",
  weHaveFor: "We have something special for you!",
  exploreMore: "Explore More", viewAll: "View all",
  typeHere: "Type here…",
  whatMakesYouHappy: "What Makes You Happy?",
  shareHappyThought: "Share a happy thought or memory…",
  skipForNow: "Skip for now", saveThought: "Save My Thought",
  relaxationExercises: "Quick Relaxation", yourMoodSuggestions: "For You Today",

  careCalendar: "My Calendar", upcomingEvents: "Upcoming Events",
  addEvent: "Add Event", noEventsToday: "No events today",
  noEventsScheduled: "No events scheduled",
  tapToAddEvent: "Tap + to add a doctor appointment,\nfamily visit, or wellness activity",
  addCareEvent: "Add Care Event", selectTime: "Select Time",
  confirmTime: "Confirm Time", categoryLabel: "Category", saveEvent: "Save Event",
  eventTitle: "Event Title", eventDate: "Date", eventTime: "Time",
};

const hi: AppTranslations = {
  yes: "हाँ", no: "नहीं", save: "सहेजें", cancel: "रद्द करें", saving: "सहेज रहे हैं...",
  backToHome: "घर वापस जाएं", optional: "वैकल्पिक", done: "हो गया!",
  add: "जोड़ें", edit: "संपादित करें", update: "अपडेट करें", stop: "रोकें",
  recording: "रिकॉर्डिंग… रोकने के लिए दबाएं", tapToRecord: "रिकॉर्ड करने के लिए माइक दबाएं",
  voiceRecorded: "✓ आवाज़ रिकॉर्ड हुई",

  dailyCheckIn: "दैनिक स्वास्थ्य",
  allDoneToday: "आज का काम हो गया! 🎉",
  alreadyCheckedIn: "आपने आज की जांच पहले ही पूरी कर ली है। कल वापस आएं।",
  sathiTitle: "साथी AI कह रहा है...", sathiSub: "आपका वॉइस AI साथी",
  sathiGreeting: "सुप्रभात {name}! आज आप कैसा महसूस कर रहे हैं? दवाइयाँ लेना न भूलें।",
  talkToSathi: "साथी से बात करें",
  howAreYouFeeling: "आप कैसा महसूस कर रहे हैं?",
  quickHealthCheck: "त्वरित स्वास्थ्य जांच",
  ofDone: "में से हो गया", voiceOptionalLabel: "वैकल्पिक · वॉइस संदेश",
  anythingToShare: "कुछ और शेयर करना है?",
  recordForFamily: "अपने परिवार के लिए वॉइस संदेश रिकॉर्ड करें",
  tapToStop: "रोकने के लिए दोबारा दबाएं",
  completeCheckIn: "जांच पूरी करें · परिवार को भेजें",
  q1Text: "रात को नींद कैसी आई?", q1Sub: "क्या आप आराम महसूस करते हैं?",
  q2Text: "क्या नाश्ता किया?",     q2Sub: "चाय, रोटी या हल्का खाना",
  q3Text: "सुबह पानी पिया?",       q3Sub: "उठने के बाद कम से कम 1 गिलास",
  q4Text: "आज कोई दर्द या तकलीफ?", q4Sub: "पैर, पीठ, सीना या सिर",

  emergencySOS: "आपातकालीन SOS", holdToActivate: "दबाकर रखें",
  emergencyAlertSent: "आपातकालीन अलर्ट भेजा गया", pressFor3Sec: "3 सेकंड दबाएं",
  familyNotified: "आपके परिवार और आपातकालीन सेवाओं को सूचित किया गया है।",
  willCallBoth: "यह आपके परिवार और एम्बुलेंस\nदोनों को एक साथ कॉल करेगा",
  emergencyContacts: "आपातकालीन संपर्क", addContact: "संपर्क जोड़ें",
  editContact: "संपर्क संपादित करें", whoGetsCallFirst: "पहले किसे कॉल होगी",
  noPersonalContact: "कोई व्यक्तिगत संपर्क नहीं",
  addInProfile: "प्रोफाइल → आपके बारे में में जोड़ें",
  nameLabel: "नाम", mobileNumber: "मोबाइल नंबर", relationLocation: "संबंध / स्थान",
  fullNamePlaceholder: "पूरा नाम", phonePlaceholder: "फोन नंबर",
  rolePlaceholder: "जैसे बहन · शहर, राज्य",

  familyMessages: "पारिवारिक संदेश",
  newMessagesFrom: "परिवार से नए संदेश",
  sendMessageToFamily: "परिवार को संदेश भेजें",
  talkLovedOnes: "अपने प्रियजनों से बात करें",
  recordVoiceInstant: "आवाज़ रिकॉर्ड करें · तुरंत परिवार को भेजें",
  recordVoice: "आवाज़\nरिकॉर्ड करें", tapAndSpeak: "दबाएं और बोलें",
  sendPhoto: "फोटो\nभेजें", takeOrUpload: "खींचें या\nअपलोड करें",
  sendText: "संदेश भेजें", typeMessage: "संदेश\nलिखें",
  sendTo: "भेजें", allFamily: "सभी परिवार →",
  receivedMessages: "प्राप्त संदेश",
  noMessagesYet: "अभी कोई संदेश नहीं। एक भेजें!",
  voiceMessage: "वॉइस संदेश", play: "चलाएं",
  alsoOnWhatsApp: "व्हाट्सऐप पर भी",
  writeMessage: "संदेश लिखें", sendMessage: "संदेश भेजें",
  messagePlaceholder: "आप सब कैसे हैं आज?",
  voiceSent: "आपका वॉइस संदेश परिवार को भेज दिया गया!",
  photoSent: "आपकी फोटो आपके प्रियजनों के पास पहुंच रही है।",
  messageSent: "आपका संदेश परिवार के साथ साझा किया गया।",

  mindGames: "ब्रेन गेम्स", yourBrainHealth: "आपका मस्तिष्क स्वास्थ्य",
  activateMind: "अपने दिमाग को सक्रिय करें!", totalScore: "कुल स्कोर",
  streak: "लकीर", rank: "रैंक", timeMinutes: "समय (मि.)",
  todaysChallenge: "आज की चुनौती", playGames: "खेल खेलें",
  quickGames: "त्वरित खेल", leaderboard: "लीडरबोर्ड",

  moodLift: "मनोदशा सुधार", dailyInspiration: "दैनिक प्रेरणा",
  howAreYouToday: "आज आप कैसा महसूस कर रहे हैं?",
  weHaveFor: "आपके लिए कुछ खास है!",
  exploreMore: "और देखें", viewAll: "सब देखें",
  typeHere: "यहाँ लिखें…",
  whatMakesYouHappy: "आपको क्या खुश करता है?",
  shareHappyThought: "एक खुशी की बात या याद लिखें…",
  skipForNow: "अभी छोड़ें", saveThought: "मेरी बात सहेजें",
  relaxationExercises: "त्वरित विश्राम", yourMoodSuggestions: "आज आपके लिए",

  careCalendar: "मेरा कैलेंडर", upcomingEvents: "आगामी कार्यक्रम",
  addEvent: "कार्यक्रम जोड़ें", noEventsToday: "आज कोई कार्यक्रम नहीं",
  noEventsScheduled: "कोई कार्यक्रम निर्धारित नहीं",
  tapToAddEvent: "+ दबाएं — डॉक्टर अपॉइंटमेंट,\nपरिवार मिलन या वेलनेस गतिविधि जोड़ें",
  addCareEvent: "देखभाल कार्यक्रम जोड़ें", selectTime: "समय चुनें",
  confirmTime: "समय पक्का करें", categoryLabel: "श्रेणी", saveEvent: "कार्यक्रम सहेजें",
  eventTitle: "कार्यक्रम का नाम", eventDate: "तारीख", eventTime: "समय",
};

const gu: AppTranslations = {
  yes: "હા", no: "ના", save: "સંગ્રહ", cancel: "રદ કરો", saving: "સંગ્રહ કરી રહ્યા છીએ...",
  backToHome: "ઘરે પાછા", optional: "વૈકલ્પિક", done: "થઈ ગયું!",
  add: "ઉમેરો", edit: "સંપાદિત કરો", update: "અપડેટ કરો", stop: "બંધ કરો",
  recording: "રેકૉર્ડિંગ... બંધ કરવા દબાવો", tapToRecord: "રેકૉર્ડ કરવા માઇક દબાવો",
  voiceRecorded: "✓ અવાજ રેકૉર્ડ થયો",

  dailyCheckIn: "દૈનિક સ્વાસ્થ્ય",
  allDoneToday: "આજ માટે બધું થઈ ગયું! 🎉",
  alreadyCheckedIn: "તમે આજની તપાસ પૂરી કરી છે. કાલે પાછા આવો.",
  sathiTitle: "સાથી AI કહે છે...", sathiSub: "તમારા AI સાથી",
  sathiGreeting: "સુપ્રભાત {name}! આજે તમે કેવા છો? તમારી દવાઓ લેવાનું ભૂલશો નહીં.",
  talkToSathi: "સાથી સાથે વાત કરો",
  howAreYouFeeling: "તમે કેવું અનુભવો છો?",
  quickHealthCheck: "ઝડપી સ્વાસ્થ્ય તપાસ",
  ofDone: "માંથી થઈ ગયું", voiceOptionalLabel: "વૈકલ્પિક · વૉઇસ સંદેશ",
  anythingToShare: "બીજું કંઈ શેર કરવું છે?",
  recordForFamily: "તમારા પરિવાર માટે વૉઇસ સંદેશ રેકૉર્ડ કરો",
  tapToStop: "ફરીથી દબાવો — સ્ટૉપ & સેવ",
  completeCheckIn: "તપાસ પૂરી કરો · પરિવારને મોકલો",
  q1Text: "રાત્રે ઊંઘ કેવી આવી?", q1Sub: "શું તમે આરામ અનુભવ્યો?",
  q2Text: "નાસ્તો કર્યો?",           q2Sub: "ચા, રોટલી કે હળવો ખોરાક",
  q3Text: "સવારે પાણી પીધું?",       q3Sub: "ઉઠ્યા પછી ઓછામાં ઓછો 1 ગ્લાસ",
  q4Text: "આજે કોઈ દુઃખ કે અસ્વસ્થતા?", q4Sub: "પગ, પીઠ, છાતી કે માથું",

  emergencySOS: "ઈમર્જન્સી SOS", holdToActivate: "દબાઈ રહો",
  emergencyAlertSent: "ઈમર્જન્સી સૂચના મોકલી", pressFor3Sec: "3 સેકન્ડ દબાવો",
  familyNotified: "તમારા પરિવાર અને ઈમર્જન્સી સેવાઓને\nજાણ કરી દેવામાં આવી છે.",
  willCallBoth: "આ તમારા પરિવાર અને એમ્બ્યુલન્સ\nબંનેને એકસાથે ફોન કરશે",
  emergencyContacts: "ઈમર્જન્સી સંપર્ક", addContact: "સંપર્ક ઉમેરો",
  editContact: "સંપર્ક સંપાદિત કરો", whoGetsCallFirst: "સૌ પ્રથમ કોને ફોન",
  noPersonalContact: "કોઈ વ્યક્તિગત સંપર્ક નથી",
  addInProfile: "પ્રોફાઇલ → તમારા વિશે માં ઉમેરો",
  nameLabel: "નામ", mobileNumber: "મોબાઇલ નંબર", relationLocation: "સંબંધ / સ્થળ",
  fullNamePlaceholder: "પૂરું નામ", phonePlaceholder: "ફોન નંબર",
  rolePlaceholder: "દા.ત. બહેન · શહેર, રાજ્ય",

  familyMessages: "પારિવારિક સંદેશ",
  newMessagesFrom: "પરિવાર તરફથી નવા સંદેશ",
  sendMessageToFamily: "પરિવારને સંદેશ મોકલો",
  talkLovedOnes: "તમારા પ્રિયજનો સાથે વાત કરો",
  recordVoiceInstant: "અવાજ રેકૉર્ડ કરો · તરત પરિવારને મોકલો",
  recordVoice: "અવાજ\nરેકૉર્ડ", tapAndSpeak: "દબાવો અને બોલો",
  sendPhoto: "ફોટો\nમોકલો", takeOrUpload: "ખેંચો કે\nઅપલોડ",
  sendText: "સંદેશ મોકલો", typeMessage: "સંદેશ\nલખો",
  sendTo: "મોકલો", allFamily: "સૌ પરિવાર →",
  receivedMessages: "મળેલ સંદેશ",
  noMessagesYet: "હજુ કોઈ સંદેશ નથી. એક મોકલો!",
  voiceMessage: "વૉઇસ સંદેશ", play: "ચલાવો",
  alsoOnWhatsApp: "વ્હૉટ્સઐપ પર પણ",
  writeMessage: "સંદેશ લખો", sendMessage: "સંદેશ મોકલો",
  messagePlaceholder: "આજે તમે બધા કેમ છો?",
  voiceSent: "તમારો વૉઇસ સંદેશ પરિવારને મોકલી દેવામાં આવ્યો!",
  photoSent: "તમારો ફોટો પ્રિયજનો સુધી પહોંચી રહ્યો છે.",
  messageSent: "તમારો સંદેશ પરિવાર સાથે શેર થઈ ગયો.",

  mindGames: "બ્રેઈન ગેમ્સ", yourBrainHealth: "તમારું મગજ સ્વાસ્થ્ય",
  activateMind: "તમારા મગજને સક્રિય કરો!", totalScore: "કુલ સ્કોર",
  streak: "ધારા", rank: "ક્રમ", timeMinutes: "સમય (મિ.)",
  todaysChallenge: "આજની પડકાર", playGames: "રમત રમો",
  quickGames: "ઝડપી રમત", leaderboard: "લીડરબોર્ડ",

  moodLift: "મૂડ સુધારો", dailyInspiration: "દૈનિક પ્રેરણા",
  howAreYouToday: "આજ તમે કેવું અનુભવો છો?",
  weHaveFor: "તમારા માટે કંઈ ખાસ છે!",
  exploreMore: "વધારે જુઓ", viewAll: "બધું જુઓ",
  typeHere: "અહીં લખો…",
  whatMakesYouHappy: "શું તમને ખુશ કરે છે?",
  shareHappyThought: "ખુશ વિચાર કે યાદ લખો…",
  skipForNow: "અત્યારે છોડો", saveThought: "મારો વિચાર સહેજ",
  relaxationExercises: "ઝડપી આરામ", yourMoodSuggestions: "આજ તમારા માટે",

  careCalendar: "મારો કૅલેન્ડર", upcomingEvents: "આગામી કાર્યક્રમ",
  addEvent: "કાર્યક્રમ ઉમેરો", noEventsToday: "આજ કોઈ કાર્યક્રમ નથી",
  noEventsScheduled: "કોઈ કાર્યક્રમ નિર્ધારિત નથી",
  tapToAddEvent: "+ દબાવો — ડૉક્ટર મુલાકાત,\nપરિવાર મિલન કે સ્વાસ્થ્ય ગતિવિધ ઉમેરો",
  addCareEvent: "સ્વાસ્થ્ય કાર્યક્રમ ઉમેરો", selectTime: "સમય પસંદ કરો",
  confirmTime: "સમય નિશ્ચિત કરો", categoryLabel: "શ્રેણી", saveEvent: "કાર્યક્રમ સાચવો",
  eventTitle: "કાર્યક્રમ નામ", eventDate: "તારીખ", eventTime: "સમય",
};

const ta: AppTranslations = {
  yes: "ஆம்", no: "இல்லை", save: "சேமி", cancel: "ரத்து செய்", saving: "சேமிக்கிறது...",
  backToHome: "வீட்டிற்கு திரும்பு", optional: "விருப்பமானது", done: "முடிந்தது!",
  add: "சேர்", edit: "திருத்து", update: "புதுப்பி", stop: "நிறுத்து",
  recording: "பதிவாகிறது… நிறுத்த அழுத்துங்கள்", tapToRecord: "பதிவு செய்ய மைக் அழுத்துங்கள்",
  voiceRecorded: "✓ குரல் பதிவாயிற்று",

  dailyCheckIn: "தினசரி ஆரோக்கியம்",
  allDoneToday: "இன்றைக்கு முடிந்தது! 🎉",
  alreadyCheckedIn: "இன்றைய சோதனை முடித்துவிட்டீர்கள். நாளை திரும்பி வாருங்கள்.",
  sathiTitle: "சாதி AI சொல்கிறது...", sathiSub: "உங்கள் AI தோழர்",
  sathiGreeting: "காலை வணக்கம் {name}! இன்று எப்படி இருக்கிறீர்கள்? மருந்துகளை மறக்காதீர்கள்.",
  talkToSathi: "சாதியிடம் பேசுங்கள்",
  howAreYouFeeling: "நீங்கள் எப்படி உணர்கிறீர்கள்?",
  quickHealthCheck: "விரைவு உடல்நல சோதனை",
  ofDone: "இல் முடிந்தது", voiceOptionalLabel: "விருப்பமானது · குரல் செய்தி",
  anythingToShare: "வேறு ஏதாவது பகிர வேண்டுமா?",
  recordForFamily: "குடும்பத்திற்கு குரல் செய்தி பதிவுசெய்யுங்கள்",
  tapToStop: "மீண்டும் அழுத்துங்கள் — நிறுத்து & சேமி",
  completeCheckIn: "சோதனை முடிக்கவும் · குடும்பத்திற்கு அனுப்பவும்",
  q1Text: "இரவு தூக்கம் எப்படி இருந்தது?", q1Sub: "ஓய்வு கிடைத்ததா?",
  q2Text: "காலை உணவு சாப்பிட்டீர்களா?",   q2Sub: "தேநீர், ரொட்டி அல்லது இலகுவான உணவு",
  q3Text: "காலையில் தண்ணீர் குடித்தீர்களா?", q3Sub: "எழுந்த பிறகு குறைந்தது 1 கிளாஸ்",
  q4Text: "இன்று வலி அல்லது அசௌகரியம் உள்ளதா?", q4Sub: "கால், முதுகு, மார்பு அல்லது தலை",

  emergencySOS: "அவசர SOS", holdToActivate: "அழுத்திப் பிடிக்கவும்",
  emergencyAlertSent: "அவசர எச்சரிக்கை அனுப்பப்பட்டது", pressFor3Sec: "3 நொடி அழுத்துங்கள்",
  familyNotified: "உங்கள் குடும்பத்தினரும் அவசர சேவைகளும்\nதெரிவிக்கப்பட்டனர்.",
  willCallBoth: "இது உங்கள் குடும்பம் மற்றும்\nஆம்புலன்சை ஒரே நேரத்தில் அழைக்கும்",
  emergencyContacts: "அவசர தொடர்புகள்", addContact: "தொடர்பு சேர்",
  editContact: "தொடர்பு திருத்து", whoGetsCallFirst: "முதலில் யாருக்கு அழைப்பு",
  noPersonalContact: "தனிப்பட்ட தொடர்பு இல்லை",
  addInProfile: "சுயவிவரம் → உங்களைப் பற்றி என்பதில் சேர்க்கவும்",
  nameLabel: "பெயர்", mobileNumber: "மொபைல் எண்", relationLocation: "உறவு / இடம்",
  fullNamePlaceholder: "முழு பெயர்", phonePlaceholder: "தொலைபேசி எண்",
  rolePlaceholder: "எ.கா. அக்கா · நகரம், மாநிலம்",

  familyMessages: "குடும்ப செய்திகள்",
  newMessagesFrom: "குடும்பத்திடமிருந்து புதிய செய்திகள்",
  sendMessageToFamily: "குடும்பத்திற்கு செய்தி அனுப்புங்கள்",
  talkLovedOnes: "உங்கள் அன்பானவர்களிடம் பேசுங்கள்",
  recordVoiceInstant: "குரல் பதிவு செய்யுங்கள் · உடனே குடும்பத்திற்கு",
  recordVoice: "குரல்\nபதிவு", tapAndSpeak: "அழுத்தி பேசுங்கள்",
  sendPhoto: "புகைப்படம்\nஅனுப்பு", takeOrUpload: "எடு அல்லது\nபதிவேற்று",
  sendText: "உரை அனுப்பு", typeMessage: "செய்தி\nதட்டச்சு",
  sendTo: "அனுப்பு", allFamily: "எல்லா குடும்பம் →",
  receivedMessages: "பெறப்பட்ட செய்திகள்",
  noMessagesYet: "இன்னும் செய்தி இல்லை. ஒன்று அனுப்பு!",
  voiceMessage: "குரல் செய்தி", play: "இயக்கு",
  alsoOnWhatsApp: "வாட்ஸ்அப்பிலும்",
  writeMessage: "செய்தி எழுது", sendMessage: "செய்தி அனுப்பு",
  messagePlaceholder: "இன்று எல்லோரும் எப்படி இருக்கீங்க?",
  voiceSent: "உங்கள் குரல் செய்தி குடும்பத்திற்கு அனுப்பப்பட்டது!",
  photoSent: "உங்கள் புகைப்படம் உங்கள் அன்பானவர்களிடம் சென்றடைகிறது.",
  messageSent: "உங்கள் செய்தி குடும்பத்துடன் பகிரப்பட்டது.",

  mindGames: "மூளை விளையாட்டுகள்", yourBrainHealth: "உங்கள் மூளை ஆரோக்கியம்",
  activateMind: "உங்கள் மனதை செயல்படுத்துங்கள்!", totalScore: "மொத்த மதிப்பெண்",
  streak: "தொடர்", rank: "தரம்", timeMinutes: "நேரம் (நி.)",
  todaysChallenge: "இன்றைய சவால்", playGames: "விளையாட்டு விளையாடு",
  quickGames: "விரைவு விளையாட்டு", leaderboard: "லீடர்போர்ட்",

  moodLift: "மனநிலை உயர்வு", dailyInspiration: "தினசரி உத்வேகம்",
  howAreYouToday: "இன்று எப்படி உணர்கிறீர்கள்?",
  weHaveFor: "உங்களுக்காக ஏதோ சிறப்பானது இருக்கிறது!",
  exploreMore: "மேலும் காண்", viewAll: "அனைத்தும் காண்",
  typeHere: "இங்கே தட்டச்சு செய்க…",
  whatMakesYouHappy: "உங்களை மகிழ்விப்பது என்ன?",
  shareHappyThought: "மகிழ்ச்சியான எண்ணம் அல்லது நினைவை பகிருங்கள்…",
  skipForNow: "இப்போது தவிர்", saveThought: "என் எண்ணத்தை சேமி",
  relaxationExercises: "விரைவு தளர்வு", yourMoodSuggestions: "இன்று உங்களுக்காக",

  careCalendar: "என் நாட்காட்டி", upcomingEvents: "வரவிருக்கும் நிகழ்வுகள்",
  addEvent: "நிகழ்வு சேர்", noEventsToday: "இன்று நிகழ்வுகள் இல்லை",
  noEventsScheduled: "நிகழ்வுகள் திட்டமிடப்படவில்லை",
  tapToAddEvent: "+ அழுத்துங்கள் — மருத்துவர் நியமனம்,\nகுடும்ப வருகை அல்லது ஆரோக்கிய செயல்பாடு சேர்க்கவும்",
  addCareEvent: "பராமரிப்பு நிகழ்வு சேர்", selectTime: "நேரம் தேர்வு",
  confirmTime: "நேரம் உறுதி", categoryLabel: "வகை", saveEvent: "நிகழ்வு சேமி",
  eventTitle: "நிகழ்வு தலைப்பு", eventDate: "தேதி", eventTime: "நேரம்",
};

const bn: AppTranslations = {
  yes: "হ্যাঁ", no: "না", save: "সংরক্ষণ", cancel: "বাতিল", saving: "সংরক্ষণ করা হচ্ছে...",
  backToHome: "বাড়িতে ফিরে যান", optional: "ঐচ্ছিক", done: "হয়ে গেছে!",
  add: "যোগ করুন", edit: "সম্পাদনা করুন", update: "আপডেট করুন", stop: "থামুন",
  recording: "রেকর্ডিং... থামাতে চাপুন", tapToRecord: "রেকর্ড করতে মাইক চাপুন",
  voiceRecorded: "✓ কণ্ঠস্বর রেকর্ড হয়েছে",

  dailyCheckIn: "দৈনিক সুস্থতা",
  allDoneToday: "আজকের জন্য সব হয়ে গেছে! 🎉",
  alreadyCheckedIn: "আজকের চেক-ইন সম্পন্ন হয়েছে। কাল ফিরে আসুন।",
  sathiTitle: "সাথি AI বলছে...", sathiSub: "আপনার AI সঙ্গী",
  sathiGreeting: "সুপ্রভাত {name}! আজ আপনি কেমন আছেন? ওষুধ নিতে ভুলবেন না।",
  talkToSathi: "সাথির সাথে কথা বলুন",
  howAreYouFeeling: "আপনি কেমন অনুভব করছেন?",
  quickHealthCheck: "দ্রুত স্বাস্থ্য পরীক্ষা",
  ofDone: "এর মধ্যে হয়েছে", voiceOptionalLabel: "ঐচ্ছিক · ভয়েস বার্তা",
  anythingToShare: "আর কিছু শেয়ার করতে চান?",
  recordForFamily: "পরিবারের জন্য ভয়েস বার্তা রেকর্ড করুন",
  tapToStop: "আবার চাপুন — থামান ও সেভ করুন",
  completeCheckIn: "চেক-ইন সম্পূর্ণ করুন · পরিবারকে পাঠান",
  q1Text: "রাতে ঘুম কেমন ছিল?", q1Sub: "বিশ্রাম পেয়েছেন কি?",
  q2Text: "সকালের নাস্তা করেছেন?",  q2Sub: "চা, রুটি বা হালকা খাবার",
  q3Text: "সকালে পানি পান করেছেন?", q3Sub: "ঘুম থেকে উঠে অন্তত ১ গ্লাস",
  q4Text: "আজ কোনো ব্যথা বা অস্বস্তি?", q4Sub: "পা, পিঠ, বুক বা মাথা",

  emergencySOS: "জরুরি SOS", holdToActivate: "চেপে ধরুন",
  emergencyAlertSent: "জরুরি সতর্কতা পাঠানো হয়েছে", pressFor3Sec: "৩ সেকেন্ড চাপুন",
  familyNotified: "আপনার পরিবার এবং জরুরি সেবাকে\nজানানো হয়েছে।",
  willCallBoth: "এটি আপনার পরিবার এবং\nঅ্যাম্বুলেন্স দুটোকে একসাথে কল করবে",
  emergencyContacts: "জরুরি যোগাযোগ", addContact: "যোগাযোগ যোগ করুন",
  editContact: "যোগাযোগ সম্পাদনা", whoGetsCallFirst: "প্রথমে কাকে কল যাবে",
  noPersonalContact: "কোনো ব্যক্তিগত যোগাযোগ নেই",
  addInProfile: "প্রোফাইল → আপনার সম্পর্কে তে যোগ করুন",
  nameLabel: "নাম", mobileNumber: "মোবাইল নম্বর", relationLocation: "সম্পর্ক / অবস্থান",
  fullNamePlaceholder: "পুরো নাম", phonePlaceholder: "ফোন নম্বর",
  rolePlaceholder: "যেমন বোন · শহর, রাজ্য",

  familyMessages: "পারিবারিক বার্তা",
  newMessagesFrom: "পরিবার থেকে নতুন বার্তা",
  sendMessageToFamily: "পরিবারকে বার্তা পাঠান",
  talkLovedOnes: "আপনার প্রিয়জনদের সাথে কথা বলুন",
  recordVoiceInstant: "কণ্ঠস্বর রেকর্ড করুন · তাৎক্ষণিক পরিবারকে পাঠান",
  recordVoice: "কণ্ঠস্বর\nরেকর্ড", tapAndSpeak: "চাপুন ও বলুন",
  sendPhoto: "ছবি\nপাঠান", takeOrUpload: "তুলুন বা\nআপলোড",
  sendText: "বার্তা পাঠান", typeMessage: "বার্তা\nলিখুন",
  sendTo: "পাঠান", allFamily: "সকল পরিবার →",
  receivedMessages: "প্রাপ্ত বার্তা",
  noMessagesYet: "এখনো কোনো বার্তা নেই। একটি পাঠান!",
  voiceMessage: "ভয়েস বার্তা", play: "চালান",
  alsoOnWhatsApp: "হোয়াটসঅ্যাপেও",
  writeMessage: "বার্তা লিখুন", sendMessage: "বার্তা পাঠান",
  messagePlaceholder: "আজ সবাই কেমন আছেন?",
  voiceSent: "আপনার ভয়েস বার্তা পরিবারকে পাঠানো হয়েছে!",
  photoSent: "আপনার ছবি প্রিয়জনদের কাছে পাঠানো হচ্ছে।",
  messageSent: "আপনার বার্তা পরিবারের সাথে শেয়ার হয়েছে।",

  mindGames: "ব্রেইন গেমস", yourBrainHealth: "আপনার মস্তিষ্ক স্বাস্থ্য",
  activateMind: "আপনার মন সক্রিয় করুন!", totalScore: "মোট স্কোর",
  streak: "ধারা", rank: "র‍্যাংক", timeMinutes: "সময় (মি.)",
  todaysChallenge: "আজকের চ্যালেঞ্জ", playGames: "খেলা খেলুন",
  quickGames: "দ্রুত খেলা", leaderboard: "লিডারবোর্ড",

  moodLift: "মন উজ্জীবন", dailyInspiration: "দৈনিক অনুপ্রেরণা",
  howAreYouToday: "আজ আপনি কেমন অনুভব করছেন?",
  weHaveFor: "আপনার জন্য কিছু বিশেষ আছে!",
  exploreMore: "আরও দেখুন", viewAll: "সব দেখুন",
  typeHere: "এখানে লিখুন…",
  whatMakesYouHappy: "কী আপনাকে সুখী করে?",
  shareHappyThought: "একটি সুখী চিন্তা বা স্মৃতি লিখুন…",
  skipForNow: "এখন এড়িয়ে যান", saveThought: "আমার চিন্তা সংরক্ষণ করুন",
  relaxationExercises: "দ্রুত বিশ্রাম", yourMoodSuggestions: "আজ আপনার জন্য",

  careCalendar: "আমার ক্যালেন্ডার", upcomingEvents: "আসন্ন অনুষ্ঠান",
  addEvent: "অনুষ্ঠান যোগ করুন", noEventsToday: "আজ কোনো অনুষ্ঠান নেই",
  noEventsScheduled: "কোনো অনুষ্ঠান নির্ধারিত নেই",
  tapToAddEvent: "+ চাপুন — ডাক্তারের নিয়োগ,\nপরিবার পরিদর্শন বা সুস্থতা কার্যক্রম যোগ করুন",
  addCareEvent: "পরিচর্যা অনুষ্ঠান যোগ করুন", selectTime: "সময় বেছে নিন",
  confirmTime: "সময় নিশ্চিত করুন", categoryLabel: "বিভাগ", saveEvent: "অনুষ্ঠান সংরক্ষণ",
  eventTitle: "অনুষ্ঠানের নাম", eventDate: "তারিখ", eventTime: "সময়",
};

const mr: AppTranslations = {
  yes: "होय", no: "नाही", save: "जतन करा", cancel: "रद्द करा", saving: "जतन करत आहे...",
  backToHome: "घरी परत जा", optional: "ऐच्छिक", done: "झाले!",
  add: "जोडा", edit: "संपादित करा", update: "अपडेट करा", stop: "थांबा",
  recording: "रेकॉर्डिंग... थांबवण्यासाठी दाबा", tapToRecord: "रेकॉर्ड करण्यासाठी माय दाबा",
  voiceRecorded: "✓ आवाज रेकॉर्ड झाली",

  dailyCheckIn: "दैनंदिन स्वास्थ्य",
  allDoneToday: "आजचे काम झाले! 🎉",
  alreadyCheckedIn: "आजची तपासणी पूर्ण झाली आहे. उद्या परत या.",
  sathiTitle: "साथी AI सांगत आहे...", sathiSub: "तुमचा AI साथी",
  sathiGreeting: "सुप्रभात {name}! आज तुम्हाला कसे वाटत आहे? औषधे घेणे विसरू नका.",
  talkToSathi: "साथीशी बोला",
  howAreYouFeeling: "तुम्हाला कसे वाटत आहे?",
  quickHealthCheck: "जलद आरोग्य तपासणी",
  ofDone: "पैकी झाले", voiceOptionalLabel: "ऐच्छिक · व्हॉइस संदेश",
  anythingToShare: "इतर काही शेअर करायचे आहे?",
  recordForFamily: "कुटुंबासाठी व्हॉइस संदेश रेकॉर्ड करा",
  tapToStop: "पुन्हा दाबा — थांबवा आणि सेव्ह करा",
  completeCheckIn: "तपासणी पूर्ण करा · कुटुंबाला पाठवा",
  q1Text: "रात्री झोप कशी होती?", q1Sub: "तुम्हाला विश्रांती मिळाली का?",
  q2Text: "नाश्ता केला का?",        q2Sub: "चहा, भाकरी किंवा हलका आहार",
  q3Text: "सकाळी पाणी प्याले का?",  q3Sub: "उठल्यावर किमान 1 ग्लास",
  q4Text: "आज काही दुखणे किंवा अस्वस्थता?", q4Sub: "पाय, पाठ, छाती किंवा डोके",

  emergencySOS: "आणीबाणी SOS", holdToActivate: "दाबून ठेवा",
  emergencyAlertSent: "आणीबाणी सूचना पाठवली", pressFor3Sec: "3 सेकंद दाबा",
  familyNotified: "तुमच्या कुटुंबाला आणि आपत्कालीन सेवांना\nकळवण्यात आले आहे.",
  willCallBoth: "हे तुमच्या कुटुंबाला आणि\nरुग्णवाहिकेला एकाच वेळी कॉल करेल",
  emergencyContacts: "आणीबाणी संपर्क", addContact: "संपर्क जोडा",
  editContact: "संपर्क संपादित करा", whoGetsCallFirst: "आधी कोणाला कॉल जाईल",
  noPersonalContact: "कोणताही वैयक्तिक संपर्क नाही",
  addInProfile: "प्रोफाइल → तुमच्याबद्दल मध्ये जोडा",
  nameLabel: "नाव", mobileNumber: "मोबाइल नंबर", relationLocation: "नाते / ठिकाण",
  fullNamePlaceholder: "पूर्ण नाव", phonePlaceholder: "फोन नंबर",
  rolePlaceholder: "उदा. बहीण · शहर, राज्य",

  familyMessages: "कौटुंबिक संदेश",
  newMessagesFrom: "कुटुंबाकडून नवे संदेश",
  sendMessageToFamily: "कुटुंबाला संदेश पाठवा",
  talkLovedOnes: "तुमच्या प्रियजनांशी बोला",
  recordVoiceInstant: "आवाज रेकॉर्ड करा · लगेच कुटुंबाला पाठवा",
  recordVoice: "आवाज\nरेकॉर्ड", tapAndSpeak: "दाबा आणि बोला",
  sendPhoto: "फोटो\nपाठवा", takeOrUpload: "काढा किंवा\nअपलोड",
  sendText: "संदेश पाठवा", typeMessage: "संदेश\nलिहा",
  sendTo: "पाठवा", allFamily: "सर्व कुटुंब →",
  receivedMessages: "प्राप्त संदेश",
  noMessagesYet: "अजून कोणताही संदेश नाही. एक पाठवा!",
  voiceMessage: "व्हॉइस संदेश", play: "चालवा",
  alsoOnWhatsApp: "व्हाट्सअॅपवरही",
  writeMessage: "संदेश लिहा", sendMessage: "संदेश पाठवा",
  messagePlaceholder: "आज तुम्ही सगळे कसे आहात?",
  voiceSent: "तुमचा व्हॉइस संदेश कुटुंबाला पाठवला!",
  photoSent: "तुमचा फोटो तुमच्या प्रियजनांकडे जात आहे.",
  messageSent: "तुमचा संदेश कुटुंबासोबत शेअर झाला.",

  mindGames: "ब्रेन गेम्स", yourBrainHealth: "तुमचे मेंदू आरोग्य",
  activateMind: "तुमचा मेंदू सक्रिय करा!", totalScore: "एकूण गुण",
  streak: "सलग", rank: "क्रमांक", timeMinutes: "वेळ (मि.)",
  todaysChallenge: "आजचे आव्हान", playGames: "खेळ खेळा",
  quickGames: "जलद खेळ", leaderboard: "लीडरबोर्ड",

  moodLift: "मनस्थिती सुधारणा", dailyInspiration: "दैनंदिन प्रेरणा",
  howAreYouToday: "आज तुम्हाला कसे वाटत आहे?",
  weHaveFor: "तुमच्यासाठी काहीतरी खास आहे!",
  exploreMore: "अधिक पाहा", viewAll: "सर्व पाहा",
  typeHere: "इथे लिहा…",
  whatMakesYouHappy: "तुम्हाला काय आनंदी करते?",
  shareHappyThought: "एक आनंदी विचार किंवा आठवण लिहा…",
  skipForNow: "आत्ता सोडा", saveThought: "माझा विचार जतन करा",
  relaxationExercises: "जलद विश्रांती", yourMoodSuggestions: "आज तुमच्यासाठी",

  careCalendar: "माझे दिनदर्शिका", upcomingEvents: "येणारे कार्यक्रम",
  addEvent: "कार्यक्रम जोडा", noEventsToday: "आज कोणतेही कार्यक्रम नाहीत",
  noEventsScheduled: "कोणतेही कार्यक्रम निर्धारित नाहीत",
  tapToAddEvent: "+ दाबा — डॉक्टरांची भेट,\nकुटुंब भेट किंवा आरोग्य उपक्रम जोडा",
  addCareEvent: "काळजी कार्यक्रम जोडा", selectTime: "वेळ निवडा",
  confirmTime: "वेळ निश्चित करा", categoryLabel: "श्रेणी", saveEvent: "कार्यक्रम जतन करा",
  eventTitle: "कार्यक्रमाचे नाव", eventDate: "तारीख", eventTime: "वेळ",
};

const pa: AppTranslations = {
  yes: "ਹਾਂ", no: "ਨਹੀਂ", save: "ਸੇਵ ਕਰੋ", cancel: "ਰੱਦ ਕਰੋ", saving: "ਸੇਵ ਹੋ ਰਿਹਾ ਹੈ...",
  backToHome: "ਘਰ ਵਾਪਸ ਜਾਓ", optional: "ਵਿਕਲਪਿਕ", done: "ਹੋ ਗਿਆ!",
  add: "ਜੋੜੋ", edit: "ਸੋਧੋ", update: "ਅੱਪਡੇਟ ਕਰੋ", stop: "ਰੋਕੋ",
  recording: "ਰਿਕਾਰਡ ਹੋ ਰਿਹਾ ਹੈ… ਰੋਕਣ ਲਈ ਦਬਾਓ", tapToRecord: "ਰਿਕਾਰਡ ਕਰਨ ਲਈ ਮਾਈਕ ਦਬਾਓ",
  voiceRecorded: "✓ ਆਵਾਜ਼ ਰਿਕਾਰਡ ਹੋਈ",
  dailyCheckIn: "ਰੋਜ਼ਾਨਾ ਸਿਹਤ ਜਾਂਚ",
  allDoneToday: "ਅੱਜ ਦਾ ਕੰਮ ਹੋ ਗਿਆ! 🎉",
  alreadyCheckedIn: "ਤੁਸੀਂ ਅੱਜ ਦੀ ਜਾਂਚ ਪਹਿਲਾਂ ਹੀ ਕਰ ਲਈ ਹੈ। ਕੱਲ੍ਹ ਵਾਪਸ ਆਓ।",
  sathiTitle: "ਸਾਥੀ AI ਕਹਿ ਰਿਹਾ ਹੈ...", sathiSub: "ਤੁਹਾਡਾ ਆਵਾਜ਼ AI ਸਾਥੀ",
  sathiGreeting: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ {name}! ਅੱਜ ਕਿਵੇਂ ਹੋ? ਦਵਾਈਆਂ ਲੈਣਾ ਨਾ ਭੁੱਲੋ।",
  talkToSathi: "ਸਾਥੀ ਨਾਲ ਗੱਲ ਕਰੋ",
  howAreYouFeeling: "ਤੁਸੀਂ ਕਿਵੇਂ ਮਹਿਸੂਸ ਕਰ ਰਹੇ ਹੋ?",
  quickHealthCheck: "ਤੇਜ਼ ਸਿਹਤ ਜਾਂਚ",
  ofDone: "ਵਿੱਚੋਂ ਹੋਇਆ", voiceOptionalLabel: "ਵਿਕਲਪਿਕ · ਆਵਾਜ਼ ਸੁਨੇਹਾ",
  anythingToShare: "ਕੁਝ ਹੋਰ ਸਾਂਝਾ ਕਰਨਾ ਹੈ?",
  recordForFamily: "ਪਰਿਵਾਰ ਲਈ ਆਵਾਜ਼ ਸੁਨੇਹਾ ਰਿਕਾਰਡ ਕਰੋ",
  tapToStop: "ਰੋਕਣ ਲਈ ਦੁਬਾਰਾ ਦਬਾਓ",
  completeCheckIn: "ਜਾਂਚ ਪੂਰੀ ਕਰੋ · ਪਰਿਵਾਰ ਨੂੰ ਭੇਜੋ",
  q1Text: "ਰਾਤ ਨੂੰ ਨੀਂਦ ਕਿਵੇਂ ਆਈ?", q1Sub: "ਕੀ ਤੁਸੀਂ ਆਰਾਮ ਮਹਿਸੂਸ ਕਰਦੇ ਹੋ?",
  q2Text: "ਨਾਸ਼ਤਾ ਕੀਤਾ?", q2Sub: "ਚਾਹ, ਰੋਟੀ ਜਾਂ ਹਲਕਾ ਖਾਣਾ",
  q3Text: "ਸਵੇਰੇ ਪਾਣੀ ਪੀਤਾ?", q3Sub: "ਉੱਠਣ ਤੋਂ ਬਾਅਦ ਘੱਟੋ-ਘੱਟ 1 ਗਿਲਾਸ",
  q4Text: "ਅੱਜ ਕੋਈ ਦਰਦ ਜਾਂ ਤਕਲੀਫ਼?", q4Sub: "ਲੱਤ, ਪਿੱਠ, ਛਾਤੀ ਜਾਂ ਸਿਰ",
  emergencySOS: "ਐਮਰਜੈਂਸੀ SOS", holdToActivate: "ਦਬਾ ਕੇ ਰੱਖੋ",
  emergencyAlertSent: "ਐਮਰਜੈਂਸੀ ਅਲਰਟ ਭੇਜਿਆ", pressFor3Sec: "3 ਸਕਿੰਟ ਦਬਾਓ",
  familyNotified: "ਤੁਹਾਡੇ ਪਰਿਵਾਰ ਅਤੇ ਐਮਰਜੈਂਸੀ ਸੇਵਾਵਾਂ ਨੂੰ ਸੂਚਿਤ ਕੀਤਾ ਗਿਆ ਹੈ।",
  willCallBoth: "ਇਹ ਤੁਹਾਡੇ ਪਰਿਵਾਰ ਅਤੇ ਐਂਬੂਲੈਂਸ\nਦੋਵਾਂ ਨੂੰ ਇਕੱਠੇ ਕਾਲ ਕਰੇਗਾ",
  emergencyContacts: "ਐਮਰਜੈਂਸੀ ਸੰਪਰਕ", addContact: "ਸੰਪਰਕ ਜੋੜੋ",
  editContact: "ਸੰਪਰਕ ਸੋਧੋ", whoGetsCallFirst: "ਪਹਿਲਾਂ ਕਿਸਨੂੰ ਕਾਲ",
  noPersonalContact: "ਕੋਈ ਨਿੱਜੀ ਸੰਪਰਕ ਨਹੀਂ",
  addInProfile: "ਪ੍ਰੋਫਾਈਲ → ਆਪਣੇ ਬਾਰੇ ਵਿੱਚ ਜੋੜੋ",
  nameLabel: "ਨਾਮ", mobileNumber: "ਮੋਬਾਈਲ ਨੰਬਰ", relationLocation: "ਰਿਸ਼ਤਾ / ਥਾਂ",
  fullNamePlaceholder: "ਪੂਰਾ ਨਾਮ", phonePlaceholder: "ਫ਼ੋਨ ਨੰਬਰ",
  rolePlaceholder: "ਜਿਵੇਂ ਭੈਣ · ਸ਼ਹਿਰ, ਸੂਬਾ",
  familyMessages: "ਪਰਿਵਾਰਕ ਸੁਨੇਹੇ",
  newMessagesFrom: "ਪਰਿਵਾਰ ਤੋਂ ਨਵੇਂ ਸੁਨੇਹੇ",
  sendMessageToFamily: "ਪਰਿਵਾਰ ਨੂੰ ਸੁਨੇਹਾ ਭੇਜੋ",
  talkLovedOnes: "ਆਪਣੇ ਅਜ਼ੀਜ਼ਾਂ ਨਾਲ ਗੱਲ ਕਰੋ",
  recordVoiceInstant: "ਆਵਾਜ਼ ਰਿਕਾਰਡ ਕਰੋ · ਤੁਰੰਤ ਪਰਿਵਾਰ ਨੂੰ ਭੇਜੋ",
  recordVoice: "ਆਵਾਜ਼\nਰਿਕਾਰਡ", tapAndSpeak: "ਦਬਾਓ ਅਤੇ ਬੋਲੋ",
  sendPhoto: "ਫ਼ੋਟੋ\n�ੇਜੋ", takeOrUpload: "ਖਿੱਚੋ ਜਾਂ\nਅੱਪਲੋਡ",
  sendText: "ਸੁਨੇਹਾ ਭੇਜੋ", typeMessage: "ਸੁਨੇਹਾ\nਲਿਖੋ",
  sendTo: "ਭੇਜੋ", allFamily: "ਸਾਰਾ ਪਰਿਵਾਰ →",
  receivedMessages: "ਮਿਲੇ ਸੁਨੇਹੇ",
  noMessagesYet: "ਹਾਲੇ ਕੋਈ ਸੁਨੇਹਾ ਨਹੀਂ। ਇੱਕ ਭੇਜੋ!",
  voiceMessage: "ਆਵਾਜ਼ ਸੁਨੇਹਾ", play: "ਚਲਾਓ",
  alsoOnWhatsApp: "ਵ੍ਹਾਟਸਐਪ ਤੇ ਵੀ",
  writeMessage: "ਸੁਨੇਹਾ ਲਿਖੋ", sendMessage: "ਸੁਨੇਹਾ ਭੇਜੋ",
  messagePlaceholder: "ਅੱਜ ਤੁਸੀਂ ਸਾਰੇ ਕਿਵੇਂ ਹੋ?",
  voiceSent: "ਤੁਹਾਡਾ ਆਵਾਜ਼ ਸੁਨੇਹਾ ਪਰਿਵਾਰ ਨੂੰ ਭੇਜਿਆ ਗਿਆ!",
  photoSent: "ਤੁਹਾਡੀ ਫ਼ੋਟੋ ਤੁਹਾਡੇ ਅਜ਼ੀਜ਼ਾਂ ਕੋਲ ਪਹੁੰਚ ਰਹੀ ਹੈ।",
  messageSent: "ਤੁਹਾਡਾ ਸੁਨੇਹਾ ਪਰਿਵਾਰ ਨਾਲ ਸਾਂਝਾ ਕੀਤਾ ਗਿਆ।",
  mindGames: "ਦਿਮਾਗ਼ੀ ਖੇਡਾਂ", yourBrainHealth: "ਤੁਹਾਡੀ ਦਿਮਾਗ਼ੀ ਸਿਹਤ",
  activateMind: "ਆਪਣੇ ਦਿਮਾਗ਼ ਨੂੰ ਸਰਗਰਮ ਕਰੋ!", totalScore: "ਕੁੱਲ ਸਕੋਰ",
  streak: "ਸਿਲਸਿਲਾ", rank: "ਰੈਂਕ", timeMinutes: "ਸਮਾਂ (ਮਿ.)",
  todaysChallenge: "ਅੱਜ ਦੀ ਚੁਣੌਤੀ", playGames: "ਖੇਡਾਂ ਖੇਡੋ",
  quickGames: "ਤੇਜ਼ ਖੇਡਾਂ", leaderboard: "ਲੀਡਰਬੋਰਡ",
  moodLift: "ਮੂਡ ਸੁਧਾਰ", dailyInspiration: "ਰੋਜ਼ਾਨਾ ਪ੍ਰੇਰਣਾ",
  howAreYouToday: "ਅੱਜ ਤੁਸੀਂ ਕਿਵੇਂ ਮਹਿਸੂਸ ਕਰਦੇ ਹੋ?",
  weHaveFor: "ਤੁਹਾਡੇ ਲਈ ਕੁਝ ਖਾਸ ਹੈ!",
  exploreMore: "ਹੋਰ ਦੇਖੋ", viewAll: "ਸਾਰੇ ਦੇਖੋ",
  typeHere: "ਇੱਥੇ ਲਿਖੋ…",
  whatMakesYouHappy: "ਤੁਹਾਨੂੰ ਕੀ ਖੁਸ਼ ਕਰਦਾ ਹੈ?",
  shareHappyThought: "ਇੱਕ ਖੁਸ਼ੀ ਦਾ ਵਿਚਾਰ ਜਾਂ ਯਾਦ ਲਿਖੋ…",
  skipForNow: "ਹੁਣ ਛੱਡੋ", saveThought: "ਮੇਰਾ ਵਿਚਾਰ ਸੇਵ ਕਰੋ",
  relaxationExercises: "ਤੇਜ਼ ਆਰਾਮ", yourMoodSuggestions: "ਅੱਜ ਤੁਹਾਡੇ ਲਈ",
  careCalendar: "ਮੇਰਾ ਕੈਲੰਡਰ", upcomingEvents: "ਆਉਣ ਵਾਲੇ ਸਮਾਗਮ",
  addEvent: "ਸਮਾਗਮ ਜੋੜੋ", noEventsToday: "ਅੱਜ ਕੋਈ ਸਮਾਗਮ ਨਹੀਂ",
  noEventsScheduled: "ਕੋਈ ਸਮਾਗਮ ਨਿਰਧਾਰਿਤ ਨਹੀਂ",
  tapToAddEvent: "+ ਦਬਾਓ — ਡਾਕਟਰ ਮੁਲਾਕਾਤ,\nਪਰਿਵਾਰ ਮਿਲਣ ਜਾਂ ਸਿਹਤ ਗਤੀਵਿਧੀ ਜੋੜੋ",
  addCareEvent: "ਦੇਖਭਾਲ ਸਮਾਗਮ ਜੋੜੋ", selectTime: "ਸਮਾਂ ਚੁਣੋ",
  confirmTime: "ਸਮਾਂ ਪੱਕਾ ਕਰੋ", categoryLabel: "ਸ਼੍ਰੇਣੀ", saveEvent: "ਸਮਾਗਮ ਸੇਵ ਕਰੋ",
  eventTitle: "ਸਮਾਗਮ ਦਾ ਨਾਮ", eventDate: "ਤਾਰੀਖ", eventTime: "ਸਮਾਂ",
};

const hrv: AppTranslations = {
  yes: "हां", no: "ना", save: "सेव करो", cancel: "रद्द करो", saving: "सेव होयो जा रहा सै...",
  backToHome: "घर वापस जाओ", optional: "मर्जी का", done: "हो गया!",
  add: "जोड़ो", edit: "बदलो", update: "अपडेट करो", stop: "रोको",
  recording: "रिकॉर्ड होयो जा रहा सै… रोकण खातर दबाओ", tapToRecord: "रिकॉर्ड करण खातर माईक दबाओ",
  voiceRecorded: "✓ आवाज रिकॉर्ड होगी",
  dailyCheckIn: "रोज की सेहत जांच",
  allDoneToday: "आज का काम होग्या! 🎉",
  alreadyCheckedIn: "थाने आज की जांच पहले ही कर ली सै। कल वापस आइयो।",
  sathiTitle: "साथी AI कह रह्या सै...", sathiSub: "तेरा आवाज AI साथी",
  sathiGreeting: "राम राम {name}! आज कैसे सो? दवाई लेण की भूलणा मत।",
  talkToSathi: "साथी तैं बात करो",
  howAreYouFeeling: "थाने कैसा लागो सै?",
  quickHealthCheck: "जल्दी सेहत जांच",
  ofDone: "में से होगया", voiceOptionalLabel: "मर्जी · आवाज संदेश",
  anythingToShare: "कुछ और बताणा सै?",
  recordForFamily: "परिवार खातर आवाज संदेश रिकॉर्ड करो",
  tapToStop: "रोकण खातर दोबारा दबाओ",
  completeCheckIn: "जांच पूरी करो · परिवार नैं भेजो",
  q1Text: "रात नैं नींद कैसी आई?", q1Sub: "के थाने आराम लाग्या?",
  q2Text: "नाश्ता किया?", q2Sub: "चाह, रोटी या हल्का खाणा",
  q3Text: "सुबह पाणी पिया?", q3Sub: "उठण के बाद कम से कम 1 गिलास",
  q4Text: "आज कोई दर्द या तकलीफ?", q4Sub: "पैर, पीठ, छाती या सिर",
  emergencySOS: "इमरजेंसी SOS", holdToActivate: "दबा कै राखो",
  emergencyAlertSent: "इमरजेंसी अलर्ट भेज्या", pressFor3Sec: "3 सेकंड दबाओ",
  familyNotified: "तेरे परिवार और इमरजेंसी सेवाओं नैं खबर कर दी गई सै।",
  willCallBoth: "यो तेरे परिवार और एम्बुलेंस\ndoनूं साथ कॉल करेगा",
  emergencyContacts: "इमरजेंसी संपर्क", addContact: "संपर्क जोड़ो",
  editContact: "संपर्क बदलो", whoGetsCallFirst: "पहले किसनैं कॉल",
  noPersonalContact: "कोई निजी संपर्क नहीं",
  addInProfile: "प्रोफाइल → आपने बारे में जोड़ो",
  nameLabel: "नाम", mobileNumber: "मोबाइल नंबर", relationLocation: "रिश्ता / जगह",
  fullNamePlaceholder: "पूरा नाम", phonePlaceholder: "फोन नंबर",
  rolePlaceholder: "जैसे भैण · शहर, सूबा",
  familyMessages: "परिवार के संदेश",
  newMessagesFrom: "परिवार तैं नए संदेश",
  sendMessageToFamily: "परिवार नैं संदेश भेजो",
  talkLovedOnes: "आपणे प्रियजनों तैं बात करो",
  recordVoiceInstant: "आवाज रिकॉर्ड करो · तुरंत परिवार नैं भेजो",
  recordVoice: "आवाज\nरिकॉर्ड", tapAndSpeak: "दबाओ और बोलो",
  sendPhoto: "फोटो\nभेजो", takeOrUpload: "खींचो या\nअपलोड",
  sendText: "संदेश भेजो", typeMessage: "संदेश\nलिखो",
  sendTo: "भेजो", allFamily: "सारा परिवार →",
  receivedMessages: "मिले संदेश",
  noMessagesYet: "अभी कोई संदेश नहीं। एक भेजो!",
  voiceMessage: "आवाज संदेश", play: "चलाओ",
  alsoOnWhatsApp: "व्हाट्सऐप पै भी",
  writeMessage: "संदेश लिखो", sendMessage: "संदेश भेजो",
  messagePlaceholder: "आज थाम सब कैसे सो?",
  voiceSent: "तेरा आवाज संदेश परिवार नैं भेज्या गया!",
  photoSent: "तेरी फोटो तेरे प्रियजनों तक पहुंच रही सै।",
  messageSent: "तेरा संदेश परिवार तैं साझा होग्या।",
  mindGames: "दिमागी खेल", yourBrainHealth: "तेरी दिमागी सेहत",
  activateMind: "आपणे दिमाग नैं सक्रिय करो!", totalScore: "कुल स्कोर",
  streak: "सिलसिला", rank: "रैंक", timeMinutes: "समय (मि.)",
  todaysChallenge: "आज की चुनौती", playGames: "खेल खेलो",
  quickGames: "जल्दी खेल", leaderboard: "लीडरबोर्ड",
  moodLift: "मूड सुधार", dailyInspiration: "रोज की प्रेरणा",
  howAreYouToday: "आज थाने कैसा लागो सै?",
  weHaveFor: "तेरे खातर कुछ खास सै!",
  exploreMore: "और देखो", viewAll: "सब देखो",
  typeHere: "यहां लिखो…",
  whatMakesYouHappy: "थानैं के खुश करे सै?",
  shareHappyThought: "एक खुशी का विचार या याद लिखो…",
  skipForNow: "अभी छोड़ो", saveThought: "मेरा विचार सेव करो",
  relaxationExercises: "जल्दी आराम", yourMoodSuggestions: "आज तेरे खातर",
  careCalendar: "मेरा कैलेंडर", upcomingEvents: "आण वाले प्रोग्राम",
  addEvent: "प्रोग्राम जोड़ो", noEventsToday: "आज कोई प्रोग्राम नहीं",
  noEventsScheduled: "कोई प्रोग्राम तय नहीं",
  tapToAddEvent: "+ दबाओ — डॉक्टर मिलण,\nपरिवार मिलण या सेहत गतिविधि जोड़ो",
  addCareEvent: "देखभाल प्रोग्राम जोड़ो", selectTime: "समय चुनो",
  confirmTime: "समय पक्का करो", categoryLabel: "श्रेणी", saveEvent: "प्रोग्राम सेव करो",
  eventTitle: "प्रोग्राम का नाम", eventDate: "तारीख", eventTime: "समय",
};

const TRANSLATIONS: Partial<Record<Language, AppTranslations>> = {
  "English":    en,
  "हिंदी":     hi,
  "ગુજરાતી":  gu,
  "தமிழ்":    ta,
  "বাংলা":    bn,
  "मराठी":    mr,
  "ਪੰਜਾਬੀ":  pa,
  "हरियाणवी": hrv,
};

/** Returns the translation set for the given language, falling back to English. */
export function tr(language: Language): AppTranslations {
  return TRANSLATIONS[language] ?? en;
}
