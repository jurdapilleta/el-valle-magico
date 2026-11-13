"""Generates the placeholder sound effects as mono WAVs in tools/audio/raw/sfx.

Run from the repo root: python3 tools/audio/make_sfx.py   (then: npm run audio)
They are synthesised stand-ins for the effects listed in GAME_DESIGN §11.4;
replace any file here with a real recording of the same name.
"""

import math
import random
import struct
import wave
from pathlib import Path

RATE = 44100
OUT = Path(__file__).resolve().parent / "raw" / "sfx"

C5, E5, G5, C6, E6, G6, C7 = 523.25, 659.25, 783.99, 1046.5, 1318.5, 1568.0, 2093.0


def write(name: str, samples: list[float], gain: float = 0.35) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    peak = max(1e-6, max(abs(s) for s in samples))
    frames = b"".join(struct.pack("<h", int(s / peak * gain * 32767)) for s in samples)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(frames)


def bell(freq: float, start: float, decay: float, t: float) -> float:
    if t < start:
        return 0.0
    age = t - start
    env = min(1.0, age / 0.004) * math.exp(-age * decay)
    return env * (math.sin(2 * math.pi * freq * age) + 0.3 * math.sin(4 * math.pi * freq * age))


def render(length: float, fn) -> list[float]:
    return [fn(i / RATE) for i in range(int(RATE * length))]


def notes(sequence: list[tuple[float, float]], decay: float, length: float) -> list[float]:
    return render(length, lambda t: sum(bell(f, s, decay, t) for f, s in sequence))


def pop() -> list[float]:
    # Short downward blip.
    def fn(t: float) -> float:
        freq = 900 - 2500 * t
        return math.sin(2 * math.pi * freq * t) * math.exp(-t * 45)

    return render(0.12, fn)


def boing() -> list[float]:
    # Soft, low wobble: friendly rather than a buzzer.
    def fn(t: float) -> float:
        freq = 190 + 35 * math.sin(2 * math.pi * 9 * t) - 60 * t
        return math.sin(2 * math.pi * freq * t) * math.exp(-t * 7) * min(1.0, t / 0.01)

    return render(0.45, fn)


def sparkle() -> list[float]:
    rng = random.Random(4)
    seq = [(rng.choice([C6, E6, G6, C7]) * rng.choice([1, 2]), i * 0.045) for i in range(12)]
    return notes(seq, 14, 0.9)


def noise(length: float, decay: float, smooth: float, seed: int) -> list[float]:
    """Filtered noise burst: `smooth` near 1 is a dull thud, near 0 a bright hiss."""
    rng = random.Random(seed)
    out, last = [], 0.0
    for i in range(int(RATE * length)):
        t = i / RATE
        last = smooth * last + (1 - smooth) * rng.uniform(-1, 1)
        out.append(last * math.exp(-t * decay) * min(1.0, t / 0.003))
    return out


def splash() -> list[float]:
    body = noise(0.5, 9, 0.75, 7)
    drop = render(0.5, lambda t: 0.5 * math.sin(2 * math.pi * (500 + 900 * t) * t) * math.exp(-t * 18))
    return [a + b for a, b in zip(body, drop)]


def crunch() -> list[float]:
    # Three quick gritty steps, like snow underfoot.
    out = [0.0] * int(RATE * 0.36)
    for k, start in enumerate([0.0, 0.1, 0.2]):
        burst = noise(0.12, 30, 0.35, 11 + k)
        offset = int(start * RATE)
        for i, s in enumerate(burst):
            out[offset + i] += s
    return out


if __name__ == "__main__":
    write("chime", notes([(C6, 0.0), (E6, 0.12), (G6, 0.24)], 6, 0.9))
    write("pop", pop(), 0.3)
    write("boing", boing(), 0.3)
    write("arpeggio", notes([(C5, 0.0), (E5, 0.07), (G5, 0.14), (C6, 0.21)], 8, 0.7))
    write(
        "fanfare",
        notes([(C5, 0.0), (C5, 0.15), (C5, 0.3), (E5, 0.45), (G5, 0.6), (C6, 0.75), (E6, 0.75)], 4, 1.5),
    )
    write("sparkle", sparkle(), 0.25)
    write("sticker", notes([(G5, 0.0), (C6, 0.09)], 10, 0.4))
    write("flip", noise(0.09, 40, 0.5, 3), 0.25)
    write("splash", splash(), 0.3)
    write("crunch", crunch(), 0.25)
    write("step", noise(0.08, 45, 0.85, 5), 0.3)
    print("sfx written to", OUT)
