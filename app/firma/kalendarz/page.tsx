import CompanyNav from "@/components/CompanyNav";
import { companyClient } from "@/lib/company";
import { companyRouteLabel } from "@/lib/companyPortal";
import { statusPl } from "@/lib/status";

function warsawToday() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function normalizeMonth(value?: string) {
  return /^\d{4}-\d{2}$/.test(String(value || ""))
    ? String(value)
    : warsawToday().slice(0, 7);
}

function monthShift(month: string, delta: number) {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(year, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}


function monthLabel(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric", timeZone: "Europe/Warsaw" })
    .format(new Date(Date.UTC(year, m - 1, 1)));
}

function daysInMonth(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
}

function weekdayOffset(month: string) {
  const [year, m] = month.split("-").map(Number);
  const day = new Date(Date.UTC(year, m - 1, 1)).getUTCDay();
  return (day + 6) % 7; // poniedziałek = 0
}

function dateKey(month: string, day: number) {
  return `${month}-${String(day).padStart(2, "0")}`;
}

function bookingLegsForCalendar(booking: any) {
  const legs = [
    {
      kind: "primary",
      label: booking.service_type === "from_airport" ? "ODBIÓR" : "WYJAZD",
      date: String(booking.travel_date || "").slice(0, 10),
      time: String(booking.travel_time || "").slice(0, 5),
      route: companyRouteLabel(booking)
    }
  ];
  if (booking.service_type === "roundtrip" && booking.return_date) {
    legs.push({
      kind: "return",
      label: "POWRÓT",
      date: String(booking.return_date || "").slice(0, 10),
      time: String(booking.return_time || "").slice(0, 5),
      route: `${booking.airport_label} → ${booking.pickup_address}`
    });
  }
  return legs.filter((leg) => leg.date);
}

export default async function CompanyCalendarPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string; date?: string }>;
}) {
  const params = await searchParams;
  const { s, company } = await companyClient();
  const month = normalizeMonth(params?.month);
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(String(params?.date || ""))
    ? String(params.date)
    : "";

  const { data } = await s
    .from("bookings")
    .select("*")
    .eq("company_id", company.id)
    .neq("status", "cancelled")
    .order("travel_date", { ascending: true })
    .limit(750);

  const rows = data ?? [];
  const countByDate = new Map<string, number>();
  const legsByDate = new Map<string, Array<{ booking: any; leg: any }>>();

  for (const booking of rows) {
    for (const leg of bookingLegsForCalendar(booking)) {
      if (!leg.date.startsWith(month)) continue;
      countByDate.set(leg.date, (countByDate.get(leg.date) ?? 0) + 1);
      const list = legsByDate.get(leg.date) ?? [];
      list.push({ booking, leg });
      legsByDate.set(leg.date, list);
    }
  }

  for (const list of legsByDate.values()) {
    list.sort((a, b) => a.leg.time.localeCompare(b.leg.time));
  }

  const days = daysInMonth(month);
  const offset = weekdayOffset(month);
  const selected = selectedDate ? legsByDate.get(selectedDate) ?? [] : [];
  const today = warsawToday();

  return (
    <main className="container company-calendar-page">
      <span className="badge">MATT BOOKING PRO · B2B</span>
      <h1>Kalendarz transportów</h1>
      <CompanyNav />

      <section className="card company-calendar-card">
        <div className="company-calendar-toolbar">
          <a className="btn secondary" href={`/firma/kalendarz?month=${monthShift(month, -1)}`}>← POPRZEDNI</a>
          <div>
            <strong>{monthLabel(month)}</strong>
            <span>Kliknij dzień, aby zobaczyć zlecenia.</span>
          </div>
          <a className="btn secondary" href={`/firma/kalendarz?month=${monthShift(month, 1)}`}>NASTĘPNY →</a>
        </div>

        <div className="company-calendar-weekdays">
          {['Pn','Wt','Śr','Cz','Pt','So','Nd'].map((d) => <span key={d}>{d}</span>)}
        </div>

        <div className="company-calendar-grid">
          {Array.from({ length: offset }).map((_, i) => <span className="company-calendar-empty" key={`e-${i}`} />)}
          {Array.from({ length: days }).map((_, i) => {
            const day = i + 1;
            const date = dateKey(month, day);
            const count = countByDate.get(date) ?? 0;
            return (
              <a
                key={date}
                href={`/firma/kalendarz?month=${month}&date=${date}`}
                className={`company-calendar-day ${date === today ? "today" : ""} ${date === selectedDate ? "selected" : ""} ${count ? "has-bookings" : ""}`}
              >
                <strong>{day}</strong>
                {count > 0 && <span>{count} {count === 1 ? "zlecenie" : "zlecenia"}</span>}
              </a>
            );
          })}
        </div>
      </section>

      {selectedDate && (
        <section className="card company-calendar-selected">
          <div className="company-section-head">
            <div>
              <span className="badge">ZLECENIA NA DZIEŃ</span>
              <h2>{selectedDate}</h2>
            </div>
            <strong className="company-calendar-count">{selected.length}</strong>
          </div>

          {selected.length ? (
            <div className="company-calendar-orders">
              {selected.map(({ booking, leg }) => (
                <a href={`/firma/rezerwacje/${booking.id}`} key={`${booking.id}-${leg.kind}`}>
                  <div className="company-calendar-order-time">
                    <strong>{leg.time || "—"}</strong>
                    <span>{leg.label}</span>
                  </div>
                  <div>
                    <strong>{booking.booking_number} · {booking.customer_name}</strong>
                    <span>{leg.route}</span>
                  </div>
                  <span className={`status ${String(booking.status || "").toLowerCase()}`}>{statusPl(booking.status)}</span>
                </a>
              ))}
            </div>
          ) : (
            <div className="company-dashboard-empty">Brak zleceń na wybrany dzień.</div>
          )}
        </section>
      )}
    </main>
  );
}
