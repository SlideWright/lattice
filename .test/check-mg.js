const pp=require("puppeteer");
(async()=>{
  const b=await pp.launch({headless:"new",args:["--no-sandbox"]});
  const p=await b.newPage();
  await p.setRequestInterception(true);
  p.on("request",r=>{ if(r.url().startsWith("http"))r.abort(); else r.continue(); });
  await p.goto("file:///home/saden/Workspace/Lattice/examples/mermaid-gallery.html",{waitUntil:"domcontentloaded"});
  await new Promise(r=>setTimeout(r,5000));
  const r=await p.evaluate(()=>{
    const sections=[...document.querySelectorAll("section")];
    return sections.map((s,i)=>{
      const m=s.querySelector(".mermaid, .language-mermaid, code.language-mermaid");
      const svg=s.querySelector(".mermaid svg, .language-mermaid svg");
      const h2=s.querySelector("h2")?.textContent.slice(0,40);
      return {i:i+1,h2,hasMerm:!!m,hasSvg:!!svg,proc:m?.dataset?.processed};
    }).filter(x=>x.hasMerm);
  });
  console.log("Total slides with mermaid:",r.length);
  console.log("Without SVG:");
  r.filter(x=>!x.hasSvg).forEach(x=>console.log(" ",x));
  console.log("With SVG (first 5):");
  r.filter(x=>x.hasSvg).slice(0,5).forEach(x=>console.log(" ",x));
  await b.close();
})();
