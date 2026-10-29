import { useEffect, useRef, useState } from "react";
import { useMotionValue, useSpring, useTransform } from "framer-motion";

const INTERACTIVE = "a, button, input, label, .picker, .pitch, .nav";

/**
 * Where the pointer is over the hero, as springs from -1 to 1. The garden uses these to
 * pan a little (both of its layers by the same amount, so edges stay matched), and the
 * sunlight glow follows them.
 */
export function useGardenLook(heroRef, reduced) {
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 40, damping: 20, mass: 0.9 });
  const sy = useSpring(py, { stiffness: 40, damping: 20, mass: 0.9 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (reduced) return undefined;
    const onMove = (e) => {
      const r = heroRef.current?.getBoundingClientRect();
      if (!r || e.clientY < r.top || e.clientY > r.bottom) return;
      px.set(((e.clientX - r.left) / r.width) * 2 - 1);
      py.set(((e.clientY - r.top) / r.height) * 2 - 1);
      setActive(true);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [heroRef, reduced, px, py]);

  // Pan opposite the pointer, as if glancing across the scene.
  const panX = useTransform(sx, (v) => `${-v * 0.9}%`);
  const panY = useTransform(sy, (v) => `${-v * 0.6}%`);
  const glowX = useTransform(sx, (v) => `${50 + v * 50}%`);
  const glowY = useTransform(sy, (v) => `${50 + v * 50}%`);
  return { panX, panY, glowX, glowY, active };
}

/** A puff of petals and pollen wherever the garden is tapped or clicked. */
export function GardenBursts({ heroRef, reduced }) {
  const [bursts, setBursts] = useState([]);
  const next = useRef(0);

  useEffect(() => {
    if (reduced) return undefined;
    const hero = heroRef.current;
    if (!hero) return undefined;
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
    hero.addEventListener("pointerdown", onDown);
    return () => hero.removeEventListener("pointerdown", onDown);
  }, [heroRef, reduced]);

  return (
    <div className="bursts" aria-hidden="true">
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
