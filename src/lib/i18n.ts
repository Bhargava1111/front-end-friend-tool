import { LANGUAGES } from "@/lib/content";

export type LangCode = (typeof LANGUAGES)[number]["code"];

const LANG_CODES = new Set(LANGUAGES.map((l) => l.code));

export function normalizeLangCode(code: string | null | undefined): LangCode {
  if (code && LANG_CODES.has(code)) return code as LangCode;
  return "en";
}

const messages: Record<LangCode, Record<string, string>> = {
  en: {
    "nav.home": "Home",
    "nav.categories": "Categories",
    "nav.cart": "Cart",
    "nav.orders": "Orders",
    "nav.profile": "Profile",
    "language.title": "Language",
    "language.subtitle": "Choose how the app reads",
    "language.note": "Product names stay in their original language.",
    "language.saved": "Language set to {label}",
  },
  ta: {
    "nav.home": "முகப்பு",
    "nav.categories": "பிரிவுகள்",
    "nav.cart": "கார்ட்",
    "nav.orders": "ஆர்டர்கள்",
    "nav.profile": "சுயவிவரம்",
    "language.title": "மொழி",
    "language.subtitle": "பயன்பாட்டை எந்த மொழியில் காண வேண்டும்",
    "language.note": "பொருள் பெயர்கள் அசல மொழியிலேயே இருக்கும்.",
    "language.saved": "{label} மொழி தேர்ந்தெடுக்கப்பட்டது",
  },
  hi: {
    "nav.home": "होम",
    "nav.categories": "श्रेणियाँ",
    "nav.cart": "कार्ट",
    "nav.orders": "ऑर्डर",
    "nav.profile": "प्रोफ़ाइल",
    "language.title": "भाषा",
    "language.subtitle": "ऐप किस भाषा में दिखे",
    "language.note": "उत्पाद के नाम मूल भाषा में ही रहेंगे।",
    "language.saved": "भाषा {label} पर सेट की गई",
  },
  te: {
    "nav.home": "హోమ్",
    "nav.categories": "వర్గాలు",
    "nav.cart": "కార్ట్",
    "nav.orders": "ఆర్డర్లు",
    "nav.profile": "ప్రొఫైల్",
    "language.title": "భాష",
    "language.subtitle": "యాప్ ఏ భాషలో కనిపించాలి",
    "language.note": "ఉత్పత్తి పేర్లు అసలు భాషలోనే ఉంటాయి.",
    "language.saved": "భాష {label}కి సెట్ చేయబడింది",
  },
  kn: {
    "nav.home": "ಮುಖಪುಟ",
    "nav.categories": "ವಿಭಾಗಗಳು",
    "nav.cart": "ಕಾರ್ಟ್",
    "nav.orders": "ಆರ್ಡರ್‌ಗಳು",
    "nav.profile": "ಪ್ರೊಫೈಲ್",
    "language.title": "ಭಾಷೆ",
    "language.subtitle": "ಅಪ್ಲಿಕೇಶನ್ ಯಾವ ಭಾಷೆಯಲ್ಲಿ ಕಾಣಿಸಿಕೊಳ್ಳಬೇಕು",
    "language.note": "ಉತ್ಪನ್ನ ಹೆಸರುಗಳು ಮೂಲ ಭಾಷೆಯಲ್ಲಿಯೇ ಇರುತ್ತವೆ.",
    "language.saved": "ಭಾಷೆಯನ್ನು {label} ಗೆ ಹೊಂದಿಸಲಾಗಿದೆ",
  },
  ml: {
    "nav.home": "ഹോം",
    "nav.categories": "വിഭാഗങ്ങൾ",
    "nav.cart": "കാർട്ട്",
    "nav.orders": "ഓർഡറുകൾ",
    "nav.profile": "പ്രൊഫൈൽ",
    "language.title": "ഭാഷ",
    "language.subtitle": "ആപ്പ് ഏത് ഭാഷയിൽ കാണണം",
    "language.note": "ഉൽപ്പന്ന നാമങ്ങൾ യഥാർത്ഥ ഭാഷയിലായിരിക്കും.",
    "language.saved": "ഭാഷ {label} ആയി സജ്ജമാക്കി",
  },
};

export function translate(code: LangCode, key: string, vars?: Record<string, string>): string {
  const table = messages[code] ?? messages.en;
  let text = table[key] ?? messages.en[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, value);
    }
  }
  return text;
}

export function applyDocumentLanguage(code: LangCode) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = code;
}
