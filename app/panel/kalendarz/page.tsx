import PanelNav from "@/components/PanelNav";
import { panelClient } from "@/lib/panel";
import { statusPl } from "@/lib/status";
import { bookingHasReturnLeg, warsawToday } from "@/lib/bookingOps";
import { bookingRouteText } from "@/lib/bookingRoute";

const palette = ["#d5ae5d", "#4f8bd6", "#52a86b", "#a975d1", "#d27a5a", "#4eb9b0", "#cf6b91", "#8794aa"];

function one(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function driverColor(id: string | null, ids: string[]) {
  if (!id) return "#6b7280";
  const i = Math.max(0, ids.indexOf(id));
  return palette[i % palette.length];
}

function validDateKey(value?: string | null) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function shiftDate(dateKey: string, days: number) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days, 12));
  return date.toISOString().slice(0, 10);
}

function mondayFor(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return shiftDate(dateKey, offset);
}

function dayLabel(dateKey: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "2-digit"
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

function weekLabel(start: string, end: string) {
  const startDate = new Date(`${start}T12:00:00Z`);
  const endDate = new Date(`${end}T12:00:00Z`);
  const sameMonth = startDate.getUTCMonth() === endDate.getUTCMonth();
  const sameYear = startDate.getUTCFullYear() === endDate.getUTCFullYear();

  if (sameMonth && sameYear) {
    return `${startDate.getUTCDate()}–${endDate.getUTCDate()} ${new Intl.DateTimeFormat("pl-PL", {
      timeZone: "UTC",
      month: "long",
      year: "numeric"
    }).format(endDate)}`;
  }

  return `${new Intl.DateTimeFormat("pl-PL", {
    timeZone: "UTC",
    day: "numeric",
    month: "short"
  }).format(startDate)} – ${new Intl.DateTimeFormat("pl-PL", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(endDate)}`;
}

export default async function CalendarPage({
  searchParams
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const today = warsawToday();
  const reference = validDateKey(week) ? String(week) : today;
  const weekStart = mondayFor(reference);
  const weekDays = Array.from({ length: 7 }, (_, index) => shiftDate(weekStart, index));
  const weekEnd = weekDays[6];
  const previousWeek = shiftDate(weekStart, -7);
  const nextWeek = shiftDate(weekStart, 7);
  const currentWeek = mondayFor(today);

  const { s } = await panelClient();
  const { data } = await s
    .from("bookings")
    .select("*,drivers:drivers!bookings_driver_id_fkey(id,full_name),vehicles:vehicles!bookings_vehicle_id_fkey(name,registration),return_driver:drivers!bookings_return_driver_id_fkey(id,full_name),return_vehicle:vehicles!bookings_return_vehicle_id_fkey(name,registration)")
    .order("travel_date")
    .order("travel_time")
    .limit(700);

  const rows = data ?? [];
  const ids = [...new Set(rows.flatMap((x: any) => [x.driver_id, x.return_driver_id]).filter(Boolean))] as string[];
  const events: any[] = [];

  for (const b of rows) {
    if (weekDays.includes(String(b.travel_date || "").slice(0, 10))) {
      events.push({
        booking: b,
        leg: "primary",
        date: b.travel_date,
        time: b.travel_time,
        driverId: b.driver_id,
        driver: one(b.drivers),
        vehicle: one(b.vehicles)
      });
    }

    if (
      bookingHasReturnLeg(b) &&
      b.return_date &&
      weekDays.includes(String(b.return_date || "").slice(0, 10))
    ) {
      events.push({
        booking: b,
        leg: "return",
        date: b.return_date,
        time: b.return_time,
        driverId: b.return_driver_id || b.driver_id,
        driver: one(b.return_driver) || one(b.drivers),
        vehicle: one(b.return_vehicle) || one(b.vehicles)
      });
    }
  }

  events.sort((a, b) =>
    `${a.date}T${String(a.time || "00:00")}`.localeCompare(
      `${b.date}T${String(b.time || "00:00")}`
    )
  );

  const grouped = events.reduce((acc: Record<string, any[]>, event: any) => {
    (acc[event.date] ??= []).push(event);
    return acc;
  }, {});

  const driverName = (id: string) => {
    for (const b of rows) {
      const primary = one(b.drivers);
      const returning = one(b.return_driver);
      if (primary?.id === id) return primary.full_name;
      if (returning?.id === id) return returning.full_name;
    }
    return "Kierowca";
  };

  return (
    <main className="container">
      <span className="badge">WIDOK TYGODNIOWY</span>
      <h1>Kalendarz kursów</h1>
      <p className="muted">
        Domyślnie widzisz bieżący tydzień. Starsze i przyszłe terminy są dostępne strzałkami.
      </p>
      <PanelNav />

      <div className="calendar-week-toolbar card">
        <a className="btn secondary" href={`/panel/kalendarz?week=${previousWeek}`}>← POPRZEDNI</a>
        <div>
          <strong>{weekLabel(weekStart, weekEnd)}</strong>
          <span>{events.length} {events.length === 1 ? "kurs" : "kursów"} w tym tygodniu</span>
        </div>
        <div className="calendar-week-toolbar-actions">
          {weekStart !== currentWeek && (
            <a className="btn secondary" href="/panel/kalendarz">DZISIAJ</a>
          )}
          <a className="btn secondary" href={`/panel/kalendarz?week=${nextWeek}`}>NASTĘPNY →</a>
        </div>
      </div>

      <div className="driver-legend">
        {ids.map((id) => (
          <span key={id}>
            <i style={{ background: driverColor(id, ids) }} />
            {driverName(id)}
          </span>
        ))}
        <span><i style={{ background: "#6b7280" }} />BEZ OBSADY</span>
      </div>

      <div className="calendar-week-scroll">
        <div className="calendar-week-grid">
          {weekDays.map((date) => {
            const list = grouped[date] ?? [];
            const isToday = date === today;

            return (
              <section className={`calendar-week-column ${isToday ? "today" : ""}`} key={date}>
                <header className="calendar-week-day-head">
                  <strong>{dayLabel(date)}</strong>
                  {isToday && <span>DZISIAJ</span>}
                </header>

                <div className="calendar-week-events">
                  {list.length ? (
                    list.map((event: any) => {
                      const b = event.booking;
                      const general = String(b.service_type || "").startsWith("point_to_point");

                      return (
                        <a
                          href={`/panel/rezerwacje/${b.id}`}
                          className={`calendar-event calendar-week-event ${b.status || ""}`}
                          style={{
                            borderLeftColor: driverColor(event.driverId, ids),
                            opacity: b.status === "cancelled" ? 0.62 : 1
                          }}
                          key={`${b.id}-${event.leg}`}
                        >
                          <strong>
                            {String(event.time || "").slice(0, 5)} · {event.leg === "return" ? "POWRÓT · " : ""}
                            {b.customer_name}
                          </strong>
                          <span>{bookingRouteText(b, event.leg)}</span>
                          <small>
                            {general ? "🚐 A→B · " : ""}
                            {event.driver?.full_name ?? "BEZ OBSADY"}
                          </small>
                          <small>
                            {event.vehicle
                              ? `${event.vehicle.name} · ${event.vehicle.registration}`
                              : "brak pojazdu"} · {statusPl(b.status)}
                          </small>
                        </a>
                      );
                    })
                  ) : (
                    <div className="calendar-week-empty">Brak kursów</div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
