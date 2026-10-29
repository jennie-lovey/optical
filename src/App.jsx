import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Butterfly from "./Butterfly.jsx";
import Face from "./Face.jsx";
import Sections from "./sections/Sections.jsx";
import { CYCLE, EASE_OUT, FRAMES, OPEN, PRELOAD, T, frameSrc } from "./data.js";

const fadeIn = (reduced, timing, y = 12) => ({
  initial: reduced ? false : { opacity: 0, y },
  animate: { opacity: 1, y: 0 },
  transition: { ...timing, ease: EASE_OUT },
});

function Nav({ reduced }) {
  return (
    <motion.header className="nav" {...fadeIn(reduced, T.nav, -8)}>
      <a className="nav__logo" href="#" aria-label="Opticab home">Opticab</a>
      <nav className="nav__links" aria-label="Primary">
        <a href="#">Eyeglasses</a>
        <a href="#">Sunglasses</a>
        <a href="#">Lenses</a>
        <a href="#">Our story</a>
      </nav>
      <div className="nav__actions">
        <button className="icon-btn" type="button" aria-label="Search">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m16.5 16.5 4 4" /></svg>
        </button>
        <a className="nav__cart" href="#">Cart (0)</a>
        <a className="btn btn--light" href="#">Book eye test</a>
        <button className="icon-btn nav__menu" type="button" aria-label="Open menu">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 8h16M4 16h16" /></svg>
        </button>
      </div>
    </motion.header>
  );
}

function Headline({ reduced }) {
  const word = (i) => ({
    initial: reduced ? false : { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: T.headline.duration, delay: T.headline.delay + i * T.headline.stagger, ease: "easeOut" },
  });
  return (
    <h1 className="headline">
      <motion.span className="headline__word headline__word--see" {...word(0)}>See</motion.span>
      <motion.span className="headline__word headline__word--diff" {...word(1)}>Differently</motion.span>
    </h1>
  );
}

function Pitch({ reduced }) {
  return (
    <motion.div className="pitch" {...fadeIn(reduced, T.pitch)}>
      <p>Frames for every you.<br />Vision for a brighter tomorrow.</p>
      <a className="round-btn" href="#" aria-label="Shop frames">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16M14 6l6 6-6 6" /></svg>
      </a>
    </motion.div>
  );
}

/** Radio group with arrow-key movement; selection follows focus. */
function useRadioKeys(count, current, onSelect) {
  const refs = useRef([]);
  const onKeyDown = (e) => {
    const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    const next = (current + dir + count) % count;
    refs.current[next]?.focus();
    onSelect(next);
  };
  return { refs, onKeyDown };
}

function Picker({ selected, onSelect, reduced, cycling, cycleKey, onPause }) {
  const frames = useRadioKeys(FRAMES.length, selected, onSelect);
  const swatches = useRadioKeys(FRAMES.length, selected, onSelect);
  return (
    <motion.section
      className="picker"
      aria-label="Explore frames"
      onPointerEnter={() => onPause(true)}
      onPointerLeave={() => onPause(false)}
      onFocus={() => onPause(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && onPause(false)}
      {...fadeIn(reduced, T.picker)}
    >
      <a className="picker__link" href="#">Explore frames</a>
      <div className="picker__frames" role="radiogroup" aria-label="Frame style" onKeyDown={frames.onKeyDown}>
        {FRAMES.map((f, i) => (
          <button
            key={f.id}
            ref={(el) => (frames.refs.current[i] = el)}
            type="button"
            role="radio"
            className="frame"
            aria-checked={i === selected}
            tabIndex={i === selected ? 0 : -1}
            title={f.name}
            onClick={() => onSelect(i)}
          >
            <img src={frameSrc(f.id, "thumb")} alt={`${f.name} in ${f.colour}`} draggable="false" />
            {cycling && i === selected && (
              <motion.span
                key={cycleKey}
                className="frame__timer"
                aria-hidden="true"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: CYCLE, ease: "linear" }}
              />
            )}
          </button>
        ))}
      </div>
      <span className="picker__divider" aria-hidden="true" />
      <div className="picker__swatches" role="radiogroup" aria-label="Frame colour" onKeyDown={swatches.onKeyDown}>
        {FRAMES.map((f, i) => (
          <button
            key={f.id}
            ref={(el) => (swatches.refs.current[i] = el)}
            type="button"
            role="radio"
            className="swatch"
            aria-checked={i === selected}
            aria-label={f.colour}
            tabIndex={i === selected ? 0 : -1}
            title={f.colour}
            style={{ "--c": f.hex }}
            onClick={() => onSelect(i)}
          />
        ))}
      </div>
    </motion.section>
  );
}

/** Waits until every layer is decoded so the entrance plays from its first frame. */
function useAssetsReady(urls) {
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let live = true;
    let done = 0;
    const loads = urls.map((src) => {
      const img = new Image();
      img.src = src;
      return img.decode().catch(() => {}).then(() => {
        done += 1;
        if (live) setProgress(done / urls.length);
      });
    });
    const fallback = new Promise((r) => setTimeout(r, 6000));
    Promise.race([Promise.all(loads), fallback]).then(() => live && setReady(true));
    return () => { live = false; };
  }, [urls]);
  return { ready, progress };
}

/** Steps through the frames on its own once the entrance is done; picking one restarts the wait. */
function useFrameCycle(count, started) {
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const [cycleKey, setCycleKey] = useState(0);
  const cycling = started && !paused;
  useEffect(() => {
    if (!cycling) return undefined;
    const id = setTimeout(() => {
      setSelected((i) => (i + 1) % count);
      setCycleKey((k) => k + 1);
    }, CYCLE * 1000);
    return () => clearTimeout(id);
  }, [cycling, cycleKey, count]);
  const pick = (i) => {
    setSelected(i);
    setCycleKey((k) => k + 1);
  };
  return { selected, pick, cycling, cycleKey, setPaused };
}

