/**
 * StoreLogo — renders store brand logos as styled text with brand-accurate colors.
 * Uses CSS-only approach: no external images needed.
 * Each store gets its brand color and font styling for instant recognition.
 */

interface StoreLogoProps {
  name: string;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
}

interface BrandStyle {
  /** Display text (sometimes differs from store name) */
  display?: string;
  /** Brand color */
  color: string;
  /** Background color (if brand uses inverted logo) */
  bg?: string;
  /** Font weight */
  weight?: number;
  /** Letter spacing */
  spacing?: string;
  /** Text transform */
  transform?: "uppercase" | "lowercase" | "none";
  /** Font style */
  italic?: boolean;
}

export const BRAND_STYLES: Record<string, BrandStyle> = {
  // === Budget ===
  "Shein": { color: "#000000", weight: 700, transform: "uppercase", spacing: "0.15em" },
  "H&M": { color: "#E50010", weight: 700, spacing: "0.05em" },
  "Primark": { color: "#0054A6", weight: 700, transform: "lowercase" },
  "Pull & Bear": { color: "#000000", weight: 400, transform: "uppercase", spacing: "0.1em" },
  "Bershka": { color: "#000000", weight: 700, transform: "uppercase", spacing: "0.08em" },
  "Forever 21": { color: "#F5D300", bg: "#000000", weight: 700 },
  // === Mid-range ===
  "Zara": { color: "#000000", weight: 400, spacing: "0.25em", transform: "uppercase" },
  "Mango": { color: "#000000", weight: 700, transform: "uppercase", spacing: "0.12em" },
  "ASOS": { color: "#000000", weight: 800, transform: "uppercase", spacing: "0.05em" },
  "Massimo Dutti": { color: "#1A1A1A", weight: 400, transform: "uppercase", spacing: "0.15em" },
  "COS": { color: "#000000", weight: 400, spacing: "0.3em", transform: "uppercase" },
  "Uniqlo": { color: "#FFFFFF", bg: "#FF0000", weight: 700, transform: "uppercase" },
  "Urban Outfitters": { display: "UO", color: "#000000", weight: 700, spacing: "0.1em" },
  // === Premium ===
  "AllSaints": { color: "#000000", weight: 300, transform: "uppercase", spacing: "0.2em" },
  "Reiss": { color: "#000000", weight: 300, transform: "uppercase", spacing: "0.25em" },
  "Ted Baker": { color: "#000000", weight: 400, transform: "uppercase", spacing: "0.1em" },
  "& Other Stories": { color: "#000000", weight: 400, italic: true },
  "Arket": { color: "#000000", weight: 400, transform: "uppercase", spacing: "0.2em" },
  "Sandro": { color: "#000000", weight: 700, transform: "uppercase", spacing: "0.15em" },
  "Maje": { color: "#000000", weight: 700, transform: "uppercase", spacing: "0.15em" },
  // === Luxury ===
  "NET-A-PORTER": { color: "#000000", weight: 400, transform: "uppercase", spacing: "0.1em" },
  "Farfetch": { color: "#000000", weight: 700, transform: "lowercase" },
  "SSENSE": { color: "#000000", weight: 700, transform: "uppercase", spacing: "0.15em" },
  "Mr Porter": { color: "#000000", weight: 400, transform: "uppercase", spacing: "0.15em" },
  "MatchesFashion": { display: "MATCHES", color: "#000000", weight: 400, transform: "uppercase", spacing: "0.15em" },
  "Nordstrom": { color: "#000000", weight: 400, transform: "uppercase", spacing: "0.1em" },
  // === Israeli stores ===
  "Terminal X": { color: "#000000", weight: 800, transform: "uppercase", spacing: "0.05em" },
  "Factory 54": { color: "#000000", weight: 300, transform: "uppercase", spacing: "0.15em" },
  "Castro": { color: "#000000", weight: 700, transform: "uppercase", spacing: "0.1em" },
  "Fox": { color: "#E4002B", weight: 800, transform: "uppercase" },
  "Golf": { color: "#000000", weight: 700, transform: "uppercase", spacing: "0.05em" },
  "Renuar": { color: "#000000", weight: 400, transform: "uppercase", spacing: "0.1em" },
  "Honigman": { color: "#000000", weight: 400, transform: "uppercase", spacing: "0.08em" },
  "Adika": { color: "#000000", weight: 700, transform: "lowercase" },
  "Comme il Faut": { color: "#C8A96E", weight: 300, italic: true },
  "Sebo": { color: "#000000", weight: 700, transform: "uppercase" },
  "Mania Jeans": { color: "#1A3C6E", weight: 700, transform: "uppercase" },
  "Kravitz": { color: "#000000", weight: 400, transform: "uppercase", spacing: "0.15em" },
  "Sack's": { color: "#000000", weight: 300, transform: "uppercase", spacing: "0.2em" },
  "Sabina Musayev": { color: "#000000", weight: 300, transform: "uppercase", spacing: "0.12em" },
  "Ronen Chen": { color: "#000000", weight: 300, transform: "uppercase", spacing: "0.15em" },
  "Oysho": { color: "#000000", weight: 400, transform: "lowercase", spacing: "0.1em" },
  // === German stores ===
  "Zalando": { color: "#FF6900", weight: 700, transform: "lowercase" },
  "About You": { color: "#000000", weight: 700, transform: "uppercase", spacing: "0.05em" },
  "Peek & Cloppenburg": { display: "P&C", color: "#000000", weight: 700 },
  "Breuninger": { color: "#000000", weight: 400, transform: "uppercase", spacing: "0.1em" },
  "Mytheresa": { color: "#000000", weight: 400, transform: "lowercase", spacing: "0.05em" },
  // === French stores ===
  "Galeries Lafayette": { display: "GL", color: "#000000", weight: 700, spacing: "0.1em" },
  "La Redoute": { color: "#E4002B", weight: 700, transform: "lowercase" },
  "Zadig & Voltaire": { display: "Z&V", color: "#000000", weight: 700, spacing: "0.1em" },
  "Printemps": { color: "#000000", weight: 400, transform: "uppercase", spacing: "0.1em" },
  // === UK stores ===
  "Selfridges": { color: "#F5D300", bg: "#000000", weight: 700, transform: "uppercase", spacing: "0.05em" },
  "John Lewis": { color: "#000000", weight: 400, transform: "uppercase", spacing: "0.1em" },
  "Harrods": { color: "#8B7355", weight: 400, transform: "uppercase", spacing: "0.15em" },
  // === US stores ===
  "Bloomingdale's": { display: "B'DALES", color: "#000000", weight: 400, italic: true },
  "Saks Fifth Avenue": { display: "SAKS", color: "#000000", weight: 400, transform: "uppercase", spacing: "0.2em" },
  "Neiman Marcus": { color: "#000000", weight: 400, transform: "uppercase", spacing: "0.1em" },
  "Anthropologie": { color: "#000000", weight: 400, transform: "uppercase", spacing: "0.08em" },
  "J.Crew": { color: "#000000", weight: 700 },
  "Nike": { color: "#000000", weight: 700, transform: "uppercase" },
  "Adidas": { color: "#000000", weight: 700, transform: "lowercase" },
  // === Additional brands ===
  "Amazon": { color: "#FF9900", weight: 700 },
  "END.": { display: "END.", color: "#000000", weight: 700, transform: "uppercase" },
  "Etsy": { color: "#F16521", weight: 700, transform: "lowercase" },
  "Levi's": { color: "#C41230", weight: 700 },
  "Tissot": { color: "#000000", weight: 400, transform: "uppercase", spacing: "0.15em" },
  "Veja": { color: "#000000", weight: 700, transform: "uppercase", spacing: "0.1em" },
  "GQ": { color: "#E31837", weight: 700, transform: "uppercase" },
  "Jomashop": { color: "#003366", weight: 700 },
  "Stone Island": { color: "#000000", weight: 400, transform: "uppercase", spacing: "0.1em" },
  "Trendhim": { color: "#2C3E50", weight: 700, transform: "lowercase" },
  "Suitsupply": { color: "#1A1A2E", weight: 400, transform: "uppercase", spacing: "0.12em" },
  "Common Projects": { color: "#000000", weight: 300, transform: "uppercase", spacing: "0.15em" },
  "Revolve": { color: "#000000", weight: 700, transform: "uppercase" },
  "Kith": { color: "#000000", weight: 700, transform: "uppercase", spacing: "0.15em" },
  "New Balance": { color: "#CF0A2C", weight: 700, transform: "uppercase" },
  "LuisaViaRoma": { display: "LVR", color: "#000000", weight: 700 },
  "Tory Burch": { color: "#000000", weight: 400, transform: "uppercase", spacing: "0.1em" },
  "Kate Spade": { color: "#000000", weight: 700, transform: "lowercase" },
  "Reformation": { color: "#000000", weight: 400, transform: "uppercase", spacing: "0.08em" },
  "Sézane": { color: "#000000", weight: 400, italic: true },
  "Anine Bing": { color: "#000000", weight: 400, transform: "uppercase", spacing: "0.15em" },
  "Mejuri": { color: "#000000", weight: 400, transform: "lowercase" },
  "Brunello Cucinelli": { display: "CUCINELLI", color: "#8B7355", weight: 400, transform: "uppercase", spacing: "0.15em" },
  "Zegna": { color: "#000000", weight: 400, transform: "uppercase", spacing: "0.12em" },
};

