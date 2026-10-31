"use client";
import {useEffect,useId,useState} from "react";
import {customerFetch} from "@/lib/customerFetch";

export default function RouteStopInput({label,placeholder,value,onChange,locale}:{label:string;placeholder:string;value:string;onChange:(value:string)=>void;locale:unknown}){
  const id=useId();
  const [focused,setFocused]=useState(false);
  const [options,setOptions]=useState<string[]>([]);
  useEffect(()=>{
    setOptions([]);
    if(!focused||value.trim().length<3)return;
    const controller=new AbortController();
    const timer=setTimeout(async()=>{
      try{
        const response=await customerFetch(locale,"/api/places?q="+encodeURIComponent(value),{signal:controller.signal});
        const data=await response.json();
        if(!controller.signal.aborted&&response.ok&&Array.isArray(data.suggestions)){
          setOptions(data.suggestions.map((s:{text?:string})=>s.text).filter((x:unknown)=>typeof x==="string").slice(0,5));
        }
      }catch{/* The address can also be entered manually. */}
    },350);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[value,focused,locale]);
  return <><input aria-label={label} placeholder={placeholder} list={id} autoComplete="off" maxLength={400} value={value} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onChange={e=>onChange(e.target.value)}/><datalist id={id}>{options.map((v,i)=><option key={i} value={v}/>)}</datalist></>;
}
