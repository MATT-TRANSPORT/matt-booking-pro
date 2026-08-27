"use client";

import { useEffect, useState } from "react";
import OnlinePaymentCard from "@/components/OnlinePaymentCard";
import CustomerPushControls from "@/components/CustomerPushControls";
import { companyBookingMoney } from "@/lib/companyPortal";

const STATUS: Record<string,string> = {
  pending:"Oczekuje na potwierdzenie",
  confirmed:"Potwierdzona",
  assigned:"Kierowca przypisany",
  in_progress:"Kierowca w drodze",
  arrived:"Kierowca na miejscu",
  picked_up:"Pasażer odebrany",
  completed:"Zakończona",
  cancelled:"Anulowana"
};

export default function ClientBookingPortal({ token }: { token:string }) {
  const [data,setData] = useState<any>(null);
  const [form,setForm] = useState<any>(null);
  const [message,setMessage] = useState("");
  const [saving,setSaving] = useState(false);
  const [cancelling,setCancelling] = useState(false);
  const [showCancelConfirm,setShowCancelConfirm] = useState(false);

  useEffect(()=>{
    fetch(`/api/client-booking/${token}`)
      .then(r=>r.json().then(d=>({ok:r.ok,d})))
      .then(({ok,d})=>{
        if(!ok){setMessage(d.error||"Nie znaleziono rezerwacji.");return;}
        setData(d);
        const b=d.booking;
        setForm({
          pickupAddress:b.pickup_address||"",
          travelDate:b.travel_date||"",
          travelTime:b.travel_time||"",
          returnDate:b.return_date||"",
          returnTime:b.return_time||"",
          flightNumber:b.flight_number||"",
          returnFlightNumber:b.return_flight_number||"",
          passengers:b.passengers||1,
          vehicleType:b.vehicle_type||"car",
          invoiceRequired:!!b.invoice_required,
          companyNip:b.company_nip||"",
          notes:b.notes||""
        });
      });
  },[token]);

  async function save(){
    setSaving(true); setMessage("");
    const r=await fetch(`/api/client-booking/${token}`,{
      method:"PATCH",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(form)
    });
    const d=await r.json();
    if(!r.ok){setMessage(d.error||"Nie udało się zapisać zmian.");setSaving(false);return;}
    setData((old:any)=>({...old,booking:d.booking,editable:true}));
    setMessage(d.requiresReconfirmation
      ?"Zmiany zapisane. Rezerwacja oczekuje teraz na ponowne potwierdzenie przez MATT TRANSPORT."
      :"Zmiany zostały zapisane.");
    setSaving(false);
    window.scrollTo({top:0,behavior:"smooth"});
  }

  async function cancelBooking(){
    if(cancelling) return;
    setCancelling(true);
    setMessage("");

    try {
      const r=await fetch(`/api/client-booking/${token}`,{
        method:"DELETE"
      });
      const d=await r.json();

      if(!r.ok){
        setMessage(d.error||"Nie udało się anulować rezerwacji.");
        setCancelling(false);
        return;
      }

      setData((old:any)=>({
        ...old,
        booking:d.booking,
        editable:false,
        cancellable:false
      }));
      setShowCancelConfirm(false);
      setMessage(
        d.payment_requires_review
          ? "Rezerwacja została anulowana. Ponieważ była już opłacona, MATT TRANSPORT zweryfikuje ewentualny zwrot zgodnie z warunkami anulacji."
          : "Rezerwacja została anulowana. Potwierdzenie zostało wysłane e-mailem."
      );
      window.scrollTo({top:0,behavior:"smooth"});
    } catch {
      setMessage("Nie udało się anulować rezerwacji. Spróbuj ponownie lub zadzwoń: +48 691 242 691.");
    }

    setCancelling(false);
  }

  if(message && !data) return <main className="container client-portal-shell"><div className="card"><h1>Twoja rezerwacja</h1><div className="booking-error">{message}</div></div></main>;
  if(!data||!form) return <main className="container client-portal-shell"><div className="card"><h1>Ładowanie rezerwacji…</h1></div></main>;

  const b=data.booking;
  const editable=data.editable && !["in_progress","arrived","picked_up","completed","cancelled"].includes(b.status);
  const cancellable=(data.cancellable ?? data.editable) && ["pending","confirmed","assigned"].includes(b.status);
  const paidBooking = b.payment_status === "paid" || b.payment_status === "review";
  const driver=Array.isArray(b.drivers)?b.drivers[0]:b.drivers;
  const vehicle=Array.isArray(b.vehicles)?b.vehicles[0]:b.vehicles;
  const b2bMoney = b.company_id ? companyBookingMoney(b) : null;

  return <main className="container client-portal-shell">
    <div className="card client-portal-hero">
      <span className="badge">MATT TRANSPORT</span>
      <h1>Rezerwacja {b.booking_number}</h1>
      <div className={`client-booking-status ${b.status}`}>{STATUS[b.status]||b.status}</div>
      <p className="muted">Tutaj możesz sprawdzić szczegóły swojej rezerwacji{editable?" i wprowadzić dozwolone zmiany.":"."}</p>
    </div>

    <div className="client-portal-grid">
      <section className="card">
        <h2>Szczegóły przejazdu</h2>
        <div className="grid">
          <label>Adres
            <input disabled={!editable} value={form.pickupAddress} onChange={e=>setForm({...form,pickupAddress:e.target.value})}/>
          </label>
          <label>Data
            <input disabled={!editable} type="date" value={form.travelDate} onChange={e=>setForm({...form,travelDate:e.target.value})}/>
          </label>
          <label>{form.serviceType === "from_airport" ? "Godzina przylotu" : "Godzina wylotu"}
            <input disabled={!editable} type="time" value={form.travelTime} onChange={e=>setForm({...form,travelTime:e.target.value})}/>
          </label>
          <label>Numer lotu
            <input disabled={!editable} value={form.flightNumber} onChange={e=>setForm({...form,flightNumber:e.target.value})}/>
          </label>
          <label>Pasażerowie
            <select disabled={!editable} value={form.passengers} onChange={e=>{const p=Number(e.target.value);setForm({...form,passengers:p,vehicleType:p>3?"bus":form.vehicleType})}}>
              {[1,2,3,4,5,6,7,8].map(n=><option key={n}>{n}</option>)}
            </select>
          </label>
          <label>Pojazd
            <select disabled={!editable} value={form.vehicleType} onChange={e=>setForm({...form,vehicleType:e.target.value})}>
              <option value="car" disabled={form.passengers>3}>Samochód osobowy</option>
              <option value="bus">Bus do 8 osób</option>
            </select>
          </label>
          {b.service_type==="roundtrip"&&<>
            <label>Data powrotu<input disabled={!editable} type="date" value={form.returnDate} onChange={e=>setForm({...form,returnDate:e.target.value})}/></label>
            <label>Godzina przylotu powrotnego<input disabled={!editable} type="time" value={form.returnTime} onChange={e=>setForm({...form,returnTime:e.target.value})}/></label>
            <label>Lot powrotny<input disabled={!editable} value={form.returnFlightNumber} onChange={e=>setForm({...form,returnFlightNumber:e.target.value})}/></label>
          </>}
        </div>

        <label style={{marginTop:14}}>Uwagi
          <textarea disabled={!editable} rows={4} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
        </label>

        {b.company_id ? (
          <div style={{marginTop:14,padding:12,border:"1px solid #4f4733",borderRadius:10}}>
            <strong>Rozliczenie firmowe B2B</strong>
            <div className="muted">Ceny netto + VAT 8%. Ustawień faktury nie zmienia się z linku pasażera.</div>
          </div>
        ) : (
          <div className="grid" style={{marginTop:14}}>
            <label>Faktura VAT
              <select disabled={!editable} value={form.invoiceRequired?"1":"0"} onChange={e=>setForm({...form,invoiceRequired:e.target.value==="1"})}>
                <option value="0">Nie</option><option value="1">Tak</option>
              </select>
            </label>
            {form.invoiceRequired&&<label>NIP<input disabled={!editable} inputMode="numeric" maxLength={10} value={form.companyNip} onChange={e=>setForm({...form,companyNip:e.target.value.replace(/\D/g,"").slice(0,10)})}/></label>}
          </div>
        )}


        {! ["completed","cancelled"].includes(b.status) && <CustomerPushControls token={token} />}

        {editable&&<div className="client-edit-warning">
          {paidBooking
            ? "Rezerwacja jest już opłacona. Możesz ją edytować, ale zmiana adresu, daty, godziny lub ceny wymaga ponownego sprawdzenia przez MATT TRANSPORT. Jeśli zmieni się kwota, płatność zostanie oznaczona jako DO WERYFIKACJI — nie płać ponownie."
            : "Zmiana adresu, daty lub godziny powoduje ponowne sprawdzenie rezerwacji przez MATT TRANSPORT."}
        </div>}

        {message&&<div className={message.startsWith("Zmiany")?"client-success-message":"booking-error"}>{message}</div>}

        {editable&&<button className="btn" style={{width:"100%",marginTop:16}} disabled={saving||cancelling} onClick={save}>{saving?"ZAPISYWANIE...":"ZAPISZ ZMIANY"}</button>}

        {cancellable&&!showCancelConfirm&&
          <button
            type="button"
            className="btn secondary"
            style={{width:"100%",marginTop:14,borderColor:"#8b343b",color:"#ffb9bf"}}
            disabled={saving||cancelling}
            onClick={()=>setShowCancelConfirm(true)}
          >
            ANULUJ REZERWACJĘ
          </button>
        }

        {cancellable&&showCancelConfirm&&
          <div style={{marginTop:14,padding:16,border:"1px solid #8b343b",borderRadius:12,background:"#2b171a"}}>
            <strong style={{color:"#ffb9bf"}}>
              Czy na pewno chcesz całkowicie anulować tę rezerwację?
            </strong>
            <p className="muted" style={{marginTop:8}}>
              Kurs zostanie oznaczony jako anulowany i usunięty z planu realizacji. Jeśli rezerwacja była opłacona, zwrot zostanie zweryfikowany przez MATT TRANSPORT zgodnie z warunkami anulacji.
            </p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12}}>
              <button type="button" className="btn secondary" disabled={cancelling} onClick={()=>setShowCancelConfirm(false)}>
                NIE, ZOSTAW
              </button>
              <button type="button" className="btn" style={{background:"#8b343b",borderColor:"#a8434c"}} disabled={cancelling} onClick={cancelBooking}>
                {cancelling?"ANULOWANIE...":"TAK, ANULUJ"}
              </button>
            </div>
          </div>
        }
      </section>

      <aside className="card client-booking-summary">
        <h2>Podsumowanie</h2>
        <div><span>Lotnisko</span><strong>{b.airport_label}</strong></div>
        {b.company_id && b2bMoney ? <>
          <div><span>Netto</span><strong>{b2bMoney.net.toFixed(2)} zł</strong></div>
          <div><span>VAT {b2bMoney.vatRate.toFixed(0)}%</span><strong>{b2bMoney.vat.toFixed(2)} zł</strong></div>
          <div><span>Brutto</span><strong>{b2bMoney.gross.toFixed(2)} zł</strong></div>
        </> : <div><span>Kwota</span><strong>{Number(b.total_price).toFixed(2)} zł</strong></div>}
        <div><span>Status</span><strong>{STATUS[b.status]||b.status}</strong></div>
        <div><span>Płatność</span><strong>{b.company_id
          ? (b.payment_method === "employee_payment" ? "Płatność online firmy" : "Przelew firmowy")
          : (b.payment_method === "online" || b.online_payment_requested)
          ? "Płatność online po potwierdzeniu"
          : b.payment_method === "bank_transfer"
          ? "Przelew tradycyjny"
          : "Gotówka u kierowcy"}</strong></div>
        <OnlinePaymentCard booking={b} />
        {vehicle&&<div><span>Pojazd</span><strong>{vehicle.name} · {vehicle.registration}</strong></div>}
        {driver&&<div><span>Kierowca</span><strong>{driver.full_name}</strong></div>}
        {driver?.phone&&<a className="btn secondary" href={`tel:${driver.phone}`}>📞 ZADZWOŃ DO KIEROWCY</a>}
        <a className="btn secondary" href="tel:+48691242691">📞 MATT TRANSPORT</a>
      </aside>
    </div>
  </main>;
}
