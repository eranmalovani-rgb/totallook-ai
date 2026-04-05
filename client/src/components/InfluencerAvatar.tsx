import { useMemo } from "react";

/** Deterministic gradient based on the influencer's name */
const GRADIENTS = [
  "from-violet-500 to-fuchsia-500",
  "from-amber-400 to-primary",
  "from-amber-500 to-primary",
  "from-orange-500 to-amber-500",
  "from-rose-500 to-pink-500",
  "from-primary to-rose-500",
  "from-amber-300 to-primary",
  "from-amber-300 to-amber-500",
  "from-red-500 to-orange-500",
  "from-teal-500 to-cyan-500",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

interface InfluencerAvatarProps {
  name: string;
  imageUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-7 h-7 text-[10px]",
  md: "w-9 h-9 text-xs",
  lg: "w-12 h-12 text-sm",
};

export default function InfluencerAvatar({ name, imageUrl, size = "md", className = "" }: InfluencerAvatarProps) {
  const gradient = useMemo(() => GRADIENTS[hashString(name) % GRADIENTS.length], [name]);
  const initials = useMemo(() => getInitials(name), [name]);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover ring-1 ring-white/20 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold ring-1 ring-white/20 shrink-0 ${className}`}
      title={name}
    >
      {initials}
    </div>
  );
}
