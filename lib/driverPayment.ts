/** Driver-facing collection rules. Company invoices / online transfers are not cash due. */
export function driverPaymentDue(booking: any) {
  const gross = Number(booking?.company_id
    ? booking?.price_gross ?? booking?.total_price ?? 0
    : booking?.total_price ?? 0);
  const grossCents = Number.isFinite(gross) && gross > 0 ? Math.round(gross * 100) : 0;
  const status = String(booking?.payment_status || "pending").toLowerCase();
  const method = String(booking?.payment_method || "").toLowerCase();
  const company = Boolean(booking?.company_id);
  const settled = status === "paid";
  const review = status === "review";
  const refunded = status === "refunded";
  const online = method === "online" || method === "employee_payment" || Boolean(booking?.online_payment_requested);
  const transfer = method === "bank_transfer";
  const cash = !company && !online && !transfer && !settled && !review && !refunded && status !== "failed";
  const collectibleCents = cash ? grossCents : 0;
  let label = "KWOTA DO POBRANIA";
  let note = "Gotówka od pasażera; potwierdź, czy płatność nie została już rozliczona.";
  if (settled) { label = "OPŁACONO"; note = "Nie pobieraj ponownie ceny przejazdu."; }
  else if (review || refunded || status === "failed") {
    label = "PŁATNOŚĆ DO WYJAŚNIENIA";
    note = "Skontaktuj się z dyspozytorem przed pobraniem kwoty.";
  } else if (company) {
    label = method === "employee_payment" ? "PŁATNOŚĆ ONLINE FIRMY" : "ROZLICZENIE FIRMOWE";
    note = "Nie pobieraj ceny przejazdu od pasażera; rozliczenie prowadzi firma.";
  } else if (online) {
    label = "PŁATNOŚĆ ONLINE";
    note = "Klient płaci online — nie pobieraj ponownie bez potwierdzenia.";
  } else if (transfer) {
    label = "PRZELEW TRADYCYJNY";
    note = "Płatność przelewem — nie pobieraj gotówki bez potwierdzenia.";
  }
  return { grossCents, collectibleCents, label, note };
}

export function driverPln(cents: number): string {
  return (Math.max(0, cents) / 100).toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + " zł";
}
