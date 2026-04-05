const appVersion = (import.meta.env.VITE_APP_VERSION as string | undefined) || "dev";
const buildCommit = (import.meta.env.VITE_BUILD_COMMIT as string | undefined) || "";

const shortCommit = buildCommit ? buildCommit.slice(0, 7) : "";
const label = shortCommit ? `v${appVersion} (${shortCommit})` : `v${appVersion}`;

export default function VersionBadge() {
  return (
    <div
      aria-label={`App version ${label}`}
      className="fixed bottom-2 right-2 z-[100] pointer-events-none select-none text-[10px] leading-none text-white/45 bg-black/35 border border-white/10 rounded px-1.5 py-1"
      dir="ltr"
    >
      {label}
    </div>
  );
}
