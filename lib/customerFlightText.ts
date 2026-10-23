import { resolveCustomerLocale } from "@/lib/bookingLocale";
const statuses:Record<string,[string,string,string,string]>={
 scheduled:['Zaplanowany','Scheduled','Geplant','Plánovaný'],active:['W powietrzu','In flight','In der Luft','Ve vzduchu'],en_route:['W powietrzu','In flight','In der Luft','Ve vzduchu'],landed:['Wylądował','Landed','Gelandet','Přistál'],cancelled:['Odwołany','Cancelled','Annulliert','Zrušený'],diverted:['Przekierowany','Diverted','Umgeleitet','Odkloněný'],incident:['Zdarzenie lotnicze','Flight incident','Flugvorfall','Letecká událost'],unknown:['Brak statusu','Status unavailable','Status nicht verfügbar','Stav není dostupný']
};
export function customerFlightStatus(value:unknown,localeInput:unknown) {
 const locale=resolveCustomerLocale(localeInput),index=['pl','en','de','cs'].indexOf(locale);
 return (statuses[String(value||'unknown').toLowerCase()]||statuses.unknown)[index];
}
const alerts:Record<string,[string,string,string,string]>={
 date_mismatch:['Dane lotu oczekują na potwierdzenie','Flight details awaiting confirmation','Flugdaten werden noch bestätigt','Údaje letu čekají na potvrzení'],
 cancelled:['Lot odwołany','Flight cancelled','Flug annulliert','Let zrušen'],diverted:['Lot przekierowany','Flight diverted','Flug umgeleitet','Let odkloněn'],delay:['Opóźnienie lotu','Flight delay','Flugverspätung','Zpoždění letu'],landed:['Samolot wylądował','Flight landed','Flug gelandet','Letadlo přistálo'],eta_change:['Zmiana czasu przylotu','Arrival time changed','Ankunftszeit geändert','Změna času příletu'],eta_conflict:['Zmiana planu odbioru wymaga sprawdzenia','Pickup plan requires review','Abholplan muss geprüft werden','Plán vyzvednutí je třeba ověřit']
};
const instructions={pl:'Monitorujemy sytuację. W razie pytań skontaktuj się z MATT TRANSPORT lub kierowcą.',en:'We are monitoring the situation. Contact MATT TRANSPORT or your driver if you have questions.',de:'Wir beobachten die Lage. Bei Fragen kontaktieren Sie MATT TRANSPORT oder Ihren Fahrer.',cs:'Sledujeme situaci. V případě dotazů kontaktujte MATT TRANSPORT nebo řidiče.'};
export function customerFlightAlert(alert:any,localeInput:unknown,flight?:any) {
 const locale=resolveCustomerLocale(localeInput),index=['pl','en','de','cs'].indexOf(locale);
 const number=String(flight?.flight_number||'');
 const title=(alerts[String(alert.alert_type)]||['Aktualizacja lotu','Flight update','Flugaktualisierung','Aktualizace letu'])[index];
 const delay=Number(alert.payload?.delay??flight?.arr_delayed??flight?.dep_delayed??0);
 const delayText=alert.alert_type==='delay'&&Number.isFinite(delay)?` +${delay} min`:'';
 return {leg:alert.leg,severity:alert.severity,updated_at:alert.updated_at,title:`${number?number+' · ':''}${title}${delayText}`,message:instructions[locale]};
}
