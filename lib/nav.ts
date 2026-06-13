/** True for in-progress quiz UI (full-screen, no sidebar). Not /quiz/config. */
export function isActiveQuizSession(pathname: string): boolean {
  if (pathname === "/quiz/config") return false;
  if (pathname.endsWith("/review")) return false;
  if (pathname === "/quiz/guest") return true;
  return /^\/quiz\/[0-9a-f-]{36}$/i.test(pathname);
}

/** Sidebar nav highlight — avoids /study-guide matching /study-guides. */
export function isNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}
