/**
 * The page of a pathname: its first segment, with the slash — `/energy` for
 * `/energy/circuits`. Since 0.138 a page's tabs are its sub-routes (the
 * user: "tabs should always be sub routes"), so whatever reads the location
 * for the page — the nav's selected entry, Layout's scrolling and its reset,
 * the view listener's /control check — looks at this, not the whole path.
 */
export function pageOf(pathname: string): string {
  const [, first = ""] = pathname.split("/");
  return `/${first}`;
}
