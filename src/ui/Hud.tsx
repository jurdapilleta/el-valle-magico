import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { audio } from '../audio/AudioManager';
import { numberOf } from '../content/numbers';
import { STICKERS } from '../content/stickers';
import { useSceneState } from '../core/machine';
import { endRest } from '../core/sessionClock';
import { useGameStore } from '../core/store';
import { GAMES } from '../games/configs';
import {
  acceptInvite,
  cancelInvite,
  choose,
  exitGame,
  goToGame,
  repeatPrompt,
  useSession,
} from '../games/session';
import { travelTo } from '../world/travel';
import { ZONES } from '../world/zones/defs';
import {
  ArrowIcon,
  BackIcon,
  BookIcon,
  CheckIcon,
  GameIcon,
  SpeakerIcon,
  StarIcon,
  StickerArt,
  UnicornFace,
  ZoneIcon,
} from './icons';
import { ParentArea, ParentButton, ParentGate } from './Parent';
import './ui.css';
import './parent.css';

type TapButtonProps = {
  label: string;
  className?: string;
  onTap: () => void;
  children: ReactNode;
  silent?: boolean;
  item?: string;
};

/**
 * Every HUD control: acts on pointer-down (forgiving for small hands), first
 * touch only, and always answers with a pop (§8.1, §8.3).
 */
export function TapButton({
  label,
  className = '',
  onTap,
  children,
  silent,
  item,
}: TapButtonProps) {
  return (
    <button
      type="button"
      className={`tap ${className}`}
      aria-label={label}
      data-item={item}
      onPointerDown={(e) => {
        if (!e.isPrimary) return;
        e.stopPropagation();
        if (!silent) audio.pop();
        onTap();
      }}
    >
      {children}
    </button>
  );
}

/** "Ir a la granja", but "Ir al lago" (a + el contracts). */
const goLabel = (name: string) =>
  name.startsWith('el ') ? `Ir al ${name.slice(3)}` : `Ir a ${name}`;

const STICKERS_PER_PAGE = 6;

/** The sticker book (§8.4): pages of six, turned with big arrows. */
function Album({ onClose }: { onClose: () => void }) {
  const owned = useGameStore((s) => s.save.stickers);
  const [page, setPage] = useState(0);
  const all = Object.keys(STICKERS);
  const pages = Math.max(1, Math.ceil(all.length / STICKERS_PER_PAGE));
  const shown = all.slice(page * STICKERS_PER_PAGE, (page + 1) * STICKERS_PER_PAGE);

  return (
    <div className="panel album" onPointerDown={onClose}>
      {pages > 1 && (
        <TapButton
          label="Página anterior"
          className="round small turn"
          onTap={() => setPage((p) => (p + pages - 1) % pages)}
        >
          <ArrowIcon flip />
        </TapButton>
      )}
      <div className="album-page" key={page}>
        {Array.from({ length: STICKERS_PER_PAGE }, (_, i) => {
          const id = shown[i];
          return id && owned.includes(id) ? (
            <TapButton
              key={i}
              label={`Calcomanía ${id}`}
              className="sticker"
              onTap={() => void audio.say(STICKERS[id]!.voice)}
            >
              <StickerArt id={id} />
            </TapButton>
          ) : (
            // Not earned yet (or no sticker for this slot): an empty place in the book.
            <div key={i} className="sticker empty">
              <StarIcon filled={false} />
            </div>
          );
        })}
      </div>
      {pages > 1 && (
        <TapButton
          label="Página siguiente"
          className="round small turn"
          onTap={() => setPage((p) => (p + 1) % pages)}
        >
          <ArrowIcon />
        </TapButton>
      )}
    </div>
  );
}

function WorldHud() {
  const [menu, setMenu] = useState(false);
  const [album, setAlbum] = useState(false);
  const zoneId = useGameStore((s) => s.zone);
  const visits = useGameStore((s) => s.visits);
  const progress = useGameStore((s) => s.save.progress);
  const zone = ZONES[zoneId];

  // Suggestions (§8.2): this zone's least-played game, then the two least-visited
  // neighbours, so the way back is always on offer.
  const game = [...zone.games].sort(
    (a, b) => (progress[a.id]?.plays ?? 0) - (progress[b.id]?.plays ?? 0),
  )[0];
  const neighbours = [...zone.portals]
    .sort((a, b) => (visits[a.to] ?? 0) - (visits[b.to] ?? 0))
    .slice(0, 2);

  const go = (walk: () => void) => {
    setMenu(false);
    walk();
  };

  return (
    <>
      <TapButton
        label="Luna"
        className="corner bottom-left round"
        onTap={() => {
          setAlbum(false);
          setMenu((open) => {
            if (!open) void audio.say(zone.where);
            return !open;
          });
        }}
      >
        <UnicornFace />
      </TapButton>
      {menu && (
        <div className="panel destinations">
          {game && (
            <TapButton
              label={`Jugar a ${GAMES[game.id]!.title}`}
              className="round big"
              onTap={() => go(() => goToGame(game.id))}
            >
              <GameIcon game={game.id} />
            </TapButton>
          )}
          {neighbours.map((portal) => (
            <TapButton
              key={portal.to}
              label={goLabel(ZONES[portal.to].name)}
              className="round big"
              onTap={() => go(() => travelTo(portal.to))}
            >
              <ZoneIcon zone={portal.to} />
            </TapButton>
          ))}
        </div>
      )}

      <TapButton
        label="Álbum de calcomanías"
        className="corner bottom-right round small"
        onTap={() => {
          setMenu(false);
          setAlbum((open) => !open);
        }}
      >
        <BookIcon />
      </TapButton>
      {album && <Album onClose={() => setAlbum(false)} />}
      <ParentButton />
    </>
  );
}

