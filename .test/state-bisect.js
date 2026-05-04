const fs=require("fs"), path=require("path"), pp=require("puppeteer");
const ROOT=path.resolve(__dirname,"..");
const M=fs.readFileSync(path.join(ROOT,"node_modules/mermaid/dist/mermaid.min.js"),"utf8");
const L=fs.readFileSync(path.join(ROOT,"lattice.css"),"utf8");
const I=fs.readFileSync(path.join(ROOT,"themes/indaco.css"),"utf8");
async function test(label, css){
  const b=await pp.launch({headless:"new",args:["--no-sandbox"]});
  const p=await b.newPage();
  let err=null;
  p.on("pageerror",e=>err=e.message.slice(0,200));
  const html=`<!doctype html><html><head>${css?`<style>${css}</style>`:""}</head><body>
<div class="mermaid">stateDiagram-v2
  [*] --> Open
  Open --> Closed
  Closed --> [*]</div>
<script>${M}</script>
<script>
(async()=>{
  window.mermaid.initialize({startOnLoad:false,theme:"base",securityLevel:"loose",suppressErrorRendering:false});
  try { await window.mermaid.run({querySelector:".mermaid",suppressErrors:false}); }
  catch(e){ console.log("RUN ERR:"+e.message); }
  console.log("DONE svg="+!!document.querySelector(".mermaid svg"));
})();
</script></body></html>`;
  p.on("console",m=>{if(m.type()==="log")console.log("  "+label+":",m.text().slice(0,300));});
  await p.setContent(html,{waitUntil:"domcontentloaded"});
  await new Promise(r=>setTimeout(r,2500));
  const ok=await p.evaluate(()=>!!document.querySelector(".mermaid svg"));
  console.log(`${ok?"✓":"✗"} ${label} (err: ${err||"none"})`);
  await b.close();
}
(async()=>{
  await test("no-css","");
  await test("lattice-only",L);
  await test("indaco-only",I);
  await test("both",L+"\n"+I);
})();
