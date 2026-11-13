import { audio } from '../audio/AudioManager';
import { sceneActor } from '../core/machine';

/**
 * The one mandatory gesture (GAME_DESIGN §9.4): unlocks audio on iOS and
 * starts the game. No text to read — the star is the whole instruction.
 */
export function StartScreen() {
  const start = () => {
    audio.playMusic('hub');
    void audio.unlock().then(() => audio.playSfx('chime'));
    sceneActor.send({ type: 'START' });
  };

  return (
    <div className="start-screen">
      <button className="start-star" onPointerDown={start} aria-label="Toca para empezar">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path
            d="M50 6 L61 37 L94 38 L68 58 L77 90 L50 71 L23 90 L32 58 L6 38 L39 37 Z"
            fill="#FFD972"
            stroke="#FFFFFF"
            strokeWidth="5"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