const SIZE_MAP = {
  sm: { container: "h-10 px-2", text: "text-[9px]" },
  md: { container: "h-12 px-3", text: "text-[10px]" },
  lg: { container: "h-14 px-4", text: "text-xs" },
};

/**
 * Extract store name from a URL hostname.
 * Returns the matching BRAND_STYLES key, or a cleaned hostname.
 */
const HOSTNAME_TO_STORE: Record<string, string> = {
  "shein.com": "Shein",
  "hm.com": "H&M",
  "primark.com": "Primark",
  "pullandbear.com": "Pull & Bear",
  "bershka.com": "Bershka",
  "forever21.com": "Forever 21",
  "zara.com": "Zara",
  "mango.com": "Mango",
  "asos.com": "ASOS",
  "massimodutti.com": "Massimo Dutti",
  "cos.com": "COS",
  "cosstores.com": "COS",
  "uniqlo.com": "Uniqlo",
  "urbanoutfitters.com": "Urban Outfitters",
  "allsaints.com": "AllSaints",
  "reiss.com": "Reiss",
  "tedbaker.com": "Ted Baker",
  "arket.com": "Arket",
  "sandro-paris.com": "Sandro",
  "maje.com": "Maje",
  "net-a-porter.com": "NET-A-PORTER",
  "farfetch.com": "Farfetch",
  "ssense.com": "SSENSE",
  "mrporter.com": "Mr Porter",
  "matchesfashion.com": "MatchesFashion",
  "nordstrom.com": "Nordstrom",
  "terminalx.com": "Terminal X",
  "factory54.co.il": "Factory 54",
  "castro.com": "Castro",
  "fox.co.il": "Fox",
  "golf.co.il": "Golf",
  "renuar.co.il": "Renuar",
  "honigman.com": "Honigman",
  "adika.com": "Adika",
  "sacks.co.il": "Sack's",
  "oysho.com": "Oysho",
  "zalando.de": "Zalando",
  "zalando.co.uk": "Zalando",
  "zalando.fr": "Zalando",
  "aboutyou.de": "About You",
  "breuninger.com": "Breuninger",
  "mytheresa.com": "Mytheresa",
  "laredoute.fr": "La Redoute",
  "selfridges.com": "Selfridges",
  "johnlewis.com": "John Lewis",
  "harrods.com": "Harrods",
  "bloomingdales.com": "Bloomingdale's",
  "saksfifthavenue.com": "Saks Fifth Avenue",
  "neimanmarcus.com": "Neiman Marcus",
  "anthropologie.com": "Anthropologie",
  "jcrew.com": "J.Crew",
  "nike.com": "Nike",
  "adidas.com": "Adidas",
  "jomashop.com": "Jomashop",
  "stoneisland.com": "Stone Island",
  "trendhim.com": "Trendhim",
  "revolve.com": "Revolve",
  "suitsupply.com": "Suitsupply",
  "kith.com": "Kith",
  "newbalance.com": "New Balance",
  "commonprojects.com": "Common Projects",
  "stories.com": "& Other Stories",
  "otherstories.com": "& Other Stories",
  "galerieslafayette.com": "Galeries Lafayette",
  "zadig-et-voltaire.com": "Zadig & Voltaire",
  "printemps.com": "Printemps",
  "luisaviaroma.com": "LuisaViaRoma",
  "toryburch.com": "Tory Burch",
  "katespade.com": "Kate Spade",
  "thereformation.com": "Reformation",
  "sezane.com": "Sézane",
  "aninebing.com": "Anine Bing",
  "mejuri.com": "Mejuri",
  "brunellocucinelli.com": "Brunello Cucinelli",
  "zegna.com": "Zegna",
  // Additional stores
  "amazon.com": "Amazon",
  "endclothing.com": "END.",
  "etsy.com": "Etsy",
  "levi.com": "Levi's",
  "tissotwatches.com": "Tissot",
  "veja-store.com": "Veja",
  "gq.com": "GQ",
  "gq.com.au": "GQ",
};

