# Builds the layered face for the hero from the supplied artwork, all in the sketch's
# 2000x667 space so the page can stack them in one box:
#   sketch-brows / sketch-lids / sketch-details  the sketch split for the drawn-in reveal
#   eye-mask                                     the two eye openings (white = visible)
#   real-eye-left / real-eye-right               the realistic eyes, aligned into the openings
#   hair-sides                                   side strands, laid over the glasses arms
import sys, math
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

sketch_path, real_path, out, preview = sys.argv[1:5]
sketch = Image.open(sketch_path).convert("RGBA")
real = Image.open(real_path).convert("RGBA")
W, H = sketch.size

# Eye keypoints read off a grid: (outer corner, inner corner, iris centre) per eye.
SKETCH = {"left": ((577, 417), (862, 425), (785, 390)), "right": ((1490, 387), (1167, 422), (1407, 375))}
REAL = {"left": ((605, 390), (852, 402), (790, 370)), "right": ((1410, 345), (1122, 387), (1320, 345))}
# Eye openings in sketch space: corners plus the upper/lower lid extremes (x, y).
OPENINGS = {
    "left": ((577, 417), (862, 425), (728, 357), (700, 437)),
    "right": ((1490, 387), (1167, 422), (1380, 337), (1330, 415)),
}

def bezier(p0, c, p1, n=48):
    t = np.linspace(0, 1, n)[:, None]
    p0, c, p1 = map(np.array, (p0, c, p1))
    return ((1 - t) ** 2 * p0 + 2 * (1 - t) * t * c + t ** 2 * p1).tolist()

def opening_polygon(outer, inner, top, bottom):
    # Quadratic control points that pass through the measured lid extremes.
    mid = lambda a, b: ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    m = mid(outer, inner)
    ctop = (2 * top[0] - m[0], 2 * top[1] - m[1])
    cbot = (2 * bottom[0] - m[0], 2 * bottom[1] - m[1])
    return [tuple(p) for p in bezier(outer, ctop, inner) + bezier(inner, cbot, outer)]

mask = Image.new("L", (W, H), 0)
d = ImageDraw.Draw(mask)
for k, v in OPENINGS.items():
    d.polygon(opening_polygon(*v), fill=255)
mask = mask.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(3))  # sit just inside the lid lines
mask_img = Image.merge("RGBA", (mask, mask, mask, mask))
mask_img.save(f"{out}/eye-mask.webp", quality=88, method=6, exact=True)
hole = np.asarray(mask).astype(np.float32) / 255

def similarity(src_pts, dst_pts):
    (sx0, sy0), (sx1, sy1) = src_pts
    (dx0, dy0), (dx1, dy1) = dst_pts
    sv = complex(sx1 - sx0, sy1 - sy0); dv = complex(dx1 - dx0, dy1 - dy0)
    z = dv / sv  # scale + rotation
    t = complex(dx0, dy0) - z * complex(sx0, sy0)
    return z, t

for side in ("left", "right"):
    so, si, sc = SKETCH[side]; ro, ri, rc = REAL[side]
    z, t = similarity((ro, ri), (so, si))
    # Split the leftover iris error so the pupils land close to the sketched ones.
    iris = z * complex(*rc) + t
    t += (complex(*sc) - iris) * 0.5
    # PIL wants the inverse map: dst -> src.
    zi = 1 / z; ti = -t / z
    a, b = zi.real, -zi.imag
    coeffs = (a, b, ti.real, -b, a, ti.imag)
    warped = real.transform((W, H), Image.AFFINE, coeffs, resample=Image.BICUBIC)
    # Keep a generous patch around the opening so the eye can shift for gaze.
    region = Image.new("L", (W, H), 0)
    ImageDraw.Draw(region).polygon(opening_polygon(*OPENINGS[side]), fill=255)
    region = region.filter(ImageFilter.MaxFilter(41)).filter(ImageFilter.GaussianBlur(6))
    wa = np.asarray(warped).astype(np.float32)
    wa[..., 3] = wa[..., 3] * np.asarray(region) / 255
    Image.fromarray(wa.astype(np.uint8)).save(f"{out}/real-eye-{side}.webp", quality=88, method=6, exact=True)
    print(side, "scale %.3f rot %.1f deg" % (abs(z), math.degrees(math.atan2(z.imag, z.real))))

# Split the sketch for the reveal order: brows, then lids/lashes, then everything else.
sk = np.asarray(sketch).astype(np.float32)
yy, xx = np.mgrid[0:H, 0:W]
def band(y0, y1, x0, x1, feather=14):
    m = np.ones((H, W), np.float32)
    m *= np.clip((yy - y0) / feather + 0.5, 0, 1) * np.clip((y1 - yy) / feather + 0.5, 0, 1)
    m *= np.clip((xx - x0) / feather + 0.5, 0, 1) * np.clip((x1 - xx) / feather + 0.5, 0, 1)
    return m
brows = np.maximum(band(120, 262, 470, 945), band(95, 250, 1060, 1600))
lids = np.maximum(band(262, 520, 455, 960), band(250, 505, 1080, 1610)) * (1 - brows)
# Side strands go in their own layer, over the glasses arms (outer thirds of the sketch),
# so they are left out of "details" to avoid drawing them twice.
x = xx / W
sides = np.clip(np.clip((0.27 - x) / 0.04, 0, 1) + np.clip((x - 0.76) / 0.04, 0, 1), 0, 1)
details = np.clip(1 - brows - lids, 0, 1) * (1 - sides)
for name, m in (("brows", brows), ("lids", lids), ("details", details)):
    layer = sk.copy(); layer[..., 3] *= m * (1 - hole)
    Image.fromarray(layer.astype(np.uint8)).save(f"{out}/sketch-{name}.webp", quality=88, method=6, exact=True)

hair = sk.copy(); hair[..., 3] *= sides
Image.fromarray(hair.astype(np.uint8)).save(f"{out}/hair-sides.webp", quality=88, method=6, exact=True)

# Preview: everything stacked over sage.
bg = Image.new("RGBA", (W, H), (143, 160, 134, 255))
for f in ("sketch-details", "sketch-brows", "sketch-lids", "hair-sides"):
    bg.alpha_composite(Image.open(f"{out}/{f}.webp"))
for side in ("left", "right"):
    e = Image.open(f"{out}/real-eye-{side}.webp"); ea = np.asarray(e).astype(np.float32)
    ea[..., 3] *= hole; bg.alpha_composite(Image.fromarray(ea.astype(np.uint8)))
bg.convert("RGB").save(preview)
