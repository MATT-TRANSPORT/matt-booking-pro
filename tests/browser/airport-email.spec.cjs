const { test, expect } = require('@playwright/test');

const copy = {
  pl: { next:'DALEJ', summary:'PODSUMOWANIE', book:'ZAREZERWUJ', mail:'Podaj poprawny adres e-mail.' },
  en: { next:'NEXT', summary:'SUMMARY', book:'BOOK NOW', mail:'Enter a valid email address.' },
  de: { next:'WEITER', summary:'ZUSAMMENFASSUNG', book:'JETZT BUCHEN', mail:'Bitte geben Sie eine gültige E-Mail-Adresse ein.' },
  cs: { next:'DALŠÍ', summary:'SHRNUTÍ', book:'REZERVOVAT', mail:'Zadejte platnou e-mailovou adresu.' }
};

test('airport email validation prevents invalid contact details in the mobile wizard and desktop form', async ({page, context}, info) => {
  const locale = info.project.metadata.bookingLocale;
  const mobile = info.project.metadata.mobile;
  const t = copy[locale];
  const externalRequests = [], bookingPosts = [], browserErrors = [];

  page.on('pageerror',error => browserErrors.push(error.message));

  // Never contact the real booking backend, analytics, mail, payment or map services.
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if(url.hostname !== '127.0.0.1') {
      externalRequests.push(url.hostname);
      return route.abort();
    }
    if(!url.pathname.startsWith('/api/')) return route.continue();
    // Route recalculation and funnel telemetry are expected technical POSTs.
    // Only a booking-creation POST would be forbidden in this validation test.
    if(request.method() !== 'GET' && /^\/api\/(?:bookings|general-bookings|wedding-bookings)$/.test(url.pathname)) bookingPosts.push(url.pathname);
    let data = {};
    if(url.pathname === '/api/airports') data={airports:{pyrzowice:{label:'Katowice-Pyrzowice',car:290,bus:400},balice:{label:'Kraków-Balice',car:390,bus:500}}};
    else if(url.pathname === '/api/places') data={suggestions:[]};
    else if(url.pathname === '/api/additional-stop/quote') data={stopCount:0,totalExtraKm:0,stopFee:0,stopExtraPrice:0};
    else if(url.pathname === '/api/route') data={distanceKm:20};
    else if(url.pathname.includes('/growth/')) data={ok:true};
    else return route.fulfill({status:501,json:{error:'Test route unavailable'}});
    return route.fulfill({status:200,json:data});
  });

  await page.goto('/booking?service=airport&lang='+locale);
  await expect(page.locator('html')).toHaveAttribute('lang',locale);
  if(mobile){
    // Step 1: service; step 2: route and airport.
    await page.locator('.wizard-choice-list button').first().click();
    await page.locator('.wizard-card input').first().fill('Radlin, Mariacka 9');
    await expect(page.getByRole('button',{name:t.next,exact:true})).toBeEnabled();
    await page.getByRole('button',{name:t.next,exact:true}).click();

    // Step 3: departure time and passenger count; step 4: vehicle.
    await page.locator('input[type="date"]').first().fill('2027-01-20');
    await page.locator('input[type="time"]').first().fill('08:30');
    await page.getByRole('button',{name:t.next,exact:true}).click();
    await page.locator('.wizard-choice-list button').first().click();
    await expect(page.locator('.wizard-card h1')).toBeVisible();
  } else {
    // Desktop: all fields are on one screen.
    await page.locator('input[placeholder]').filter({visible:true}).first().fill('Radlin, Mariacka 9');
    await page.locator('input[type="date"]').first().fill('2027-01-20');
    await page.locator('input[type="time"]').first().fill('08:30');
  }

  const name=page.locator('input[autocomplete="name"]');
  const phone=page.locator('input[autocomplete="tel"]');
  const email=page.locator('input[type="email"]');
  await name.fill('QA Test');
  await phone.fill('123');
  await expect(phone).toHaveAttribute('aria-invalid','true');
  if(mobile) await expect(page.getByRole('button',{name:t.summary,exact:true})).toBeDisabled();
  await phone.fill('+48123456789');
  await expect(phone).toHaveAttribute('aria-invalid','false');
  await expect(phone).toHaveAttribute('type','tel');
  await expect(phone).toHaveAttribute('inputmode','tel');

  await email.fill('niepoprawny-adres');
  await expect(email).toHaveAttribute('aria-invalid','true');
  await expect(page.getByText(t.mail,{exact:true})).toBeVisible();

  if(mobile){
    const next=page.getByRole('button',{name:t.summary,exact:true});
    await expect(next).toBeDisabled();
    await email.fill('test@example.invalid');
    await expect(email).toHaveAttribute('aria-invalid','false');
    await expect(next).toBeEnabled();
    await next.click();
    await expect(page.locator('.wizard-card h1')).toContainText({pl:'Podsumowanie',en:'Summary',de:'Zusammenfassung',cs:'Shrnutí'}[locale]);
  }else{
    // No network write may occur if invalid data are submitted.
    await page.getByRole('button',{name:t.book,exact:true}).click();
    await expect(page.getByText(t.mail,{exact:true}).first()).toBeVisible();
    await email.fill('test@example.invalid');
    await expect(email).toHaveAttribute('aria-invalid','false');
    await expect(page.getByText(t.mail,{exact:true})).toHaveCount(0);
  }

  expect(bookingPosts).toEqual([]);
  expect(browserErrors).toEqual([]);
  // Essential no-overflow responsive layout check.
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

