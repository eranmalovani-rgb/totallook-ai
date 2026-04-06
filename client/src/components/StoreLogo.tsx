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

const BRAND_STYLES: Record<string, BrandStyle> = {
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
};

const SIZE_MAP = {
  sm: { container: "h-10 px-2", text: "text-[9px]" },
  md: { container: "h-12 px-3", text: "text-[10px]" },
  lg: { container: "h-14 px-4", text: "text-xs" },
};

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
