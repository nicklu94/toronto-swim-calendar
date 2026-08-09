const path = require("node:path");
const sharp = require("sharp");

const width = 1536;
const height = 1024;

const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#c9eadb"/>
      <stop offset="56%" stop-color="#edf5e9"/>
      <stop offset="100%" stop-color="#dcefe8"/>
    </linearGradient>
    <linearGradient id="water" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#1a8f91"/>
      <stop offset="100%" stop-color="#245e55"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#245e55" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect width="1536" height="1024" fill="url(#bg)"/>
  <circle cx="1226" cy="230" r="330" fill="#ffffff" opacity="0.42"/>
  <circle cx="1236" cy="242" r="230" fill="#9edac6" opacity="0.38"/>
  <path d="M-90 778 C 70 700, 180 856, 340 778 S 610 856, 770 778 S 1040 856, 1200 778 S 1470 856, 1628 778" fill="none" stroke="#245e55" stroke-width="18" stroke-linecap="round" opacity="0.16"/>
  <path d="M-90 854 C 70 776, 180 932, 340 854 S 610 932, 770 854 S 1040 932, 1200 854 S 1470 932, 1628 854" fill="none" stroke="#245e55" stroke-width="18" stroke-linecap="round" opacity="0.12"/>
  <g transform="translate(88 88)">
    <rect x="0" y="0" width="92" height="92" rx="46" fill="#245e55"/>
    <text x="46" y="64" text-anchor="middle" font-family="Avenir Next, Segoe UI, Arial, sans-serif" font-size="56" font-weight="850" fill="#ffffff">S</text>
    <text x="112" y="62" font-family="Avenir Next, Segoe UI, Arial, sans-serif" font-size="42" font-weight="850" fill="#245e55">wim Calendar</text>
  </g>
  <g transform="translate(92 260)">
    <text font-family="Avenir Next, Segoe UI, Arial, sans-serif" font-size="104" font-weight="850" letter-spacing="-3" fill="#245e55">Toronto Swim Times</text>
    <text y="118" font-family="Avenir Next, Segoe UI, Arial, sans-serif" font-size="56" font-weight="750" fill="#397d67">Next 7 days, public pools, one simple view.</text>
    <rect y="178" width="760" height="76" rx="38" fill="#245e55"/>
    <text x="380" y="228" text-anchor="middle" font-family="Avenir Next, Segoe UI, Arial, sans-serif" font-size="34" font-weight="800" fill="#f4f7f2">Toronto | Markham | Richmond Hill | Vaughan</text>
  </g>
  <g transform="translate(905 392)" filter="url(#shadow)">
    <rect x="0" y="0" width="472" height="344" rx="28" fill="#ffffff" opacity="0.92"/>
    <rect x="0" y="0" width="472" height="76" rx="28" fill="#245e55"/>
    <rect x="0" y="48" width="472" height="40" fill="#245e55"/>
    <text x="56" y="50" font-family="Avenir Next, Segoe UI, Arial, sans-serif" font-size="28" font-weight="850" fill="#ffffff">MON</text>
    <text x="206" y="50" font-family="Avenir Next, Segoe UI, Arial, sans-serif" font-size="28" font-weight="850" fill="#ffffff">WED</text>
    <text x="354" y="50" font-family="Avenir Next, Segoe UI, Arial, sans-serif" font-size="28" font-weight="850" fill="#ffffff">SUN</text>
    <g transform="translate(44 122)">
      <rect width="106" height="166" rx="18" fill="#dcefe8"/>
      <path d="M28 64 C48 48, 72 48, 90 64" fill="none" stroke="#245e55" stroke-width="9" stroke-linecap="round"/>
      <path d="M22 94 C42 78, 66 78, 86 94 S124 110, 144 94" fill="none" stroke="#1a8f91" stroke-width="8" stroke-linecap="round"/>
      <rect x="22" y="126" width="62" height="8" rx="4" fill="#245e55" opacity="0.42"/>
    </g>
    <g transform="translate(184 122)">
      <rect width="106" height="166" rx="18" fill="#c9eadb"/>
      <path d="M28 64 C48 48, 72 48, 90 64" fill="none" stroke="#245e55" stroke-width="9" stroke-linecap="round"/>
      <path d="M22 94 C42 78, 66 78, 86 94 S124 110, 144 94" fill="none" stroke="#1a8f91" stroke-width="8" stroke-linecap="round"/>
      <rect x="22" y="126" width="62" height="8" rx="4" fill="#245e55" opacity="0.42"/>
    </g>
    <g transform="translate(324 122)">
      <rect width="106" height="166" rx="18" fill="#edf5e9"/>
      <path d="M28 64 C48 48, 72 48, 90 64" fill="none" stroke="#245e55" stroke-width="9" stroke-linecap="round"/>
      <path d="M22 94 C42 78, 66 78, 86 94 S124 110, 144 94" fill="none" stroke="#1a8f91" stroke-width="8" stroke-linecap="round"/>
      <rect x="22" y="126" width="62" height="8" rx="4" fill="#245e55" opacity="0.42"/>
    </g>
  </g>
</svg>`;

const output = path.join(__dirname, "..", "public", "og-share-v2.png");

sharp(Buffer.from(svg))
  .png({ compressionLevel: 9 })
  .toFile(output)
  .then(() => {
    console.log(output);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
