// Renders the link-preview cards (1200x630 PNG) into client/public/og/:
//   npx tsx scripts/genOgImages.mts
// One card per question plus the site card. Drawn as SVG and rasterised with
// rsvg-convert (brew install librsvg), so no image model or browser is needed.
// Re-run after adding a question or changing a title, summary or companies.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { companies } from '../shared/companies';
import { codingQuestions, designQuestions } from '../shared/questions';

const OUT = path.resolve('client/public/og');
const BG = '#14161a';
const ACCENT = '#10a37f';
const FG = '#f2f3f5';
const MUTED = '#9aa1ad';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Greedy word wrap by an approximate character budget. */
function wrap(text: string, perLine: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > perLine && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1]!.replace(/\s*\S*$/, '') + '…';
    return kept;
  }
  return lines;
}

const ICON = `<g transform="translate(64 52) scale(0.125)">
  <rect width="512" height="512" rx="96" fill="#1d2026"/>
  <g transform="translate(256 256) scale(0.86) translate(-256 -256)" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M150 156 L70 256 L150 356" stroke="${ACCENT}" stroke-width="44"/>
    <path d="M362 156 L442 256 L362 356" stroke="${ACCENT}" stroke-width="44"/>
    <path d="M196 262 L240 306 L320 206" stroke="#fff" stroke-width="44"/>
  </g></g>`;

function card(o: {
  kicker: string;
  title: string;
  summary: string;
  chips: string[];
}): string {
  const titleLines = wrap(o.title, 26, 2);
  const titleSize = titleLines.length > 1 ? 68 : 76;
  const titleY = 246;
  const sumY = titleY + titleLines.length * (titleSize + 10) + 24;
  const sumLines = wrap(o.summary, 52, 3);
  let x = 64;
  const chips = o.chips
    .map((c) => {
      const w = c.length * 15 + 40;
      const s = `<rect x="${x}" y="526" width="${w}" height="48" rx="24" fill="#22262d" stroke="#2f343c"/>
        <text x="${x + w / 2}" y="558" font-size="24" fill="${FG}" text-anchor="middle">${esc(c)}</text>`;
      x += w + 12;
      return x > 1150 ? '' : s;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" font-family="SF Pro Display, Helvetica Neue, sans-serif">
  <rect width="1200" height="630" fill="${BG}"/>
  <rect y="0" width="1200" height="8" fill="${ACCENT}"/>
  ${ICON}
  <text x="140" y="98" font-size="30" font-weight="600" fill="${FG}">Interview Practice</text>
  <text x="1136" y="98" font-size="26" fill="${MUTED}" text-anchor="end" font-family="SF Mono, Menlo, monospace">interview.ugly.bot</text>
  <text x="64" y="160" font-size="24" font-weight="700" fill="${ACCENT}" letter-spacing="3">${esc(o.kicker.toUpperCase())}</text>
  ${titleLines.map((l, i) => `<text x="64" y="${titleY + i * (titleSize + 10)}" font-size="${titleSize}" font-weight="700" fill="${FG}">${esc(l)}</text>`).join('')}
  ${sumLines.map((l, i) => `<text x="64" y="${sumY + i * 42}" font-size="32" fill="${MUTED}">${esc(l)}</text>`).join('')}
  ${chips}
</svg>`;
}

const companyName = (id: string) =>
  companies.find((c) => c.id === id)?.name ?? id;

function render(name: string, svg: string) {
  const tmp = path.join(tmpdir(), `og-${name}.svg`);
  writeFileSync(tmp, svg);
  execFileSync('rsvg-convert', [
    '-w',
    '1200',
    '-h',
    '630',
    tmp,
    '-o',
    path.join(OUT, `${name}.png`),
  ]);
}

mkdirSync(OUT, { recursive: true });
render(
  'site',
  card({
    kicker: 'Coding and system design',
    title: 'Practice real tech interview questions',
    summary:
      'Progressive coding problems you run in the browser, and system design answers graded by AI against company-specific rubrics.',
    chips: companies.slice(0, 7).map((c) => c.name),
  }),
);
for (const q of codingQuestions)
  render(
    q.id,
    card({
      kicker: `Coding · ${q.difficulty}`,
      title: q.title,
      summary: q.summary,
      chips: q.companies.map(companyName),
    }),
  );
for (const q of designQuestions)
  render(
    q.id,
    card({
      kicker: 'System design',
      title: q.title,
      summary: q.summary,
      chips: q.companies.map(companyName),
    }),
  );
console.log(
  `wrote ${1 + codingQuestions.length + designQuestions.length} cards to ${OUT}`,
);
