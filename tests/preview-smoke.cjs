// Read-only smoke check of the isolated preview. Never submits a booking.
const {chromium,expect}=require('@playwright/test');
(async()=>{
 const origin=new URL(process.env.MATT_PREVIEW_URL).origin;
 if(!new URL(origin).hostname.endsWith('.vercel.app'))throw new Error('Only a Vercel Preview URL is allowed');
 if(!process.env.VERCEL_OIDC_TOKEN)throw new Error('Load the local development Vercel OIDC token first');
 const proxyUrl=process.env.HTTPS_PROXY?new URL(process.env.HTTPS_PROXY):null;
 const browser=await chromium.launch({executablePath:process.env.MATT_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--disable-gpu'],...(proxyUrl?{proxy:{server:proxyUrl.origin,username:decodeURIComponent(proxyUrl.username),password:decodeURIComponent(proxyUrl.password)}}:{})});
 const results=[];
 try{
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},serviceWorkers:'block'});
   await context.route('**/*',route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.origin!==origin||!['GET','HEAD'].includes(request.method()))return route.abort();
    return route.continue({headers:{...request.headers(),'x-vercel-trusted-oidc-idp-token':process.env.VERCEL_OIDC_TOKEN}});
   });
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   const response=await page.goto(origin+'/booking?service=airport&lang=de');
   if(response.status()!==200)throw new Error('Preview HTTP '+response.status());
   await expect(page.locator('html')).toHaveAttribute('lang','de');
   await expect(page.getByRole('status')).toContainText('TESTUMGEBUNG');
   await expect(page.locator('[value="bank_transfer"]')).toHaveCount(0);
   if(!mobile)await expect(page.locator('input[type="radio"]')).toHaveCount(2);
   const fits=await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth);
   if(!fits||errors.length)throw new Error('Preview layout or JavaScript errors');
   results.push({device:mobile?'mobile':'desktop',ui:'PASS',language:'de',testNotice:true,bankTransfer:false});
   await context.close();
  }
  console.log(JSON.stringify({origin,results,scope:'Read-only UI smoke; no backend writes or payment attempted'},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
