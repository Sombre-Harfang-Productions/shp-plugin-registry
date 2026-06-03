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
const year = new Date().getFullYear().toString();

const templateStr = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

// Embed logos as base64 to avoid broken paths in PDF (especially in CI)
function getBase64Logo(name) {
  const logoPath = path.join(__dirname, 'assets', name);
  try {
    const buffer = fs.readFileSync(logoPath);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  } catch (e) {
    console.warn(`Warning: Could not load logo from ${logoPath}`);
    return '';
  }
}

const logoBoneBase64 = getBase64Logo('logo-bone.png');
const logoInkBase64 = getBase64Logo('logo-ink.png');

// Config mapping for each plugin
const pluginConfigs = {
  'vocalstrip': {
    title: 'Vocal<br/>Strip',
    fulltitle: 'VOCAL STRIP',
    subtitle: 'VOCAL FRY / GROWL — RACK MOUNT SERIES',
    code: 'SHP-VS-RACK',
    sn: 'VS'
  },
  'guitarstrip': {
    title: 'Guitar<br/>Strip',
    fulltitle: 'GUITAR STRIP',
    subtitle: 'GUITAR EQ / CHUG / SATURATION — RACK MOUNT SERIES',
    code: 'SHP-GS-RACK',
    sn: 'GS'
  },
  'bassstrip': {
    title: 'Bass<br/>Strip',
    fulltitle: 'BASS STRIP',
    subtitle: 'BASS EQ / DYNAMICS / AMP — RACK MOUNT SERIES',
    code: 'SHP-BS-RACK',
    sn: 'BS'
  },
  'multibandsaturator': {
    title: 'Multiband<br/>Saturator',
    fulltitle: 'MULTIBAND SATURATOR',
    subtitle: 'TUBE SATURATION — RACK MOUNT SERIES',
    code: 'SHP-MB-RACK',
    sn: 'MB'
  },
  'doubletracking': {
    title: 'Double<br/>Tracking',
    fulltitle: 'DOUBLE TRACKING',
    subtitle: 'STEREO WIDENER — RACK MOUNT SERIES',
    code: 'SHP-DT-RACK',
    sn: 'DT'
  },
  'drumbus': {
    title: 'Drum<br/>Bus',
    fulltitle: 'DRUM BUS',
    subtitle: 'GLUE / SATURATION / TRANSIENT — RACK MOUNT SERIES',
    code: 'SHP-DB-RACK',
    sn: 'DB'
  },
  'master': {
    title: 'Master',
    fulltitle: 'MASTER',
    subtitle: 'COMP / SAT / LIMIT / LUFS — RACK MOUNT SERIES',
    code: 'SHP-MA-RACK',
    sn: 'MA'
  },
  'atmos': {
    title: 'Atmos<br/>Reverb',
    fulltitle: 'ATMOS REVERB',
    subtitle: 'ATMOSPHERIC REVERB — RACK MOUNT SERIES',
    code: 'SHP-AT-RACK',
    sn: 'AT'
  },
  'deharsh': {
    title: 'Deharsh',
    fulltitle: 'DEHARSH',
    subtitle: 'DYNAMIC RESONANCE SUPPRESSOR — RACK MOUNT SERIES',
    code: 'SHP-DH-RACK',
    sn: 'DH'
  },
  'guitarroar': {
    title: 'Guitar<br/>Roar',
    fulltitle: 'GUITAR ROAR',
    subtitle: 'NEURAL AMP MODELER / TONE3000 — RACK MOUNT SERIES',
    code: 'SHP-GR-RACK',
    sn: 'GR'
  }
};

async function buildPDF() {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
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
        <span>${sectionTitle} · CH. ${String(i).padStart(2, '0')}</span>
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

  // Apply template
  let finalHtml = templateStr
    .replace(/\{\{TITLE\}\}/g, config.title)
    .replace(/\{\{FULLTITLE\}\}/g, config.fulltitle)
    .replace(/\{\{SUBTITLE\}\}/g, config.subtitle)
    .replace(/\{\{CODE\}\}/g, config.code)
    .replace(/\{\{SN\}\}/g, config.sn)
    .replace(/\{\{VERSION\}\}/g, version)
    .replace(/\{\{YEAR\}\}/g, year)
    .replace(/\{\{LOGO_BONE\}\}/g, logoBoneBase64)
    .replace(/\{\{LOGO_INK\}\}/g, logoInkBase64)
    .replace('{{CONTENT}}', contentHtml);

  const tempHtmlPath = path.join(__dirname, `temp_${slug}_${Date.now()}.html`);
  fs.writeFileSync(tempHtmlPath, finalHtml);

  const page = await browser.newPage();
  // Using data URL or ensure the directory is correct for CSS loading
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
