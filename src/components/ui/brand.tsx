/** Two open page corners meeting in one shared space. */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <rect width="40" height="40" rx="12" fill="#315BEE" />
      <path d="M22 9h-7a6 6 0 0 0-6 6v7h6v-7h7V9Z" fill="white" />
      <path d="M18 31h7a6 6 0 0 0 6-6v-7h-6v7h-7v6Z" fill="white" />
      <path d="M19 16h5v5h-5z" fill="#AFC2FF" />
    </svg>
  );
}

export function BrandLogo({
  inverted = false,
  compact = false,
  className = "",
}: {
  inverted?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 ${className}`}
      aria-label="Collab Editor"
    >
      <BrandMark className="h-8 w-8" />
      {!compact && (
        <span
          aria-hidden="true"
          className={`text-[23px] font-semibold tracking-[-0.055em] ${inverted ? "text-white" : "text-[#171923]"}`}
        >
          collab<span className="text-[#7395ff]">.</span>
        </span>
      )}
    </span>
  );
}
