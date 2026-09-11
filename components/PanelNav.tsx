export default function PanelNav() {
  return <nav className="nav panel-main-nav">
    <a href="/panel">Dashboard</a>
    <a href="/panel/dyspozytor">Plan kursów</a>
    <a href="/panel/kalendarz">Kalendarz</a>
    <a href="/panel/firmy">Firmy B2B</a>
    <details className="panel-extra-menu">
      <summary>Dodatkowe ▾</summary>
      <div className="panel-extra-menu-list">
        <a href="/panel/rezerwacje">Rezerwacje / wyszukiwarka</a>
        <a href="/panel/zgloszenia">Zgłoszenia kierowców</a>
        <a href="/panel/kierowcy">Kierowcy</a>
        <a href="/panel/pojazdy">Pojazdy</a>
        <a href="/panel/raporty">Raporty</a>
        <a href="/panel/growth">Growth</a>
        <a href="/kierowca">Panel kierowcy</a>
      </div>
    </details>
  </nav>;
}
