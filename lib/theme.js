/* theme.js — themes: a palette, a font pairing and a few type adjustments, chosen by name.
 *
 *   theme: brief | counsel | field-guide | night        (default: brief)
 *
 * Tokens (frozen from fbi-cia-nsa.html, the cleanest of the existing pages):
 *   surfaces  --bg --surface --surface-2 --raise      lines  --line --line-2
 *   ink       --ink --ink-2 --ink-3                   chrome --accent --accent-dim --accent-lt
 *   status    --ok --bad --warn (+ -dim)              dark band --dk-bg --dk-surface --dk-line --dk-ink --dk-ink-2
 *   type      --disp (headings) --text (prose) --sans (controls, labels) --mono
 *   space     --s1..--s9 = 4 8 12 16 24 32 48 64 96
 * Head keys that override the theme: accent: #hex · colors: fbi=#1d4e89 … (topic colours →
 * .c-<name> and [label]{.name} chips) · fonts: Display / Sans / Mono (file target: any Google
 * font; link viewer: only the fonts it hosts, see FONTS).
 * Every value from the head is validated here; nothing else from a source reaches CSS.
 */
import { hexColor, cleanClass } from "./md.js";

/* The families the link viewer serves itself (fonts/, from scripts/fetch-fonts.mjs). */
export const FONTS = ["Newsreader", "Source Serif 4", "Bricolage Grotesque", "IBM Plex Sans", "IBM Plex Mono"];

const PLEX = { sans: "IBM Plex Sans", mono: "IBM Plex Mono" };

export const THEMES = {
  brief: {
    label: "Brief — cool paper, Newsreader headlines; policy and public explainers",
    fonts: { disp: "Newsreader", text: "IBM Plex Sans", ...PLEX },
    palette: {
      bg: "#eef1f5", surface: "#f7f9fb", "surface-2": "#ffffff", raise: "#e4e9ef",
      line: "#d5dce4", "line-2": "#b9c4cf", ink: "#14181f", "ink-2": "#4a5460", "ink-3": "#626d7b",
      accent: "#5b3a5e", ok: "#1a6b5e", bad: "#8c2f2f", warn: "#8a5a00",
      "dk-bg": "#131a24", "dk-surface": "#1c2531", "dk-line": "#2f3c4c", "dk-ink": "#e8edf3", "dk-ink-2": "#9fb0c2",
    },
    css: "",
  },
  counsel: {
    label: "Counsel — warm paper, a serif to read like a letter; client pages",
    fonts: { disp: "Source Serif 4", text: "Source Serif 4", ...PLEX },
    palette: {
      bg: "#f5f2ec", surface: "#faf8f4", "surface-2": "#ffffff", raise: "#ece7de",
      line: "#ded6c9", "line-2": "#c5baa8", ink: "#1c1915", "ink-2": "#4b453c", "ink-3": "#6b6357",
      accent: "#24496b", ok: "#2c6a4f", bad: "#8e3131", warn: "#86600c",
      "dk-bg": "#1c2430", "dk-surface": "#252f3c", "dk-line": "#38465a", "dk-ink": "#f1ede6", "dk-ink-2": "#b7c0cc",
    },
    css: "body{font-size:18px;line-height:1.62}h1,h2,h3,h4{font-weight:600;letter-spacing:-.008em}" +
      ".hero h1{font-size:clamp(36px,5.6vw,60px)}.sechead h2{font-size:clamp(28px,3.4vw,38px)}" +
      ".dek,.lede{font-style:normal}.cmp td,.data td,.gloss dd,.roles,.stage p,.tl-panel p{font-family:var(--text)}",
  },
  "field-guide": {
    label: "Field guide — bright paper, Bricolage Grotesque; tools and how-tos",
    fonts: { disp: "Bricolage Grotesque", text: "IBM Plex Sans", ...PLEX },
    palette: {
      bg: "#f7f6f2", surface: "#ffffff", "surface-2": "#ffffff", raise: "#eeece6",
      line: "#e1ded6", "line-2": "#c9c4b8", ink: "#15161c", "ink-2": "#4a4d5a", "ink-3": "#6a6d79",
      accent: "#5b48b8", ok: "#2f7d4f", bad: "#c0392b", warn: "#a86a00",
      "dk-bg": "#1b1a2e", "dk-surface": "#242339", "dk-line": "#38365a", "dk-ink": "#f0eefa", "dk-ink-2": "#b9b4d8",
    },
    css: "h1,h2,h3,h4{font-weight:750;letter-spacing:-.022em}.hero h1{font-weight:800;letter-spacing:-.03em}" +
      ".eyebrow{letter-spacing:.1em}.demo,.quiz,.checklist{border-radius:10px}.seg,.btn,.wire,.opt,.stage{border-radius:7px}",
  },
  night: {
    label: "Night — dark ink, Newsreader headlines; presentations and late reading",
    fonts: { disp: "Newsreader", text: "IBM Plex Sans", ...PLEX },
    palette: {
      bg: "#11151b", surface: "#171c24", "surface-2": "#1d232c", raise: "#262e39",
      line: "#2c3542", "line-2": "#3e4a59", ink: "#e9edf2", "ink-2": "#b0bac6", "ink-3": "#8e99a8",
      accent: "#a9bdff", ok: "#5fc9a4", bad: "#f08a8a", warn: "#e8bd5e",
      "dk-bg": "#0a0d11", "dk-surface": "#12161c", "dk-line": "#242c36", "dk-ink": "#e9edf2", "dk-ink-2": "#9aa6b5",
    },
    css: "",
  },
};

