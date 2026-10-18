// A local, read-only Supabase protocol fixture. No production credentials are used.
const http=require('node:http');
const {spawn}=require('node:child_process');
const user={id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'test@example.invalid',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
const company={id:'22222222-2222-4222-8222-222222222222',name:'TEST COMPANY',email:'test@example.invalid',active:true,payment_days:14};
const employee={id:'33333333-3333-4333-8333-333333333333',company_id:company.id,first_name:'Test',last_name:'User',active:true,email:'test@example.invalid'};
const booking={id:'fixture-booking',company_id:company.id,company_employee_id:employee.id,booking_number:'TEST-COMPANY',customer_name:'Test User',customer_locale:'de',pickup_address:'Radlin, Mariacka 9',airport_key:'pyrzowice',airport_label:'Katowice-Pyrzowice',travel_date:'2027-01-20',travel_time:'08:30',return_date:'2027-01-27',return_time:'14:55',service_type:'roundtrip',status:'confirmed',vehicle_type:'bus',passengers:8,price_net:800,price_gross:864,vat_price:64,vat_rate:8,total_price:864,payment_method:'company_transfer',payment_status:'pending',customer_access_token:'fixture-token',drivers:null,vehicles:null,return_driver:null,return_vehicle:null};
const terms={id:'fixture-terms',company_id:company.id,active:true,effective_from:'2026-01-01',pricing_origin_address:'Książenice, Kościelna 29',free_km:40,extra_km_rate_net:2.4,payment_days:14,use_custom_pricing:false};
const tables={
 company_users:[{id:'fixture-membership',role:'admin',company_id:company.id,active:true,companies:company}],
 companies:[company],bookings:[booking],company_employees:[employee],company_pricing_terms:[terms],
 company_addresses:[],company_booking_templates:[],company_settlements:[],company_booking_documents:[],
 company_airport_prices:[],company_pricing_airports:[],profiles:[{id:user.id,role:'company'}],
 airport_pricing:[{airport_key:'pyrzowice',label:'Katowice-Pyrzowice',car_price:290,bus_price:400,active:true,sort_order:1,route_address:'Katowice-Pyrzowice'}]
};
const fixture=http.createServer((req,res)=>{
 res.setHeader('content-type','application/json');
 const url=new URL(req.url,'http://127.0.0.1:3201');
 if(req.method!=='GET'){res.writeHead(405);res.end(JSON.stringify({error:'Read-only local fixture'}));return;}
 if(url.pathname==='/auth/v1/user'){res.end(JSON.stringify(user));return;}
 const table=url.pathname.split('/').at(-1);
 if(!url.pathname.startsWith('/rest/v1/')||!Object.hasOwn(tables,table)){res.writeHead(404);res.end(JSON.stringify({error:'Unknown fixture table: '+table}));return;}
 const rows=tables[table];
 const single=String(req.headers.accept||'').includes('vnd.pgrst.object');
 res.setHeader('content-range',`0-${Math.max(0,rows.length-1)}/${rows.length}`);
 res.end(JSON.stringify(single?(rows[0]||null):rows));
});
fixture.listen(3201,'127.0.0.1',()=>{
 const app=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','--port','3100','--hostname','127.0.0.1'],{stdio:'inherit',env:process.env});
 app.on('exit',code=>{fixture.close();process.exit(code||0);});
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{app.kill(signal);fixture.close();});
});
