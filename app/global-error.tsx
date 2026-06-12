"use client";

import { useEffect } from "react";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
          <header className="border-b border-slate-200 bg-white px-6 py-4">
            <div className="inline-flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6366F1] text-sm font-semibold text-white">
                R
              </div>
              <span className="text-base font-semibold text-[#0F1729]">RNReady</span>
            </div>
          </header>
          <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-[#6366F1]">Error</p>
            <h1 className="mt-3 text-3xl font-semibold text-[#0F1729]">Something went wrong</h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500">
              A critical error occurred. Refresh the page or try again in a moment.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#6366F1] px-4 text-sm font-medium text-white hover:bg-[#5558E3]"
              >
                Try again
              </button>
              <a
                href="/"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-[#0F1729] hover:bg-slate-50"
              >
                Back to home
              </a>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