/**
 * Opening screen: the wordmark over a sage field with a line that fills as the page
 * loads, then the field parts like eyelids to reveal the garden.
 */
function Splash({ progress, open, onGone }) {
  return (
    <div className="splash" data-open={open} aria-hidden={open || undefined}>
      <motion.div
        className="splash__lid splash__lid--top"
        animate={open ? { y: "-100%" } : { y: "0%" }}
        transition={{ ...OPEN.lids, ease: [0.65, 0, 0.35, 1] }}
        onAnimationComplete={() => open && onGone()}
      />
      <motion.div
        className="splash__lid splash__lid--bottom"
        animate={open ? { y: "100%" } : { y: "0%" }}
        transition={{ ...OPEN.lids, ease: [0.65, 0, 0.35, 1] }}
      />
      <motion.div
        className="splash__mark"
        initial={{ opacity: 0, y: 8 }}
        animate={open ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }}
        transition={{ duration: open ? 0.35 : 0.6, ease: EASE_OUT }}
      >
        <span className="splash__word" role="status" aria-label="Loading Opticab">Opticab</span>
        <span className="splash__bar"><span style={{ transform: `scaleX(${progress})` }} /></span>
      </motion.div>
    </div>
  );
}

/** A few specks of pollen drifting up through the light. */
const POLLEN = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  top: `${30 + ((i * 53) % 45)}%`,
  size: 2 + ((i * 7) % 4),
  dur: 14 + ((i * 5) % 10),
  delay: -((i * 3.7) % 14),
}));

export default function App() {
  const reduced = useReducedMotion();
  const { ready, progress } = useAssetsReady(PRELOAD);
  const heroRef = useRef(null);

  // loading → open (lids part, garden wakes) → face (entrance plays) → entered (idle)
  const [minHeld, setMinHeld] = useState(false);
  const [splashGone, setSplashGone] = useState(false);
  const [faceOn, setFaceOn] = useState(false);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setMinHeld(true), (reduced ? 0 : OPEN.minSplash) * 1000);
    return () => clearTimeout(id);
  }, [reduced]);
  const open = ready && minHeld;
  useEffect(() => {
    if (!open) return undefined;
    const face = setTimeout(() => setFaceOn(true), (reduced ? 0 : OPEN.face) * 1000);
    return () => clearTimeout(face);
  }, [open, reduced]);
  useEffect(() => {
    if (!faceOn) return undefined;
    const id = setTimeout(() => setEntered(true), (reduced ? 0 : T.done) * 1000);
    return () => clearTimeout(id);
  }, [faceOn, reduced]);
  const { selected, pick, cycling, cycleKey, setPaused } = useFrameCycle(FRAMES.length, entered);

  // The photo and its foliage cut-out always move together, so their edges stay matched.
  const wake = {
    initial: reduced ? false : { scale: 1.1, y: "3%" },
    animate: open ? { scale: 1, y: "0%" } : undefined,
    transition: { ...OPEN.wake, ease: EASE_OUT },
  };

  return (
    <>
    {!reduced && !splashGone && <Splash progress={progress} open={open} onGone={() => setSplashGone(true)} />}
    {ready && <Butterfly open={open} reduced={reduced} heroRef={heroRef} />}
    <main className="hero" data-awake={open} ref={heroRef}>
      <div className="hero__media" aria-hidden="true">
        <motion.div className="garden" {...wake}>
          <div className="garden__drift">
            <motion.img
              className="hero__photo"
              src="/assets/hero.webp"
              alt=""
              fetchpriority="high"
              initial={reduced ? false : { filter: "blur(12px) brightness(0.8)" }}
              animate={open ? { filter: "blur(0px) brightness(1)" } : undefined}
              transition={{ duration: 1.8, delay: 0.15, ease: EASE_OUT }}
            />
          </div>
        </motion.div>
        <motion.div
          className="hero__light"
          initial={reduced ? false : { opacity: 0 }}
          animate={open ? { opacity: 1 } : undefined}
          transition={{ duration: 2.4, delay: 1, ease: "easeOut" }}
        />
        {!reduced && (
          <div className="pollen">
            {POLLEN.map((p, i) => (
              <span key={i} style={{ left: p.left, top: p.top, width: p.size, height: p.size, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }} />
            ))}
          </div>
        )}
      </div>

      {faceOn && (
        <>
          <Nav reduced={reduced} />
          <Headline reduced={reduced} />
          <Face frameId={FRAMES[selected].id} reduced={reduced} />
        </>
      )}
      <motion.div className="garden garden--front" aria-hidden="true" {...wake}>
        <div className="garden__drift">
          <motion.img
            className="hero__front"
            src="/assets/hero-front.webp"
            alt=""
            initial={reduced ? false : { opacity: 0 }}
            animate={open ? { opacity: 1 } : undefined}
            transition={{ duration: 1.2, delay: 0.25, ease: "easeOut" }}
          />
        </div>
      </motion.div>
      {faceOn && (
        <>
          <Pitch reduced={reduced} />
          <Picker
            selected={selected}
            onSelect={pick}
            reduced={reduced}
            cycling={cycling}
            cycleKey={cycleKey}
            onPause={setPaused}
          />
        </>
      )}
    </main>
    {faceOn && <Sections />}
    </>
  );
}
