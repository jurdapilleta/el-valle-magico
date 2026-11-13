import { useEffect, useRef, useState } from 'react';
import { audio, type VolumeGroup } from '../audio/AudioManager';
import type { QualitySetting } from '../app/quality';
import { ANIMALS, COLOURS, LETTERS, OBJECTIVES } from '../content/items';
import { sceneActor } from '../core/machine';
import { defaultSave, isMastered, writeSave, type Save } from '../core/persistence';
import { useGameStore } from '../core/store';
import { GAME_LIST } from '../games/configs';

// The parent side (§7.6, §8.6). Plain text and ordinary controls are fine
// here: this is the one place written for an adult.

const HOLD_MS = 3000;

function update(change: (save: Save) => Save): void {
  const { save, setSave } = useGameStore.getState();
  const next = change(save);
  setSave(next);
  void writeSave(next);
}

/** Deliberately small and dull (§8.2): hold for three seconds to reach the gate. */
export function ParentButton() {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const [holding, setHolding] = useState(false);
  const stop = () => {
    clearTimeout(timer.current);
    setHolding(false);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      className={holding ? 'parent-button holding' : 'parent-button'}
      aria-label="Rincón de padres (mantener presionado)"
      onPointerDown={(e) => {
        e.stopPropagation();
        setHolding(true);
        timer.current = setTimeout(() => {
          setHolding(false);
          sceneActor.send({ type: 'HOLD_PARENT' });
        }, HOLD_MS);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="14" fill="none" stroke="currentColor" strokeWidth="10" />
        <path
          d="M50 12 V26 M50 74 V88 M12 50 H26 M74 50 H88 M23 23 L33 33 M67 67 L77 77 M23 77 L33 67 M67 33 L77 23"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

const newSum = (): [number, number] => [
  10 + Math.floor(Math.random() * 40),
  10 + Math.floor(Math.random() * 40),
];

/** A sum a four-year-old cannot do (§8.6). */
export function ParentGate() {
  const [[a, b], setSum] = useState(newSum);
  const [typed, setTyped] = useState('');
  const submit = () => {
    if (Number(typed) === a + b) sceneActor.send({ type: 'PASS' });
    else {
      setSum(newSum());
      setTyped('');
    }
  };
  return (
    <div className="parent gate" role="dialog" aria-label="Solo para adultos">
      <p className="question">
        ¿Cuánto es{' '}
        <span data-testid="sum">
          {a} + {b}
        </span>
        ?
      </p>
      <output className="typed">{typed || ' '}</output>
      <div className="keypad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} type="button" onClick={() => setTyped((t) => (t + n).slice(0, 3))}>
            {n}
          </button>
        ))}
        <button type="button" onClick={() => setTyped('')} aria-label="Borrar">
          ⌫
        </button>
        <button type="button" onClick={() => setTyped((t) => (t + 0).slice(0, 3))}>
          0
        </button>
        <button type="button" className="ok" onClick={submit}>
          OK
        </button>
      </div>
      <button type="button" className="link" onClick={() => sceneActor.send({ type: 'CLOSE' })}>
        Volver al juego
      </button>
    </div>
  );
}

function minutesThisWeek(minutesByDay: Record<string, number>): number {
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const day = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    total += minutesByDay[day] ?? 0;
  }
  return total;
}

const STATUS_TITLE = { yes: 'Lo sabe', seen: 'Practicando', new: 'Sin ver' };