/* older names */
const ALIAS = { "paper-cool": "brief", "paper-warm": "counsel", ink: "night" };

export function themeOf(head) {
  const name = String(head.theme || ALIAS[head.palette] || head.palette || "brief").toLowerCase();
  return THEMES[ALIAS[name] || name] || THEMES.brief;
}

const FALLBACK = {
  disp: 'Georgia,"Times New Roman",serif',
  serif: 'Georgia,"Times New Roman",serif',
  sans: '-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
  mono: 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
};
const SERIFS = ["Newsreader", "Source Serif 4"];

function rgb(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16));
}
function rgba(hex, a) { return `rgba(${rgb(hex).join(",")},${a})`; }
function mix(hex, toward, t) {
  const a = rgb(hex), b = rgb(toward);
  return "#" + a.map((v, k) => Math.round(v + (b[k] - v) * t).toString(16).padStart(2, "0")).join("");
}
function lum(hex) {
  return rgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
    .reduce((s, v, k) => s + v * [0.2126, 0.7152, 0.0722][k], 0);
}

/* The page's fonts: the theme's, with `fonts: Display / Sans / Mono` overriding. In the
 * link viewer only hosted families are allowed (`hosted: true`). */
export function fontNames(head, { hosted = false } = {}) {
  const t = themeOf(head).fonts;
  const ok = (s) => /^[A-Za-z0-9 ]{2,40}$/.test(s) && (!hosted || FONTS.includes(s));
  const parts = String(head.fonts || "").split("/").map((s) => s.trim());
  const pick = (i, dflt) => (parts[i] && ok(parts[i]) ? parts[i] : dflt);
  const disp = pick(0, t.disp), sans = pick(1, t.sans), mono = pick(2, t.mono);
  return { disp, text: head.fonts && parts[1] && ok(parts[1]) ? sans : t.text, sans, mono };
}

export function topicColors(head) {
  const out = {};
  for (const m of String(head.colors || "").matchAll(/([A-Za-z][\w-]*)\s*=\s*(#[0-9a-fA-F]{3,6})/g)) {
    const name = cleanClass(m[1]), hex = hexColor(m[2]);
    if (name && hex) out[name] = hex;
  }
  return out;
}

/* :root tokens, the theme's adjustments and topic colour classes, as a CSS string. */
export function themeCss(head, { hosted = false } = {}) {
  const theme = themeOf(head);
  const pal = { ...theme.palette };
  const acc = hexColor(head.accent);
  if (acc) pal.accent = acc;
  const dark = lum(pal.bg) < 0.2;
  const vars = Object.entries(pal).map(([k, v]) => `--${k}:${v}`);
  vars.push(`--accent-dim:${rgba(pal.accent, dark ? 0.18 : 0.1)}`, `--accent-lt:${mix(pal.accent, "#ffffff", 0.45)}`);
  for (const k of ["ok", "bad", "warn"]) vars.push(`--${k}-dim:${rgba(pal[k], dark ? 0.2 : 0.11)}`);
  vars.push(`--nav-bg:${rgba(pal.bg, 0.92)}`);
  const f = fontNames(head, { hosted });
  const stack = (name, kind) => `"${name}",${FALLBACK[kind === "text" || kind === "disp" ? (SERIFS.includes(name) ? "serif" : "sans") : kind]}`;
  vars.push(`--disp:${stack(f.disp, "disp")}`, `--text:${stack(f.text, "text")}`, `--sans:${stack(f.sans, "sans")}`, `--mono:${stack(f.mono, "mono")}`);
  let css = `:root{${vars.join(";")}}\n${theme.css}\n`;
  for (const [name, hex] of Object.entries(topicColors(head))) {
    css += `.c-${name}{--c:${hex};--c-dim:${rgba(hex, dark ? 0.22 : 0.11)};--c-lt:${mix(hex, "#ffffff", 0.5)}}\n`;
  }
  // on a dark theme, topic colours use their light variants so they stay visible
  if (dark) css += `:root{color-scheme:dark}\n.tl-dot.kt,.tl-key i.kt{background:var(--c-lt);border-color:var(--c-lt)}.tl-dot.kt.future{background:var(--surface-2)}` +
    `.chip{background:var(--c-lt,var(--ink-2));color:var(--bg)}table thead th.h-c{color:var(--c-lt);box-shadow:inset 0 -3px 0 var(--c-lt)}\n`;
  return css;
}

/* Google Fonts stylesheet URL for the file target. */
export function fontLink(head) {
  const f = fontNames(head);
  const fam = [];
  const seen = new Set();
  const add = (name, axes) => { if (!seen.has(name)) { seen.add(name); fam.push(`family=${name.replace(/ /g, "+")}:${axes}`); } };
  add(f.disp, "wght@400;500;600;700;800");
  add(f.text, "ital,wght@0,400;0,500;0,600;0,700;1,400");
  add(f.sans, "ital,wght@0,400;0,500;0,600;0,700;1,400");
  add(f.mono, "wght@400;500;600;700");
  return `https://fonts.googleapis.com/css2?${fam.join("&")}&display=swap`;
}
