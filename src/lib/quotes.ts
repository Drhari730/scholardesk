/**
 * Motivational quotes.
 *
 * Selection is deterministic but PER-USER and PER-DAY:
 *   index = (dayOfYear + hash(seed)) % pool.length
 * so two different people almost never see the same quote on the same day,
 * and each person's quote rotates every day. With N quotes and M people
 * that is effectively N×M unique daily deliveries — add more quotes to the
 * arrays below anytime to widen the pool further.
 */

export type Quote = { text: string; author: string };

/** Deterministic 32-bit string hash (stable across runs) */
function hashString(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** Pick a quote for a given day, offset by a per-user seed (e.g. person id). */
function pickQuote(pool: Quote[], date: Date, seed?: string): Quote {
  const offset = seed ? hashString(seed) : 0;
  return pool[(dayOfYear(date) + offset) % pool.length];
}

/** Motivational quotes for the academic / admin (Dr. Hari) */
export const DAILY_QUOTES: Quote[] = [
  { text: "Research is formalized curiosity. It is poking and prying with a purpose.", author: "Zora Neale Hurston" },
  { text: "The best way to predict the future is to create it through rigorous inquiry.", author: "Peter Drucker" },
  { text: "Public health saves lives quietly. Your work today shapes healthier tomorrows.", author: "ScholarDesk" },
  { text: "Teaching is the greatest act of optimism. Every lecture plants a seed.", author: "Colleen Wilcox" },
  { text: "Data tells a story. Your analysis gives it a voice that can change policy.", author: "ScholarDesk" },
  { text: "Excellence is not an act, but a habit — in research, teaching, and service.", author: "Aristotle" },
  { text: "A manuscript submitted is a dream in motion. Keep writing.", author: "ScholarDesk" },
  { text: "The expert in anything was once a beginner who refused to give up.", author: "Helen Hayes" },
  { text: "Community health begins with one committed investigator. That is you.", author: "ScholarDesk" },
  { text: "Peer review is tough, but acceptance tastes like years of work vindicated.", author: "ScholarDesk" },
  { text: "Plan your month. Protect your time. Great work needs protected space.", author: "ScholarDesk" },
  { text: "Every conference talk is a chance to share knowledge that saves lives.", author: "ScholarDesk" },
  { text: "Guest lectures inspire the next generation. Prepare well, impact deeply.", author: "ScholarDesk" },
  { text: "Methodology is the bridge between a good question and a trustworthy answer.", author: "ScholarDesk" },
  { text: "Rest is part of research. Take leave when you need it — you earn it.", author: "ScholarDesk" },
  { text: "Small daily progress compounds into publications and policy change.", author: "James Clear" },
  { text: "Your students are watching how you handle deadlines. Lead by example.", author: "ScholarDesk" },
  { text: "Ethics approval is not bureaucracy — it is the foundation of trustworthy science.", author: "ScholarDesk" },
  { text: "Travel for conferences expands networks. Plan travel, maximize learning.", author: "ScholarDesk" },
  { text: "A well-prepared question paper reflects respect for your students.", author: "ScholarDesk" },
  { text: "Collaboration multiplies impact. Invite, include, and acknowledge.", author: "ScholarDesk" },
  { text: "Rejections redirect, not define. Revise, resubmit, persist.", author: "ScholarDesk" },
  { text: "Field work is where theory meets humanity. Document every insight.", author: "ScholarDesk" },
  { text: "Morning clarity fuels afternoon productivity. Start with your hardest task.", author: "ScholarDesk" },
  { text: "Statistics is the grammar of public health evidence. Master it patiently.", author: "ScholarDesk" },
  { text: "Your timetable is a promise. Honor it, and students will honor yours.", author: "ScholarDesk" },
  { text: "Innovation in health tools starts with understanding real community needs.", author: "ScholarDesk" },
  { text: "Leave days restore creativity. Schedule them before burnout schedules you.", author: "ScholarDesk" },
  { text: "A single accepted paper can influence thousands of lives. Keep going.", author: "ScholarDesk" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "Today: one task completed is one step closer to your next breakthrough.", author: "ScholarDesk" },
  { text: "It always seems impossible until it is done.", author: "Nelson Mandela" },
  { text: "The scientist is not a person who gives the right answers, but one who asks the right questions.", author: "Claude Lévi-Strauss" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "If we knew what we were doing, it would not be called research.", author: "Albert Einstein" },
  { text: "The good physician treats the disease; the great physician treats the patient who has the disease.", author: "William Osler" },
  { text: "Nothing in life is to be feared, it is only to be understood.", author: "Marie Curie" },
  { text: "An ounce of prevention is worth a pound of cure.", author: "Benjamin Franklin" },
  { text: "The important thing is not to stop questioning. Curiosity has its own reason for existing.", author: "Albert Einstein" },
  { text: "Well done is better than well said.", author: "Benjamin Franklin" },
  { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { text: "The people who are crazy enough to think they can change the world are the ones who do.", author: "Steve Jobs" },
  { text: "Health is not valued till sickness comes.", author: "Thomas Fuller" },
  { text: "You do not have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "The reward of a thing well done is having done it.", author: "Ralph Waldo Emerson" },
  { text: "Science is a way of thinking much more than it is a body of knowledge.", author: "Carl Sagan" },
  { text: "Great things are done by a series of small things brought together.", author: "Vincent van Gogh" },
  { text: "The best time to plant a tree was twenty years ago. The second best time is now.", author: "Proverb" },
  { text: "A goal without a plan is just a wish.", author: "Antoine de Saint-Exupéry" },
  { text: "Perfection is not attainable, but if we chase perfection we can catch excellence.", author: "Vince Lombardi" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "What gets measured gets managed.", author: "Peter Drucker" },
  { text: "Knowledge is of no value unless you put it into practice.", author: "Anton Chekhov" },
  { text: "Do not wait to strike till the iron is hot; make it hot by striking.", author: "William Butler Yeats" },
  { text: "Prevention is the daughter of intelligence.", author: "Walter Raleigh" },
  { text: "A day of writing, however small, keeps the blank page away.", author: "ScholarDesk" },
  { text: "Mentoring one student well can outlast a hundred citations.", author: "ScholarDesk" },
  { text: "Read one paper before noon; you will be smarter by evening.", author: "ScholarDesk" },
  { text: "Every clean dataset began with someone who refused to cut corners.", author: "ScholarDesk" },
  { text: "Write the abstract first; let it guide the study you actually run.", author: "ScholarDesk" },
  { text: "Deadlines are respect made visible. Meet them, and be met in kind.", author: "ScholarDesk" },
  { text: "The best grant proposal is the one you actually submitted.", author: "ScholarDesk" },
  { text: "Answer one reviewer comment now; momentum will handle the rest.", author: "ScholarDesk" },
  { text: "Guard your deep-work hours as fiercely as you guard your ethics.", author: "ScholarDesk" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "Courage doesn't always roar. Sometimes it is the quiet resolve to try again tomorrow.", author: "Mary Anne Radmacher" },
  { text: "Genius is one percent inspiration and ninety-nine percent perspiration.", author: "Thomas Edison" },
  { text: "The measure of intelligence is the ability to change.", author: "Albert Einstein" },
  { text: "Waste no more time arguing about what a good person should be. Be one.", author: "Marcus Aurelius" },
  { text: "You miss one hundred percent of the shots you do not take.", author: "Wayne Gretzky" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "One finding, honestly reported, is worth more than ten that were hoped for.", author: "ScholarDesk" },
  { text: "Your future self is built by the tasks your present self finishes.", author: "ScholarDesk" },
  { text: "Care for the caregiver — your rest is a public health measure too.", author: "ScholarDesk" },
  { text: "Teach so clearly that your students no longer need you. That is success.", author: "ScholarDesk" },
  { text: "A well-cited reference today saves an angry reviewer tomorrow.", author: "ScholarDesk" },
  { text: "Progress, not perfection, publishes papers.", author: "ScholarDesk" },
  { text: "The strongest evidence is the study you designed carefully from the start.", author: "ScholarDesk" },
  { text: "Momentum is a habit. Do the smallest next thing, now.", author: "ScholarDesk" },
  { text: "You are closer than you think. Open the manuscript and add one line.", author: "ScholarDesk" },
];

/** Motivational quotes for research students & team members in the portal */
export const TEAM_PORTAL_QUOTES: Quote[] = [
  { text: "Finish what you start today — your supervisor is counting on you.", author: "ScholarDesk" },
  { text: "A task marked done is worth more than ten tasks planned. Update your status now.", author: "ScholarDesk" },
  { text: "Research progress is built one small completed step at a time.", author: "ScholarDesk" },
  { text: "Don't wait for perfect conditions. Start the task in front of you.", author: "Arthur Ashe" },
  { text: "Your contribution to this project matters. Show up and deliver.", author: "ScholarDesk" },
  { text: "Delayed is better than silent — update your status so the team can help.", author: "ScholarDesk" },
  { text: "The difference between a student and a researcher is follow-through.", author: "ScholarDesk" },
  { text: "Every data point collected, every paragraph written — it all adds up.", author: "ScholarDesk" },
  { text: "Discipline today creates publications tomorrow.", author: "ScholarDesk" },
  { text: "Ask for help early. Finish strong together.", author: "ScholarDesk" },
  { text: "Quality work is never an accident. It comes from consistent effort.", author: "John Wooden" },
  { text: "Your supervisor trusts you with this task. Honor that trust.", author: "ScholarDesk" },
  { text: "One focused hour beats a whole day of procrastination.", author: "ScholarDesk" },
  { text: "Mark your task In Progress — momentum begins with honesty.", author: "ScholarDesk" },
  { text: "Great teams communicate through action, not just messages.", author: "ScholarDesk" },
  { text: "Today's effort is tomorrow's evidence.", author: "ScholarDesk" },
  { text: "You are part of research that can improve lives. Take your role seriously.", author: "ScholarDesk" },
  { text: "Small wins daily lead to manuscripts eventually.", author: "ScholarDesk" },
  { text: "Be the team member who finishes — not the one who disappears.", author: "ScholarDesk" },
  { text: "If it's due soon, start now. Future you will be grateful.", author: "ScholarDesk" },
  { text: "Excellence in field work starts with showing up on time.", author: "ScholarDesk" },
  { text: "Read the instructions. Do the work. Update the portal. Simple.", author: "ScholarDesk" },
  { text: "A delayed task with a reason is professional. Silence is not.", author: "ScholarDesk" },
  { text: "You don't need to be perfect — you need to be progressing.", author: "ScholarDesk" },
  { text: "Team science works when everyone does their part. Today is your part.", author: "ScholarDesk" },
  { text: "The best researchers are reliable. Be reliable today.", author: "ScholarDesk" },
  { text: "Your name on this project is your reputation. Make it count.", author: "ScholarDesk" },
  { text: "Finish one task before lunch. You'll feel unstoppable.", author: "ScholarDesk" },
  { text: "Public health research needs people who follow through. That's you.", author: "ScholarDesk" },
  { text: "Log in, check your tasks, update your status — that's professionalism.", author: "ScholarDesk" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "Every finished task moves the whole team forward.", author: "ScholarDesk" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Little by little, one travels far.", author: "J. R. R. Tolkien" },
  { text: "Continuous effort — not strength or intelligence — unlocks our potential.", author: "Winston Churchill" },
  { text: "Do the hard jobs first. The easy jobs will take care of themselves.", author: "Dale Carnegie" },
  { text: "Amateurs sit and wait for inspiration; the rest of us just get up and go to work.", author: "Stephen King" },
  { text: "You don't have to see the whole staircase, just take the first step.", author: "Martin Luther King Jr." },
  { text: "A river cuts through rock not because of its power but its persistence.", author: "Jim Watkins" },
  { text: "Motivation gets you going, but discipline keeps you growing.", author: "John C. Maxwell" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "One update from you saves your supervisor ten questions. Post it.", author: "ScholarDesk" },
  { text: "Stuck? Message Dr. Hari from your portal — asking early is a strength.", author: "ScholarDesk" },
  { text: "Your data entry today is someone's discovery tomorrow.", author: "ScholarDesk" },
  { text: "Consistency compounds. Show up for your task again today.", author: "ScholarDesk" },
  { text: "Curiosity started your research. Discipline will finish it.", author: "ScholarDesk" },
  { text: "Progress loves a checked box. Go check one.", author: "ScholarDesk" },
  { text: "The task you keep avoiding is usually the one that frees you.", author: "ScholarDesk" },
  { text: "Be someone your teammates can rely on. Deliver what you promised.", author: "ScholarDesk" },
  { text: "Great careers are built from small tasks done well, over and over.", author: "ScholarDesk" },
  { text: "You learn the method by doing the method. Begin.", author: "ScholarDesk" },
  { text: "Effort today, evidence tomorrow, impact for years.", author: "ScholarDesk" },
  { text: "Your best work starts the moment you stop scrolling and start doing.", author: "ScholarDesk" },
  { text: "Ten focused minutes now beats an hour of worry later.", author: "ScholarDesk" },
  { text: "Update your portal — it is how the whole team sees you shine.", author: "ScholarDesk" },
];

/** @deprecated day-of-year only; kept for callers that don't pass a seed */
export function getDailyQuote(date = new Date(), seed?: string): Quote {
  return pickQuote(DAILY_QUOTES, date, seed);
}

/** Per-user portal quote. Pass the person's id as `seed` for a unique rotation. */
export function getTeamPortalQuote(date = new Date(), seed?: string): Quote {
  return pickQuote(TEAM_PORTAL_QUOTES, date, seed);
}

export function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function formatWelcomeDate(date = new Date()) {
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export function formatPortalDateTime(date = new Date()) {
  return {
    date: date.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Kolkata",
    }),
    time: date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }),
  };
}

export function getTeamGreeting(name: string, date = new Date()) {
  const hour = date.getHours();
  const first = name.trim().split(/\s+/)[0] || name;
  if (hour < 12) return `Good Morning, ${first}`;
  if (hour < 17) return `Good Afternoon, ${first}`;
  return `Good Evening, ${first}`;
}
