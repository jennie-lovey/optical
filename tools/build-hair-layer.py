# Lifts the loose hair strands at the sides of the eyes artwork into their own layer,
# so the opened glasses arms can tuck under the hair (eyes -> arms -> hair -> frame front).
import sys
from PIL import Image, ImageFilter
import numpy as np

src, out, preview = sys.argv[1], sys.argv[2], sys.argv[3]
img = Image.open(src).convert("RGBA")
px = np.asarray(img).astype(np.float32)
H, W = px.shape[:2]
lum = 0.3 * px[..., 0] + 0.59 * px[..., 1] + 0.11 * px[..., 2]

# Strands are dark and thin; skin is light. Only the outer sides, where the arms run.
strand = np.clip((150 - lum) / 60, 0, 1)
x = np.arange(W)[None, :] / W
sides = np.clip((0.30 - x) / 0.05, 0, 1) + np.clip((x - 0.70) / 0.05, 0, 1)
alpha = px[..., 3] / 255 * strand * np.clip(sides, 0, 1)
alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))).astype(np.float32)

out_img = np.dstack([px[..., :3], alpha]).astype(np.uint8)
Image.fromarray(out_img).save(out, optimize=True)
bg = Image.new("RGBA", (W, H), (230, 120, 60, 255)); bg.alpha_composite(Image.fromarray(out_img))
bg.convert("RGB").resize((1000, 333)).save(preview)