for(const account of ["public","company"])test(account+" ordered stops: quote follows edits and separate return route",async({page,context},info)=>{
 const company=account==="company", lang=info.project.metadata.bookingLocale;
 if(company){
 const user={id:'11111111-1111-4111-8111-111111111111',email:'test@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const access_token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user.id,aud:'authenticated',role:'authenticated',exp:4102444800,email:user.email})+'.test-signature';
 const session={access_token,refresh_token:'test-only-refresh',expires_at:4102444800,expires_in:3600,token_type:'bearer',user};
 await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+encode(session),domain:'127.0.0.1',path:'/'}]);

 }
 const requests=[];
 await context.route("**/*",async route=>{
   const u=new URL(route.request().url());
   if(u.hostname!=="127.0.0.1")return route.abort();
   if(!u.pathname.startsWith("/api/"))return route.continue();
   if(u.pathname===(company?"/api/company/quote":"/api/additional-stop/quote")){
     const body=route.request().postDataJSON();requests.push(body);
     const count=body.routeStops.outbound.length+body.routeStops.inbound.length;
     return route.fulfill({json:{stopFee:count*20,totalExtraKm:6,stopExtraPrice:14.4,billableKm:6,baseOneWayNet:290,extraPriceNet:14.4,additionalStopFeeNet:count*20,vatRate:8,multiplier:2}});
   }
   if(u.pathname==="/api/airports")return route.fulfill({json:{airports:{balice:{label:"Kraków-Balice",car:390,bus:500}}}});
   if(u.pathname==="/api/route")return route.fulfill({json:{distanceKm:70}});
   if(u.pathname==="/api/places")return route.fulfill({json:{suggestions:[]}});
   return route.fulfill({json:{}});
 });
 await page.goto((company?"/firma/nowa-rezerwacja":"/booking?service=airport")+(company?"?":"&")+"lang="+lang);
 // Both forms identify transfer choices with the same flight / return symbols.
 await page.getByRole("button",{name:/🔁/}).first().click();
 const box=page.locator(".additional-stop-box").filter({visible:true}).first();
 const primary=company?page.locator('input[autocomplete="off"]').filter({visible:true}).last():page.locator('input[placeholder]').filter({visible:true}).first();
 await primary.fill("Rybnik, Rynek 1");
 await expect.poll(()=>requests.at(-1)?.routeStops).toEqual({outbound:[],inbound:[]});
 const sections=box.locator(":scope > div").filter({has:page.locator("button")});
 for(const [section,values] of [[0,["Rybnik, Rynek 2","Żory, Rynek 5"]],[1,["Radlin, Mariacka 9"]]]){
  for(const [i,value] of values.entries()){
   await sections.nth(section).locator(":scope > button").click();
   await sections.nth(section).locator("input").nth(i).fill(value);
  }
 }
 await sections.first().getByRole("button",{name:"↑",exact:true}).last().click();
 await expect.poll(()=>requests.at(-1)?.routeStops).toEqual({outbound:["Żory, Rynek 5","Rybnik, Rynek 2"],inbound:["Radlin, Mariacka 9"]});
});
