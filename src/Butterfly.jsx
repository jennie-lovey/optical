import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue } from "framer-motion";

// Swap the image here to use a different butterfly (tools/build-butterfly.py makes it).
const SRC = "/assets/butterfly.webp";

// Flowers it can land on, in the hero photo's own pixels (1671x941), read off the image.
// Which ones are usable depends on the screen: see usable() below.
const PHOTO = { w: 1671, h: 941 };
const FLOWERS = [
  { x: 35, y: 425 },   // white daisy, far left
  { x: 128, y: 478 },  // pink, left
  { x: 240, y: 527 },  // pink, left of centre
  { x: 292, y: 668 },  // white daisy, low left
  { x: 430, y: 560 },  // pink, left-centre
  { x: 1240, y: 590 }, // pink, right-centre
  { x: 1420, y: 575 }, // pink, right
  { x: 1545, y: 605 }, // white daisy, right
  { x: 1610, y: 480 }, // pink, far right
  { x: 158, y: 715 },  // white daisy, low left
  { x: 1410, y: 715 }, // white daisy, low right
  { x: 1532, y: 640 }, // white daisy, right, under the tagline
];

// Where flowers run short (phones show only the middle of the photo, and the tagline panel
// covers its flowers), it can also perch on the top edge of the frosted panels.
const PERCHES = [
  { sel: ".pitch", fx: 0.22 },
  { sel: ".pitch", fx: 0.62 },
  { sel: ".picker", fx: 0.5 },
];

const rand = (a, b) => a + Math.random() * (b - a);

/** Hero photo pixels → page pixels, matching object-fit: cover with position 50% 100%. */
function toPage(p, w, h) {
  const s = Math.max(w / PHOTO.w, h / PHOTO.h);
  const ox = (w - PHOTO.w * s) * 0.5;
  const oy = h - PHOTO.h * s;
  return { x: ox + p.x * s, y: oy + p.y * s };
}

/**
 * A butterfly that flies across the splash, leads the eyelids open, then lives in the
 * garden: it lands on a flower, lifts off when the cursor (or a tap) comes close, and
 * now and then moves to another flower on its own.
 */
