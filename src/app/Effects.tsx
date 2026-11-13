import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';

/**
 * Post-processing for the high tier only (GAME_DESIGN §5.2): a low bloom so
 * stars, sparkles and snow glow a little, and a soft vignette. Loaded as its
 * own chunk, so devices that never use it never download it.
 */
export default function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={0.3} luminanceThreshold={0.86} luminanceSmoothing={0.15} mipmapBlur />
      <Vignette offset={0.32} darkness={0.38} />
    </EffectComposer>
  );
}