export function extractStoreFromUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    // Direct match
    if (HOSTNAME_TO_STORE[hostname]) return HOSTNAME_TO_STORE[hostname];
    // Try matching without subdomain
    const parts = hostname.split(".");
    if (parts.length > 2) {
      const short = parts.slice(-2).join(".");
      if (HOSTNAME_TO_STORE[short]) return HOSTNAME_TO_STORE[short];
    }
    return null;
  } catch {
    return null;
  }
}

/** Extract store name from a shopping link label (format: "Product Name — StoreName") */
export function extractStoreFromLabel(label: string): string | null {
  const dashMatch = label.match(/[—–-]\s*([^—–-]+)$/);
  if (dashMatch) {
    const storeName = dashMatch[1].trim();
    if (BRAND_STYLES[storeName]) return storeName;
  }
  return null;
}

export default function StoreLogo({ name, size = "md", selected = false }: StoreLogoProps) {
  const brand = BRAND_STYLES[name];
  const sizeClasses = SIZE_MAP[size];

  if (!brand) {
    // Fallback: simple styled text for unknown stores
    return (
      <div className={`${sizeClasses.container} flex items-center justify-center rounded-lg`}>
        <span className={`${sizeClasses.text} font-medium text-center leading-tight truncate`}>
          {name}
        </span>
      </div>
    );
  }

  const displayText = brand.display || name;

  const textStyle: React.CSSProperties = {
    color: selected ? undefined : (brand.bg ? (brand.color || "#FFFFFF") : brand.color),
    fontWeight: brand.weight || 400,
    letterSpacing: brand.spacing || "normal",
    textTransform: brand.transform || "none",
    fontStyle: brand.italic ? "italic" : "normal",
  };

  const containerStyle: React.CSSProperties = {};
  if (brand.bg && !selected) {
    containerStyle.backgroundColor = brand.bg;
  }

  return (
    <div
      className={`${sizeClasses.container} flex items-center justify-center rounded-lg`}
      style={containerStyle}
    >
      <span
        className={`${sizeClasses.text} text-center leading-tight truncate`}
        style={textStyle}
      >
        {displayText}
      </span>
    </div>
  );
}
