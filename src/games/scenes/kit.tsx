import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import {
  CanvasTexture,
  ConeGeometry,
  MeshBasicMaterial,
  Plane,
  RingGeometry,
  Vector3,
  type Group,
  type Mesh,
} from 'three';
import { audio } from '../../audio/AudioManager';
import { useGameStore } from '../../core/store';
import { stageOf } from '../../world/layout';
import type { HintTarget } from '../engine/RoundRunner';
import { baseOf, type ItemId } from '../engine/types';
import { choose, place, select, tapItem, tapObject, useSession } from '../session';
import { stagePoints } from '../stagePoints';

// Building blocks shared by every game's stage. A stage only says what its
// items look like; tapping, dragging, hints and feedback live here, and the
// answer logic lives in the engine.

export const SPACING = 1.6;
/** x of the i-th of n items in a centred row. */
export const rowX = (i: number, n: number, spacing = SPACING) => (i - (n - 1) / 2) * spacing;

const useCentre = () => stageOf(useGameStore((s) => s.zone)).centre;

/** Places a game's stage at the zone's stage spot. */
export function StageGroup({ children }: { children: ReactNode }) {
  const centre = useCentre();
  return <group position={centre}>{children}</group>;
}

function usePoint(key: string, x: number, y: number, z: number) {
  const centre = useCentre();
  useEffect(() => {
    stagePoints.set(key, new Vector3(centre.x + x, y, centre.z + z));
    return () => void stagePoints.delete(key);
  }, [key, centre, x, y, z]);
}

// ---- Hint marker: glowing ring on the ground and a bobbing arrow ----

const RING = new RingGeometry(0.62, 0.8, 32);
const ARROW = new ConeGeometry(0.22, 0.5, 12);
const GOLD = new MeshBasicMaterial({ color: '#FFD972' });

function HintMarker({ top }: { top: number }) {
  const ring = useRef<Mesh>(null);
  const arrow = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    ring.current?.scale.setScalar(1 + 0.12 * Math.sin(t * 6));
    if (arrow.current) arrow.current.position.y = top + 0.5 + 0.2 * Math.sin(t * 6);
  });
  return (
    <>
      <mesh
        ref={ring}
        geometry={RING}
        material={GOLD}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.05, 0]}
        raycast={() => null}
      />
      <mesh
        ref={arrow}
        geometry={ARROW}
        material={GOLD}
        rotation={[Math.PI, 0, 0]}
        raycast={() => null}
      />
    </>
  );
}

type Kind = 'choice' | 'item' | 'slot' | 'object';

function hintFor(hint: { level: number; target: HintTarget } | null, kind: Kind, id: string) {
  if (!hint) return 0;
  const t = hint.target;
  const hit =
    (kind === 'choice' && t.kind === 'choice' && t.item === id) ||
    (kind === 'item' && (t.kind === 'item' || t.kind === 'place') && t.item === id) ||
    (kind === 'slot' && t.kind === 'place' && t.slot === id) ||
    (kind === 'object' && t.kind === 'object' && String(t.index) === id);
  return hit ? hint.level : 0;
}

/** Wiggle when it was the wrong pick (never a red X, §2). */
function useWiggle(id: string, enabled: boolean) {
  const nonce = useSession((s) => (enabled && s.wrong?.item === id ? s.wrong.nonce : 0));
  const until = useRef(0);
  const last = useRef(0);
  if (nonce !== last.current) {
    last.current = nonce;
    if (nonce) until.current = performance.now() + 450;
  }
  return until;
}

type PickProps = {
  id: string;
  kind: Kind;
  x: number;
  y?: number;
  z?: number;
  /** Radius and height of the invisible hit proxy (§8.1: generous). */
  hit?: [number, number];
  onTap: () => void;
  /** What the right answer does: hop on the spot, or float away. */
  onCorrect?: 'hop' | 'rise';
  children: ReactNode;
};

