export function exportEntriesToCSV(entries) {
  const headers = ["Date", "Name", "Renewal", "RD Amount", "RD Scheme", "FD Amount", "FD Scheme"];
  const rows = [];

  entries.forEach((en) => {
    const rdCount = en.rdArray.length || 1;
    const fdCount = en.fdArray.length || 1;
    const maxRows = Math.max(rdCount, fdCount, 1);

    for (let i = 0; i < maxRows; i++) {
      const rd = en.rdArray[i];
      const fd = en.fdArray[i];
      rows.push([
        i === 0 ? en.date : "",
        i === 0 ? en.name : "",
        i === 0 ? en.renewal : "",
        rd ? rd.rdAmount : "",
        rd ? rd.rdScheme : "",
        fd ? fd.fdAmount : "",
        fd ? fd.fdScheme : "",
      ]);
    }
  });

  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rd-fd-register-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
