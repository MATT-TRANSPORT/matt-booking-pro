const { test, expect } = require('@playwright/test');
const copy = {
  pl: {round:'🔁 W obie strony',next:'DALEJ',back:'WSTECZ',bus:'🚐 Bus do 8 osób',summary:'PODSUMOWANIE',book:'ZAREZERWUJ',name:'Imię i nazwisko',phone:'Telefon',email:'E-mail',success:'Dziękujemy! Rezerwacja przyjęta',general:'Transport pozostały',wedding:'Dane do przygotowania umowy',pay:'💳 OPŁAĆ REZERWACJĘ ONLINE',paid:'Opłacono'},
  en: {round:'🔁 Round trip',next:'NEXT',back:'BACK',bus:'🚐 Minibus up to 8 passengers',summary:'SUMMARY',book:'BOOK NOW',name:'Full name',phone:'Phone',email:'Email',success:'Thank you! Booking received',general:'Other transport',wedding:'Details for your agreement',pay:'💳 PAY FOR BOOKING ONLINE',paid:'Paid'},
  de: {round:'🔁 Hin- und Rückfahrt',next:'WEITER',back:'ZURÜCK',bus:'🚐 Kleinbus bis 8 Personen',summary:'ZUSAMMENFASSUNG',book:'JETZT BUCHEN',name:'Vor- und Nachname',phone:'Telefon',email:'E-Mail',success:'Vielen Dank! Buchung eingegangen',general:'Weitere Fahrten',wedding:'Angaben zur Vertragserstellung',pay:'💳 BUCHUNG ONLINE BEZAHLEN',paid:'Bezahlt'},
  cs: {round:'🔁 Tam a zpět',next:'DALŠÍ',back:'ZPĚT',bus:'🚐 Minibus až pro 8 osob',summary:'SHRNUTÍ',book:'REZERVOVAT',name:'Jméno a příjmení',phone:'Telefon',email:'E-mail',success:'Děkujeme! Rezervace přijata',general:'Ostatní doprava',wedding:'Údaje pro přípravu smlouvy',pay:'💳 ZAPLATIT REZERVACI ONLINE',paid:'Zaplaceno'}
};
const booking = locale => ({id:'fixture',booking_number:'TEST-ONLY',customer_locale:locale,customer_name:'Test User',customer_access_token:'fixture-token',pickup_address:'Radlin, Mariacka 9',airport_label:'Katowice-Pyrzowice',airport_key:'pyrzowice',travel_date:'2027-01-20',travel_time:'08:30',return_date:'2027-01-27',return_time:'14:55',service_type:'roundtrip',passengers:8,vehicle_type:'bus',total_price:800,status:'confirmed',payment_method:'online',payment_status:'pending',online_payment_requested:true});

test.beforeEach(async ({context,page}, info) => {
  const locale = info.project.metadata.bookingLocale;
  const writes = [];
  info.writes = writes;
  info.browserErrors = [];
  page.on('pageerror',error=>info.browserErrors.push(error.message));
  // Every API request is fulfilled locally. Neither the production database nor
  // Stripe, Resend, Maps, analytics or push providers can receive a request.
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if(url.hostname !== '127.0.0.1') return route.abort();
    if(!url.pathname.startsWith('/api/')) return route.continue();
    if(req.method() !== 'GET') writes.push({path:url.pathname,body:req.postDataJSON(),localeHeader:req.headers()['x-matt-locale']});
    let data = {};
    if(url.pathname === '/api/airports') data={airports:{pyrzowice:{label:'Katowice-Pyrzowice',car:290,bus:400},balice:{label:'Kraków Balice',car:390,bus:500}}};
    else if(url.pathname === '/api/places') data={suggestions:[]};
    else if(url.pathname === '/api/route') data={distanceKm:20};
    else if(url.pathname === '/api/general-route') data={distanceKm:120,durationSeconds:7200};
    else if(url.pathname === '/api/bookings') data={booking_number:'TEST-ONLY',total_price:800,customer_access_token:'fixture-token'};
    else if(url.pathname === '/api/general-bookings') data={booking_number:'TEST-ONLY',distance_km:120,customer_access_token:'fixture-token'};
    else if(url.pathname === '/api/wedding-bookings') data={booking_number:'TEST-WEDDING'};
    else if(url.pathname.endsWith('/status') && url.pathname.includes('/client-booking/')) data={booking:booking(locale),flights:[],alerts:[],history:[]};
    else if(url.pathname === '/api/client-booking/fixture-token') data={booking:booking(locale),editable:true,cancellable:true};
    else if(url.pathname.endsWith('/checkout/fixture-token')) data={url:'http://127.0.0.1:3100/rezerwacja/fixture-token?lang='+locale+'&payment=cancelled'};
    else if(url.pathname.includes('/growth/')) data={ok:true};
    else return route.fulfill({status:501,json:{error:'Unconfigured local fixture: '+url.pathname}});
    return route.fulfill({status:200,json:data});
  });
});