/** Anything on stage that answers a tap, with wiggle, hint and celebration built in. */
export function Pick({
  id,
  kind,
  x,
  y = 0,
  z = 0,
  hit = [0.75, 2],
  onTap,
  onCorrect,
  children,
}: PickProps) {
  const inner = useRef<Group>(null);
  const hint = useSession((s) => hintFor(s.hint, kind, id));
  const right = useSession((s) => s.solved && kind === 'choice' && s.target === id);
  const faded = useSession((s) => s.solved && kind === 'choice' && s.target !== id);
  const wiggleUntil = useWiggle(id, kind !== 'slot');
  usePoint(`${kind}:${id}`, x, y + hit[1] / 2, z);

  useFrame(({ clock }, delta) => {
    const g = inner.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.position.x =
      performance.now() < wiggleUntil.current || hint === 1 ? Math.sin(t * 22) * 0.09 : 0;
    if (right && onCorrect === 'rise') g.position.y += delta * 2.5;
    else g.position.y = right ? Math.abs(Math.sin(t * 8)) * 0.3 : 0;
    const scale = faded ? 0.75 : 1;
    g.scale.setScalar(g.scale.x + (scale - g.scale.x) * Math.min(1, delta * 10));
  });

  return (
    <group position={[x, y, z]}>
      <group ref={inner}>{children}</group>
      {hint >= 2 && <HintMarker top={hit[1]} />}
      <mesh
        position={[0, hit[1] / 2, 0]}
        visible={false}
        onPointerDown={(e) => {
          e.stopPropagation();
          onTap();
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <cylinderGeometry args={[hit[0], hit[0], hit[1], 10]} />
      </mesh>
    </group>
  );
}

type RowProps = {
  render: (id: ItemId, index: number) => ReactNode;
  /** 'choice' answers a question; 'item' is tapped in a sequence or just for fun. */
  kind?: 'choice' | 'item';
  ids?: ItemId[];
  z?: number;
  y?: number;
  spacing?: number;
  hit?: [number, number];
  onCorrect?: 'hop' | 'rise';
};

/** The round's choices in a row at the front of the stage. */
export function Choices({
  render,
  kind = 'choice',
  ids,
  z = 1.2,
  y = 0,
  spacing,
  hit,
  onCorrect = 'hop',
}: RowProps) {
  const choices = useSession((s) => s.choices);
  const roundIndex = useSession((s) => s.roundIndex);
  const list = ids ?? choices;
  const gap = spacing ?? (list.length > 4 ? 1.35 : SPACING);
  return (
    <>
      {list.map((id, i) => (
        <Pick
          // Keyed by round so nothing carries over from the last question.
          key={`${roundIndex}:${id}`}
          id={id}
          kind={kind}
          x={rowX(i, list.length, gap)}
          y={y}
          z={z}
          hit={hit}
          onCorrect={onCorrect}
          onTap={() => (kind === 'choice' ? choose(id) : tapItem(id))}
        >
          {render(baseOf(id), i)}
        </Pick>
      ))}
    </>
  );
}

/** Things to look at, not touch: a pattern or the picture a question is about. */
export function ShowRow({
  render,
  z = -1.3,
  y = 0,
  spacing = 1.25,
  gap,
}: {
  render: (id: ItemId, index: number) => ReactNode;
  z?: number;
  y?: number;
  spacing?: number;
  /** Adds a "?" after the last item: the place the answer goes. */
  gap?: boolean;
}) {
  const show = useSession((s) => s.show);
  const n = show.length + (gap ? 1 : 0);
  return (
    <>
      {show.map((id, i) => (
        <group key={i} position={[rowX(i, n, spacing), y, z]}>
          {render(baseOf(id), i)}
        </group>
      ))}
      {gap && show.length > 0 && (
        <group position={[rowX(n - 1, n, spacing), y, z]}>
          <Glyph text="?" y={0.7} size={0.9} />
        </group>
      )}
    </>
  );
}

// ---- Tap-all: objects to count ----

type ObjectState = { count: number | undefined; anim: () => 'Idle' | 'Walk' | 'Happy' };

type TapObjectsProps = {
  render: (index: number, state: ObjectState) => ReactNode;
  /** Objects gallop in from the right instead of simply being there. */
  enter?: boolean;
  spacing?: number;
  hit?: [number, number];
  /** Where an object sits; lets counted ones move (a tower growing). */
  position?: (
    index: number,
    quantity: number,
    count: number | undefined,
  ) => [number, number, number];
  numeralAt?: number;
};

const PER_ROW = 5;
/** Slots in a line, or a 2×N grid above five (§7.4: never scattered). */
export function gridSlot(index: number, quantity: number, spacing = 1.5): [number, number, number] {
  const row = Math.floor(index / PER_ROW);
  const inRow = Math.min(PER_ROW, quantity - row * PER_ROW);
  return [rowX(index % PER_ROW, inRow, spacing), 0, -row * 1.7];
}

function TapObject({
  index,
  quantity,
  render,
  enter,
  spacing,
  hit = [0.72, 2.2],
  position,
  numeralAt = 2.1,
}: TapObjectsProps & { index: number; quantity: number }) {
  const group = useRef<Group>(null);
  const offset = useRef(enter ? 14 + index * 1.2 : 0);
  const happyUntil = useRef(0);
  const lastCount = useRef<number | undefined>(undefined);
  const count = useSession((s) => s.counted[index]);
  const solved = useSession((s) => s.solved);
  const hint = useSession((s) => hintFor(s.hint, 'object', String(index)));
  const home = gridSlot(index, quantity, spacing);
  const at = position?.(index, quantity, count) ?? home;
  // Where it waits to be tapped (before it is counted).
  const start = position?.(index, quantity, undefined) ?? home;
  usePoint(`object:${index}`, start[0], start[1] + hit[1] / 2, start[2]);

  if (count !== lastCount.current) {
    lastCount.current = count;
    if (count !== undefined) happyUntil.current = performance.now() + 900;
  }
  const anim = () =>
    offset.current > 0.01
      ? 'Walk'
      : solved || performance.now() < happyUntil.current
        ? 'Happy'
        : 'Idle';

  useFrame(({ clock }, delta) => {
    const g = group.current;
    if (!g) return;
    offset.current = Math.max(0, offset.current - 9 * delta);
    const wiggle = hint > 0 ? Math.sin(clock.elapsedTime * 14) * 0.08 : 0;
    const k = Math.min(1, delta * 8);
    g.position.x += (at[0] + offset.current + wiggle - g.position.x) * (offset.current > 0 ? 1 : k);
    g.position.y += (at[1] - g.position.y) * k;
    g.position.z += (at[2] - g.position.z) * k;
    g.rotation.y = offset.current > 0.01 ? -Math.PI / 2 : 0;
  });

  return (
    <group ref={group} position={[at[0] + offset.current, at[1], at[2]]}>
      {render(index, { count, anim })}
      <mesh
        position={[0, hit[1] / 2, 0]}
        visible={false}
        onPointerDown={(e) => {
          e.stopPropagation();
          // Everything tappable reacts (§2), even one that is already counted.
          if (count !== undefined) {
            audio.pop();
            happyUntil.current = performance.now() + 500;
          }
          tapObject(index);
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <cylinderGeometry args={[hit[0], hit[0], hit[1], 10]} />
      </mesh>
      {count !== undefined && <Glyph text={String(count)} y={numeralAt} size={0.8} />}
      {hint >= 2 && <HintMarker top={hit[1]} />}
    </group>
  );
}

export function TapObjects(props: TapObjectsProps) {
  const quantity = useSession((s) => s.quantity);
  const roundIndex = useSession((s) => s.roundIndex);
  return (
    <>
      {Array.from({ length: quantity }, (_, i) => (
        <TapObject key={`${roundIndex}-${i}`} index={i} quantity={quantity} {...props} />
      ))}
    </>
  );
}

// ---- Drag-to-slot (with a tap-tap alternative, §14) ----

const hitPoint = new Vector3();
/** A drop this close to a slot snaps into it (generous, like a magnet). */
const SNAP_METRES = 1.5;
const DRAG_START_METRES = 0.35;

type DragItemProps = {
  id: ItemId;
  home: [number, number];
  slots: string[];
  slotAt: (slot: string) => [number, number];
  hit?: [number, number];
  children: ReactNode;
};

const DRAG_HIT: [number, number] = [0.8, 2];

function DragItem({ id, home, slots, slotAt, hit = DRAG_HIT, children }: DragItemProps) {
  const centre = useCentre();
  const group = useRef<Group>(null);
  const drag = useRef<{ moved: boolean } | null>(null);
  const pointer = useRef(new Vector3(home[0], 0, home[1]));
  // The finger holds the item by its middle, so track it on a plane at that height:
  // dropping it visually on a slot then really is on the slot.
  const grabPlane = useMemo(() => new Plane(new Vector3(0, 1, 0), -hit[1] / 2), [hit]);
  const placedIn = useSession((s) => s.placed[id]);
  const selected = useSession((s) => s.selected === id);
  const hint = useSession((s) => hintFor(s.hint, 'item', id));
  const wiggleUntil = useWiggle(id, true);
  usePoint(`item:${id}`, home[0], hit[1] / 2, home[1]);

  useFrame(({ clock }, delta) => {
    const g = group.current;
    if (!g) return;
    const dragging = drag.current !== null;
    const slot = placedIn ? slotAt(placedIn) : null;
    // Sits just in front of its slot once placed.
    const tx = slot ? slot[0] : dragging ? pointer.current.x : home[0];
    const tz = slot ? slot[1] + 0.2 : dragging ? pointer.current.z : home[1];
    const wiggle =
      performance.now() < wiggleUntil.current || hint === 1
        ? Math.sin(clock.elapsedTime * 22) * 0.09
        : 0;
    const k = dragging ? 1 : Math.min(1, delta * 9);
    g.position.x += (tx + wiggle - g.position.x) * k;
    g.position.z += (tz - g.position.z) * k;
    const lift = dragging ? 0.5 : selected ? 0.35 : 0;
    g.position.y += (lift - g.position.y) * Math.min(1, delta * 12);
  });

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as unknown as Element).setPointerCapture(e.pointerId);
    pointer.current.set(home[0], 0, home[1]);
    drag.current = { moved: false };
    audio.pop();
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current || !e.ray.intersectPlane(grabPlane, hitPoint)) return;
    pointer.current.set(hitPoint.x - centre.x, 0, hitPoint.z - centre.z);
    const moved = Math.hypot(pointer.current.x - home[0], pointer.current.z - home[1]);
    if (moved > DRAG_START_METRES) drag.current.moved = true;
  };
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    const state = drag.current;
    drag.current = null;
    if (!state) return;
    e.stopPropagation();
    (e.target as unknown as Element).releasePointerCapture(e.pointerId);
    if (!state.moved) {
      // A tap picks it up; the next tap on a slot puts it down.
      select(selected ? null : id);
      return;
    }
    let best: string | null = null;
    let bestDistance = SNAP_METRES;
    for (const slot of slots) {
      const [sx, sz] = slotAt(slot);
      const d = Math.hypot(pointer.current.x - sx, pointer.current.z - sz);
      if (d < bestDistance) {
        best = slot;
        bestDistance = d;
      }
    }
    if (best) place(id, best);
  };

  return (
    <group ref={group} position={[home[0], 0, home[1]]}>
      {children}
      {hint >= 2 && <HintMarker top={hit[1]} />}
      {!placedIn && (
        <mesh
          position={[0, hit[1] / 2, 0]}
          visible={false}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onClick={(e) => e.stopPropagation()}
        >
          <cylinderGeometry args={[hit[0], hit[0], hit[1], 10]} />
        </mesh>
      )}
    </group>
  );
}

