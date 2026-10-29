// Real frames from the product photo. Thumbnails are crops; the hero uses the
// front-on pair, split into arms (under the side hair) and front (on top).
export const FRAMES = [
  { id: "tortoise", name: "Hazel", colour: "Tortoise", hex: "#6e3a1b" },
  { id: "azure", name: "Rowan", colour: "Azure", hex: "#7e9ec4" },
  { id: "smoke", name: "Ash", colour: "Smoke", hex: "#4a4749" },
];

export const frameSrc = (id, part) =>
  part === "thumb" ? `/assets/frames/${id}.webp` : `/assets/frames/${id}-${part}.webp`;

// Entrance timeline, in seconds.
//   Scene 1  0.0–1.5  the sketch draws itself: brows, then lids and lashes, then the rest
//   Scene 2  1.5–2.5  realistic eyes fade into the sketched openings, blink, small glance
//   Scene 3  2.5–3.5  the selected frame rises into place, one soft sweep across the lenses
//   Scene 4  3.5–4.5  SEE DIFFERENTLY fades in behind the face, then copy and picker
export const T = {
  brows: { delay: 0.05, duration: 0.75 },
  lids: { delay: 0.45, duration: 0.75 },
  details: { delay: 0.8, duration: 0.7 },
  eyes: { delay: 1.5, duration: 0.55 },
  firstBlink: 2.1,
  glance: { delay: 1.95, duration: 0.5 },
  glasses: { delay: 2.5, duration: 0.95 },
  sheen: { delay: 3.05, duration: 1.1 },
  headline: { delay: 3.5, duration: 0.8, stagger: 0.12 },
  nav: { delay: 3.65, duration: 0.6 },
  pitch: { delay: 3.85, duration: 0.6 },
  picker: { delay: 4.0, duration: 0.6 },
  done: 4.6,
};

// Iris travel from the photo's own direction to straight ahead, in % of the face width
// (from tools/build-eye-parts.py). Twice this is looking fully the other way.
export const GAZE = { left: -3.27, right: -3.62 };

// Seconds each frame stays on the face before the next one cross-fades in.
export const CYCLE = 4.5;

// Everything the entrance needs, decoded before it starts.
export const PRELOAD = [
  ...["sketch-details", "sketch-brows", "sketch-lids", "hair-sides", "eye-ball-left", "eye-ball-right", "eye-iris-left", "eye-iris-right", "eye-mask"].map(
    (f) => `/assets/face/${f}.webp`
  ),
  ...FRAMES.flatMap((f) => [frameSrc(f.id, "arms"), frameSrc(f.id, "front"), frameSrc(f.id, "thumb")]),
];

export const EASE_OUT = [0.22, 1, 0.36, 1];
export const EASE_IN_OUT = [0.65, 0, 0.35, 1];
