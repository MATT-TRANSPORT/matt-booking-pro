"use client";

import { useEffect, useState } from "react";
import { isBookingLocale, type BookingLocale } from "@/lib/bookingLocale";

export default function TestEnvironmentNotice() {
  const [locale, setLocale] = useState<BookingLocale>("pl");
  useEffect(() => {
    const sync = () => {
      const value = document.documentElement.lang;
      setLocale(isBookingLocale(value) ? value : "pl");
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {attributes:true,attributeFilter:["lang"]});
    return () => observer.disconnect();
  }, []);
  const text = {
    pl: "ŚRODOWISKO TESTOWE — rezerwacje nie są realizowane. Używaj wyłącznie danych testowych.",
    en: "TEST ENVIRONMENT — bookings will not be fulfilled. Use test data only.",
    de: "TESTUMGEBUNG — Buchungen werden nicht ausgeführt. Verwenden Sie nur Testdaten.",
    cs: "TESTOVACÍ PROSTŘEDÍ — rezervace nebudou realizovány. Používejte pouze testovací údaje."
  }[locale];
  return <aside role="status" style={{padding:"12px 16px",background:"#f1d28b",color:"#171717",textAlign:"center",fontSize:14,fontWeight:700}}>{text}</aside>;
}