export function DragBoard({
  renderItem,
  renderSlot,
  spacing = 2.1,
  itemZ = 1.4,
  slotZ = -1.2,
  hit,
}: {
  renderItem: (id: ItemId) => ReactNode;
  renderSlot: (slot: string) => ReactNode;
  spacing?: number;
  itemZ?: number;
  slotZ?: number;
  hit?: [number, number];
}) {
  const items = useSession((s) => s.items);
  const slots = useSession((s) => s.slots);
  const roundIndex = useSession((s) => s.roundIndex);
  const slotAt = (slot: string): [number, number] => [
    rowX(slots.indexOf(slot), slots.length, spacing),
    slotZ,
  ];
  return (
    <>
      {slots.map((slot) => (
        <Pick
          key={`${roundIndex}:${slot}`}
          id={slot}
          kind="slot"
          x={slotAt(slot)[0]}
          z={slotZ}
          hit={[0.95, 2.2]}
          onTap={() => {
            const picked = useSession.getState().selected;
            if (picked) place(picked, slot);
            else audio.pop();
          }}
        >
          {renderSlot(baseOf(slot))}
        </Pick>
      ))}
      {items.map((item, i) => (
        <DragItem
          key={`${roundIndex}:${item}`}
          id={item}
          home={[rowX(i, items.length, spacing), itemZ]}
          slots={slots}
          slotAt={slotAt}
          hit={hit}
        >
          {renderItem(baseOf(item))}
        </DragItem>
      ))}
    </>
  );
}

