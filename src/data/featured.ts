// Featured chat partners (from the original BetaShine site)
export type Profile = {
  name: string;
  img: string;
  money: number;
  duration: number;
  emoji: string;
  rating: string;
  wants: string;
};

export const FEATURED: Record<string, Omit<Profile, "name">> = {
  "Isabella": {
    "img": "https://i.pravatar.cc/150?img=44",
    "money": 32000,
    "duration": 47,
    "emoji": "🎵",
    "rating": "4.8",
    "wants": "Practice Conversation & Music"
  },
  "Thomas": {
    "img": "https://i.pravatar.cc/150?img=51",
    "money": 28000,
    "duration": 36,
    "emoji": "💼",
    "rating": "4.9",
    "wants": "Business Swahili & Culture"
  },
  "Grace": {
    "img": "https://i.pravatar.cc/150?img=45",
    "money": 25000,
    "duration": 28,
    "emoji": "🎨",
    "rating": "5.0",
    "wants": "Teach Swahili Language (Hobbies)"
  },
  "Lucas": {
    "img": "https://i.pravatar.cc/150?img=52",
    "money": 31000,
    "duration": 44,
    "emoji": "⚽",
    "rating": "4.8",
    "wants": "Sports & Football Chat"
  },
  "Freya": {
    "img": "https://i.pravatar.cc/150?img=47",
    "money": 27000,
    "duration": 41,
    "emoji": "✈️",
    "rating": "4.9",
    "wants": "Learn Culture & Travel Tips"
  },
  "Adrian": {
    "img": "https://i.pravatar.cc/150?img=53",
    "money": 29000,
    "duration": 39,
    "emoji": "🎸",
    "rating": "4.7",
    "wants": "Music & Musical Instruments"
  },
  "Marcus": {
    "img": "https://i.pravatar.cc/150?img=54",
    "money": 23000,
    "duration": 25,
    "emoji": "🏔️",
    "rating": "4.9",
    "wants": "Hiking & Mountain Climbing"
  },
  "Elena": {
    "img": "https://i.pravatar.cc/150?img=48",
    "money": 26000,
    "duration": 31,
    "emoji": "📚",
    "rating": "5.0",
    "wants": "Swahili Pronunciation Basics"
  },
  "Oscar": {
    "img": "https://i.pravatar.cc/150?img=55",
    "money": 27500,
    "duration": 34,
    "emoji": "💻",
    "rating": "4.6",
    "wants": "Tech & Computing Terms"
  },
  "Matilda": {
    "img": "https://i.pravatar.cc/150?img=49",
    "money": 31500,
    "duration": 49,
    "emoji": "🍕",
    "rating": "4.9",
    "wants": "African Food Recipes Discussion"
  },
  "Felix": {
    "img": "https://i.pravatar.cc/150?img=56",
    "money": 27500,
    "duration": 33,
    "emoji": "🚗",
    "rating": "4.7",
    "wants": "Cars & Transport Conversation"
  },
  "Nora": {
    "img": "https://i.pravatar.cc/150?img=20",
    "money": 25500,
    "duration": 27,
    "emoji": "☕",
    "rating": "4.7",
    "wants": "Friendly Daily Chat"
  },
  "Julian": {
    "img": "https://i.pravatar.cc/150?img=57",
    "money": 30000,
    "duration": 46,
    "emoji": "📸",
    "rating": "5.0",
    "wants": "Photography & Wildlife"
  },
  "Rosalie": {
    "img": "https://i.pravatar.cc/150?img=21",
    "money": 32000,
    "duration": 51,
    "emoji": "🌐",
    "rating": "4.9",
    "wants": "Languages & World Cultures"
  },
  "Harriet": {
    "img": "https://i.pravatar.cc/150?img=22",
    "money": 23500,
    "duration": 24,
    "emoji": "🎨",
    "rating": "4.6",
    "wants": "Art & Colors in Swahili"
  },
  "Dominic": {
    "img": "https://i.pravatar.cc/150?img=58",
    "money": 28000,
    "duration": 37,
    "emoji": "🎮",
    "rating": "4.8",
    "wants": "Gaming & Online Fun"
  },
  "Bianca": {
    "img": "https://i.pravatar.cc/150?img=23",
    "money": 30000,
    "duration": 43,
    "emoji": "👗",
    "rating": "4.9",
    "wants": "Fashion & Cultural Clothes"
  },
  "Sebastian": {
    "img": "https://i.pravatar.cc/150?img=59",
    "money": 30500,
    "duration": 48,
    "emoji": "🎥",
    "rating": "4.9",
    "wants": "Documentaries & Nature Films"
  },
  "Talia": {
    "img": "https://i.pravatar.cc/150?img=24",
    "money": 24500,
    "duration": 26,
    "emoji": "🐱",
    "rating": "4.8",
    "wants": "Pets & Animal Names"
  },
  "Gregory": {
    "img": "https://i.pravatar.cc/150?img=60",
    "money": 29000,
    "duration": 42,
    "emoji": "⛰️",
    "rating": "4.8",
    "wants": "Geology & Earth Science"
  },
  "Antonia": {
    "img": "https://i.pravatar.cc/150?img=25",
    "money": 33000,
    "duration": 52,
    "emoji": "🎬",
    "rating": "5.0",
    "wants": "Movies & Entertainment"
  },
  "Caleb": {
    "img": "https://i.pravatar.cc/150?img=61",
    "money": 26500,
    "duration": 29,
    "emoji": "🏄",
    "rating": "4.7",
    "wants": "Surfing & Water Adventure"
  },
  "Priya": {
    "img": "https://i.pravatar.cc/150?img=26",
    "money": 28500,
    "duration": 38,
    "emoji": "🌺",
    "rating": "4.9",
    "wants": "Gardens, Flowers & Nature Words"
  },
  "Mateo": {
    "img": "https://i.pravatar.cc/150?img=62",
    "money": 27500,
    "duration": 35,
    "emoji": "🥁",
    "rating": "4.8",
    "wants": "Drums & Traditional Rhythms"
  },
  "Delphine": {
    "img": "https://i.pravatar.cc/150?img=27",
    "money": 26000,
    "duration": 30,
    "emoji": "🧵",
    "rating": "4.7",
    "wants": "Fabrics, Kitenge & Handcraft"
  },
  "Rowan": {
    "img": "https://i.pravatar.cc/150?img=63",
    "money": 31000,
    "duration": 45,
    "emoji": "🚴",
    "rating": "4.9",
    "wants": "Cycling & Outdoor Life"
  },
  "Yasmin": {
    "img": "https://i.pravatar.cc/150?img=28",
    "money": 27000,
    "duration": 32,
    "emoji": "🕌",
    "rating": "4.8",
    "wants": "Coastal Culture & Zanzibar Talk"
  }
};
