const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export function sitePath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
