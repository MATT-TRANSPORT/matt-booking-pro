const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/browser',
  timeout: 30000,
  workers: 2,
  reporter: [['list'], ['json', {outputFile: 'test-results/international-browser.json'}]],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    serviceWorkers: 'block',
    launchOptions: process.env.MATT_CHROMIUM_EXECUTABLE ? {
      executablePath: process.env.MATT_CHROMIUM_EXECUTABLE,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--disable-gpu']
    } : {}
  },
  projects: ['pl','en','de','cs'].flatMap(locale => ['desktop','mobile'].map(device => ({
    name: `${locale}-${device}`,
    metadata: {bookingLocale: locale, mobile: device === 'mobile'},
    use: {browserName: 'chromium', viewport: device === 'mobile' ? {width:390,height:844} : {width:1440,height:1000}}
  }))),
  webServer: {env:{NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3201',SUPABASE_SERVICE_ROLE_KEY:'matt-local-test-only',NEXT_PUBLIC_SUPABASE_ANON_KEY:'matt-local-test-only'},command: 'node tests/start-browser-server.cjs', url:'http://127.0.0.1:3100/booking', timeout:90000}
});
