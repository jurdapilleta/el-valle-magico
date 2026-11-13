import type { JSX } from 'react';
import { STICKERS } from '../content/stickers';

// Own SVG icons (§6.3). Everything is a picture: the player cannot read.

export function UnicornFace({
  body = '#F1EAFF',
  mane = '#FF8FD8',
}: {
  body?: string;
  mane?: string;
}) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M52 30 L60 4 L68 32 Z" fill="#FFD972" />
      <ellipse cx="30" cy="42" rx="12" ry="20" fill={mane} />
      <ellipse cx="26" cy="66" rx="10" ry="16" fill={mane} />
      <path d="M36 28 L40 12 L50 28 Z" fill={body} />
      <ellipse cx="54" cy="56" rx="27" ry="29" fill={body} />
      <ellipse cx="68" cy="74" rx="17" ry="13" fill={body} />
      <circle cx="58" cy="52" r="6" fill="#3A2A4A" />
      <circle cx="60" cy="50" r="2" fill="#FFFFFF" />
      <circle cx="74" cy="76" r="2" fill="#5A3A6A" opacity="0.5" />
      <ellipse cx="48" cy="66" rx="6" ry="4" fill="#FF8FD8" opacity="0.5" />
    </svg>
  );
}

export function StarIcon({ filled = true }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path
        d="M50 8 L61 38 L93 39 L68 58 L77 89 L50 71 L23 89 L32 58 L7 39 L39 38 Z"
        fill={filled ? '#FFD972' : 'rgba(255,255,255,0.55)'}
        stroke="#FFFFFF"
        strokeWidth="6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path
        d="M22 54 L42 74 L80 30"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path
        d="M44 26 L22 46 L44 66 M24 46 H62 a16 16 0 0 1 0 32 H46"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SpeakerIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M18 40 H34 L54 24 V76 L34 60 H18 Z" fill="#5A3A6A" />
      <path
        d="M64 38 a16 16 0 0 1 0 24 M72 28 a30 30 0 0 1 0 44"
        fill="none"
        stroke="#5A3A6A"
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BookIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M50 28 C40 20 24 20 14 24 V76 C24 72 40 72 50 80 Z" fill="#C9B6FF" />
      <path d="M50 28 C60 20 76 20 86 24 V76 C76 72 60 72 50 80 Z" fill="#FF8FD8" />
      <path d="M68 38 l3 8 8 0 -6 5 2 8 -7 -5 -7 5 2 -8 -6 -5 8 0 Z" fill="#FFD972" />
    </svg>
  );
}

function TreeIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <rect x="43" y="56" width="14" height="34" rx="5" fill="#C98A5E" />
      <circle cx="50" cy="40" r="30" fill="#6CC477" />
      <circle cx="36" cy="32" r="10" fill="#9FE0A8" />
    </svg>
  );
}

function CastleIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <rect x="26" y="48" width="48" height="40" fill="#FFC4EA" />
      <rect x="14" y="36" width="20" height="52" fill="#FFE3F5" />
      <rect x="66" y="36" width="20" height="52" fill="#FFE3F5" />
      <path d="M10 38 L24 12 L38 38 Z M62 38 L76 12 L90 38 Z" fill="#C9B6FF" />
      <path d="M38 50 L50 26 L62 50 Z" fill="#FF8FD8" />
      <path d="M42 88 V70 a8 8 0 0 1 16 0 V88 Z" fill="#B08968" />
    </svg>
  );
}

function BarnIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M14 46 L50 16 L86 46 V88 H14 Z" fill="#E5534B" />
      <path
        d="M8 48 L50 12 L92 48"
        fill="none"
        stroke="#8C4A3F"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <rect x="36" y="56" width="28" height="32" fill="#FFF6E5" />
      <path d="M36 56 L64 88 M64 56 L36 88" stroke="#E5534B" strokeWidth="4" />
      <circle cx="50" cy="38" r="7" fill="#FFF6E5" />
    </svg>
  );
}

function SnowIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="42" fill="#BDEBFF" />
      <g stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round">
        <path d="M50 18 V82 M22 34 L78 66 M22 66 L78 34" />
        <path d="M40 22 L50 32 L60 22 M40 78 L50 68 L60 78" fill="none" />
      </g>
    </svg>
  );
}

function LakeIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <ellipse cx="50" cy="64" rx="42" ry="24" fill="#8AD3FF" />
      <ellipse cx="50" cy="66" rx="20" ry="8" fill="#6CC477" />
      <ellipse cx="50" cy="52" rx="17" ry="13" fill="#6CC477" />
      <circle cx="41" cy="40" r="7" fill="#FFFFFF" />
      <circle cx="59" cy="40" r="7" fill="#FFFFFF" />
      <circle cx="42" cy="40" r="3" fill="#3A2A4A" />
      <circle cx="60" cy="40" r="3" fill="#3A2A4A" />
    </svg>
  );
}

function RainbowIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <g fill="none" strokeWidth="9">
        <path d="M10 76 a40 40 0 0 1 80 0" stroke="#FF4D5E" />
        <path d="M19 76 a31 31 0 0 1 62 0" stroke="#FFD23F" />
        <path d="M28 76 a22 22 0 0 1 44 0" stroke="#3DD68C" />
        <path d="M37 76 a13 13 0 0 1 26 0" stroke="#3D8BFF" />
      </g>
    </svg>
  );
}

const ZONE_ICONS = {
  hub: TreeIcon,
  castillo: CastleIcon,
  granja: BarnIcon,
  bosque: SnowIcon,
  lago: LakeIcon,
  pradera: RainbowIcon,
};

/** The picture that stands for a zone on Luna's destination buttons. */
export function ZoneIcon({ zone }: { zone: keyof typeof ZONE_ICONS }) {
  const Icon = ZONE_ICONS[zone];
  return <Icon />;
}

