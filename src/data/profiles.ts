import { FEATURED, type Profile } from "./featured";

export type { Profile };

const NAMES = [
  "Isabella", "Thomas", "Grace", "Lucas", "Freya", "Adrian", "Marcus", "Elena",
  "Oscar", "Matilda", "Felix", "Nora", "Julian", "Rosalie", "Harriet", "Dominic",
  "Bianca", "Sebastian", "Talia", "Gregory", "Antonia", "Caleb", "Priya", "Mateo",
  "Delphine", "Rowan", "Yasmin", "Sophia", "Liam", "Emma", "Noah", "Olivia",
  "William", "Ava", "James", "Mia", "Benjamin", "Charlotte", "Elijah", "Amelia",
  "Henry", "Evelyn", "Alexander", "Abigail", "Daniel", "Emily", "Matthew", "Ella",
  "Jackson", "Scarlett", "Jack", "Chloe", "Owen", "Camila", "Levi", "Victoria",
  "David", "Aria", "Joseph", "Luna", "Charles", "Layla", "Samuel", "Penelope",
  "Lillian", "Nathan", "Zoe", "Adam", "Naomi", "Robert", "Aubrey", "Andrew",
  "Hannah", "Carter", "Eleanor", "Christopher", "Stella", "Joshua", "Bella",
  "Hazel", "Anthony", "Aurora", "Leo", "Kevin", "Riley", "Eric", "Savannah",
  "Dylan", "Willow", "Brian", "Everly", "Finn", "Paisley", "George", "Skylar",
  "Mason", "Claire", "Aiden", "Brielle", "Iris", "Wyatt", "Lucy", "Anna",
  "Caroline", "Isaac", "Genesis", "Gabriel", "Serenity", "Maya", "Hunter",
  "Piper", "Eli", "Sienna", "Asher", "Ruby", "Eva", "Alice", "Leonardo",
  "Madeline", "Theo", "Clara", "Nolan", "Sadie", "Aaliyah", "Easton", "Kinsley",
  "Allison", "Xavier", "Melody", "Lydia", "Tristan", "Jade",
];

const EMOJIS = [
  "🎵", "💼", "🎨", "⚽", "✈️", "🎸", "🏔️", "📚", "💻", "🍕", "🚗", "☕", "📸",
  "🌐", "🎮", "👗", "🎥", "🐱", "⛰️", "🎬", "🏄", "🌺", "🥁", "🧵", "🚴", "🕌",
  "🍷", "🎭", "🏝️", "📷",
];

const WANTS = [
  "Practice Conversation & Music", "Business Swahili & Culture",
  "Teach Swahili Language (Hobbies)", "Sports & Football Chat",
  "Learn Culture & Travel Tips", "Music & Musical Instruments",
  "Hiking & Mountain Climbing", "Swahili Pronunciation Basics",
  "Tech & Computing Terms", "African Food Recipes Discussion",
  "Cars & Transport Conversation", "Friendly Daily Chat",
  "Photography & Wildlife", "Languages & World Cultures",
  "Art & Colors in Swahili", "Gaming & Online Fun",
  "Fashion & Cultural Clothes", "Documentaries & Nature Films",
  "Pets & Animal Names", "Geology & Earth Science",
  "Movies & Entertainment", "Surfing & Water Adventure",
  "Gardens, Flowers & Nature Words", "Drums & Traditional Rhythms",
  "Fabrics, Kitenge & Handcraft", "Cycling & Outdoor Life",
  "Coastal Culture & Zanzibar Talk", "Wine & Cooking Talk",
  "Theatre & Drama Chat", "Island Travel & Beach Stories",
];

/** Deterministic pseudo-random generator so server and browser agree. */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    return h / 4294967296;
  };
}

export function getProfile(name: string): Profile {
  const featured = FEATURED[name];
  if (featured) return { name, ...featured };

  const rand = seeded(name);
  return {
    name,
    img: `https://i.pravatar.cc/150?u=${encodeURIComponent(name)}`,
    money: 21000 + Math.floor(rand() * 13) * 1000,
    duration: 24 + Math.floor(rand() * 29),
    emoji: EMOJIS[Math.floor(rand() * EMOJIS.length)]!,
    rating: (4.5 + rand() * 0.5).toFixed(1),
    wants: WANTS[Math.floor(rand() * WANTS.length)]!,
  };
}

/** A stable feed of chat partners, identical on server and browser. */
export function buildFeed(count = 60): Profile[] {
  const seen = new Set<string>();
  const feed: Profile[] = [];
  const rand = seeded("betashine-feed");
  let guard = 0;
  while (feed.length < count && guard < count * 30) {
    guard += 1;
    const name = NAMES[Math.floor(rand() * NAMES.length)]!;
    if (seen.has(name)) continue;
    seen.add(name);
    feed.push(getProfile(name));
  }
  return feed;
}

export function todayLabel(): string {
  const months = [
    "January", "February", "March", "April", "May", "June", "July", "August",
    "September", "October", "November", "December",
  ];
  const now = new Date();
  return `${months[now.getMonth()]}, ${String(now.getDate()).padStart(2, "0")}`;
}
