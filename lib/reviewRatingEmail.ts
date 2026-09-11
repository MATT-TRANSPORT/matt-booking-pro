import type { BookingMail } from "@/lib/emailTemplates";

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function reviewRatingEmail(booking: BookingMail, ratingUrl: string) {
  return {
    subject: `Jak minęła podróż? – ${booking.booking_number}`,
    html: `<div style="font-family:Arial,sans-serif;background:#0b0e13;color:#fff;padding:28px">
      <div style="max-width:650px;margin:auto;background:#151923;border:1px solid #343b49;border-radius:16px;padding:28px">
        <h2 style="color:#f1d28b;margin:0 0 8px">MATT TRANSPORT</h2>
        <h1 style="margin:0 0 16px">Jak minęła podróż?</h1>
        <p style="color:#aab1bc;line-height:1.7">Dziękujemy za przejazd. Oceń usługę w skali 1–5 — zajmie to kilka sekund.</p>
        <div style="margin:24px 0;text-align:center">
          <a href="${esc(ratingUrl)}" style="display:inline-block;background:#d5ae5d;color:#111;padding:15px 24px;border-radius:11px;text-decoration:none;font-weight:900">⭐ OCEŃ PRZEJAZD</a>
        </div>
        <div style="background:#10141b;border:1px solid #343b49;border-radius:14px;padding:16px;line-height:1.7">
          <span style="color:#aab1bc">Rezerwacja:</span> <strong>${esc(booking.booking_number)}</strong><br/>
          <span style="color:#aab1bc">Klient:</span> <strong>${esc(booking.customer_name)}</strong>
        </div>
        <p style="margin-top:18px;color:#aab1bc;font-size:12px;line-height:1.6">Po najwyższej ocenie możesz jednym kliknięciem opublikować opinię również w Google. Niższa ocena i uwagi trafią bezpośrednio do MATT TRANSPORT.</p>
      </div>
    </div>`
  };
}