export function ArrowIcon({ flip }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path
        d="M38 24 L66 50 L38 76"
        fill="none"
        stroke="#5A3A6A"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const DARK = '#5A3A6A';

/** A picture for each game: on Luna's menu, and as that game's sticker. */
const GAME_ICONS: Record<string, () => JSX.Element> = {
  balloons: () => (
    <>
      <ellipse cx="50" cy="40" rx="26" ry="31" fill="#FF7AC8" />
      <path d="M50 71 l-5 8 h10 Z" fill="#FF7AC8" />
      <path d="M50 79 q-8 8 0 16" fill="none" stroke={DARK} strokeWidth="3" />
      <ellipse cx="41" cy="30" rx="6" ry="9" fill="#FFFFFF" opacity="0.6" />
    </>
  ),
  jewels: () => (
    <>
      <path d="M14 76 L20 36 L36 56 L50 26 L64 56 L80 36 L86 76 Z" fill="#FFD23F" />
      <circle cx="50" cy="62" r="8" fill="#8AD3FF" />
      <circle cx="28" cy="66" r="5" fill="#FF7AC8" />
      <circle cx="72" cy="66" r="5" fill="#3DD68C" />
    </>
  ),
  doors: () => (
    <>
      <path d="M26 90 V34 a24 24 0 0 1 48 0 V90 Z" fill="#C98A5E" />
      <path d="M50 12 V90" stroke="#8A552B" strokeWidth="3" />
      <circle cx="60" cy="58" r="4" fill="#FFD23F" />
    </>
  ),
  tower: () => (
    <>
      <rect x="22" y="62" width="56" height="26" rx="4" fill="#3D8BFF" />
      <rect x="30" y="38" width="40" height="24" rx="4" fill="#FFD23F" />
      <rect x="38" y="16" width="24" height="22" rx="4" fill="#FF7AC8" />
    </>
  ),
  animals: () => (
    <>
      <ellipse cx="50" cy="54" rx="30" ry="28" fill="#FFFFFF" stroke={DARK} strokeWidth="3" />
      <ellipse cx="50" cy="68" rx="18" ry="12" fill="#F6B8C8" />
      <path
        d="M22 38 q-12 -4 -8 8 Z M78 38 q12 -4 8 8 Z"
        fill="#FFFFFF"
        stroke={DARK}
        strokeWidth="3"
      />
      <circle cx="40" cy="48" r="4" fill={DARK} />
      <circle cx="60" cy="48" r="4" fill={DARK} />
      <path d="M34 30 q8 -8 14 4 Z" fill="#4A4350" />
    </>
  ),
  who: () => (
    <>
      <circle cx="42" cy="52" r="26" fill="#FFD23F" />
      <ellipse cx="66" cy="58" rx="16" ry="8" fill="#FF9A3D" />
      <circle cx="46" cy="44" r="4" fill={DARK} />
      <path
        d="M84 36 q8 14 0 28 M90 28 q14 22 0 44"
        fill="none"
        stroke={DARK}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </>
  ),
  homes: () => (
    <>
      <path d="M14 46 L50 16 L86 46 V88 H14 Z" fill="#E5534B" />
      <rect x="38" y="58" width="24" height="30" fill="#FFF6E5" />
      <path
        d="M8 48 L50 12 L92 48"
        fill="none"
        stroke="#8C4A3F"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </>
  ),
  eggs: () => (
    <>
      <path
        d="M22 70 l8 -8 8 8 8 -8 8 8 8 -8 8 8 8 -8 v18 a18 10 0 0 1 -56 0 Z"
        fill="#FFF6E5"
        stroke={DARK}
        strokeWidth="2"
      />
      <circle cx="50" cy="46" r="20" fill="#FFD23F" />
      <circle cx="43" cy="42" r="3" fill={DARK} />
      <circle cx="57" cy="42" r="3" fill={DARK} />
      <path d="M46 50 h8 l-4 6 Z" fill="#FF9A3D" />
    </>
  ),
  'count-unicorns': () => (
    <g transform="translate(8 8) scale(0.84)">
      <UnicornFace body="#9AF0D5" mane="#C9B6FF" />
    </g>
  ),
  more: () => (
    <>
      <path d="M18 54 H82 L74 88 H26 Z" fill="#C98A5E" />
      <circle cx="36" cy="44" r="12" fill="#FF4D5E" />
      <circle cx="62" cy="44" r="12" fill="#FF4D5E" />
      <circle cx="49" cy="30" r="12" fill="#FF4D5E" />
    </>
  ),
  necklace: () => (
    <>
      <path d="M14 28 Q50 96 86 28" fill="none" stroke={DARK} strokeWidth="3" />
      {[
        [22, 42, '#FF7AC8'],
        [34, 58, '#3D8BFF'],
        [50, 65, '#FF7AC8'],
        [66, 58, '#3D8BFF'],
        [78, 42, '#FF7AC8'],
      ].map(([x, y, fill]) => (
        <circle key={x} cx={x} cy={y} r="9" fill={fill as string} />
      ))}
    </>
  ),
  letters: () => (
    <>
      <rect x="16" y="16" width="68" height="68" rx="12" fill="#BDEBFF" />
      <path
        d="M32 74 L50 26 L68 74 M39 58 H61"
        fill="none"
        stroke={DARK}
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  next: () => (
    <g fill="#4A6FA5">
      <ellipse cx="30" cy="66" rx="12" ry="10" />
      <circle cx="18" cy="48" r="5" />
      <circle cx="30" cy="42" r="5" />
      <circle cx="42" cy="48" r="5" />
      <ellipse cx="68" cy="50" rx="12" ry="10" />
      <circle cx="56" cy="32" r="5" />
      <circle cx="68" cy="26" r="5" />
      <circle cx="80" cy="32" r="5" />
    </g>
  ),
  tracks: () => (
    <g stroke="#4A6FA5" strokeWidth="7" strokeLinecap="round">
      <path d="M50 14 V86 M19 32 L81 68 M19 68 L81 32" />
    </g>
  ),
  pairs: () => (
    <>
      <ellipse cx="34" cy="56" rx="24" ry="20" fill="#6CC477" />
      <ellipse cx="68" cy="50" rx="24" ry="20" fill="#8FD694" />
      <path d="M34 56 L20 44 M68 50 L82 38" stroke="#3F9A52" strokeWidth="4" />
      <circle cx="68" cy="50" r="7" fill="#FF7AC8" />
    </>
  ),
  faces: () => (
    <>
      <circle cx="50" cy="52" r="36" fill="#FFD972" />
      <circle cx="38" cy="44" r="5" fill={DARK} />
      <circle cx="62" cy="44" r="5" fill={DARK} />
      <path
        d="M32 60 Q50 80 68 60"
        fill="none"
        stroke={DARK}
        strokeWidth="6"
        strokeLinecap="round"
      />
    </>
  ),
};

export function GameIcon({ game }: { game: string }) {
  const Icon = GAME_ICONS[game];
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      {Icon ? <Icon /> : <circle cx="50" cy="50" r="30" fill="#FFD972" />}
    </svg>
  );
}

export function StickerArt({ id }: { id: string }) {
  const Icon = GAME_ICONS[STICKERS[id]?.game ?? ''];
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="47" fill="#FFFFFF" stroke="#FFD972" strokeWidth="5" />
      <g transform="translate(15 15) scale(0.7)">{Icon && <Icon />}</g>
    </svg>
  );
}
