export function formatYmd(date: string | null | undefined): string {
  if (!date) return "-";
  try {
    return new Date(date).toISOString().slice(0, 10);
  } catch {
    return "-";
  }
}

export function fileExt(name: string): string {
  const idx = name.lastIndexOf(".");
  if (idx < 0) return "";
  return name.slice(idx + 1).toLowerCase();
}

export function safeDisplayNameFromFilename(filename: string): string {
  // Avoid obvious PII patterns (digits-heavy) and odd chars.
  // If it becomes too empty, fall back to a generic label.
  const base = filename.replace(/\.[^/.]+$/, "");
  const scrubbed = base
    .replace(/[0-9]/g, "")
    .replace(/[^a-zA-ZåäöÅÄÖ\- _]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);

  return scrubbed.length >= 3 ? scrubbed : "Dokument";
}
