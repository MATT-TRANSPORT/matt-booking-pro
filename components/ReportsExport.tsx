"use client";

import { useState } from "react";

function currentMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit"
  }).formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value || "";
  const month = parts.find((p) => p.type === "month")?.value || "";
  return `${year}-${month}`;
}

export default function ReportsExport() {
  const [month, setMonth] = useState(currentMonth());

  return (
    <div className="card report-export-card">
      <div>
        <span className="badge">EKSPORT DLA KSIĘGOWOŚCI</span>
        <h2>CSV / Excel</h2>
        <p className="muted">Pełna lista transportów z kwotami, płatnościami i numerami faktur. Plik CSV otwiera się bezpośrednio w Excelu.</p>
      </div>
      <div className="report-export-actions">
        <label>Miesiąc<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label>
        <a className="btn" href={`/api/admin/reports/export?month=${encodeURIComponent(month)}`}>POBIERZ CSV</a>
      </div>
    </div>
  );
}
