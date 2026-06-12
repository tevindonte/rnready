"use client";

function getGreeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function LocalGreeting({ name }: { name: string }) {
  const greeting = getGreeting(new Date().getHours());

  return (
    <h1 className="text-2xl font-semibold text-foreground">
      {greeting}, {name}.
    </h1>
  );
}
