"""Score a render against the reference with DreamSim (lower = more similar).

Usage:
  ART_PY=/path/to/venv/bin/python bash scripts/art-score.sh current.png [reference.png]

DreamSim is a learned perceptual distance tuned to human "do these look alike"
judgements. It is a tracking number, not a goal: always look at the images.
Scores the whole frame plus a 3x3 grid of tiles so a local regression (one
room getting worse) doesn't hide inside a global average.
"""

import json
import sys

import torch
from dreamsim import dreamsim
from PIL import Image

current_path = sys.argv[1]
reference_path = sys.argv[2] if len(sys.argv) > 2 else "art/style-scene.png"

device = "mps" if torch.backends.mps.is_available() else "cpu"
model, preprocess = dreamsim(pretrained=True, device=device, cache_dir=".cache/dreamsim")


def fit(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Center-crop to the target aspect ratio, then resize."""
    tw, th = size
    w, h = image.size
    scale = max(tw / w, th / h)
    image = image.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    w, h = image.size
    left, top = (w - tw) // 2, (h - th) // 2
    return image.crop((left, top, left + tw, top + th))


def distance(a: Image.Image, b: Image.Image) -> float:
    with torch.no_grad():
        return float(model(preprocess(a).to(device), preprocess(b).to(device)).item())


reference = Image.open(reference_path).convert("RGB")
current = fit(Image.open(current_path).convert("RGB"), reference.size)

tiles = []
w, h = reference.size
for row in range(3):
    for col in range(3):
        box = (col * w // 3, row * h // 3, (col + 1) * w // 3, (row + 1) * h // 3)
        tiles.append(round(distance(reference.crop(box), current.crop(box)), 4))

print(
    json.dumps(
        {
            "current": current_path,
            "reference": reference_path,
            "frame": round(distance(reference, current), 4),
            "tiles": tiles,
            "tileMean": round(sum(tiles) / len(tiles), 4),
        }
    )
)
