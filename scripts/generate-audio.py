"""Author the site's original synthesized placeholders. No external samples or packages.

Run: python3 scripts/generate-audio.py
Output: src/assets/audio/generated/*.wav (22.05 kHz, mono PCM16).
"""
from array import array
from pathlib import Path
import math
import random
import wave

RATE = 22050
OUT = Path(__file__).resolve().parents[1] / 'src/assets/audio/generated'
OUT.mkdir(parents=True, exist_ok=True)
RNG = random.Random(542)
TAU = math.tau


def blank(seconds):
    return array('f', [0]) * round(seconds * RATE)


def write(name, data, loop=False, peak=.78):
    if not loop:
        fade = min(150, len(data) // 8)
        for i in range(fade):
            data[i] *= i / fade
            data[-1-i] *= i / fade
    scale = peak / max(.001, max(abs(v) for v in data))
    pcm = array('h', (round(max(-1, min(1, v * scale)) * 32767) for v in data))
    with wave.open(str(OUT / f'{name}.wav'), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(pcm.tobytes())
    print(f'{name}: {len(data)/RATE:.2f}s, {len(pcm)*2/1024:.0f} KiB')


def bell(dst, offset, frequency, duration, gain):
    start = round(offset * RATE)
    for i in range(round(duration * RATE)):
        if start+i >= len(dst):
            break
        t = i / RATE
        attack = min(1, t / .003)
        sample = sum(weight * math.sin(TAU * frequency * ratio * t) * math.exp(-t / decay)
                     for ratio, weight, decay in [(1, 1, .28), (1.49, .36, .19), (2.09, .2, .12), (3.02, .08, .075)])
        dst[start+i] += sample * attack * gain


def soft_hit(name, duration, high, low, noise=.15):
    data = blank(duration)
    brown = 0
    for i in range(len(data)):
        t = i / RATE
        brown += .16 * (RNG.uniform(-1, 1) - brown)
        phase = TAU * (low * t + (high-low) * .035 * (1-math.exp(-t/.035)))
        envelope = min(1, t/.006) * math.exp(-t/.065)
        data[i] = envelope * (math.sin(phase) * .7 + brown * noise)
    write(name, data, peak=.7)


def rustle(name, duration, darkness=.18):
    data = blank(duration)
    low = 0
    for i in range(len(data)):
        t = i / RATE
        white = RNG.uniform(-1, 1)
        low += darkness * (white-low)
        envelope = math.sin(math.pi * i / len(data)) ** 1.3
        data[i] = (low * .7 + white * .08) * envelope * (.6 + .4 * math.sin(t*75)**2)
    write(name, data, peak=.48)


# Synthetic rain with a soft low traffic-like bed. It is not an NYC field recording.
rain = blank(12)
low, rumble = 0, 0
for i in range(len(rain)):
    t = i / RATE
    white = RNG.uniform(-1, 1)
    low += .16 * (white-low)
    rumble += .002 * (white-rumble)
    rain[i] = (low*.42 + white*.055 + rumble*.16) * (.84 + .1*math.sin(TAU*t/12))
# Join the end into the beginning without a discontinuity in the noise source.
overlap = round(.08 * RATE)
joined = array('f', rain[overlap:-overlap])
for i in range(overlap):
    p = i / (overlap-1)
    joined.append(rain[-overlap+i]*(1-p) + rain[i]*p)
write('rain', joined, loop=True, peak=.58)

door = blank(1.15)
bell(door, 0, 1245, .9, .65)
bell(door, .12, 1661, .8, .45)
bell(door, .27, 1245, .65, .18)
write('door-bell', door)

rustle('dough-pickup', .18, .07)
soft_hit('dough-drop', .32, 155, 66, .4)
soft_hit('dough-hit', .24, 205, 82, .75)

sauce_pickup = blank(.32)
bell(sauce_pickup, 0, 710, .28, .4)
write('sauce-pickup', sauce_pickup, peak=.48)
sauce = blank(.52)
slow, fast = 0, 0
for i in range(len(sauce)):
    t = i / RATE
    white = RNG.uniform(-1, 1)
    slow += .025*(white-slow)
    fast += .19*(white-fast)
    env = min(1, t/.025) * math.exp(-t/.13)
    sauce[i] = env * ((fast-slow)*.8 + math.sin(TAU*(105*t + 10*(1-math.exp(-t/.04))))*.24)
write('sauce-drop', sauce, peak=.65)

rustle('cheese-pickup', .2, .3)
cheese = blank(.55)
for drop in range(10):
    start = round((.025 + drop*.037 + RNG.random()*.012) * RATE)
    for i in range(round(.055*RATE)):
        if start+i < len(cheese):
            cheese[start+i] += RNG.uniform(-1, 1) * math.exp(-i/(RATE*.012)) * (.12 + RNG.random()*.05)
write('cheese-drop', cheese, peak=.52)

whoosh = blank(.75)
low = 0
for i in range(len(whoosh)):
    p = i / len(whoosh)
    white = RNG.uniform(-1, 1)
    low += (.025 + .7*math.sin(math.pi*p)**2) * (white-low)
    whoosh[i] = low * math.sin(math.pi*p)**2
write('invite-whoosh', whoosh, peak=.62)

oven = blank(1.2)
bell(oven, 0, 660, .9, .5)
bell(oven, .18, 880, 1.0, .6)
write('oven-done', oven, peak=.68)

# An original eight-bar, 80 BPM electric-piano/bass/brushes placeholder loop.
beat = 60/80
music = blank(32*beat)
chords = [[48,55,59,64], [45,52,55,60], [50,57,60,64], [43,53,57,64],
          [48,55,59,62], [45,52,59,64], [50,57,60,65], [43,50,57,59]]


def note(start_beat, midi, duration, gain, bass=False):
    frequency = 440 * 2**((midi-69)/12)
    start = round(start_beat * beat * RATE)
    for i in range(round(duration * RATE)):
        t = i / RATE
        envelope = min(1, t/(.012 if bass else .006)) * math.exp(-t/(.3 if bass else .7))
        tone = math.sin(TAU*frequency*t) + .2*math.sin(TAU*frequency*2*t)*math.exp(-t/.2)
        if not bass:
            tone += .08*math.sin(TAU*frequency*3.003*t)*math.exp(-t/.12)
        music[(start+i) % len(music)] += tone * envelope * gain


melody = [[76,79], [72,76], [74,77], [71,74], [76,74], [72,71], [69,72], [71,74]]
for bar, chord in enumerate(chords):
    for n, midi in enumerate(chord):
        note(bar*4 + n*.025, midi, 2.7, .065)
        note(bar*4 + 2.5 + n*.02, midi, 1.7, .028)
    note(bar*4, chord[0]-12, .8, .16, bass=True)
    note(bar*4 + 2, chord[0]-5, .7, .12, bass=True)
    for offset, midi in zip([1.5, 3.25], melody[bar]):
        note(bar*4 + offset, midi, .65, .025)
    for tick in range(8):
        start = round((bar*4 + tick*.5) * beat * RATE)
        for i in range(round(.07*RATE)):
            music[(start+i) % len(music)] += RNG.uniform(-1, 1) * math.exp(-i/(RATE*.018)) * (.012 if tick%2 else .018)
write('shop-music', music, loop=True, peak=.72)
