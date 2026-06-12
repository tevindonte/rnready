"use client";

type LocalDateTimeProps = {
  value: string;
  variant?: "date" | "short" | "chart";
};

export function LocalDateTime({ value, variant = "date" }: LocalDateTimeProps) {
  const date = new Date(value);

  if (variant === "chart") {
    return (
      <>
        {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </>
    );
  }

  if (variant === "short") {
    return (
      <>
        {date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </>
    );
  }

  return <>{date.toLocaleDateString()}</>;
}
