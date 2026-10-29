import { useEffect, useRef, useState } from "react";
import { Arrow, Placeholder, Reveal, RevealImage, RevealText, Rule, SectionLabel } from "./shared.jsx";

// Product photos from public/assets/products (tools/build-product-shots.py).
// Each product lists its colourways; a colour only appears once it has a real photo.
// look: "studio" = shot on white, blended into the card; "cutout" = transparent, as is.
const shot = (name) => `/assets/products/${name}.webp`;
const PRODUCTS = [
  { id: "hazel", name: "Hazel", kind: "Optical frame", price: 175,
    colours: [{ name: "Tortoise", hex: "#6e3a1b", img: shot("milo-angle"), look: "studio" }] },
  { id: "rowan", name: "Rowan", kind: "Optical frame", price: 175,
    colours: [{ name: "Olive", hex: "#3f5a2a", img: shot("rowan-olive"), look: "studio" }] },
  { id: "ash", name: "Ash", kind: "Optical frame", price: 195, tag: "Bio-acetate",
    colours: [{ name: "Smoke", hex: "#8d949c", img: shot("ash-crystal"), look: "studio" }] },
  { id: "willow", name: "Willow", kind: "Sunglasses", price: 235,
    colours: [{ name: "Sage", hex: "#4f7a45", img: shot("willow-green"), look: "cutout" }] },
  { id: "fern", name: "Fern", kind: "Optical frame", price: 175,
    colours: [{ name: "Havana", hex: "#a4521c", img: shot("rowan-aviator"), look: "cutout" }] },
];

