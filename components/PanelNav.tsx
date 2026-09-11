export default function PanelNav() {
  const itemStyle = {
    display: "block",
    padding: "10px 12px",
    borderBottom: "1px solid #343b49",
    textDecoration: "none"
  } as const;

  return <nav className="nav" style={{ alignItems: "flex-start" }}>
    <a href="/panel">Dashboard</a>
    <a href="/panel/dyspozytor">Plan kursów</a>
    <a href="/panel/kalendarz">Kalendarz</a>
    <a href="/panel/firmy">Firmy B2B</a>

    <details style={{ position: "relative", zIndex: 30 }}>
      <summary
        style={{
          listStyle: "none",
          cursor: "pointer",
          padding: "10px 12px",
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: 9,
          color: "var(--text)",
          userSelect: "none"
        }}
      >
        Dodatkowe ▾
      </summary>
      <div
        style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          right: 0,
          minWidth: 235,
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 18px 45px rgba(0,0,0,.38)"
        }}
      >
        <a style={itemStyle} href="/panel/rezerwacje?view=all">Wyszukiwarka rezerwacji</a>
        <a style={itemStyle} href="/panel/wesela">Transport weselny</a>
        <a style={itemStyle} href="/panel/zgloszenia">Zgłoszenia kierowców</a>
        <a style={itemStyle} href="/panel/kierowcy">Kierowcy</a>
        <a style={itemStyle} href="/panel/pojazdy">Pojazdy</a>
        <a style={itemStyle} href="/kierowca">Panel kierowcy</a>
        <a style={itemStyle} href="/panel/raporty">Raporty</a>
        <a style={{ ...itemStyle, borderBottom: 0 }} href="/panel/growth">Growth</a>
      </div>
    </details>
  </nav>;
}
