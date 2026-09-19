"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  airport_key: string;
  label: string;
  route_address: string;
  car_price: number;
  bus_price: number;
  active: boolean;
  sort_order: number;
};

function emptyForm() {
  return {
    label: "",
    routeAddress: "",
    carPrice: "",
    busPrice: "",
    sortOrder: "100"
  };
}

export default function AirportPricingManager({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Row>>(
    Object.fromEntries(rows.map((row) => [row.airport_key, { ...row }]))
  );
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const ordered = useMemo(
    () => [...rows].sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label)),
    [rows]
  );

  function patch(key: string, change: Partial<Row>) {
    setDrafts((current) => ({
      ...current,
      [key]: { ...current[key], ...change }
    }));
  }

  async function send(payload: any, busyKey: string) {
    setBusy(busyKey);
    setMessage("");

    try {
      const response = await fetch("/api/admin/airports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Nie udało się zapisać cennika.");
        setBusy("");
        return false;
      }

      setMessage("✓ Cennik został zaktualizowany. Nowe wyceny używają zmian od razu.");
      setBusy("");
      router.refresh();
      return true;
    } catch {
      setMessage("Nie udało się połączyć z serwerem.");
      setBusy("");
      return false;
    }
  }

  async function create() {
    const ok = await send({
      action: "create",
      ...form,
      active: true
    }, "create");

    if (ok) setForm(emptyForm());
  }

  async function save(key: string) {
    const row = drafts[key];
    await send({
      action: "update",
      airportKey: key,
      label: row.label,
      routeAddress: row.route_address,
      carPrice: row.car_price,
      busPrice: row.bus_price,
      active: row.active,
      sortOrder: row.sort_order
    }, key);
  }

  async function toggle(key: string, active: boolean) {
    patch(key, { active });
    await send({ action: "toggle", airportKey: key, active }, `toggle:${key}`);
  }

  return (
    <div className="airport-pricing-manager">
      <section className="card airport-pricing-add">
        <div>
          <span className="badge">NOWE LOTNISKO</span>
          <h2>Dodaj lotnisko do cennika</h2>
          <p className="muted">
            Po zapisaniu lotnisko automatycznie pojawi się w formularzach B2C i B2B.
          </p>
        </div>
        <div className="airport-pricing-add-grid">
          <label>Nazwa
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="np. Berlin Brandenburg" />
          </label>
          <label>Adres do Google Maps
            <input value={form.routeAddress} onChange={(e) => setForm({ ...form, routeAddress: e.target.value })} placeholder="pełny adres lotniska" />
          </label>
          <label>Samochód
            <input type="number" min="0" step="10" value={form.carPrice} onChange={(e) => setForm({ ...form, carPrice: e.target.value })} />
          </label>
          <label>Bus
            <input type="number" min="0" step="10" value={form.busPrice} onChange={(e) => setForm({ ...form, busPrice: e.target.value })} />
          </label>
          <label>Kolejność
            <input type="number" min="0" step="10" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          </label>
          <button type="button" className="btn" disabled={busy === "create"} onClick={create}>
            {busy === "create" ? "DODAWANIE..." : "+ DODAJ LOTNISKO"}
          </button>
        </div>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <div className="company-section-head">
          <div>
            <span className="badge">CENNIK GŁÓWNY</span>
            <h2>Transfery lotniskowe</h2>
            <p className="muted">
              Zmiana ceny dotyczy nowych wycen. Istniejące rezerwacje zachowują zapisaną kwotę.
            </p>
          </div>
        </div>

        <div className="airport-pricing-list">
          {ordered.map((source) => {
            const row = drafts[source.airport_key] || source;
            return (
              <article className={`airport-pricing-row${row.active ? "" : " inactive"}`} key={source.airport_key}>
                <div className="airport-pricing-title">
                  <strong>{source.label}</strong>
                  <small>{source.airport_key}</small>
                </div>
                <label>Nazwa
                  <input value={row.label} onChange={(e) => patch(source.airport_key, { label: e.target.value })} />
                </label>
                <label>Adres
                  <input value={row.route_address} onChange={(e) => patch(source.airport_key, { route_address: e.target.value })} />
                </label>
                <label>Osobowy
                  <input type="number" min="0" step="10" value={row.car_price} onChange={(e) => patch(source.airport_key, { car_price: Number(e.target.value) })} />
                </label>
                <label>Bus
                  <input type="number" min="0" step="10" value={row.bus_price} onChange={(e) => patch(source.airport_key, { bus_price: Number(e.target.value) })} />
                </label>
                <label>Kolejność
                  <input type="number" min="0" step="1" value={row.sort_order} onChange={(e) => patch(source.airport_key, { sort_order: Number(e.target.value) })} />
                </label>
                <div className="airport-pricing-actions">
                  <button type="button" className="btn secondary" disabled={busy === source.airport_key} onClick={() => save(source.airport_key)}>
                    {busy === source.airport_key ? "ZAPIS..." : "ZAPISZ"}
                  </button>
                  <button
                    type="button"
                    className={`btn secondary ${row.active ? "" : "airport-enable"}`}
                    disabled={busy === `toggle:${source.airport_key}`}
                    onClick={() => toggle(source.airport_key, !row.active)}
                  >
                    {row.active ? "UKRYJ" : "AKTYWUJ"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {message && <div className={`airport-pricing-message${message.startsWith("✓") ? " ok" : ""}`}>{message}</div>}
      </section>
    </div>
  );
}
