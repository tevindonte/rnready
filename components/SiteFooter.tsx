import Link from "next/link";
import { CONTACT_EMAIL, copyrightNotice } from "@/lib/site-meta";

type SiteFooterProps = {
  className?: string;
  showContact?: boolean;
};

export function SiteFooter({ className, showContact = false }: SiteFooterProps) {
  return (
    <footer className={className}>
      <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground md:flex-row">
        <div className="text-center md:text-left">
          <p>{copyrightNotice()}</p>
          {showContact && (
            <p className="mt-1">
              Questions?{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo hover:underline">
                {CONTACT_EMAIL}
              </a>
            </p>
          )}
        </div>
        <div className="flex gap-4">
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
