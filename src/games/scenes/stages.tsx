import type { ComponentType } from 'react';
import { BABY_COLOURS, Unicorn } from '../../characters/Unicorn';
import { keyOf } from '../engine/types';
import { tapItem, useSession } from '../session';
import {
  Animal,
  Balloon,
  Basket,
  Block,
  BLOCK_SIZE,
  Door,
  Egg,
  Face,
  Gem,
  HomeModel,
  LetterTile,
  LilyPad,
  Pearl,
  SIZE_SCALE,
  Track,
} from './items3d';
import {
  Choices,
  DragBoard,
  Glyph,
  gridSlot,
  PairsBoard,
  Pick,
  rowX,
  ShowRow,
  StageGroup,
  TapObjects,
} from './kit';
import { choose } from '../session';

// One stage per game (GAME_DESIGN §9.1). A stage says what the round's items
// look like and where they stand; it holds no answer logic.

const baby = (i: number) => BABY_COLOURS[i % BABY_COLOURS.length]!;
const BABY_SCALE = 0.62;

// ---- Castillo de Estrella ----

export function BalloonsStage() {
  return (
    <StageGroup>
      <Choices render={(id) => <Balloon colour={keyOf(id)} />} hit={[0.7, 2.8]} onCorrect="rise" />
    </StageGroup>
  );
}

export function JewelsStage() {
  const step = useSession((s) => s.step);
  const level = useSession((s) => s.level);
  return (
    <StageGroup>
      {step === 'drag-to-slot' ? (
        <DragBoard
          renderItem={(id) => <Gem shape={keyOf(id)} />}
          renderSlot={(slot) => <Gem shape={keyOf(slot)} hole />}
        />
      ) : (
        // At level 3 the gems are turned, so shape has to be recognised, not matched by outline.
        <Choices
          render={(id, i) => <Gem shape={keyOf(id)} roll={level === 3 ? 0.5 + i * 0.9 : 0} />}
        />
      )}
    </StageGroup>
  );
}

export function DoorsStage() {
  const step = useSession((s) => s.step);
  const solved = useSession((s) => s.solved);
  const target = useSession((s) => s.target);
  const choices = useSession((s) => s.choices);
  const at = target ? choices.indexOf(target) : -1;
  return (
    <StageGroup>
      {step === 'drag-to-slot' ? (
        <DragBoard
          renderItem={(id) => <Door size={keyOf(id)} />}
          renderSlot={(slot) => <Door size={keyOf(slot)} ghost />}
          hit={[0.7, 2.4]}
        />
      ) : (
        <>
          <Choices
            render={(id) => <Door size={keyOf(id)} />}
            z={0.6}
            spacing={2}
            hit={[0.75, 2.4]}
          />
          {/* The right door opens and a baby unicorn peeks out. */}
          {solved && at >= 0 && (
            <group position={[rowX(at, choices.length, 2), 0, 1.5]} scale={BABY_SCALE * 0.8}>
              <Unicorn body={baby(0).body} mane={baby(0).mane} getAnim={() => 'Happy'} />
            </group>
          )}
        </>
      )}
    </StageGroup>
  );
}

const TOWER_X = 0;
const TOWER_Z = -1.4;
const BLOCK = 0.62;

export function TowerStage() {
  const step = useSession((s) => s.step);
  const items = useSession((s) => s.items);
  const sequenced = useSession((s) => s.sequenced);
  const roundIndex = useSession((s) => s.roundIndex);
  if (step !== 'sequence') {
    return (
      <StageGroup>
        <TapObjects
          hit={[0.6, 1.2]}
          numeralAt={0.3}
          render={(i) => <Block colour={i} />}
          // A counted block flies onto the tower, in the order it was counted.
          position={(i, quantity, count) =>
            count === undefined
              ? [gridSlot(i, quantity, 1.3)[0], 0, 1.3]
              : [TOWER_X, (count - 1) * BLOCK, TOWER_Z]
          }
          spacing={1.3}
        />
      </StageGroup>
    );
  }
  // Level 3: three sizes, biggest first.
  let height = 0;
  const stack = sequenced.map((id) => {
    const size = BLOCK_SIZE[keyOf(id)] ?? BLOCK;
    const y = height;
    height += size;
    return { id, size, y };
  });
  return (
    <StageGroup>
      {items
        .filter((id) => !sequenced.includes(id))
        .map((id) => (
          <Pick
            key={`${roundIndex}:${id}`}
            id={id}
            kind="item"
            x={rowX(items.indexOf(id), items.length, 1.9)}
            z={1.3}
            hit={[0.75, 1.4]}
            onTap={() => tapItem(id)}
          >
            <Block colour={items.indexOf(id)} size={BLOCK_SIZE[keyOf(id)]} />
          </Pick>
        ))}
      {stack.map(({ id, size, y }) => (
        <group key={id} position={[TOWER_X, y, TOWER_Z]}>
          <Block colour={items.indexOf(id)} size={size} />
        </group>
      ))}
    </StageGroup>
  );
}

// ---- La Granja ----

export function AnimalsStage() {
  const step = useSession((s) => s.step);
  return (
    <StageGroup>
      <Choices
        kind={step === 'free-play' ? 'item' : 'choice'}
        render={(id) => <Animal animal={keyOf(id)} />}
        hit={[0.65, 1.8]}
      />
    </StageGroup>
  );
}

export function WhoStage() {
  return (
    <StageGroup>
      <Choices render={(id) => <Animal animal={keyOf(id)} />} hit={[0.7, 1.8]} />
    </StageGroup>
  );
}

