export function escapeMini(s: string) {
  return s.replaceAll("<", "\\<").replaceAll("&", "&amp;");
}
