import { BABY_COLOURS, Unicorn } from '../../../characters/Unicorn';
import { Tappable } from '../../Tappable';
import { PRADERA } from '../defs';
import { Rainbow } from './shared';

const idle = () => 'Idle' as const;

/** Chispa and Brisa graze nearby and hop when tapped. */
function Baby({
  at,
  colours,
  rate,
}: {
  at: { x: number; z: number };
  colours: number;
  rate: number;
}) {
  const c = BABY_COLOURS[colours]!;
  return (
    <Tappable {...at} react="bounce" sfx="sparkle" rate={rate} hit={[1.1, 2]}>
      <group scale={0.62} rotation={[0, colours, 0]}>
        <Unicorn body={c.body} mane={c.mane} getAnim={idle} phase={colours} />
      </group>
    </Tappable>
  );
}

export default function PraderaDecor() {
  return (
    <>
      <Rainbow {...PRADERA.rainbow} />
      <Baby at={PRADERA.chispa} colours={1} rate={1.2} />
      <Baby at={PRADERA.brisa} colours={2} rate={1.4} />
    </>
  );
}
