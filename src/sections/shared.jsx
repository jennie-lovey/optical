import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { EASE_OUT } from "../data.js";

const VIEW = { once: true, amount: 0.25 };

/** Fades and lifts its content once, as it scrolls into view. */
export function Reveal({ as = "div", delay = 0, className, children, ...rest }) {
  const reduced = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={reduced ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEW}
      transition={{ duration: 0.8, delay, ease: EASE_OUT }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * Headline whose words rise out of a mask, staggered. `lines` is an array of strings;
 * each renders on its own line. Screen readers get the plain text.
 */
export function RevealText({ as = "h2", lines, className, delay = 0, id }) {
  const reduced = useReducedMotion();
  const Tag = motion[as];
  let n = 0;
  return (
    <Tag
      className={`rt ${className ?? ""}`}
      id={id}
      aria-label={lines.join(" ")}
      initial={reduced ? false : "hidden"}
      whileInView="shown"
      viewport={VIEW}
    >
      {lines.map((line, li) => (
        <span className="rt__line" key={li} aria-hidden="true">
          {line.split(" ").map((word, wi) => {
            const i = n++;
            return (
              <span className="rt__mask" key={wi}>
                <motion.span
                  className="rt__word"
                  variants={{ hidden: { y: "105%" }, shown: { y: "0%" } }}
                  transition={{ duration: 0.9, delay: delay + i * 0.06, ease: EASE_OUT }}
                >
                  {word}
                </motion.span>
              </span>
            );
          })}
        </span>
      ))}
    </Tag>
  );
}

/** Photo that unmasks from the bottom while settling from a slight zoom. */
export function RevealImage({ src, alt = "", className = "", delay = 0, parallax = 0, position }) {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`${-parallax}%`, `${parallax}%`]);
  // The in-view trigger sits on an unclipped wrapper: a fully clipped element never
  // counts as visible, so it could not start its own reveal.
  return (
    <motion.div
      ref={ref}
      className={`ri ${className}`}
      initial={reduced ? false : "hidden"}
      whileInView="shown"
      viewport={VIEW}
    >
      <motion.div
        className="ri__clip"
        variants={{ hidden: { clipPath: "inset(100% 0% 0% 0%)" }, shown: { clipPath: "inset(0% 0% 0% 0%)" } }}
        transition={{ duration: 1.1, delay, ease: [0.65, 0, 0.35, 1] }}
      >
        <motion.img
          src={src}
          alt={alt}
          loading="lazy"
          draggable="false"
          style={{ y: reduced || !parallax ? 0 : y, objectPosition: position }}
          variants={{ hidden: { scale: 1.12 }, shown: { scale: parallax ? 1.12 : 1 } }}
          transition={{ duration: 1.6, delay, ease: EASE_OUT }}
        />
      </motion.div>
    </motion.div>
  );
}

/** Thin rule that draws itself in from the leading edge. */
export function Rule({ className = "", delay = 0 }) {
  const reduced = useReducedMotion();
  return (
    <motion.span
      className={`rule ${className}`}
      aria-hidden="true"
      initial={reduced ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={VIEW}
      transition={{ duration: 1.2, delay, ease: EASE_OUT }}
    />
  );
}

/** Stand-in for a photo that has not been supplied yet. */
export function Placeholder({ label, tone = "warm", className = "" }) {
  return (
    <div className={`ph ph--${tone} ${className}`} role="img" aria-label={`Image placeholder: ${label}`}>
      <span className="ph__label">Image · {label}</span>
    </div>
  );
}

export function Arrow({ dir = "right", size = 18 }) {
  const d = {
    right: "M4 12h16M14 6l6 6-6 6",
    left: "M20 12H4M10 6l-6 6 6 6",
    upRight: "M7 17 17 7M8 7h9v9",
  }[dir];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function SectionLabel({ children }) {
  return <p className="label">{children}</p>;
}