export default function Butterfly({ open, reduced, heroRef }) {
  const x = useMotionValue(-400);
  const y = useMotionValue(-400);
  const [facing, setFacing] = useState(1);
  const [mode, setMode] = useState("fly"); // "fly" flaps fast, "rest" slow and lazy
  const at = useRef(0);
  const busy = useRef(false);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    let alive = true;
    const timers = new Set();
    const wait = (s) => new Promise((r) => { const id = setTimeout(r, s * 1000); timers.add(id); });
    const size = () => ({ w: window.innerWidth, h: heroRef.current?.offsetHeight || window.innerHeight });
    // Spots 0..n-1 are flowers; the rest are perches on panel edges, read from the page.
    const spot = (i) => {
      const { w, h } = size();
      if (i < FLOWERS.length) return toPage(FLOWERS[i], w, h);
      const perch = PERCHES[i - FLOWERS.length];
      const hero = heroRef.current?.getBoundingClientRect();
      const r = heroRef.current?.querySelector(perch.sel)?.getBoundingClientRect();
      if (!r || !hero) return { x: -999, y: -999 };
      return { x: r.left - hero.left + r.width * perch.fx, y: r.top - hero.top + 2 };
    };
    // Flowers on screen and clear of the face, the tagline panel, the picker and the nav.
    const usable = () => {
      const { w, h } = size();
      const hero = heroRef.current?.getBoundingClientRect();
      // The face's hair spills well past the glasses box, so the face gets a wider margin.
      const keepOut = [[".rig", 0.32], [".pitch", 0], [".picker", 0], [".nav", 0]]
        .map(([sel, spill]) => {
          const r = heroRef.current?.querySelector(sel)?.getBoundingClientRect();
          if (!r) return null;
          const m = 30 + r.width * spill;
          return { l: r.left - hero.left - m, t: r.top - hero.top - 60 - r.height * spill, r: r.right - hero.left + m, b: r.bottom - hero.top + 20 + r.height * spill };
        })
        .filter(Boolean);
      const ok = FLOWERS.map((_, i) => i).filter((i) => {
        const p = spot(i);
        if (p.x < w * 0.05 || p.x > w * 0.95 || p.y < h * 0.2 || p.y > h * 0.95) return false;
        return !keepOut.some((k) => p.x > k.l && p.x < k.r && p.y > k.t && p.y < k.b);
      });
      if (ok.length >= 3) return ok;
      // Too few flowers in view: add the panel-edge perches that are on screen.
      const perches = PERCHES.map((_, j) => FLOWERS.length + j).filter((i) => {
        const p = spot(i);
        return p.x > w * 0.04 && p.x < w * 0.96 && p.y > h * 0.3 && p.y < h * 0.98;
      });
      const all = [...ok, ...perches];
      return all.length ? all : [0];
    };

    // Flight along a soft arc with a gentle up-and-down flutter, facing where it goes.
    const flyTo = async (to, { lift = 0.12, dur } = {}) => {
      busy.current = true;
      setMode("fly");
      const from = { x: x.get(), y: y.get() };
      const { w, h } = size();
      setFacing(to.x >= from.x ? 1 : -1);
      const dist = Math.hypot(to.x - from.x, to.y - from.y);
      const d = dur ?? Math.min(2.8, Math.max(1.2, (dist / w) * 2.6));
      const peak = Math.min(from.y, to.y) - h * lift;
      const xs = [from.x, from.x + (to.x - from.x) * 0.3, from.x + (to.x - from.x) * 0.55, from.x + (to.x - from.x) * 0.8, to.x];
      const ys = [from.y, peak + h * 0.03, peak, peak + (to.y - peak) * 0.45, to.y];
      const ease = "easeInOut";
      await Promise.all([animate(x, xs, { duration: d, ease }), animate(y, ys, { duration: d, ease })]);
      if (!alive) return;
      setMode("rest");
      busy.current = false;
    };

    const land = (i) => { at.current = i; return flyTo(spot(i)); };
    const otherSpot = (awayFrom) => {
      const pool = usable();
      const options = pool.length > 1 ? pool.filter((i) => i !== at.current) : pool;
      if (!awayFrom) return options[Math.floor(Math.random() * options.length)];
      // Fleeing: pick the flower farthest from the cursor.
      return options.sort((a, b) => {
        const pa = spot(a), pb = spot(b);
        return Math.hypot(pb.x - awayFrom.x, pb.y - awayFrom.y) - Math.hypot(pa.x - awayFrom.x, pa.y - awayFrom.y);
      })[0];
    };

    if (reduced) {
      const p = spot(usable()[0]);
      x.set(p.x); y.set(p.y); setMode("rest");
      return undefined;
    }

    (async () => {
      // Splash: in from the lower left, past the wordmark, reaching the middle as the lids part.
      const { w, h } = size();
      x.set(-0.08 * w); y.set(0.78 * h);
      await wait(0.2);
      busy.current = true;
      await Promise.all([
        animate(x, [-0.08 * w, 0.18 * w, 0.36 * w, 0.52 * w], { duration: 1.7, ease: "easeInOut" }),
        animate(y, [0.78 * h, 0.6 * h, 0.52 * h, 0.4 * h], { duration: 1.7, ease: "easeInOut" }),
      ]);
      while (alive && !openRef.current) await wait(0.1);
      // Garden: a little loop over the scene while it wakes, then down onto a flower.
      if (alive) await flyTo({ x: 0.7 * w, y: 0.3 * h }, { lift: 0.06, dur: 1.4 });
      if (alive) await land(usable()[0]);
      // Now and then it moves on by itself.
      while (alive) {
        await wait(rand(9, 15));
        if (alive && !busy.current) await land(otherSpot());
      }
    })();

    // Lift off when the cursor comes close, or on a tap near it.
    const near = (e, r) => {
      const rect = heroRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      return Math.hypot(p.x - x.get(), p.y - y.get()) < r ? p : null;
    };
    const onMove = (e) => {
      if (busy.current || e.pointerType === "touch") return;
      const p = near(e, 120);
      if (p) land(otherSpot(p));
    };
    const onDown = (e) => {
      if (busy.current) return;
      const p = near(e, 150);
      if (p) land(otherSpot(p));
    };
    // Keep it on its flower when the window changes size.
    const onResize = () => {
      if (busy.current) return;
      if (!usable().includes(at.current)) at.current = usable()[0];
      const p = spot(at.current); x.set(p.x); y.set(p.y);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onResize);
    };
  }, [reduced, heroRef, x, y]);

  return (
    <div className="bf-layer" aria-hidden="true">
      <motion.div className="bf" data-mode={mode} style={{ x, y }}>
        <div className="bf__face" style={{ "--facing": facing }}>
          {/* Wings fold about the line of the body: tilt so the body is level, flap, tilt back. */}
          <div className="bf__tilt">
            <div className="bf__flap">
              <div className="bf__level">
                <img src={SRC} alt="" draggable="false" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
