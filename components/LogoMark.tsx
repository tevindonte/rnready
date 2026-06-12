import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoMarkProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  priority?: boolean;
};

const markHeights = {
  sm: 32,
  md: 40,
  lg: 48,
} as const;

export function LogoMark({ className, size = "md", priority }: LogoMarkProps) {
  const height = markHeights[size];

  return (
    <Image
      src="/logo-icon.png"
      alt="RNReady"
      width={height}
      height={height}
      priority={priority}
      sizes={`${height}px`}
      className={cn("h-auto w-auto shrink-0 object-contain", className)}
      style={{ height, width: "auto", maxHeight: height }}
    />
  );
}

type LogoFullProps = {
  className?: string;
  height?: number;
  href?: string;
  priority?: boolean;
  variant?: "full" | "compact";
};

export function LogoFull({
  className,
  height = 40,
  href,
  priority,
  variant = "full",
}: LogoFullProps) {
  const src = variant === "compact" ? "/logo-full-sm.png" : "/logo.png";
  const image = (
    <Image
      src={src}
      alt="RNReady Nursing Test Prep"
      width={Math.round(height * 2.2)}
      height={height}
      priority={priority}
      sizes={`${height}px`}
      className={cn("h-auto w-auto shrink-0 object-contain", className)}
      style={{ height, width: "auto", maxHeight: height }}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0 items-center">
        {image}
      </Link>
    );
  }

  return image;
}