// ---- Pairs: face-down cards in two rows ----

export function PairsBoard({
  renderBack,
  renderFace,
}: {
  renderBack: () => ReactNode;
  renderFace: (id: ItemId) => ReactNode;
}) {
  const cards = useSession((s) => s.choices);
  const faceUp = useSession((s) => s.faceUp);
  const matched = useSession((s) => s.matched);
  const roundIndex = useSession((s) => s.roundIndex);
  const cols = Math.ceil(cards.length / 2);
  return (
    <>
      {cards.map((card, i) => {
        const back = i >= cols;
        const shown = faceUp.includes(card) || matched.includes(card);
        return (
          <Pick
            key={`${roundIndex}:${card}`}
            id={card}
            kind="item"
            x={rowX(back ? i - cols : i, back ? cards.length - cols : cols, 1.7)}
            z={back ? -1.3 : 1}
            // Low, like the pad itself: a tall proxy on the front row would catch
            // taps aimed at the row behind it.
            hit={[0.8, 0.5]}
            onTap={() => tapItem(card)}
          >
            {renderBack()}
            {shown && (
              <group position={[0, 0.16, 0]} scale={0.62}>
                {renderFace(baseOf(card))}
              </group>
            )}
          </Pick>
        );
      })}
    </>
  );
}

// ---- Decorative glyphs: numerals, letters, "?" (no font file, no network) ----

const glyphs = new Map<string, CanvasTexture>();
function glyphTexture(text: string): CanvasTexture {
  let texture = glyphs.get(text);
  if (!texture) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5A3A6A';
    ctx.font = '700 76px ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 70);
    texture = new CanvasTexture(canvas);
    glyphs.set(text, texture);
  }
  return texture;
}

export function Glyph({ text, y = 0, size = 0.8 }: { text: string; y?: number; size?: number }) {
  return (
    <sprite position={[0, y, 0]} scale={size} raycast={() => null}>
      <spriteMaterial map={glyphTexture(text)} depthTest={false} />
    </sprite>
  );
}
