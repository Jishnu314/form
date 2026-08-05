import { Router } from "express";
import * as XLSX from "xlsx";
import { db } from "../db.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { monthKeyToLabel } from "../utils.js";

const router = Router();
const HEADERS = ["Date", "Name", "Renewal", "RD Amount", "RD Scheme", "FD Amount", "FD Scheme"];

function entryToRows(row) {
  const rdArray = JSON.parse(row.rd_array);
  const fdArray = JSON.parse(row.fd_array);
  const maxRows = Math.max(rdArray.length, fdArray.length, 1);
  const rows = [];

  for (let i = 0; i < maxRows; i++) {
    const rd = rdArray[i];
    const fd = fdArray[i];
    rows.push([
      i === 0 ? row.date : "",
      i === 0 ? row.name : "",
      i === 0 ? row.renewal : "",
      rd ? rd.rdAmount : "",
      rd ? rd.rdScheme : "",
      fd ? fd.fdAmount : "",
      fd ? fd.fdScheme : "",
    ]);
  }
  return rows;
}

router.get("/excel", requireAdmin, (req, res) => {
  const rows = db.prepare(`SELECT * FROM entries ORDER BY date ASC`).all();

  const byMonth = new Map();
  rows.forEach((r) => {
    if (!byMonth.has(r.month_key)) byMonth.set(r.month_key, []);
    byMonth.get(r.month_key).push(r);
  });

  const sortedKeys = [...byMonth.keys()].sort().reverse();
  const wb = XLSX.utils.book_new();

  if (sortedKeys.length === 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([HEADERS]), "No data");
  } else {
    sortedKeys.forEach((key) => {
      const monthRows = byMonth.get(key).flatMap(entryToRows);
      const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...monthRows]);
      ws["!cols"] = [{ wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 16 }];
      const label = monthKeyToLabel(key).replace(/[\\/?*[\]:]/g, "").slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, label);
    });
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="rd-fd-register-${Date.now()}.xlsx"`);
  res.send(buffer);
});

export default router;
