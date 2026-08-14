"use client";import {useState} from "react";
export default function PaymentLinkBox({booking}:{booking:any}){
 const [link,setLink]=useState(booking.payment_link??"");const [msg,setMsg]=useState("");
 if(booking.payment_method!=="employee_payment")return null;
 async function save(){const r=await fetch("/api/admin/payment-link",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bookingId:booking.id,link})});const d=await r.json();setMsg(r.ok?"✓ Link zapisany i wysłany pracownikowi.":d.error??"Błąd.");}
 return <div className="card payment-link-box"><h2>Płatność pracownika</h2><p className="muted">Wklej link do płatności. System wyśle go na e-mail pasażera.</p><input value={link} onChange={e=>setLink(e.target.value)} placeholder="https://..."/><button className="btn" onClick={save}>ZAPISZ I WYŚLIJ LINK</button>{msg&&<div className="admin-save-message">{msg}</div>}</div>
}