/** One card. The colour dots are a radio group that swaps the photo and the colour name. */
function Product({ p }) {
  const [active, setActive] = useState(0);
  const dots = useRef([]);
  const colour = p.colours[active];
  const pick = (i) => setActive((i + p.colours.length) % p.colours.length);
  const onKeyDown = (e) => {
    const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    const next = (active + dir + p.colours.length) % p.colours.length;
    pick(next);
    dots.current[next]?.focus();
  };
  return (
    <>
      <a href="#" className="product__media">
        {p.tag && <span className="chip">{p.tag}</span>}
        {p.colours.map((c, i) => (
          <img
            key={c.name}
            className={`product__img--${c.look}`}
            data-on={i === active}
            src={c.img}
            alt={i === active ? `${p.name} in ${c.name}` : ""}
            aria-hidden={i === active ? undefined : true}
            loading="lazy"
          />
        ))}
      </a>
      <div className="product__meta">
        <span className="mono product__kind">{p.kind}</span>
        <div className="product__row">
          <a href="#" className="product__name">{p.name} <span>· {colour.name}</span></a>
          <span className="product__price">${p.price}</span>
        </div>
        <div className="product__swatches" role="radiogroup" aria-label={`${p.name} colours`} onKeyDown={onKeyDown}>
          {p.colours.map((c, i) => (
            <button
              key={c.name}
              ref={(el) => (dots.current[i] = el)}
              type="button"
              role="radio"
              className="dot"
              aria-checked={i === active}
              aria-label={c.name}
              title={c.name}
              tabIndex={i === active ? 0 : -1}
              style={{ "--c": c.hex }}
              onClick={() => pick(i)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function Essentials() {
  const track = useRef(null);
  const scroll = (dir) => {
    const el = track.current;
    const card = el?.querySelector(".product");
    if (el && card) el.scrollBy({ left: dir * (card.offsetWidth + parseFloat(getComputedStyle(el).columnGap)), behavior: "smooth" });
  };
  return (
    <section className="sec essentials" aria-labelledby="essentials-title">
      <div className="intro wrap">
        <SectionLabel>The frame edit</SectionLabel>
        <RevealText className="display" id="essentials-title" lines={["Frames that", "feel like you."]} />
        <Reveal as="p" className="mono intro__copy" delay={0.1}>
          Every pair is fitted by our opticians and finished with lenses from our own lab.
          Choose a frame, a colour, a fit. We handle the rest.
        </Reveal>
      </div>

      <div className="essentials__rail">
        <div className="essentials__controls wrap">
          <button className="sq-btn" type="button" aria-label="Previous frames" onClick={() => scroll(-1)}><Arrow dir="left" /></button>
          <button className="sq-btn" type="button" aria-label="Next frames" onClick={() => scroll(1)}><Arrow dir="right" /></button>
          <a className="link-underline" href="#">See every frame</a>
        </div>
        <ul className="essentials__track" ref={track}>
          {PRODUCTS.map((p, i) => (
            <Reveal as="li" className="product" key={p.id} delay={i * 0.06}>
              <Product p={p} />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

// Three steps every pair goes through, shown as panels that open one at a time.
const life = (name) => `/assets/lifestyle/${name}.webp`;
const STEPS = [
  {
    id: "exam",
    title: "The exam",
    body: "A full eye exam with an optometrist, not a quick screening. Around 45 minutes, and we explain every result.",
    cta: "Book an eye exam",
    media: { placeholder: "optometrist with patient, soft daylight", tone: "cool" },
  },
  {
    id: "fit",
    title: "The fit",
    body: "Our opticians adjust each frame to your face at the bridge, the temples and the ears, then check it again a week later.",
    cta: "Find a studio",
    media: { src: life("aviator-hand"), position: "50% 55%" },
  },
  {
    id: "lenses",
    title: "The lenses",
    body: "Cut, coated and finished in our own lab, then guaranteed for two years. No outsourcing, no waiting weeks.",
    cta: "About our lenses",
    media: { src: life("crystal-plinth"), position: "50% 45%" },
  },
];

/** True when the panels have room to sit side by side. */
function useWide(query = "(min-width: 861px)") {
  const get = () => typeof window !== "undefined" && window.matchMedia(query).matches;
  const [wide, setWide] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return wide;
}

function Way() {
  const [active, setActive] = useState(1);
  const wide = useWide();
  return (
    <section className="sec way" aria-labelledby="way-title">
      <div className="intro wrap">
        <SectionLabel>The Opticab way</SectionLabel>
        <RevealText className="display" id="way-title" lines={["Seen properly,", "start to finish."]} />
        <Reveal as="p" className="mono intro__copy" delay={0.2}>
          Three steps for every pair, done by the same team in the same place.
        </Reveal>
      </div>

      <Reveal as="ol" className="way__panels wrap">
        {STEPS.map((step, i) => {
          const open = !wide || i === active;
          return (
            <li
              key={step.id}
              className="way__panel"
              data-open={open}
              onPointerEnter={() => wide && setActive(i)}
              onFocus={() => wide && setActive(i)}
            >
              <div className="way__media" aria-hidden="true">
                {step.media.src ? (
                  <RevealImage src={step.media.src} position={step.media.position} delay={0.1 * i} />
                ) : (
                  <Placeholder label={step.media.placeholder} tone={step.media.tone} />
                )}
              </div>
              <div className="way__content">
                <h3 className="way__head">
                  <button
                    type="button"
                    className="way__toggle"
                    aria-expanded={open}
                    aria-controls={`way-${step.id}`}
                    onClick={() => setActive(i)}
                  >
                    <span className="mono way__num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="way__title">{step.title}</span>
                    <span className="way__icon" aria-hidden="true">
                      <svg className="way__plus" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                      <svg className="way__arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </span>
                  </button>
                </h3>
                <div className="way__detail" id={`way-${step.id}`}>
                  <p>{step.body}</p>
                  <a className="btn btn--white way__cta" href="#">{step.cta}</a>
                </div>
              </div>
            </li>
          );
        })}
      </Reveal>
    </section>
  );
}

const BAND = ["See differently", "Fitted by hand", "Made in our own lab", "Tweaks for life", "Come try them on"];

/** Slow scrolling band of brand lines between sections. Paused on hover and for reduced motion. */
function Band() {
  const row = (hidden) => (
    <span className="band__row" aria-hidden={hidden || undefined}>
      {BAND.map((t) => (
        <span key={t} className="band__item">{t}<span className="band__dot" aria-hidden="true" /></span>
      ))}
    </span>
  );
  return (
    <div className="band" role="presentation">
      <div className="band__track">{row(false)}{row(true)}</div>
    </div>
  );
}

const ARTICLES = [
  { tag: "Care", title: "Keeping acetate like new", lede: "Five habits that keep a frame’s colour and shine for years.", img: life("olive-flat") },
  { tag: "Trends", title: "Round frames are back", lede: "Why the softest shape of the decade suits almost every face.", img: "/assets/products/milo-front.webp", studio: true },
  { tag: "Lenses", title: "Clear acetate, explained", lede: "What crystal frames do to colour, light and the way you look.", img: life("crystal-plinth") },
];

function Journal() {
  return (
    <section className="sec journal" aria-labelledby="journal-title">
      <div className="intro wrap">
        <SectionLabel>The journal</SectionLabel>
        <RevealText className="display" id="journal-title" lines={["Notes on", "seeing well."]} />
        <Reveal as="p" className="mono intro__copy" delay={0.2}>
          Advice from our optometrists, the frames everyone is asking for, and how we make lenses.
        </Reveal>
      </div>
      <div className="journal__grid wrap">
        <article className="feature">
          <a href="#" className="feature__media" aria-label="This season’s colours">
            <RevealImage src={life("sand-teal")} parallax={6} />
          </a>
          <Reveal className="feature__body" delay={0.15}>
            <span className="mono tag">Trends · 4 min read</span>
            <h3 className="feature__title">This season’s colours: sand, teal and everything between</h3>
            <a className="link-underline" href="#">Read the article</a>
          </Reveal>
        </article>
        <ul className="journal__list">
          {ARTICLES.map((a, i) => (
            <Reveal as="li" key={a.title} delay={0.1 * (i + 1)}>
              <a href="#" className="story">
                <div className={`story__media${a.studio ? " story__media--studio" : ""}`}>
                  <img src={a.img} alt="" loading="lazy" />
                </div>
                <div>
                  <span className="mono tag">{a.tag}</span>
                  <h3 className="story__title">{a.title}</h3>
                  <p className="story__lede">{a.lede}</p>
                  <span className="story__read">Read <Arrow dir="right" size={14} /></span>
                </div>
              </a>
            </Reveal>
          ))}
        </ul>
      </div>
      <div className="journal__more">
        <a className="btn btn--outline" href="#">All stories</a>
      </div>
    </section>
  );
}

function Boutiques() {
  return (
    <section className="stores" aria-labelledby="stores-title">
      <RevealImage src="/assets/hero.webp" className="stores__bg" parallax={8} position="50% 80%" />
      <div className="stores__inner wrap">
        <p className="mono stores__kicker">Our studios</p>
        <RevealText className="display display--light stores__title" id="stores-title" lines={["Come in.", "Try everything on."]} />
        <Reveal className="stores__side" delay={0.25}>
          <p className="mono">No appointment needed to browse. Every studio has an optometrist in, a wall of frames to try and a bench for quick fixes.</p>
          <form className="inline-form inline-form--light" onSubmit={(e) => e.preventDefault()}>
            <label className="sr-only" htmlFor="postcode">Postcode</label>
            <input id="postcode" placeholder="Your postcode" autoComplete="postal-code" />
            <button type="submit">Find a studio <Arrow dir="right" size={14} /></button>
          </form>
        </Reveal>
      </div>
    </section>
  );
}

const PROMISES = [
  { title: "A real optometrist, every time", body: "Your eyes are checked by a qualified optometrist, never a quick screening." },
  { title: "The fitting comes with the frame", body: "From the first exam to the last adjustment, it is all in the price." },
  { title: "Tweaks for as long as you wear them", body: "Bent arm, loose screw, slipping nose pads. Bring them in and we sort it." },
  { title: "Lenses covered for two years", body: "Every lens is cut in our own lab, and we stand behind it." },
];

function Promises() {
  return (
    <section className="sec wrap promises" aria-labelledby="promises-title">
      <div className="promises__head">
        <SectionLabel>What you can count on</SectionLabel>
        <RevealText className="display" id="promises-title" lines={["Four things", "we never skip."]} />
      </div>
      <ol className="promises__grid">
        {PROMISES.map((p, i) => (
          <li key={p.title} className="promise">
            <Rule delay={i * 0.12} />
            <Reveal className="promise__body" delay={0.2 + i * 0.12}>
              <span className="mono promise__num">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="promise__title">{p.title}</h3>
              <p className="promise__text">{p.body}</p>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}

const SOCIALS = ["Email", "Instagram", "Pinterest", "TikTok"];

function Community() {
  return (
    <section className="community" aria-labelledby="community-title">
      <div className="community__copy">
        <p className="mono community__kicker">Letters from Opticab</p>
        <RevealText className="display display--light community__title" id="community-title" lines={["See the", "world your", "way."]} />
        <div className="community__row">
          <Reveal as="form" className="glass-form" onSubmit={(e) => e.preventDefault()} delay={0.2}>
            <p className="mono">One letter a month</p>
            <label className="mono" htmlFor="c-name">Name</label>
            <input id="c-name" placeholder="Your name" autoComplete="name" />
            <label className="mono" htmlFor="c-email">Email</label>
            <input id="c-email" type="email" placeholder="Your email" autoComplete="email" />
            <button className="btn btn--white" type="submit">Send me the letter</button>
          </Reveal>
          <Reveal className="socials" delay={0.3}>
            <p className="mono">Elsewhere</p>
            <ul>
              {SOCIALS.map((s) => (
                <li key={s}><a href="#">{s} <Arrow dir="upRight" size={16} /></a></li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
      <RevealImage src={life("green-flowers")} className="community__photo" parallax={7} position="50% 40%" />
    </section>
  );
}

const FOOTER = {
  Shop: ["Eyeglasses", "Sunglasses", "Lenses", "Gift cards"],
  Services: ["Eye exams", "Fittings and tweaks", "Insurance", "Studios"],
  Opticab: ["Our story", "Journal", "Careers", "Contact"],
};

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__top wrap">
        <p className="mono footer__tag">Frames for every you.<br />Vision for a brighter tomorrow.</p>
        {Object.entries(FOOTER).map(([h, links], i) => (
          <Reveal as="nav" key={h} className="footer__col" aria-label={h} delay={i * 0.08}>
            <p className="mono footer__head">{h}</p>
            <ul>{links.map((l) => <li key={l}><a href="#">{l}</a></li>)}</ul>
          </Reveal>
        ))}
      </div>
      <RevealText as="p" className="footer__mark" lines={["Opticab"]} />
      <div className="footer__legal wrap">
        <p className="mono">© {new Date().getFullYear()} Opticab. All rights reserved.</p>
        <p className="mono">Privacy · Terms · Accessibility</p>
      </div>
    </footer>
  );
}

/** Everything below the hero: white editorial sections with darker bands for rhythm. */
export default function Sections() {
  return (
    <div className="page">
      <Essentials />
      <Way />
      <Band />
      <Journal />
      <Boutiques />
      <Promises />
      <Community />
      <Footer />
    </div>
  );
}
