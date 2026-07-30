export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  readMinutes: number;
  tag: string;
  body: string[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "daily-pooja-checklist",
    title: "The complete daily pooja checklist for a South Indian home",
    excerpt:
      "From cotton wicks to the right camphor, here is everything you need for a calm, complete morning ritual.",
    author: "Lakshmi Narayanan",
    date: "2026-06-12",
    readMinutes: 5,
    tag: "Pooja",
    body: [
      "A daily pooja does not need to be elaborate to feel complete. What matters is that everything you need is within reach before you light the lamp.",
      "Start with the lamp: a brass deepam, cotton wicks and cold-pressed sesame or ghee oil. Keep a small container of each so you never break the ritual hunting for supplies.",
      "Next, the offerings — kumkum, turmeric, akshata rice, flowers and a fruit. A tray with fixed compartments keeps the arrangement identical each morning, which is the point of ritual.",
      "Finally, fragrance. Sambrani cups in the evening and agarbatti in the morning give the house two distinct moods. Store both away from the kitchen so they keep their scent.",
    ],
  },
  {
    slug: "choosing-cooking-oil",
    title: "Choosing the right cooking oil for everyday Indian cooking",
    excerpt:
      "Groundnut, sesame, coconut or sunflower — a plain-language guide to smoke points and flavour.",
    author: "Ananya Rao",
    date: "2026-05-28",
    readMinutes: 6,
    tag: "Kitchen",
    body: [
      "Oil is the one grocery decision you make several times a day without thinking about it. A little structure helps.",
      "For deep frying, choose a high smoke point: groundnut or rice bran. For tempering and everyday sabzi, sesame carries flavour beautifully. Coconut oil belongs in Kerala-style dishes and very little else.",
      "Buy small bottles more often rather than a large tin once a year. Oil oxidises, and the difference in taste after three months open is obvious.",
    ],
  },
  {
    slug: "storing-rice-and-dals",
    title: "How to store rice and dals so they last the whole year",
    excerpt: "Simple, cheap habits that keep weevils out and grains fresh in Indian humidity.",
    author: "Ravi Kumar",
    date: "2026-04-19",
    readMinutes: 4,
    tag: "Staples",
    body: [
      "Buying staples in bulk only saves money if the grain survives. Humidity, not time, is the enemy.",
      "Sun the grain for a few hours before storing, cool it completely, then move it into airtight steel containers. A few dried neem leaves or two or three cloves keep insects away without chemicals.",
      "Keep a small working jar in the kitchen and refill it weekly. Opening the big container daily is what lets moisture in.",
    ],
  },
];

export type Testimonial = {
  name: string;
  location: string;
  rating: number;
  quote: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Meera Iyer",
    location: "T. Nagar, Chennai",
    rating: 5,
    quote:
      "The pooja essentials arrive properly packed and the ghee is genuinely fresh. It has replaced my weekly market trip.",
  },
  {
    name: "Suresh Babu",
    location: "Adyar, Chennai",
    rating: 5,
    quote: "Ordered at 8 in the morning, delivered before 10. The order tracking is honest, which is rare.",
  },
  {
    name: "Kavitha R.",
    location: "Velachery, Chennai",
    rating: 4,
    quote: "Prices match the shop and the app is far easier than calling. Wish there were more organic options.",
  },
  {
    name: "Arun Prasad",
    location: "Anna Nagar, Chennai",
    rating: 5,
    quote: "Cash on delivery without any fuss, and the delivery team actually calls before arriving.",
  },
];

export type FaqItem = { question: string; answer: string; topic: string };

export const FAQS: FaqItem[] = [
  {
    topic: "Delivery",
    question: "What areas do you deliver to?",
    answer:
      "We deliver within a 5 km radius of each of our Chennai outlets. Enter your pincode on the home screen or open the store locator to check whether your address is covered.",
  },
  {
    topic: "Delivery",
    question: "How long does delivery take?",
    answer:
      "Express orders reach you within 90 minutes. You can also choose a scheduled slot for today or tomorrow at checkout.",
  },
  {
    topic: "Delivery",
    question: "Is there a delivery charge?",
    answer:
      "Delivery is free on orders above ₹499. Below that a flat ₹40 fee applies, which the FREESHIP coupon removes on orders above ₹249.",
  },
  {
    topic: "Payments",
    question: "Which payment methods can I use?",
    answer:
      "Cash on delivery is live today. UPI, cards, net banking and store wallet are shown at checkout and will be enabled shortly.",
  },
  {
    topic: "Orders",
    question: "Can I cancel an order?",
    answer:
      "Yes — any order still marked pending can be cancelled from the order detail screen. Once it is confirmed and packed, contact support instead.",
  },
  {
    topic: "Orders",
    question: "How do returns work?",
    answer:
      "Raise a return request from the order detail screen within 24 hours of delivery. Perishables must be reported the same day with a photo.",
  },
  {
    topic: "Account",
    question: "Do I need an account to order?",
    answer:
      "Yes, an account keeps your cart, addresses and order history in sync. You can sign in with email and password, a one-time code, or Google.",
  },
  {
    topic: "Account",
    question: "How do I change my delivery address?",
    answer: "Open Profile → Saved Addresses. You can add multiple addresses and mark one as default.",
  },
];

export const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", label: "Malayalam", native: "മലയാളം" },
];

export const WALLET_DEMO = {
  balance: 640,
  transactions: [
    { id: "w1", label: "Cashback · Order MNX-1042", amount: 45, date: "2026-07-22" },
    { id: "w2", label: "Refund · Cancelled order", amount: 320, date: "2026-07-14" },
    { id: "w3", label: "Referral bonus · Ravi joined", amount: 100, date: "2026-07-02" },
    { id: "w4", label: "Used on order MNX-1021", amount: -125, date: "2026-06-28" },
    { id: "w5", label: "Welcome credit", amount: 300, date: "2026-06-01" },
  ],
};

export const REWARDS_DEMO = {
  points: 1840,
  tier: "Gold",
  nextTier: "Platinum",
  pointsToNextTier: 660,
  history: [
    { id: "r1", label: "Order MNX-1042", points: 82, date: "2026-07-22" },
    { id: "r2", label: "Wrote a product review", points: 50, date: "2026-07-18" },
    { id: "r3", label: "Order MNX-1033", points: 128, date: "2026-07-09" },
    { id: "r4", label: "Redeemed ₹100 voucher", points: -500, date: "2026-06-30" },
  ],
  rewards: [
    { id: "v1", label: "₹100 off voucher", cost: 500 },
    { id: "v2", label: "Free delivery for a month", cost: 1200 },
    { id: "v3", label: "₹300 off voucher", cost: 1500 },
  ],
};

export const REFERRAL_DEMO = {
  code: "LAKSHMI250",
  friendReward: 150,
  yourReward: 150,
  invited: 4,
  joined: 2,
  earned: 300,
};

export const HELP_TOPICS = [
  { title: "Track or change an order", detail: "Order status, edits, cancellations and delays." },
  { title: "Delivery and slots", detail: "Coverage areas, express delivery and scheduled windows." },
  { title: "Payments and refunds", detail: "Payment options, failed payments and refund timelines." },
  { title: "Returns and quality", detail: "Damaged items, missing products and perishables." },
  { title: "Account and security", detail: "Sign-in problems, OTP codes and password resets." },
];
