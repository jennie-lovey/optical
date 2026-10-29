import { useEffect, useRef, useState } from "react";
import { animate, useMotionValue, useSpring, useTransform } from "framer-motion";

const INTERACTIVE = "a, button, input, label, .pitch, .nav";
const BLEED = 0.025; // the garden is drawn 2.5% past each edge so it can pan (.garden__look)
const PAN = { x: 1.8, y: 1.1 }; // % of the garden layer
const LENS = 170; // px radius of the focus lens

/**
 * Pointer over the hero, as springs. Drives the garden pan (both layers alike, so their
 * edges stay matched), the sunlight glow, and the focus lens: the garden softens a little
 * and a clear, vivid circle follows the pointer, like seeing it through new lenses.
 * On touch the lens opens where the finger lands and closes again after a moment.
 */
export function useGardenLook(heroRef, reduced) {
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 20, mass: 0.7 });
  const sy = useSpring(py, { stiffness: 60, damping: 20, mass: 0.7 });
  const lensR = useMotionValue(0);
  const size = useRef({ w: 1, h: 1 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (reduced) return undefined;
    let closeId = null;
    let lensAnim = null;
    const setLens = (to, d) => {
      lensAnim?.stop();
      lensAnim = animate(lensR, to, { duration: d, ease: [0.22, 1, 0.36, 1] });
    };
    const point = (e) => {
      const r = heroRef.current?.getBoundingClientRect();
      if (!r || e.clientY < r.top || e.clientY > r.bottom) return false;
      size.current = { w: r.width, h: r.height };
      px.set(((e.clientX - r.left) / r.width) * 2 - 1);
      py.set(((e.clientY - r.top) / r.height) * 2 - 1);
      return true;
    };
    const onMove = (e) => {
      if (e.pointerType === "touch") return;
      if (!point(e)) { setLens(0, 0.5); return; }
      setActive(true);
      if (lensR.get() < LENS - 1) setLens(LENS, 0.6);
    };
    const onDown = (e) => {
      if (e.pointerType !== "touch" || !point(e)) return;
      setActive(true);
      setLens(LENS * 0.85, 0.5);
      clearTimeout(closeId);
      closeId = setTimeout(() => setLens(0, 0.9), 1600);
    };
    const onLeave = () => setLens(0, 0.5);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      clearTimeout(closeId);
      lensAnim?.stop();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [heroRef, reduced, px, py, lensR]);

  // Pan opposite the pointer, as if glancing across the scene.
  const panX = useTransform(sx, (v) => `${-v * PAN.x}%`);
  const panY = useTransform(sy, (v) => `${-v * PAN.y}%`);
  // Lens centre in the garden layer's own box: that box starts 2.5% outside the hero and
  // is shifted by the pan, so undo both.
  const lensX = useTransform(sx, (v) => {
    const { w } = size.current;
    const lw = w * (1 + 2 * BLEED);
    return `${((v + 1) / 2) * w + w * BLEED + (v * PAN.x / 100) * lw}px`;
  });
  const lensY = useTransform(sy, (v) => {
    const { h } = size.current;
    const lh = h * (1 + 2 * BLEED);
    return `${((v + 1) / 2) * h + h * BLEED + (v * PAN.y / 100) * lh}px`;
  });
  const lensSize = useTransform(lensR, (v) => `${v}px`);
  const softness = useTransform(lensR, [0, LENS], [0, 1]);
  const glowX = useTransform(sx, (v) => `${50 + v * 50}%`);
  const glowY = useTransform(sy, (v) => `${50 + v * 50}%`);
  return { panX, panY, lensX, lensY, lensSize, softness, glowX, glowY, active };
}

/**
 * Petals and pollen: a puff wherever the garden is tapped or clicked, and a light trail of
 * pollen behind the pointer as it moves over the garden.
 */
export function GardenBursts({ heroRef, reduced }) {
  const [bursts, setBursts] = useState([]);
  const [trail, setTrail] = useState([]);
  const next = useRef(0);

  useEffect(() => {
    if (reduced) return undefined;
    const hero = heroRef.current;
    if (!hero) return undefined;
    let last = 0;
    const onDown = (e) => {
      if (e.target.closest?.(INTERACTIVE)) return;
      const r = hero.getBoundingClientRect();
      const id = next.current++;
      const bits = Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2 + Math.random() * 0.6;
        const d = 40 + Math.random() * 70;
        return {
          petal: i % 3 !== 2,
          dx: Math.cos(a) * d,
          dy: Math.sin(a) * d * 0.7 - 20,
          fall: 60 + Math.random() * 70,
          rot: (Math.random() - 0.5) * 540,
          size: 7 + Math.random() * 6,
        };
      });
      setBursts((b) => [...b, { id, x: e.clientX - r.left, y: e.clientY - r.top, bits }]);
      setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 2600);
    };
    const onMove = (e) => {
      const now = performance.now();
      if (now - last < 45) return;
      const r = hero.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom) return;
      if (e.target.closest?.(INTERACTIVE)) return;
      last = now;
      const id = next.current++;
      const speck = {
        id,
        x: e.clientX - r.left + (Math.random() - 0.5) * 14,
        y: e.clientY - r.top + (Math.random() - 0.5) * 14,
        dx: (Math.random() - 0.5) * 40,
        size: 2 + Math.random() * 3,
      };
      setTrail((t) => [...t.slice(-22), speck]);
      setTimeout(() => setTrail((t) => t.filter((s) => s.id !== id)), 1400);
    };
    hero.addEventListener("pointerdown", onDown);
    hero.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      hero.removeEventListener("pointerdown", onDown);
      hero.removeEventListener("pointermove", onMove);
    };
  }, [heroRef, reduced]);

  return (
    <div className="bursts" aria-hidden="true">
      {trail.map((s) => (
        <span
          key={s.id}
          className="trail"
          style={{ left: s.x, top: s.y, width: s.size, height: s.size, "--dx": `${s.dx}px` }}
        />
      ))}
      {bursts.map((b) => (
        <div key={b.id} className="burst" style={{ left: b.x, top: b.y }}>
          {b.bits.map((bit, i) => (
            <span
              key={i}
              className={bit.petal ? "burst__petal" : "burst__pollen"}
              style={{
                "--dx": `${bit.dx}px`,
                "--dy": `${bit.dy}px`,
                "--fall": `${bit.fall}px`,
                "--rot": `${bit.rot}deg`,
                width: bit.petal ? bit.size : bit.size * 0.4,
                height: bit.petal ? bit.size * 0.62 : bit.size * 0.4,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
