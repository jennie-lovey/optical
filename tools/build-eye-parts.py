# Splits each aligned realistic eye (real-eye-<side>.webp, sketch space) into a still
# eyeball and a movable iris, so the eyes can look left, centre and right:
#   eye-ball-<side>.webp  the photo with the iris painted out using its own sclera colours
#   eye-iris-<side>.webp  the real iris + pupil as a disc, top completed where the lid hid it
# Prints the gaze offsets (as % of the face width) used by src/data.js.
import sys
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

face, preview = sys.argv[1], sys.argv[2]
mask = np.asarray(Image.open(f"{face}/eye-mask.webp").convert("RGBA"))[..., 3].astype(np.float32) / 255
H, W = mask.shape
yy, xx = np.mgrid[0:H, 0:W]
# Aligned photo irises (centre x, centre y, radius) read off a grid, and the openings' x span.
IRIS = {"left": (785, 385, 53), "right": (1401, 370, 47)}
OPENING_X = {"left": (577, 862), "right": (1167, 1490)}

sheet = Image.new("RGB", (W, H), (143, 160, 134))
for side in ("left", "right"):
    eye = np.asarray(Image.open(f"{face}/real-eye-{side}.webp").convert("RGBA")).astype(np.float32)
    lum = 0.3 * eye[..., 0] + 0.59 * eye[..., 1] + 0.11 * eye[..., 2]
    inside = mask > 0.5
    x0, x1 = OPENING_X[side]
    band = inside & (xx > x0) & (xx < x1)
    cx, cy, R = IRIS[side]
    disc = ((xx - cx) ** 2 + (yy - cy) ** 2) <= (R + 2) ** 2

    r_from_c = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)

    # Eyeball: paint the iris out by blending in the surrounding sclera (normalised blur),
    # so nothing shows where the iris was once it moves away.
    ball = eye.copy()
    hole = r_from_c <= R + 9
    sat_all = (eye[..., :3].max(2) - eye[..., :3].min(2)) / np.maximum(eye[..., :3].max(2), 1)
    sclera_px = (lum > 150) & (sat_all < 0.32) & (mask > 0.5)
    known = (~hole & sclera_px & (eye[..., 3] > 200)).astype(np.float32)
    def nblur(arr, sigma):
        # Three box blurs ~ a Gaussian; done with cumulative sums along each axis.
        out = arr.astype(np.float32)
        r = max(1, int(sigma * 0.9))
        for _ in range(3):
            for axis in (0, 1):
                c = np.cumsum(np.pad(out, [(r + 1, r) if a == axis else (0, 0) for a in range(2)], mode="edge"), axis=axis)
                hi = np.take(c, np.arange(2 * r + 1, c.shape[axis]), axis=axis)
                lo = np.take(c, np.arange(0, c.shape[axis] - 2 * r - 1), axis=axis)
                out = (hi - lo) / (2 * r + 1)
        return out
    # Where no sclera is close by, lean on the eye's median sclera colour.
    median = np.median(eye[sclera_px & ~hole][:, :3], axis=0)
    eps = 0.03
    w = nblur(known, 22)
    fillc = np.dstack([(nblur(eye[..., c] * known, 22) + eps * median[c]) / (w + eps) for c in range(3)])
    feather = np.clip((R + 9 - r_from_c) / 5, 0, 1)[..., None]
    ball[..., :3] = ball[..., :3] * (1 - feather) + fillc * feather
    Image.fromarray(np.clip(ball, 0, 255).astype(np.uint8)).save(f"{face}/eye-ball-{side}.webp", quality=88, method=6, exact=True)

    # Iris: keep the real pixels that are iris (brown fibres, pupil, glints); rebuild the
    # rest (lid skin, lid line, lashes) from the median iris colour at the same radius.
    r_, g_, b_ = eye[..., 0], eye[..., 1], eye[..., 2]
    sat = (eye[..., :3].max(2) - eye[..., :3].min(2)) / np.maximum(eye[..., :3].max(2), 1)
    disc = r_from_c <= R + 2
    pupil = r_from_c < 0.42 * R
    brown = (r_ - b_ > 12) & (lum > 30) & (lum < 175)
    glint = (lum > 205) & (sat < 0.2)
    good = disc & (mask > 0.6) & (pupil | brown | glint)
    iris = eye.copy()
    bins = np.clip((r_from_c / (R + 2) * 24).astype(int), 0, 23)
    profile = np.zeros((24, 3), np.float32)
    for k in range(24):
        sel = good & (bins == k) & ~glint
        if sel.sum() > 8:
            profile[k] = np.median(eye[sel][:, :3], axis=0)
        elif k:
            profile[k] = profile[k - 1]
    rebuilt = profile[bins]
    bad = disc & ~good
    soft_bad = np.asarray(Image.fromarray((bad * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32)[..., None] / 255
    iris[..., :3] = iris[..., :3] * (1 - soft_bad) + rebuilt * soft_bad
    edge = np.clip((R + 2 - r_from_c) / 2.5, 0, 1)
    iris[..., 3] = 255 * edge
    Image.fromarray(np.clip(iris, 0, 255).astype(np.uint8)).save(f"{face}/eye-iris-{side}.webp", quality=90, method=6, exact=True)

    # Gaze offsets: iris centre -> opening centre is "look ahead"; the same again is "look away".
    centre = (x0 + x1) / 2
    print(f"  gaze: centre {100 * (centre - cx) / W:.2f}%  far {100 * 2 * (centre - cx) / W:.2f}%")

    for img in (ball, iris):
        a = img.copy(); a[..., 3] *= mask
        tmp = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
        s = sheet.convert("RGBA"); s.alpha_composite(tmp); sheet = s.convert("RGB")
sheet.crop((450, 250, 1650, 520)).save(preview)
