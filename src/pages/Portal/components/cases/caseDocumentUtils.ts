export function fileExt(name: string): string {
  const base = name.split("?")[0];
  const last = base.split("/").pop() || base;
  const idx = last.lastIndexOf(".");
  if (idx === -1) return "";
  return last.slice(idx + 1).toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function safeDisplayNameFromFilename(name: string): string {
  const base = name.replace(/\.[^/.]+$/, "");
  const scrubbed = base
    .replace(/[0-9]/g, "")
    .replace(/[^a-zA-ZåäöÅÄÖ\- _]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);

  return scrubbed.length >= 3 ? scrubbed : "Dokument";
}
