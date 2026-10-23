const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const root=path.resolve(__dirname,'..');
let locale='pl';
const original=Module._load;
Module._load=function(id,parent,isMain){
 if(id==='next/navigation')return {useRouter:()=>({refresh(){}})};
 if(id==='@/lib/useCustomerLocale')return {useCustomerLocale:()=>locale};
 if(id.startsWith('@/'))id=path.join(root,id.slice(2));
 return original.call(this,id,parent,isMain);
};
for(const extension of ['.ts','.tsx']) require.extensions[extension]=function(m,file){m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file)};
const Component=require('../components/CompanyBookingTemplates.tsx').default;
for(const [lang,label] of [['pl','USUŃ'],['en','REMOVE'],['de','ENTFERNEN'],['cs','ODSTRANIT']])test(`saved roundtrip template renders without crashing in ${lang}`,()=>{
 locale=lang;
 const html=renderToStaticMarkup(React.createElement(Component,{templates:[{id:'test',name:'TEST SERIES',employee_id:'employee',pickup_address:'TEST ADDRESS',airport_key:'pyrzowice',vehicle_type:'bus',service_type:'roundtrip',return_offset_days:7,return_time:'14:55'}],employees:[{id:'employee',first_name:'TEST',last_name:'ONLY'}],recentBookings:[],airports:{pyrzowice:{label:'Pyrzowice'}}}));
 assert.ok(html.includes('TEST SERIES'));assert.ok(html.includes('14:55'));assert.ok(html.includes(label));
});
