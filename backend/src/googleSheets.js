// Server-side equivalent of the old client-side googleSheets.js — now the
// server pushes each saved entry, so it happens once, reliably, regardless
// of which device submitted it.
export async function sendToGoogleSheet(entry) {
  const url = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  if (!url) return;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: entry.date,
      name: entry.name,
      renewal: entry.renewal,
      rd: entry.rdArray.map((r) => `${r.rdScheme}: ₹${r.rdAmount}`).join(" | "),
      fd: entry.fdArray.map((f) => `${f.fdScheme}: ₹${f.fdAmount}`).join(" | "),
    }),
  }).catch(() => {
    // Local DB row is already saved; a failed sheet sync stays silent here.
  });
}