/** Shown while a zone streams in: Luna trots in place (§5.3). */
function Loading() {
  return (
    <div className="loading" role="status" aria-label="Cargando">
      <div className="trot">
        <UnicornFace />
      </div>
    </div>
  );
}

function InviteHud() {
  return (
    <>
      {/* Tapping anywhere else declines (§4.4). */}
      <div className="scrim" onPointerDown={cancelInvite} />
      <div className="panel invite">
        <TapButton label="Sí, jugar" className="round big yes" onTap={acceptInvite}>
          <CheckIcon />
        </TapButton>
        <TapButton label="Ahora no" className="round no" onTap={cancelInvite}>
          <BackIcon />
        </TapButton>
      </div>
    </>
  );
}

/** Big numeral cards for the counting games; other games show their choices on stage. */
function ChoiceCards() {
  const choices = useSession((s) => s.choices);
  const wrong = useSession((s) => s.wrong);
  const solved = useSession((s) => s.solved);
  const target = useSession((s) => s.target);
  const hint = useSession((s) => (s.hint?.target.kind === 'choice' ? s.hint : null));

  return (
    <div className="choices">
      {choices.map((item) => {
        const n = numberOf(item);
        const isTarget = item === target;
        const classes = [
          'card',
          wrong?.item === item ? 'wiggle' : '',
          hint && isTarget ? `hint-${hint.level}` : '',
          solved ? (isTarget ? 'correct' : 'faded') : '',
        ];
        return (
          <TapButton
            // The nonce restarts the wiggle when the same wrong card is tapped again.
            key={wrong?.item === item ? `${item}-${wrong.nonce}` : item}
            label={`Número ${n}`}
            className={classes.join(' ')}
            item={item}
            onTap={() => choose(item)}
            silent
          >
            <span className="numeral">{n}</span>
            {/* The numeral always appears with its quantity (§7.4). */}
            <span className="dots" aria-hidden="true">
              {Array.from({ length: n }, (_, i) => (
                <i key={i} />
              ))}
            </span>
          </TapButton>
        );
      })}
    </div>
  );
}

const CONFETTI = ['#FF8FD8', '#FFD972', '#9AF0D5', '#8AD3FF', '#C9B6FF', '#FF9F8A'];

function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 36 }, (_, i) => (
        <i
          key={i}
          style={
            {
              left: `${(i * 37) % 100}%`,
              background: CONFETTI[i % CONFETTI.length],
              animationDelay: `${(i % 9) * 0.07}s`,
              '--drift': `${((i * 53) % 120) - 60}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function GameHud() {
  const total = useSession((s) => s.totalRounds);
  const stars = useSession((s) => s.stars);
  const step = useSession((s) => s.step);
  const cards = useSession((s) => s.config?.choiceUi === 'cards');
  const celebrating = useSession((s) => s.celebrating);
  const newSticker = useSession((s) => s.newSticker);

  return (
    <>
      <div className="stars" role="img" aria-label={`${stars} de ${total} estrellas`}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={i < stars ? 'on' : ''}>
            <StarIcon filled={i < stars} />
          </span>
        ))}
      </div>
      <TapButton
        label="Repetir la pregunta"
        className="corner top-left round small"
        onTap={repeatPrompt}
      >
        <SpeakerIcon />
      </TapButton>
      <TapButton label="Salir con Luna" className="corner bottom-left round" onTap={exitGame}>
        <UnicornFace />
      </TapButton>
      {cards && step === 'choose-one' && <ChoiceCards />}
      {celebrating && <Confetti />}
      {newSticker && (
        <div className="new-sticker">
          <StickerArt id={newSticker} />
        </div>
      )}
    </>
  );
}

/** Time to rest (§7.6): the world dims and Luna dozes; a tap wakes her. Nothing is locked. */
function Rest() {
  return (
    <div className="rest" onPointerDown={endRest} role="button" aria-label="Luna descansa">
      <div className="doze">
        <UnicornFace />
      </div>
    </div>
  );
}

/** Placeholder-voice captions: shown only for lines that have no recording yet. */
function Caption() {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    audio.onCaption(setText);
    return () => audio.onCaption(() => {});
  }, []);
  return text ? <div className="caption">{text}</div> : null;
}

export function Hud() {
  const state = useSceneState();
  return (
    <div className="hud">
      {(state === 'world.idle' || state === 'world.walking') && <WorldHud />}
      {state === 'world.invite' && <InviteHud />}
      {state.startsWith('game') && <GameHud />}
      {state === 'loading' && <Loading />}
      {state === 'rest' && <Rest />}
      {state === 'parentGate' && <ParentGate />}
      {state === 'parentArea' && <ParentArea />}
      <Caption />
    </div>
  );
}