export function HomesStage() {
  return (
    <StageGroup>
      <DragBoard
        renderItem={(id) => <Animal animal={keyOf(id)} />}
        renderSlot={(slot) => <HomeModel home={keyOf(slot)} />}
        spacing={2.6}
        hit={[0.8, 1.8]}
      />
    </StageGroup>
  );
}

export function EggsStage() {
  return (
    <StageGroup>
      <TapObjects
        hit={[0.62, 1.3]}
        numeralAt={1.7}
        render={(_, { count }) => <Egg hatched={count !== undefined} />}
      />
    </StageGroup>
  );
}

// ---- Pradera de Unicornios ----

export function CountUnicornsStage() {
  return (
    <StageGroup>
      <TapObjects
        enter
        render={(i, { anim }) => (
          <group scale={BABY_SCALE}>
            <Unicorn body={baby(i).body} mane={baby(i).mane} getAnim={anim} phase={i * 0.7} />
          </group>
        )}
      />
    </StageGroup>
  );
}

export function MoreStage() {
  const groups = useSession((s) => s.groups);
  const choices = useSession((s) => s.choices);
  const roundIndex = useSession((s) => s.roundIndex);
  const equal = choices.includes('cmp.igual');
  return (
    <StageGroup>
      {(['cmp.a', 'cmp.b'] as const).map((id, i) => (
        <Pick
          key={`${roundIndex}:${id}`}
          id={id}
          kind="choice"
          x={i === 0 ? -2.4 : 2.4}
          z={0.6}
          hit={[1.15, 1.4]}
          onTap={() => choose(id)}
        >
          <Basket count={groups[i] ?? 0} />
        </Pick>
      ))}
      {equal && (
        <Pick
          key={`${roundIndex}:eq`}
          id="cmp.igual"
          kind="choice"
          x={0}
          z={1.6}
          hit={[0.8, 1.6]}
          onTap={() => choose('cmp.igual')}
        >
          <Glyph text="=" y={0.75} size={1.1} />
        </Pick>
      )}
    </StageGroup>
  );
}

export function NecklaceStage() {
  return (
    <StageGroup>
      <ShowRow gap render={(id) => <Pearl colour={keyOf(id)} />} />
      <Choices render={(id) => <Pearl colour={keyOf(id)} />} z={1.4} hit={[0.75, 1.5]} />
    </StageGroup>
  );
}

// ---- Bosque Nevado ----

export function LettersStage() {
  return (
    <StageGroup>
      <ShowRow render={(id) => <Animal animal={keyOf(id)} scale={1.2} />} z={-1.6} />
      <Choices render={(id) => <LetterTile letter={keyOf(id)} />} hit={[0.75, 1.4]} />
    </StageGroup>
  );
}

export function NextStage() {
  return (
    <StageGroup>
      <ShowRow gap render={(id) => <Track kind={keyOf(id)} />} />
      <Choices render={(id) => <Track kind={keyOf(id)} />} z={1.4} hit={[0.75, 1.5]} />
    </StageGroup>
  );
}

export function TracksStage() {
  return (
    <StageGroup>
      <Choices render={(id) => <Track kind={keyOf(id)} />} hit={[0.7, 1.5]} />
    </StageGroup>
  );
}

// ---- Lago del Arcoíris ----

export function PairsStage() {
  return (
    <StageGroup>
      <PairsBoard
        renderBack={() => <LilyPad />}
        renderFace={(id) => <Animal animal={keyOf(id)} />}
      />
    </StageGroup>
  );
}

export function FacesStage() {
  return (
    <StageGroup>
      <Choices
        render={(id, i) => <Face emotion={keyOf(id)} colour={i} />}
        spacing={1.7}
        hit={[0.75, 1.6]}
      />
    </StageGroup>
  );
}

/** Stage components by the name each config's `stage` field gives. */
export const STAGES: Record<string, ComponentType> = {
  BalloonsStage,
  JewelsStage,
  DoorsStage,
  TowerStage,
  AnimalsStage,
  WhoStage,
  HomesStage,
  EggsStage,
  CountUnicornsStage,
  MoreStage,
  NecklaceStage,
  LettersStage,
  NextStage,
  TracksStage,
  PairsStage,
  FacesStage,
};

const sized = (size: string) => SIZE_SCALE[size];

/** One item from each game, shown at its entrance in the world. */
export const EMBLEMS: Record<string, ComponentType> = {
  balloons: () => <Balloon colour="rosa" />,
  jewels: () => <Gem shape="estrella" />,
  doors: () => (
    <group scale={sized('pequena')! / sized('mediana')!}>
      <Door size="mediana" />
    </group>
  ),
  tower: () => (
    <>
      <Block colour={0} />
      <group position={[0, 0.62, 0]}>
        <Block colour={1} />
      </group>
    </>
  ),
  animals: () => <Animal animal="vaca" />,
  who: () => <Animal animal="pato" />,
  homes: () => <HomeModel home="granja" />,
  eggs: () => <Egg hatched />,
  'count-unicorns': () => (
    <group scale={BABY_SCALE}>
      <Unicorn body={baby(0).body} mane={baby(0).mane} getAnim={() => 'Idle'} />
    </group>
  ),
  more: () => (
    <group scale={0.7}>
      <Basket count={3} />
    </group>
  ),
  necklace: () => <Pearl colour="rosa" />,
  letters: () => <LetterTile letter="a" />,
  next: () => <Track kind="pata" />,
  tracks: () => <Track kind="pajaro" />,
  pairs: () => <LilyPad />,
  faces: () => <Face emotion="contento" />,
};
