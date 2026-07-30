export function FootMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 240 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M118 28c-18 6-34 28-38 56-3 22 2 44 14 62 8 12 12 24 10 38-2 18-10 32-10 48 0 28 18 52 46 52s46-24 46-52c0-16-8-30-10-48-2-14 2-26 10-38 12-18 17-40 14-62-4-28-20-50-38-56-8-3-18-3-26 0-4 1-8 1-12 0-8-3-18-3-26 0Z"
        fill="currentColor"
        opacity="0.22"
      />
      <path
        d="M96 42c-4 1-8 4-11 9-8 14-10 34-6 52 3 14 10 26 18 36 6 8 10 18 9 28-1 14-6 26-6 38 0 20 12 36 30 36s30-16 30-36c0-12-5-24-6-38-1-10 3-20 9-28 8-10 15-22 18-36 4-18 2-38-6-52-3-5-7-8-11-9"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M108 78c-6 18-4 40 4 58M132 78c6 18 4 40-4 58"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.35"
      />
      <ellipse cx="78" cy="52" rx="14" ry="20" fill="currentColor" opacity="0.18" />
      <ellipse cx="102" cy="36" rx="12" ry="18" fill="currentColor" opacity="0.18" />
      <ellipse cx="130" cy="34" rx="12" ry="18" fill="currentColor" opacity="0.18" />
      <ellipse cx="154" cy="46" rx="13" ry="19" fill="currentColor" opacity="0.18" />
      <ellipse cx="172" cy="68" rx="11" ry="16" fill="currentColor" opacity="0.18" />
    </svg>
  );
}
