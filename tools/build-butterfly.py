# Cuts the butterfly off its white backdrop for the hero (public/assets/butterfly.webp).
# Alpha comes from how far each pixel is from white; anything the outline encloses (the
# white spots on the wing edges) is filled back in so the wings have no holes.
import sys
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

src, out, preview = sys.argv[1], sys.argv[2], sys.argv[3]
im = Image.open(src).convert("RGB")
a = np.asarray(im).astype(np.float32)
dist = (255 - a).max(axis=2) / 255
alpha = np.clip((dist - 0.08) / 0.25, 0, 1)

m = Image.fromarray((alpha > 0.5).astype(np.uint8) * 255)
pad = Image.new("L", (m.width + 2, m.height + 2), 0); pad.paste(m, (1, 1))
ImageDraw.floodfill(pad, (0, 0), 128)
inside = np.asarray(pad)[1:-1, 1:-1] != 128
alpha = np.maximum(alpha, inside.astype(np.float32))
alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))).astype(np.float32) / 255

rgba = np.dstack([a, alpha * 255]).astype(np.uint8)
img = Image.fromarray(rgba)
img = img.crop(img.getchannel("A").point(lambda v: 255 if v > 30 else 0).getbbox())
print("crop", img.size)
img.thumbnail((420, 420), Image.LANCZOS)
img.save(out, quality=92, method=6, exact=True)
print("saved", img.size)
bg = Image.new("RGBA", img.size, (140, 159, 134, 255)); bg.alpha_composite(img)
bg.convert("RGB").save(preview)
