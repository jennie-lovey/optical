import { useEffect } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "framer-motion";
import { EASE_IN_OUT, EASE_OUT, GAZE, T, frameSrc } from "./data.js";
import { useLiveFace } from "./useLiveFace.js";

const FACE = "/assets/face";

/** One slice of the supplied sketch, revealed by a soft mask that travels like a pencil. */
function SketchLayer({ src, sweep, timing, reduced }) {
  const p = useMotionValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return undefined;
    const controls = animate(p, 1, { ...timing, ease: EASE_IN_OUT });
    return () => controls.stop();
  }, [p, reduced, timing]);
  return (
    <motion.img
      className={`face__layer sweep sweep--${sweep}`}
      src={src}
      alt=""
      draggable="false"
      style={{ "--p": p }}
    />
  );
}

/**
 * The realistic eyes, shown through the sketched openings. Each eye is a still eyeball with
 * the real iris on its own layer, so the iris can travel across the opening.
 */
function RealEyes({ reduced }) {
  const { gaze, gazeY, lid } = useLiveFace(reduced);
  // gaze 1 = the photo's own direction; 0 = straight ahead; -1 = the other side.
  const leftX = useTransform(gaze, (g) => `${GAZE.left * (1 - g)}%`);
  const rightX = useTransform(gaze, (g) => `${GAZE.right * (1 - g)}%`);
  const irisY = useTransform(gazeY, (v) => `${v}%`);
  // Upper lid comes down toward the lower lid.
  const scaleY = useTransform(lid, [0, 1], [1, 0.06]);
  const irisX = { left: leftX, right: rightX };

  return (
    <motion.div
      className="face__layer face__eyes"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ ...T.eyes, ease: "easeOut" }}
    >
      {["left", "right"].map((side) => (
        <motion.div key={side} className={`face__eye face__eye--${side}`} style={{ scaleY }}>
          <img src={`${FACE}/eye-ball-${side}.webp`} alt="" draggable="false" />
          <motion.img
            className="face__iris"
            src={`${FACE}/eye-iris-${side}.webp`}
            alt=""
            draggable="false"
            style={{ x: irisX[side], y: irisY }}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

const rise = (reduced) => ({
  initial: reduced ? false : { opacity: 0, y: "14%" },
  animate: { opacity: 1, y: "0%" },
  transition: { ...T.glasses, ease: EASE_OUT },
});

// Frame swaps cross-fade in place; the entrance itself is handled by `rise`.
const swap = {
  initial: { opacity: 0, y: "2%" },
  animate: { opacity: 1, y: "0%" },
  exit: { opacity: 0, y: "-1%" },
  transition: { duration: 0.45, ease: EASE_OUT },
};

function FramePart({ frameId, part }) {
  return (
    <AnimatePresence initial={false}>
      <motion.img
        key={frameId}
        className="specs__img"
        src={frameSrc(frameId, part)}
        alt=""
        draggable="false"
        {...swap}
      />
    </AnimatePresence>
  );
}

/**
 * Layers, back to front: sketch (details, brows, lids) → realistic eyes → glasses arms →
 * side hair → glasses front + lens sheen. The headline sits behind all of it.
 */
export default function Face({ frameId, reduced }) {
  return (
    <div className="rig" aria-hidden="true">
      <div className="rig__box">
        <div className="face">
          <SketchLayer src={`${FACE}/sketch-details.webp`} sweep="down" timing={T.details} reduced={reduced} />
          <SketchLayer src={`${FACE}/sketch-brows.webp`} sweep="out" timing={T.brows} reduced={reduced} />
          <SketchLayer src={`${FACE}/sketch-lids.webp`} sweep="out" timing={T.lids} reduced={reduced} />
          <RealEyes reduced={reduced} />
        </div>

        <motion.div className="specs" {...rise(reduced)}>
          <FramePart frameId={frameId} part="arms" />
        </motion.div>

        <div className="face face--over">
          <SketchLayer src={`${FACE}/hair-sides.webp`} sweep="down" timing={T.details} reduced={reduced} />
        </div>

        <motion.div className="specs specs--front" {...rise(reduced)}>
          <FramePart frameId={frameId} part="front" />
          {!reduced && (
            <div className="sheen">
              <motion.span
                className="sheen__band"
                initial={{ x: "-130%" }}
                animate={{ x: "130%" }}
                transition={{ ...T.sheen, ease: EASE_IN_OUT }}
              />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