test('airport round trip offers only cash and online payment and keeps route, dates and locale', async ({page}, info) => {
  const lang=info.project.metadata.bookingLocale, mobile=info.project.metadata.mobile,t=copy[lang];
  await page.goto(`/booking?service=airport&lang=${lang}`);
  await expect(page.locator('html')).toHaveAttribute('lang',lang);
  await page.getByRole('button',{name:t.round,exact:!mobile}).click();
  await page.getByPlaceholder({pl:'Wpisz adres',en:'Enter address',de:'Adresse eingeben',cs:'Zadejte adresu'}[lang]).fill('Radlin, Mariacka 9');
  await page.locator('select').filter({has:page.locator('option[value="pyrzowice"]')}).selectOption('pyrzowice');
  if(mobile) await page.getByRole('button',{name:t.next,exact:true}).click();
  await page.locator('input[type="date"]').nth(0).fill('2027-01-20');
  await page.locator('input[type="time"]').nth(0).fill('08:30');
  await page.locator('input[type="date"]').nth(1).fill('2027-01-27');
  await page.locator('input[type="time"]').nth(1).fill('14:55');
  await page.locator('select').filter({has:page.locator('option',{hasText:/^8$/})}).selectOption('8');
  if(mobile){await page.getByRole('button',{name:t.next,exact:true}).click();await page.getByRole('button',{name:t.bus,exact:false}).click();}
  else await page.getByRole('button',{name:t.bus.replace(/^🚐 /,''),exact:true}).click();
  await page.getByLabel(t.name,{exact:true}).fill('Test User');
  await page.getByLabel(t.phone,{exact:true}).fill('+48123456789');
  await page.getByLabel(t.email,{exact:true}).fill('test@example.invalid');
  await expect(page.locator('input[type="radio"]')).toHaveCount(2);
  await expect(page.locator('[value="bank_transfer"]')).toHaveCount(0);
  await page.locator('input[type="radio"][value="online"]').check();
  if(mobile) await page.getByRole('button',{name:t.summary,exact:true}).click();
  await expect(page.locator('body')).toContainText('800.00');
  await page.getByRole('button',{name:t.book,exact:true}).click();
  await expect(page.getByRole('heading',{name:t.success,exact:true})).toBeVisible();
  const write=info.writes.find(x=>x.path==='/api/bookings');
  expect(write.localeHeader).toBe(lang);
  expect(write.body).toMatchObject({locale:lang,serviceType:'roundtrip',vehicleType:'bus',passengers:8,paymentMethod:'online',travelDate:'2027-01-20',travelTime:'08:30',returnDate:'2027-01-27',returnTime:'14:55',distanceKm:20});
  await expect(page.locator('.success-actions a')).toHaveAttribute('href',`/booking?lang=${lang}`);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('changing flag updates the mounted airport form without clearing data', async ({page},info)=>{
  const mobile=info.project.metadata.mobile;
  await page.goto('/booking?service=airport&lang=pl');
  if(mobile) await page.getByRole('button',{name:'🔁 W obie strony',exact:false}).click();
  await page.getByPlaceholder('Wpisz adres',{exact:true}).fill('Radlin, Mariacka 9');
  await page.getByRole('button',{name:'Deutsch',exact:true}).click();
  await expect(page.getByPlaceholder('Adresse eingeben',{exact:true})).toHaveValue('Radlin, Mariacka 9');
  await expect(page.locator('html')).toHaveAttribute('lang','de');
  await expect(page).toHaveURL(/lang=de/);
});

test('wedding and general forms display translated headings and validation', async ({page},info)=>{
  const lang=info.project.metadata.bookingLocale;
  await page.goto('/transport?lang='+lang);
  await expect(page.getByRole('heading',{name:copy[lang].general,exact:true})).toBeVisible();
  await page.locator('.general-transport-layout button.btn').click();
  await expect(page.getByText({pl:'Uzupełnij wymagane pola.',en:'Please complete all required fields.',de:'Bitte füllen Sie alle Pflichtfelder aus.',cs:'Vyplňte povinná pole.'}[lang],{exact:true})).toBeVisible();
  await page.goto('/wesele?lang='+lang);
  await expect(page.getByRole('heading',{name:copy[lang].wedding,exact:true})).toBeVisible();
  expect(info.writes.filter(x=>/bookings$/.test(x.path))).toEqual([]);
});

test('portal payment button preserves language through simulated cancellation',async({page},info)=>{
  const lang=info.project.metadata.bookingLocale;
  await page.goto('/rezerwacja/fixture-token?lang='+lang);
  await page.getByRole('button',{name:copy[lang].pay,exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`lang=${lang}&payment=cancelled`));
  await expect(page.locator('html')).toHaveAttribute('lang',lang);
  expect(info.writes.some(x=>x.path==='/api/payments/checkout/fixture-token')).toBe(true);
});

test('general round-trip submission carries locale without contacting a backend',async({page},info)=>{
  const lang=info.project.metadata.bookingLocale,t=copy[lang];
  await page.goto('/transport?lang='+lang);
  await page.locator('.general-transport-layout input').nth(0).fill('Radlin, Mariacka 9');
  await page.locator('.general-transport-layout input').nth(1).fill('Katowice, Rynek 1');
  await page.locator('input[type="checkbox"]').first().check();
  await page.locator('input[type="date"]').nth(0).fill('2027-01-20');
  await page.locator('input[type="time"]').nth(0).fill('08:30');
  await page.locator('input[type="date"]').nth(1).fill('2027-01-27');
  await page.locator('input[type="time"]').nth(1).fill('14:55');
  await page.getByLabel(t.name,{exact:true}).fill('Test User');
  await page.getByLabel(t.phone,{exact:true}).fill('+48123456789');
  await page.getByLabel(t.email,{exact:true}).fill('test@example.invalid');
  await page.locator('.general-transport-layout button.btn').click();
  await expect.poll(()=>info.writes.filter(x=>x.path==='/api/general-bookings').length).toBe(1);
  const write=info.writes.find(x=>x.path==='/api/general-bookings');
  expect(write.body).toMatchObject({locale:lang,roundtrip:true,returnDate:'2027-01-27',returnTime:'14:55'});
  await expect(page.locator('.general-transport-success a').first()).toHaveAttribute('href',`/rezerwacja/fixture-token?lang=${lang}`);
});

test('wedding submission carries locale and requested vehicles to local fixture',async({page},info)=>{
  const lang=info.project.metadata.bookingLocale;
  await page.goto('/wesele?lang='+lang);
  const inputs=page.locator('.wedding-form-card .grid input');
  for(const [index,value] of [[0,'Test User'],[1,'2027-01-20'],[2,'18:30'],[3,'Test Restaurant'],[4,'Radlin, Mariacka 9'],[5,'2'],[6,'+48123456789'],[7,'test@example.invalid']]) await inputs.nth(index).fill(value);
  await page.locator('.wedding-submit').click();
  await expect.poll(()=>info.writes.filter(x=>x.path==='/api/wedding-bookings').length).toBe(1);
  expect(info.writes.find(x=>x.path==='/api/wedding-bookings').body).toMatchObject({locale:lang,vehiclesCount:2,vehicleTypes:['bus','bus']});
  await expect(page.locator('.wedding-success a')).toHaveAttribute('href',`/booking?lang=${lang}`);
});

test('company payment page uses the saved booking locale and translated paid status',async({page},info)=>{
  const lang=info.project.metadata.bookingLocale;
  await page.route('**/api/payments/company-employee/fixture-token',route=>route.fulfill({json:{booking:{...booking(lang),amount:864,payment_status:'paid',booking_status:'confirmed'}}}));
  await page.goto('/platnosc/fixture-token');
  await expect(page.getByRole('heading',{name:{pl:'Płatność firmowa online',en:'Company online payment',de:'Online-Firmenzahlung',cs:'Firemní online platba'}[lang],exact:true})).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang',lang);
  await expect(page.locator('.online-payment-success').first()).toContainText({pl:'Płatność została zaksięgowana',en:'Payment received',de:'Zahlung eingegangen',cs:'Platba přijata'}[lang]);
  expect(info.writes.filter(x=>x.path.startsWith('/api/payments/'))).toEqual([]);
  const contactLinks=page.locator('aside a');
  const first=await contactLinks.nth(0).boundingBox(),second=await contactLinks.nth(1).boundingBox();
  expect(first).toBeTruthy();expect(second).toBeTruthy();
  expect(second.y).toBeGreaterThanOrEqual(first.y+first.height);

});

test('My rides shows translated private bookings and preserves language in links',async({page},info)=>{
 const lang=info.project.metadata.bookingLocale;
 await page.route('**/api/customer-account/me',route=>route.fulfill({json:{authenticated:true,email:'test@example.invalid',bookings:[booking(lang)],weddings:[]}}));
 await page.goto('/moje-przejazdy?lang='+lang);
 await expect(page.getByRole('heading',{name:{pl:'Moje przejazdy',en:'My rides',de:'Meine Fahrten',cs:'Moje jízdy'}[lang],exact:true})).toBeVisible();
 await expect(page.locator(`a[href="/rezerwacja/fixture-token?lang=${lang}"]`).first()).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('lang',lang);
});

test('repeat airport round trip preserves locale in the new booking',async({page},info)=>{
 const lang=info.project.metadata.bookingLocale;
 await page.addInitScript(({lang})=>sessionStorage.setItem('matt_customer_repeat',JSON.stringify({kind:'airport',locale:lang,serviceType:'roundtrip',address:'Radlin, Mariacka 9',airport:'pyrzowice',vehicle:'bus',passengers:8,customerName:'Test User',phone:'+48123456789',email:'test@example.invalid',paymentMethod:'bank_transfer'})),{lang});
 await page.goto('/booking?repeat=1&service=airport&lang='+lang);
 await page.locator('input[type="date"]').nth(0).fill('2027-01-20');
 await page.locator('input[type="time"]').nth(0).fill('08:30');
 await page.locator('input[type="date"]').nth(1).fill('2027-01-27');
 await page.locator('input[type="time"]').nth(1).fill('14:55');
 await expect(page.locator('option[value="bank_transfer"]')).toHaveCount(0);
 await page.locator('.customer-repeat-submit').click();
 await expect.poll(()=>info.writes.filter(x=>x.path==='/api/bookings').length).toBe(1);
 expect(info.writes.find(x=>x.path==='/api/bookings').body).toMatchObject({locale:lang,serviceType:'roundtrip',returnDate:'2027-01-27',passengers:8,paymentMethod:'cash'});
 await expect(page.locator('.customer-repeat-success a').first()).toHaveAttribute('href',`/rezerwacja/fixture-token?lang=${lang}`);
});

test.afterEach(async({page},info)=>{
 expect(info.browserErrors).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 if(info.project.name==='de-mobile' && info.title.includes('company payment page')) await page.screenshot({path:'test-results/de-mobile-payment.png',fullPage:true});
});

test('language selection works when browser storage is unavailable',async({page})=>{
 await page.addInitScript(()=>{const fail=()=>{throw new DOMException('Storage blocked','SecurityError')};Object.defineProperty(Storage.prototype,'getItem',{value:fail});Object.defineProperty(Storage.prototype,'setItem',{value:fail});});
 await page.goto('/booking?service=airport&lang=pl');
 await page.getByRole('button',{name:'Deutsch',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('lang','de');
 await expect(page.getByRole('button',{name:'🔁 Hin- und Rückfahrt',exact:false})).toBeVisible();
 await expect(page).toHaveURL(/lang=de/);
});

test('review form restores saved language without a query parameter',async({page},info)=>{
 const lang=info.project.metadata.bookingLocale;
 await page.route('**/api/review/fixture-token',route=>route.fulfill({json:{booking:{...booking(lang),status:'completed'},review:null,google_url:null}}));
 await page.goto('/opinia/fixture-token');
 await expect(page.getByRole('heading',{name:{pl:'Jak minęła podróż?',en:'How was your journey?',de:'Wie war Ihre Fahrt?',cs:'Jaká byla vaše cesta?'}[lang],exact:true})).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('lang',lang);
 expect(info.writes.filter(x=>x.path.startsWith('/api/review/'))).toEqual([]);
});

test('B2B login page displays the selected customer language',async({page},info)=>{
 const lang=info.project.metadata.bookingLocale;
 await page.goto('/firma/login?lang='+lang);
 await expect(page.getByRole('heading',{name:{pl:'Panel klienta biznesowego',en:'Business customer portal',de:'Geschäftskundenportal',cs:'Portál firemního zákazníka'}[lang],exact:true})).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('lang',lang);
 expect(info.writes).toEqual([]);
});

test('authenticated company screens render the selected language and retain it in navigation',async({page,context},info)=>{
 const lang=info.project.metadata.bookingLocale;
 const user={id:'11111111-1111-4111-8111-111111111111',email:'test@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const access_token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user.id,aud:'authenticated',role:'authenticated',exp:4102444800,email:user.email})+'.test-signature';
 const session={access_token,refresh_token:'test-only-refresh',expires_at:4102444800,expires_in:3600,token_type:'bearer',user};
 await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+encode(session),domain:'127.0.0.1',path:'/'}]);
 const headings={
  '/firma':['TEST COMPANY','TEST COMPANY','TEST COMPANY','TEST COMPANY'],
  '/firma/rezerwacje':['Rezerwacje firmy','Company bookings','Firmenbuchungen','Firemní rezervace'],
  '/firma/nowa-rezerwacja':['Nowa rezerwacja','New booking','Neue Buchung','Nová rezervace'],
  '/firma/pracownicy':['Pracownicy','Employees','Mitarbeiter','Zaměstnanci'],
  '/firma/szablony':['Szablony i rezerwacje cykliczne','Templates and recurring bookings','Vorlagen und regelmäßige Buchungen','Šablony a opakované rezervace'],
  '/firma/kalendarz':['Kalendarz transportów','Journey calendar','Fahrtenkalender','Kalendář jízd'],
  '/firma/cennik':['Cennik i warunki handlowe','Prices and commercial terms','Preise und Geschäftskonditionen','Ceník a obchodní podmínky'],
  '/firma/faktury':['Rozliczenia','Billing','Abrechnung','Vyúčtování'],
  '/firma/ustawienia':['Dane firmy','Company details','Firmendaten','Údaje firmy']
 };
 const index=['pl','en','de','cs'].indexOf(lang);
 for(const [path,values] of Object.entries(headings)){
  await page.goto(path+'?lang='+lang);
  await expect(page.getByRole('heading',{name:values[index],exact:true}).first()).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang',lang);
  for(const link of await page.locator('.company-nav a').all()) await expect(link).toHaveAttribute('href',new RegExp(`lang=${lang}`));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),path+' must fit the viewport').toBe(true);
 }
 await page.goto('/firma/rezerwacje/fixture-booking?lang='+lang);
 await page.getByRole('button',{name:['POWTÓRZ REZERWACJĘ','REPEAT BOOKING','BUCHUNG WIEDERHOLEN','ZOPAKOVAT REZERVACI'][index],exact:true}).click();
 const repeat=page.locator('.repeat-box');
 await repeat.locator('input[type="date"]').nth(0).fill('2027-02-20');
 await repeat.locator('input[type="time"]').nth(0).fill('08:30');
 const submit=repeat.getByRole('button',{name:['UTWÓRZ NOWY KURS','CREATE NEW JOURNEY','NEUE FAHRT ERSTELLEN','VYTVOŘIT NOVOU JÍZDU'][index],exact:true});
 await submit.click();
 expect(info.writes).toEqual([]);
 await repeat.locator('input[type="date"]').nth(1).fill('2027-02-27');
 await repeat.locator('input[type="time"]').nth(1).fill('14:55');
 let submitted;
 await page.route('**/api/company/bookings/fixture-booking',route=>{submitted=route.request().postDataJSON();return route.fulfill({json:{id:'fixture-booking'}})});
 await Promise.all([page.waitForEvent('load'),submit.click()]);
 await expect(page.locator('html')).toHaveAttribute('lang',lang);
 await expect.poll(()=>submitted).toMatchObject({action:'repeat',locale:lang,travelDate:'2027-02-20',travelTime:'08:30',returnDate:'2027-02-27',returnTime:'14:55'});
 await expect(page).toHaveURL(new RegExp('/firma/rezerwacje/fixture-booking\\?lang='+lang));

});

 test('company payment method edit submits selected method and explains reconfirmation',async({page,context},info)=>{
 const lang=info.project.metadata.bookingLocale;
 const user={id:'11111111-1111-4111-8111-111111111111',email:'test@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const access_token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user.id,aud:'authenticated',role:'authenticated',exp:4102444800,email:user.email})+'.test-signature';
 const session={access_token,refresh_token:'test-only-refresh',expires_at:4102444800,expires_in:3600,token_type:'bearer',user};
 await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+encode(session),domain:'127.0.0.1',path:'/'}]);

 const index=['pl','en','de','cs'].indexOf(lang);
 await page.route('**/api/company/quote',route=>route.fulfill({json:{net:800,gross:864,vatRate:8,distanceKm:20,billableKm:0}}));
 let submitted;
 await page.route('**/api/company/bookings/fixture-booking',route=>{submitted=route.request().postDataJSON();return route.fulfill({json:{id:'fixture-booking',status:'pending'}})});
 await page.goto('/firma/rezerwacje/fixture-booking?lang='+lang);
 await page.getByRole('button',{name:['EDYTUJ REZERWACJĘ','EDIT BOOKING','BUCHUNG BEARBEITEN','UPRAVIT REZERVACI'][index],exact:true}).click();
 const select=page.locator('select').filter({has:page.locator('option[value="employee_payment"]')});
 await expect(select).toHaveValue('company_transfer');
 await select.selectOption('employee_payment');
 await page.getByRole('button',{name:['ZAPISZ ZMIANY','SAVE CHANGES','ÄNDERUNGEN SPEICHERN','ULOŽIT ZMĚNY'][index],exact:true}).click();
 await expect.poll(()=>submitted).toMatchObject({action:'update',locale:lang,paymentMethod:'employee_payment'});
 await expect(page.locator('.admin-save-message')).toContainText(['Zmiany oczekują','Changes are awaiting','Die Änderungen warten','Změny čekají'][index]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 });
