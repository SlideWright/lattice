// Assemble each *.body.html fragment into a complete, self-contained mockup page
// (inlines the shared sprite + head so it renders under file:// in puppeteer).
const fs = require('node:fs');
const path = require('node:path');
const dir = __dirname;
const sprite = fs.readFileSync(path.join(dir, '_sprite.html'), 'utf8');

const head = (title, mode, viewport) => `<!doctype html>
<html lang="en" data-palette="indaco" data-mode="${mode}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="studio.css"/>
${viewport ? `<style>html,body{width:${viewport}px}</style>` : ''}
</head>
<body>
${sprite}
`;

for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.body.html')) continue;
  const name = f.replace('.body.html', '');
  const raw = fs.readFileSync(path.join(dir, f), 'utf8');
  // First line may be a directive: <!--mode:dark;w:390-->
  let mode = 'light', vw = '';
  const m = raw.match(/^<!--\s*(.*?)\s*-->/);
  let body = raw;
  if (m) {
    body = raw.slice(m[0].length);
    for (const kv of m[1].split(';')) {
      const [k, v] = kv.split(':').map((s) => s.trim());
      if (k === 'mode') mode = v;
      if (k === 'w') vw = v;
    }
  }
  fs.writeFileSync(
    path.join(dir, name + '.html'),
    head(`Studio — ${name}`, mode, vw) + body + '\n</body></html>\n',
  );
  console.log('built', name + '.html', `(mode=${mode}${vw ? `,w=${vw}` : ''})`);
}
