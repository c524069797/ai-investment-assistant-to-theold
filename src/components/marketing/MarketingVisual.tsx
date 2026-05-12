"use client";

import Image from "next/image";

type MarketingVisualTone = "hero" | "poster" | "compact";

interface MarketingVisualProps {
  alt: string;
  className?: string;
  priority?: boolean;
  src?: string;
  tone?: MarketingVisualTone;
}

const DEFAULT_IMAGES: Record<MarketingVisualTone, string> = {
  hero: "/marketing/hero-main.png",
  poster: "/marketing/promo-poster.png",
  compact: "/marketing/hero-main.png",
};

export default function MarketingVisual({
  alt,
  className,
  priority = false,
  src,
  tone = "hero",
}: MarketingVisualProps) {
  const imageSrc = src ?? DEFAULT_IMAGES[tone];

  return (
    <div className={["marketing-visual", `marketing-visual--${tone}`, className].filter(Boolean).join(" ")}>
      <Image
        src={imageSrc}
        alt={alt}
        fill
        priority={priority}
        sizes={tone === "poster" ? "(max-width: 768px) 88vw, 360px" : "(max-width: 768px) 88vw, 520px"}
        className="marketing-visual__image"
      />
    </div>
  );
}
