import Link from "next/link";

interface FamaLogoProps {
  href?: string;
  size?: "sm" | "md" | "lg" | "hero";
  subtitle?: string;
}

const SIZE: Record<NonNullable<FamaLogoProps["size"]>, string> = {
  sm: "text-3xl",
  md: "text-4xl",
  lg: "text-6xl",
  hero: "text-7xl sm:text-8xl",
};

export function FamaLogo({ href, size = "md", subtitle }: FamaLogoProps) {
  const mark = (
    <span className="inline-flex flex-col items-start leading-none">
      <span className={`fama-logo ${SIZE[size]}`}>Fama</span>
      {subtitle ? (
        <span className="mt-2 text-[0.65rem] font-semibold uppercase tracking-[0.34em] text-white/55">
          {subtitle}
        </span>
      ) : null}
    </span>
  );

  if (!href) return mark;
  return (
    <Link href={href} className="inline-flex no-underline" aria-label="Fama MZL">
      {mark}
    </Link>
  );
}
