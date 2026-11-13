"""Generates six placeholder music loops (hub + five zones) as stereo WAVs in
tools/audio/raw/music.

Run from the repo root: python3 tools/audio/make_music.py   (then: npm run audio)

These are synthesised stand-ins for the loops in GAME_DESIGN §11.4: soft
plucked and bell tones over simple chord progressions, each 64 s long and
seamless (note tails wrap around to the start). Replace any file here with a
real loop of the same name. Needs numpy.
"""

import wave
from pathlib import Path

import numpy as np

RATE = 44100
OUT = Path(__file__).resolve().parent / "raw" / "music"
BARS = 16

NOTE = {"C": 0, "C#": 1, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "Bb": 10, "B": 11}


def hz(semitones_from_c4: float) -> float:
    return 261.63 * 2 ** (semitones_from_c4 / 12)


def chord(root: str, minor: bool = False) -> list[int]:
    base = NOTE[root]
    return [base, base + (3 if minor else 4), base + 7]


# Timbres: (harmonic multiples, their levels, decay per second, attack seconds)
TIMBRES = {
    "harp": ([1, 2, 3, 4], [1, 0.45, 0.2, 0.08], 2.2, 0.004),
    "celesta": ([1, 4, 6.3], [1, 0.3, 0.1], 3.2, 0.002),
    "ukulele": ([1, 2, 3, 5], [1, 0.6, 0.35, 0.12], 4.5, 0.003),
    "chimes": ([1, 2.76, 5.4], [1, 0.4, 0.15], 1.4, 0.002),
    "marimba": ([1, 4, 10], [1, 0.35, 0.05], 6.0, 0.002),
}


def pluck(freq: float, seconds: float, timbre: str) -> np.ndarray:
    multiples, levels, decay, attack = TIMBRES[timbre]
    t = np.arange(int(seconds * RATE)) / RATE
    tone = sum(level * np.sin(2 * np.pi * freq * m * t) for m, level in zip(multiples, levels))
    return tone * np.minimum(1, t / attack) * np.exp(-t * decay)


def loop(name: str, bpm: float, beats: int, progression, timbre: str, pad: str, octave: int, seed: int):
    """`progression` is one chord per bar; the melody is drawn from chord tones."""
    rng = np.random.default_rng(seed)
    beat = 60 / bpm
    total = int(BARS * beats * beat * RATE)
    left = np.zeros(total)
    right = np.zeros(total)

    def add(freq: float, at: float, seconds: float, level: float, pan: float, voice: str):
        note = pluck(freq, seconds, voice) * level
        # Wrap the tail around the end so the loop has no seam.
        index = (int(at * RATE) + np.arange(len(note))) % total
        np.add.at(left, index, note * (1 - pan) / 2 * 1.4)
        np.add.at(right, index, note * (1 + pan) / 2 * 1.4)

    for bar in range(BARS):
        tones = progression[bar % len(progression)]
        start = bar * beats * beat
        # Soft bass note and a broken chord on every beat.
        add(hz(tones[0] - 12 + 12 * (octave - 4)), start, beats * beat * 1.2, 0.5, 0, pad)
        for b in range(beats):
            tone = tones[b % len(tones)]
            add(hz(tone + 12 * (octave - 4)), start + b * beat, beat * 2.5, 0.42, -0.35, timbre)
        # A sparse melody an octave up: some beats rest, so it stays calm.
        for b in range(beats * 2):
            if rng.random() < 0.45:
                tone = tones[int(rng.integers(0, 3))] + 12 * (octave - 3)
                add(hz(tone), start + b * beat / 2, beat * 3, 0.3, 0.4, timbre)

    peak = max(np.abs(left).max(), np.abs(right).max())
    # Leave headroom: music sits well under the voice (§2: −18 dB).
    scale = 0.22 / peak
    frames = np.stack([left, right], axis=1) * scale * 32767
    OUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(frames.astype("<i2").tobytes())
    print(f"{name}: {total / RATE:.0f} s")


if __name__ == "__main__":
    # 16 bars each; tempo chosen so every loop lasts 64 s.
    loop("hub", 60, 4, [chord("C"), chord("A", True), chord("F"), chord("G")], "harp", "harp", 4, 1)
    loop("castillo", 45, 3, [chord("F"), chord("D", True), chord("Bb"), chord("C")], "celesta", "celesta", 5, 2)
    loop("granja", 60, 4, [chord("G"), chord("C"), chord("G"), chord("D")], "ukulele", "harp", 4, 3)
    loop("pradera", 60, 4, [chord("D"), chord("G"), chord("B", True), chord("A")], "chimes", "harp", 5, 4)
    loop("bosque", 45, 3, [chord("A", True), chord("F"), chord("C"), chord("E", True)], "celesta", "chimes", 5, 5)
    loop("lago", 60, 4, [chord("E"), chord("A"), chord("C#", True), chord("B")], "marimba", "harp", 4, 6)