/** Per item: known (right first time and not missed since), practising, or not yet seen. */
function Known({
  title,
  family,
  names,
}: {
  title: string;
  family: string;
  names: Record<string, string>;
}) {
  const items = useGameStore((s) => s.save.items);
  return (
    <section>
      <h3>{title}</h3>
      <ul className="known">
        {Object.entries(names).map(([key, name]) => {
          const record = items[family + '.' + key];
          const status = !record ? 'new' : record.box >= 2 ? 'yes' : 'seen';
          return (
            <li key={key} className={status} title={STATUS_TITLE[status]}>
              {name}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const numberNames = Object.fromEntries(
  Array.from({ length: 10 }, (_, i) => [String(i + 1), String(i + 1)]),
);
const colourNames = Object.fromEntries(Object.keys(COLOURS).map((key) => [key, key]));
const animalNames = Object.fromEntries(
  Object.entries(ANIMALS).map(([key, a]) => [key, a.name.split(' ')[1]!]),
);
const letterNames = Object.fromEntries(Object.keys(LETTERS).map((key) => [key, key.toUpperCase()]));
const VOLUME_LABELS = { voice: 'Voz', music: 'Música', sfx: 'Efectos' };

export function ParentArea() {
  const save = useGameStore((s) => s.save);
  const tier = useGameStore((s) => s.tier);
  const [confirmReset, setConfirmReset] = useState(false);
  const { settings } = save;

  const setVolume = (group: VolumeGroup, value: number) => {
    audio.setVolume(group, value);
    update((s) => ({
      ...s,
      settings: { ...s.settings, volumes: { ...s.settings.volumes, [group]: value } },
    }));
  };
  const started = new Set(
    GAME_LIST.filter((g) => (save.progress[g.id]?.plays ?? 0) > 0).flatMap((g) => g.objectives),
  );

  return (
    <div className="parent area" role="dialog" aria-label="Rincón de padres">
      <header>
        <h2>Rincón de padres</h2>
        <button type="button" className="ok" onClick={() => sceneActor.send({ type: 'CLOSE' })}>
          Volver al juego
        </button>
      </header>

      <section>
        <h3>Esta semana</h3>
        <p>
          <strong data-testid="minutes">{minutesThisWeek(save.minutesByDay)}</strong> minutos de
          juego · <strong data-testid="stickers">{save.stickers.length}</strong> calcomanías
        </p>
      </section>

      <section>
        <h3>Objetivos</h3>
        <ul className="objectives">
          {Object.entries(OBJECTIVES).map(([code, label]) => {
            const attempts = save.objectives[code] ?? [];
            const right = attempts.filter(Boolean).length;
            const mastered = isMastered(attempts);
            const status = mastered
              ? 'Dominado'
              : started.has(code)
                ? 'Aprendiendo'
                : 'Sin empezar';
            return (
              <li key={code} data-objective={code}>
                <span>{label}</span>
                <span className="bar" aria-hidden="true">
                  <i style={{ width: right * 10 + '%' }} />
                </span>
                <span className={mastered ? 'status done' : 'status'}>{status}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <Known title="Números" family="num" names={numberNames} />
      <Known title="Colores" family="color" names={colourNames} />
      <Known title="Animales" family="animal" names={animalNames} />
      <Known title="Letras" family="letter" names={letterNames} />

      <section>
        <h3>Ajustes</h3>
        <label>
          Nombre
          <input
            type="text"
            value={save.child.name ?? ''}
            maxLength={20}
            onChange={(e) => {
              const name = e.target.value;
              // Her initial drives the first level of the letters game (§7.4).
              const firstLetter = name.trim().charAt(0).toLowerCase() || undefined;
              update((s) => ({ ...s, child: { name, firstLetter } }));
            }}
          />
        </label>
        <label>
          Tiempo de juego
          <select
            value={settings.sessionMinutes}
            onChange={(e) =>
              update((s) => ({
                ...s,
                settings: {
                  ...s.settings,
                  sessionMinutes: Number(e.target.value) as 0 | 10 | 15 | 20,
                },
              }))
            }
          >
            <option value={10}>10 minutos</option>
            <option value={15}>15 minutos</option>
            <option value={20}>20 minutos</option>
            <option value={0}>Sin límite</option>
          </select>
        </label>
        {(['voice', 'music', 'sfx'] as const).map((group) => (
          <label key={group}>
            {VOLUME_LABELS[group]}
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.volumes[group]}
              onChange={(e) => setVolume(group, Number(e.target.value))}
            />
          </label>
        ))}
        <label>
          Calidad gráfica
          <select
            value={settings.quality}
            onChange={(e) =>
              update((s) => ({
                ...s,
                settings: { ...s.settings, quality: e.target.value as QualitySetting },
              }))
            }
          >
            <option value="auto">Automática ({tier})</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </label>
        <p>
          {confirmReset ? (
            <>
              ¿Seguro? Se borran las calcomanías y el progreso.{' '}
              <button
                type="button"
                className="danger"
                onClick={() => {
                  update((s) => ({ ...defaultSave(), child: s.child, settings: s.settings }));
                  setConfirmReset(false);
                }}
              >
                Sí, borrar
              </button>{' '}
              <button type="button" onClick={() => setConfirmReset(false)}>
                Cancelar
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmReset(true)}>
              Borrar el progreso
            </button>
          )}
        </p>
      </section>

      <section className="credits">
        <h3>Créditos</h3>
        <p>
          Modelos de naturaleza: Kenney Nature Kit (kenney.nl), CC0. Personajes, edificios y sonidos
          de prueba: hechos para este juego. Sin anuncios, sin cuentas y sin conexión: no se recoge
          ningún dato.
        </p>
      </section>
    </div>
  );
}
