"use client";
import { customerFetch } from "@/lib/customerFetch";
import { customerText } from "@/lib/customerCopy";
import { useCustomerLocale } from "@/lib/useCustomerLocale";

import { useEffect, useState } from "react";
import {
  onlinePaymentEligible,
  paymentBookingStatusAllowed,
  paymentStatusLabel
} from "@/lib/payment";

const paymentCopy: Record<string,[string,string,string]> = {"PŁATNOŚĆ ONLINE":["ONLINE PAYMENT","ONLINE-ZAHLUNG","ONLINE PLATBA"],"✓ Płatność została zaksięgowana.":["✓ Payment received.","✓ Zahlung eingegangen.","✓ Platba přijata."],"↩ Dla tej płatności zarejestrowano zwrot.":["↩ This payment has been refunded.","↩ Diese Zahlung wurde erstattet.","↩ Tato platba byla vrácena."],"⚠ Płatność wymaga weryfikacji przez MATT TRANSPORT.":["⚠ Payment requires verification by MATT TRANSPORT.","⚠ Die Zahlung muss von MATT TRANSPORT geprüft werden.","⚠ Platbu musí ověřit MATT TRANSPORT."],"Nie wykonuj kolejnej płatności.":["Do not pay again.","Bitte nicht erneut bezahlen.","Neplaťte znovu."],"Płatność online jest niedostępna dla aktualnego statusu rezerwacji.":["Online payment is unavailable for the current booking status.","Online-Zahlung ist für den aktuellen Buchungsstatus nicht verfügbar.","Online platba není pro aktuální stav rezervace dostupná."],"Płatność została przerwana. Możesz spróbować ponownie.":["Payment was cancelled. You can try again.","Die Zahlung wurde abgebrochen. Sie können es erneut versuchen.","Platba byla zrušena. Můžete to zkusit znovu."],"Płatność została przyjęta. Potwierdzamy jej status…":["Payment submitted. Checking its status…","Zahlung übermittelt. Status wird geprüft…","Platba odeslána. Ověřujeme stav…"],"✓ Płatność została zaksięgowana. Dziękujemy.":["✓ Payment received. Thank you.","✓ Zahlung eingegangen. Vielen Dank.","✓ Platba přijata. Děkujeme."],"Płatność dotarła, ale wymaga weryfikacji przez MATT TRANSPORT.":["Payment received but requires review by MATT TRANSPORT.","Zahlung eingegangen, muss aber von MATT TRANSPORT geprüft werden.","Platba dorazila, ale musí ji ověřit MATT TRANSPORT."],"Płatność została wysłana do operatora. Status może zaktualizować się za chwilę.":["Payment submitted to the provider. Status may update shortly.","Zahlung an den Anbieter gesendet. Der Status wird in Kürze aktualisiert.","Platba byla odeslána poskytovateli. Stav se brzy aktualizuje."],"Nie udało się rozpocząć płatności.":["Could not start payment.","Zahlung konnte nicht gestartet werden.","Platbu se nepodařilo zahájit."]};
export default function OnlinePaymentCard({
  booking
}: {
  booking: any;
}) {
 const fetchCustomer=(input:RequestInfo|URL,init?:RequestInit)=>customerFetch(locale,input,init);
  const locale = useCustomerLocale(booking.customer_locale);
  const t=(key:string)=>locale==="pl"?key:paymentCopy[key]?.[locale==="en"?0:locale==="de"?1:2]??customerText(key,locale);
  const [status, setStatus] = useState(
    String(booking.payment_status || "pending")
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const eligible = onlinePaymentEligible(booking);
  const bookingStatus = String(booking.status || "");
  const available =
    paymentBookingStatusAllowed(bookingStatus) &&
    !["paid", "refunded", "review"].includes(status);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const paymentResult = query.get("payment");
    const shouldFocus = query.get("pay") === "1";

    if (shouldFocus || paymentResult) {
      setTimeout(() => {
        document
          .getElementById("online-payment")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
      }, 250);
    }

    if (paymentResult === "cancelled") {
      setMessage(
        t("Płatność została przerwana. Możesz spróbować ponownie.")
      );
    }

    if (paymentResult === "success") {
      setMessage(
        t("Płatność została przyjęta. Potwierdzamy jej status…")
      );
      refreshPaymentStatus();
    }
  }, []);

  async function refreshPaymentStatus() {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const response = await fetchCustomer(
          `/api/client-booking/${booking.customer_access_token}`,
          { cache: "no-store" }
        );
        const data = await response.json();
        const next = String(
          data?.booking?.payment_status || "pending"
        );

        setStatus(next);

        if (next === "paid") {
          setMessage(t("✓ Płatność została zaksięgowana. Dziękujemy."));
          return;
        }

        if (next === "review") {
          setMessage(
            t("Płatność dotarła, ale wymaga weryfikacji przez MATT TRANSPORT.")
          );
          return;
        }
      } catch {
        // Kolejna próba poniżej.
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 1500)
      );
    }

    setMessage(
      t("Płatność została wysłana do operatora. Status może zaktualizować się za chwilę.")
    );
  }

  async function pay() {
    if (busy) return;

    setBusy(true);
    setMessage("");

    if (
      booking.company_id &&
      booking.payment_method === "employee_payment" &&
      booking.payment_link &&
      String(booking.payment_link).startsWith("http")
    ) {
      window.location.href = booking.payment_link;
      return;
    }

    try {
      const response = await fetchCustomer(
        `/api/payments/checkout/${booking.customer_access_token}`,
        { method: "POST" }
      );

      const contentType =
        response.headers.get("content-type") || "";

      const raw = await response.text();

      let data: any = {};

      if (contentType.includes("application/json")) {
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          data = {};
        }
      }

      if (!response.ok || !data.url) {
        const fallback =
          response.status === 404
            ? "Endpoint płatności nie jest dostępny w aktualnym wdrożeniu. Wymagany jest backend Stripe Checkout."
            : `Nie udało się rozpocząć płatności (HTTP ${response.status}).`;

        throw new Error(
          data.error || fallback
        );
      }

      window.location.href = data.url;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : t("Nie udało się rozpocząć płatności.")
      );
      setBusy(false);
    }
  }

  if (!eligible || booking.company_id) return null;

  return (
    <div
      id="online-payment"
      className={`online-payment-card payment-${status}`}
    >
      <div className="online-payment-head">
        <div>
          <span className="badge">{t("PŁATNOŚĆ ONLINE")}</span>
          <h3>{t(paymentStatusLabel(status))}</h3>
        </div>
        <strong>
          {Number(booking.company_id ? (booking.price_gross ?? booking.total_price) : booking.total_price).toFixed(2)} zł
        </strong>
      </div>

      {status === "paid" ? (
        <div className="online-payment-success">
          {t("✓ Płatność została zaksięgowana.")}</div>
      ) : status === "refunded" ? (
        <div className="online-payment-info">
          {t("↩ Dla tej płatności zarejestrowano zwrot.")}</div>
      ) : status === "review" ? (
        <div className="online-payment-warning">
          ⚠ Płatność wymaga weryfikacji przez MATT TRANSPORT.
          Nie wykonuj kolejnej płatności.
        </div>
      ) : !paymentBookingStatusAllowed(bookingStatus) ? (
        <div className="online-payment-info">
          {t("Płatność online jest niedostępna dla aktualnego statusu rezerwacji.")}</div>
      ) : (
        <>
          <p>
            {t("Zapłać bezpiecznie online za rezerwację")}{bookingStatus === "completed" ? t(" — płatność jest nadal dostępna po wykonaniu transportu") : ""}{booking.company_id ? t(" — kwotę brutto z VAT 8%.") : "."}
          </p>
          <button
            type="button"
            className="btn online-pay-button"
            onClick={pay}
            disabled={busy || !available}
          >
            {busy
              ? t("PRZECHODZĘ DO PŁATNOŚCI...")
              : t("💳 OPŁAĆ REZERWACJĘ ONLINE")}
          </button>
          <small>
            {t("Dostępne metody zależą od konfiguracji operatora płatności.")}</small>
        </>
      )}

      {message && (
        <div className="online-payment-message">
          {message}
        </div>
      )}
    </div>
  );
}
