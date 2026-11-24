import { useEffect, useState } from "react";

export const ROUTES = ["today", "upcoming", "roundup", "rules", "history"] as const;
export type Route = (typeof ROUTES)[number];

function readRoute(): Route {
  const name = window.location.hash.replace(/^#\/?/, "") as Route;
  return (ROUTES as readonly string[]).includes(name) ? name : "today";
}

/** Hash-based routing so the static build works from any root without server rewrites. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(readRoute);
  useEffect(() => {
    const onChange = () => setRoute(readRoute());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
