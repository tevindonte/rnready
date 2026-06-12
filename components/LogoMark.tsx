import { cn } from "@/lib/utils";

type LogoMarkProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

export function LogoMark({ className, size = "md" }: LogoMarkProps) {
  const sizes = {
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-12 w-12 text-lg",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg bg-indigo font-semibold text-white",
        sizes[size],
        className
      )}
    >
      R
    </div>
  );
}

export function LogoFull({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size="sm" />
      <span className="text-lg font-semibold text-white">RNReady</span>
    </div>
  );
}
