import { useEffect } from "react";
import { animate, useMotionValue } from "framer-motion";
import { T } from "./data.js";

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Gaze runs -1 (looking to the viewer's left) through 0 (straight ahead) to 1 (the
// photo's own direction, to the viewer's right).
const SACCADE = { type: "spring", stiffness: 520, damping: 42, mass: 0.6 }; // quick flick, no overshoot
const FOLLOW = { type: "spring", stiffness: 90, damping: 22 };
const SPOTS = [-1, -0.55, 0, 0, 0.45, 1]; // straight ahead comes up most often

/**
 * Drives the realistic eyes: where they look (gaze x/y) and the eyelid (0 open, 1 closed).
 * After the entrance the eyes wander between left, centre and right with short holds,
 * and follow the cursor while it is moving.
 */
export function useLiveFace(reduced) {
  const gaze = useMotionValue(reduced ? 0 : 1);
  const gazeY = useMotionValue(0);
  const lid = useMotionValue(0);

  useEffect(() => {
    if (reduced) return undefined;
    const timers = new Set();
    const later = (s, fn) => {
      const id = setTimeout(() => { timers.delete(id); fn(); }, s * 1000);
      timers.add(id);
      return id;
    };

    const blink = (twice = false) => {
      animate(lid, [0, 1, 1, 0], { duration: 0.3, times: [0, 0.38, 0.5, 1], ease: "easeInOut" });
      if (twice) later(0.42, () => blink(false));
    };

    // Scene 2: one natural blink and a slight glance that settles back.
    later(T.firstBlink, () => blink());
    later(T.glance.delay, () => animate(gaze, [1, 0.72, 1], { duration: T.glance.duration * 2, ease: "easeInOut" }));

    // Idle: look somewhere, hold, look somewhere else. A blink often lands on a big move.
    let wanderId = null;
    let following = false;
    const wander = () => {
      if (following) return;
      const now = gaze.get();
      const next = pick(SPOTS.filter((s) => Math.abs(s - now) > 0.3));
      animate(gaze, next, SACCADE);
      animate(gazeY, rand(-0.25, 0.35), SACCADE);
      if (Math.abs(next - now) > 1.2 && Math.random() < 0.35) later(0.05, () => blink());
      wanderId = later(rand(1.4, 3.4), wander);
    };

    // Cursor: follow while it moves, go back to wandering when it rests.
    let restId = null;
    const onMove = (e) => {
      following = true;
      if (wanderId) { clearTimeout(wanderId); timers.delete(wanderId); wanderId = null; }
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      animate(gaze, Math.max(-1, Math.min(1, x * 1.15)), FOLLOW);
      animate(gazeY, Math.max(-0.6, Math.min(0.8, y * 0.7)), FOLLOW);
      if (restId) { clearTimeout(restId); timers.delete(restId); }
      restId = later(2.4, () => { following = false; wander(); });
    };

    let blinkId = null;
    const queueBlink = () => {
      blinkId = later(rand(3.8, 7.5), () => {
        blink(Math.random() < 0.18);
        queueBlink();
      });
    };

    later(T.done, () => {
      window.addEventListener("pointermove", onMove, { passive: true });
      queueBlink();
      wanderId = later(0.6, wander);
    });

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("pointermove", onMove);
    };
  }, [reduced, gaze, gazeY, lid]);

  return { gaze, gazeY, lid };
}
