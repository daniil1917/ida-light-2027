"""Original successful-placement cue. No samples, background loop or borrowed melody."""
import array
import hashlib
import json
import math
from pathlib import Path
import wave

RATE = 48000
ROOT = Path(__file__).resolve().parents[1] / 'public' / 'audio'
ROOT.mkdir(parents=True, exist_ok=True)


def chime(duration, notes, gain=.34):
    """Soft felt-mallet attack; overtones decay before the fundamental."""
    samples = []
    for i in range(round(duration * RATE)):
        time = i / RATE
        value = 0
        for frequency, delay, weight in notes:
            t = time - delay
            if t < 0:
                continue
            attack = 1 - math.exp(-t / .006)
            value += weight * attack * (math.sin(2 * math.pi * frequency * t) * math.exp(-t / .105)
                + .22 * math.sin(2 * math.pi * frequency * 2 * t) * math.exp(-t / .045))
        samples.append(gain * value * min(1, (duration - time) / .035))
    return samples


# Preserve the successful-placement cue from 0.19.0 exactly.
samples = chime(.36, [(523.25, 0, .65), (783.99, .018, .3)])
pcm = array.array('h', (round(max(-1, min(1, s)) * 32767) for s in samples))
path = ROOT / 'impact.wav'
with wave.open(str(path), 'wb') as wav:
    wav.setnchannels(1)
    wav.setsampwidth(2)
    wav.setframerate(RATE)
    wav.writeframes(pcm.tobytes())
assert max(map(abs, samples)) < .6
(ROOT / 'manifest.json').write_text(json.dumps({
    'origin': 'Original deterministic synthesis: scripts/generate-audio.py', 'license': 'CC0-1.0',
    'externalSamples': False, 'sampleRate': RATE, 'backgroundAudio': False,
    'effects': ['impact'], 'files': {'impact.wav': {'bytes': path.stat().st_size,
        'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}},
}, indent=2) + '\n')
print('Successful placement cue only; 48 kHz, 360 ms.')
