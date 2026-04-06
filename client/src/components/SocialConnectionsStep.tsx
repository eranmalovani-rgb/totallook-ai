/**
 * SocialConnectionsStep — Onboarding screen showing social platform connections.
 * Instagram is active (leads to influencer selection), TikTok and Pinterest are "coming soon".
 */

import { useLanguage } from "@/i18n";

interface SocialConnectionsStepProps {
  onInstagramClick: () => void;
}

// SVG icons for each platform (official brand colors)
function InstagramIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#ig-grad)" />
      <rect x="10" y="10" width="28" height="28" rx="8" stroke="white" strokeWidth="2.5" fill="none" />
      <circle cx="24" cy="24" r="7" stroke="white" strokeWidth="2.5" fill="none" />
      <circle cx="33" cy="15" r="2" fill="white" />
    </svg>
  );
}

function TikTokIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#000000" />
      <path d="M33.5 16.5C32.1 15.3 31.2 13.5 31 11.5H27V29.5C27 31.7 25.2 33.5 23 33.5C20.8 33.5 19 31.7 19 29.5C19 27.3 20.8 25.5 23 25.5C23.5 25.5 24 25.6 24.4 25.8V22C24 21.9 23.5 21.9 23 21.9C18.6 21.9 15 25.3 15 29.5C15 33.7 18.6 37 23 37C27.4 37 31 33.7 31 29.5V20.5C32.6 21.7 34.5 22.4 36.5 22.5V18.5C35.3 18.4 34.2 17.6 33.5 16.5Z" fill="white" />
      <path d="M33.5 16.5C32.1 15.3 31.2 13.5 31 11.5H27V29.5C27 31.7 25.2 33.5 23 33.5C20.8 33.5 19 31.7 19 29.5C19 27.3 20.8 25.5 23 25.5C23.5 25.5 24 25.6 24.4 25.8V22C24 21.9 23.5 21.9 23 21.9C18.6 21.9 15 25.3 15 29.5C15 33.7 18.6 37 23 37C27.4 37 31 33.7 31 29.5V20.5C32.6 21.7 34.5 22.4 36.5 22.5V18.5C35.3 18.4 34.2 17.6 33.5 16.5Z" fill="#25F4EE" opacity="0.5" transform="translate(-1, -1)" />
      <path d="M33.5 16.5C32.1 15.3 31.2 13.5 31 11.5H27V29.5C27 31.7 25.2 33.5 23 33.5C20.8 33.5 19 31.7 19 29.5C19 27.3 20.8 25.5 23 25.5C23.5 25.5 24 25.6 24.4 25.8V22C24 21.9 23.5 21.9 23 21.9C18.6 21.9 15 25.3 15 29.5C15 33.7 18.6 37 23 37C27.4 37 31 33.7 31 29.5V20.5C32.6 21.7 34.5 22.4 36.5 22.5V18.5C35.3 18.4 34.2 17.6 33.5 16.5Z" fill="#FE2C55" opacity="0.5" transform="translate(1, 1)" />
    </svg>
  );
}

function PinterestIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#E60023" />
      <path d="M24 12C17.4 12 12 17.4 12 24C12 29 15 33.3 19.2 35.1C19.1 34.1 19 32.5 19.2 31.4C19.4 30.4 20.5 25.5 20.5 25.5C20.5 25.5 20.2 24.7 20.2 23.6C20.2 21.8 21.2 20.5 22.5 20.5C23.6 20.5 24.1 21.3 24.1 22.3C24.1 23.4 23.4 25 23 26.5C22.7 27.8 23.7 28.8 25 28.8C27.3 28.8 29 26.5 29 23.2C29 20.3 27 18.1 24 18.1C20.5 18.1 18.4 20.7 18.4 23.5C18.4 24.5 18.8 25.6 19.3 26.2C19.4 26.3 19.4 26.5 19.3 26.6C19.2 27 19 27.8 19 28C18.9 28.2 18.8 28.3 18.6 28.2C17 27.5 16 25.3 16 23.4C16 19.5 18.9 15.9 24.3 15.9C28.6 15.9 32 19 32 23.1C32 27.3 29.4 30.7 25.8 30.7C24.5 30.7 23.2 30 22.8 29.2C22.8 29.2 22.2 31.5 22 32.3C21.7 33.4 20.9 34.8 20.4 35.6C21.5 35.9 22.7 36 24 36C30.6 36 36 30.6 36 24C36 17.4 30.6 12 24 12Z" fill="white" />
    </svg>
  );
}

export default function SocialConnectionsStep({ onInstagramClick }: SocialConnectionsStepProps) {
  const { lang } = useLanguage();

  const platforms = [
    {
      id: "instagram",
      name: "Instagram",
      icon: <InstagramIcon size={56} />,
      active: true,
      description: lang === "he"
        ? "בחר משפיענים שמעניינים אותך"
        : "Choose influencers that inspire you",
      buttonText: lang === "he" ? "בחר משפיענים" : "Choose Influencers",
      onClick: onInstagramClick,
    },
    {
      id: "tiktok",
      name: "TikTok",
      icon: <TikTokIcon size={56} />,
      active: false,
      description: lang === "he"
        ? "ניתוח סגנון מסרטוני אופנה שאהבת"
        : "Style analysis from fashion videos you liked",
      buttonText: lang === "he" ? "בקרוב" : "Coming Soon",
      onClick: undefined,
    },
    {
      id: "pinterest",
      name: "Pinterest",
      icon: <PinterestIcon size={56} />,
      active: false,
      description: lang === "he"
        ? "ניתוח בורדים והשראות אופנה שלך"
        : "Analyze your fashion boards and pins",
      buttonText: lang === "he" ? "בקרוב" : "Coming Soon",
      onClick: undefined,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <h2 className="text-2xl md:text-3xl font-bold text-center">
        {lang === "he" ? "מאיפה ההשראה שלך?" : "Where's your inspiration?"}
      </h2>
      <p className="text-muted-foreground text-center text-sm">
        {lang === "he"
          ? "חבר את הרשתות החברתיות שלך כדי שנלמד את הסגנון שלך"
          : "Connect your social accounts so we can learn your style"}
      </p>

      <div className="space-y-3">
        {platforms.map((platform) => (
          <button
            key={platform.id}
            onClick={platform.active ? platform.onClick : undefined}
            disabled={!platform.active}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 ${
              platform.active
                ? "bg-card border-white/10 hover:border-primary/40 hover:bg-card/80 cursor-pointer group"
                : "bg-card/50 border-white/5 opacity-60 cursor-not-allowed"
            }`}
          >
            {/* Platform icon */}
            <div className={`flex-shrink-0 ${platform.active ? "group-hover:scale-105 transition-transform" : ""}`}>
              {platform.icon}
            </div>

            {/* Text content */}
            <div className="flex-1 text-start min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{platform.name}</span>
                {!platform.active && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/70 font-medium">
                    {platform.buttonText}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{platform.description}</p>
            </div>

            {/* Arrow / status */}
            {platform.active && (
              <div className="flex-shrink-0 text-primary/60 group-hover:text-primary transition-colors">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground/50 text-center">
        {lang === "he"
          ? "TikTok ו-Pinterest יהיו זמינים בקרוב — הרשמו לעדכונים"
          : "TikTok and Pinterest will be available soon — stay tuned"}
      </p>
    </div>
  );
}
