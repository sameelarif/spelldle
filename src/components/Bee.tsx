type BeeProps = {
  size?: number
  className?: string
}

export function Bee({ size = 36, className }: BeeProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M18 22c-4-8 2-14 8-10 6-7 14-1 9 9"
        fill="#f7f1e3"
        stroke="#1c1610"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M38 24c2-5 8-4 9 2"
        stroke="#1c1610"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <ellipse cx="34" cy="38" rx="16" ry="13" fill="#1c1610" />
      <path
        d="M21 35.5h26M20 41h24"
        stroke="#c9a227"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="46" cy="31" r="5.2" fill="#1c1610" />
      <circle cx="48.2" cy="29.2" r="1.35" fill="#f7f1e3" />
      <circle cx="50.5" cy="21.5" r="1.4" fill="#1c1610" />
    </svg>
  )
}
