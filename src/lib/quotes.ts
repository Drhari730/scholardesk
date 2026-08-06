/** Motivational quotes for academics — one per day of year (cycles) */
export const DAILY_QUOTES = [
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
];

/** Motivational quotes for research students & team members in the portal */
export const TEAM_PORTAL_QUOTES = [
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
];

export function getDailyQuote(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
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

export function getTeamPortalQuote(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return TEAM_PORTAL_QUOTES[dayOfYear % TEAM_PORTAL_QUOTES.length];
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
