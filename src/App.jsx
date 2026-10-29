import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Face from "./Face.jsx";
import Sections from "./sections/Sections.jsx";
import { CYCLE, EASE_OUT, FRAMES, PRELOAD, T, frameSrc } from "./data.js";

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
  useEffect(() => {
    let live = true;
    const loads = urls.map((src) => {
      const img = new Image();
      img.src = src;
      return img.decode().catch(() => {});
    });
    const fallback = new Promise((r) => setTimeout(r, 6000));
    Promise.race([Promise.all(loads), fallback]).then(() => live && setReady(true));
    return () => { live = false; };
  }, [urls]);
  return ready;
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

export default function App() {
  const reduced = useReducedMotion();
  const ready = useAssetsReady(PRELOAD);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (!ready) return undefined;
    const id = setTimeout(() => setEntered(true), (reduced ? 0 : T.done) * 1000);
    return () => clearTimeout(id);
  }, [ready, reduced]);
  const { selected, pick, cycling, cycleKey, setPaused } = useFrameCycle(FRAMES.length, entered);

  return (
    <>
    <main className="hero">
      {/* Background and foliage are there from the first frame; the foliage cut-out
          sits above the face so the hair tucks into it. */}
      <div className="hero__media" aria-hidden="true">
        <img className="hero__photo" src="/assets/hero.webp" alt="" fetchpriority="high" />
      </div>

      {ready && (
        <>
          <Nav reduced={reduced} />
          <Headline reduced={reduced} />
          <Face frameId={FRAMES[selected].id} reduced={reduced} />
        </>
      )}
      <img className="hero__front" src="/assets/hero-front.webp" alt="" aria-hidden="true" />
      {ready && (
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
    {ready && <Sections />}
    </>
  );
}
