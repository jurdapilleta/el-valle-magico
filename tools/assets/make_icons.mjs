// Renders the app icons from one drawing (Luna's face on the game's sky) into
// public/icons/. Run from the repo root: npm run icons
// Uses the Chromium that Playwright already installed, so there is nothing new to download.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const OUT = 'public/icons';

/** `inset` shrinks the face: maskable icons must keep it inside the central 80 % (§5.4). */
const drawing = (inset, rounded) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#BFE3FF"/>
      <stop offset="1" stop-color="#FFE3F3"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="url(#sky)"/>
  <circle cx="256" cy="330" r="150" fill="#9FE0A8" opacity="0.55" transform="translate(0 150)"/>
  <g transform="translate(${256 - 256 * inset} ${256 - 256 * inset}) scale(${inset * 5.12})">
    <path d="M52 30 L60 4 L68 32 Z" fill="#FFD972"/>
    <ellipse cx="30" cy="42" rx="12" ry="20" fill="#FF8FD8"/>
    <ellipse cx="26" cy="66" rx="10" ry="16" fill="#C9B6FF"/>
    <path d="M36 28 L40 12 L50 28 Z" fill="#F1EAFF"/>
    <ellipse cx="54" cy="56" rx="27" ry="29" fill="#F8F4FF"/>
    <ellipse cx="68" cy="74" rx="17" ry="13" fill="#F8F4FF"/>
    <circle cx="58" cy="52" r="6" fill="#3A2A4A"/>
    <circle cx="60" cy="50" r="2" fill="#FFFFFF"/>
    <circle cx="74" cy="76" r="2" fill="#5A3A6A" opacity="0.5"/>
    <ellipse cx="48" cy="66" rx="6" ry="4" fill="#FF8FD8" opacity="0.5"/>
  </g>
</svg>`;

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/icon.svg`, drawing(0.82, true).trim() + '\n');

const browser = await chromium.launch();
const page = await browser.newPage();
async function png(name, size, svg, transparent) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  await page.screenshot({ path: `${OUT}/${name}`, omitBackground: transparent });
  console.log(`${name}  ${size}×${size}`);
}
await png('icon-192.png', 192, drawing(0.82, true), true);
await png('icon-512.png', 512, drawing(0.82, true), true);
// Full-bleed background with a smaller face: the system crops these to its own shape.
await png('icon-maskable-512.png', 512, drawing(0.62, false), false);
// iOS adds its own rounding and does not accept transparency.
await png('apple-touch-icon.png', 180, drawing(0.78, false), false);
await browser.close();
