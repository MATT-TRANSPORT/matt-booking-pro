export const STATUS_PL: Record<string,string> = {
  pending: "Oczekuje",
  confirmed: "Potwierdzona",
  assigned: "Kierowca przypisany",
  in_progress: "W realizacji",
  arrived: "Kierowca na miejscu",
  picked_up: "Pasażer odebrany",
  completed: "Zakończona",
  cancelled: "Anulowana"
};

export function statusPl(value?: string | null) {
  if (!value) return "—";
  const normalized = String(value).trim().toLowerCase().replaceAll(" ", "_");
  return STATUS_PL[normalized] ?? value;
}
