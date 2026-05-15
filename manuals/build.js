const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { marked } = require('marked');

// Usage: node build.js <input.md> <output.pdf> <slug> <version>
// Example: node build.js ../MANUAL_FR.md "SHP Vocal Strip - Manual v0.1.5.pdf" vocalstrip 0.1.5

const args = process.argv.slice(2);
if (args.length < 4) {
  console.error("Usage: node build.js <input.md> <output.pdf> <slug> <version>");
  process.exit(1);
}

const inputPath = path.resolve(args[0]);
const outputPath = path.resolve(args[1]);
const slug = args[2];
const version = args[3];

const templateStr = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

// Config mapping for each plugin
const pluginConfigs = {
  'vocalstrip': {
    title: 'Vocal<br/>Strip',
    fulltitle: 'VOCAL STRIP',
    subtitle: 'VOCAL FRY / GROWL — 500-SERIES RACK',
    code: 'SHP-VS-500',
    sn: 'VS'
  },
  'guitarstrip': {
    title: 'Guitar<br/>Strip',
    fulltitle: 'GUITAR STRIP',
    subtitle: 'GUITAR EQ / CHUG / SATURATION — 500-SERIES RACK',
    code: 'SHP-GS-500',
    sn: 'GS'
  },
  'bassstrip': {
    title: 'Bass<br/>Strip',
    fulltitle: 'BASS STRIP',
    subtitle: 'BASS EQ / DYNAMICS / AMP — 500-SERIES RACK',
    code: 'SHP-BS-500',
    sn: 'BS'
  },
  'multibandsaturator': {
    title: 'Multiband<br/>Saturator',
    fulltitle: 'MULTIBAND SATURATOR',
    subtitle: 'TUBE SATURATION — 500-SERIES RACK',
    code: 'SHP-MB-500',
    sn: 'MB'
  },
  'doubletracking': {
    title: 'Double<br/>Tracking',
    fulltitle: 'DOUBLE TRACKING',
    subtitle: 'STEREO WIDENER — 500-SERIES RACK',
    code: 'SHP-DT-500',
    sn: 'DT'
  }
};

async function buildPDF() {
  const browser = await puppeteer.launch();
  const config = pluginConfigs[slug];
  if (!config) {
    console.error(`Unknown plugin slug: ${slug}`);
    process.exit(1);
  }

  const mdContent = fs.readFileSync(inputPath, 'utf8');
  const sections = mdContent.split(/^## /m).filter(s => s.trim().length > 0);
  
  let contentHtml = '';
  let pageNum = 3;

  for (let i = 1; i < sections.length; i++) {
    let section = '## ' + sections[i];
    let html = marked.parse(section);
    
    let sectionMatch = section.match(/^## (.*)/);
    let sectionTitle = sectionMatch ? sectionMatch[1].toUpperCase() : `MOD-0${i}`;

    let pageHtml = `
    <section class="page page--inside">
      <div class="r-head">
        <span><span class="blood">SHP</span> · ${config.fulltitle} · MANUEL</span>
        <span>${sectionTitle} · CH. 0${i}</span>
      </div>

      <div style="margin-top: 5mm;">
        ${html}
      </div>

      <div class="r-foot">
        <span>${config.code} · v${version}</span>
        <span class="pageno">${String(pageNum).padStart(2, '0')}</span>
      </div>
    </section>
    `;
    contentHtml += pageHtml;
    pageNum++;
  }

  // Update version in template
  let finalHtml = templateStr
    .replace(/\{\{TITLE\}\}/g, config.title)
    .replace(/\{\{FULLTITLE\}\}/g, config.fulltitle)
    .replace(/\{\{SUBTITLE\}\}/g, config.subtitle)
    .replace(/\{\{CODE\}\}/g, config.code)
    .replace(/\{\{SN\}\}/g, config.sn)
    .replace(/v1\.0/g, `v${version}`)
    .replace('{{CONTENT}}', contentHtml);

  const tempHtmlPath = path.join(__dirname, `temp_${slug}_${Date.now()}.html`);
  fs.writeFileSync(tempHtmlPath, finalHtml);

  const page = await browser.newPage();
  await page.goto(`file:///${tempHtmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true
  });

  fs.unlinkSync(tempHtmlPath);
  console.log(`Generated ${outputPath}`);
  await browser.close();
}

buildPDF().catch(err => {
  console.error(err);
  process.exit(1);
});
