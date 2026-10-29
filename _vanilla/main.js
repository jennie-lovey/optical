(() => {
  const hero = document.getElementById("hero");
  const framesEl = document.getElementById("frames");
  const swatchesEl = document.getElementById("swatches");
  const bigGlasses = document.getElementById("hero-glasses");

  /* ---------- Image slots: fall back to placeholder if not supplied ---------- */

  const photo = hero.querySelector(".hero__photo");
  const front = hero.querySelector(".hero__front");
  const markMissing = () => hero.classList.add("no-photo");
  if (photo.complete && photo.naturalWidth === 0) markMissing();
  photo.addEventListener("error", markMissing);
  const hideFront = () => front.classList.add("is-missing");
  if (front.complete && front.naturalWidth === 0) hideFront();
  front.addEventListener("error", hideFront);

  /* ---------- Headline: split into characters for the staggered rise ---------- */

  let i = 0;
  document.querySelectorAll("[data-split]").forEach((word) => {
    const text = word.textContent.trim();
    word.setAttribute("aria-label", text);
    word.textContent = "";
    for (const letter of text) {
      const outer = document.createElement("span");
      outer.className = "ch";
      outer.setAttribute("aria-hidden", "true");
      const inner = document.createElement("span");
      inner.textContent = letter;
      inner.style.setProperty("--i", i++);
      outer.appendChild(inner);
      word.appendChild(outer);
    }
  });

  /* ---------- Frames + colours ---------- */

  // One colourway per real frame; the swatches double as a frame shortcut.
  const colours = [
    { id: "tortoise", name: "Tortoise", hex: "#6e3a1b" },
    { id: "azure",    name: "Azure",    hex: "#7e9ec4" },
    { id: "smoke",    name: "Smoke",    hex: "#4a4749" },
  ];

  // Real photos only: thumbnails from assets/frames/<id>.webp, and the hero frame
  // from a front-on cut-out at assets/frames/<id>-front.png when one exists.
  const styles = [
    { id: "tortoise", name: "Hazel", colour: "tortoise" },
    { id: "azure",    name: "Rowan", colour: "azure" },
    { id: "smoke",    name: "Ash",   colour: "smoke" },
  ];

  const state = { style: 0 };

  const colourById = (id) => colours.find((c) => c.id === id);

  styles.forEach((style, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "frame";
    btn.setAttribute("role", "radio");
    btn.dataset.index = idx;
    btn.title = style.name;
    btn.addEventListener("click", () => selectStyle(idx));
    framesEl.appendChild(btn);
  });

  colours.forEach((colour) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "swatch";
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-label", colour.name);
    btn.title = colour.name;
    btn.style.setProperty("--c", colour.hex);
    btn.dataset.id = colour.id;
    btn.addEventListener("click", () => selectColour(colour.id));
    swatchesEl.appendChild(btn);
  });

  function renderFrame(idx) {
    const style = styles[idx];
    framesEl.children[idx].innerHTML =
      `<img src="assets/frames/${style.id}.webp" alt="${style.name} in ${colourById(style.colour).name}" draggable="false">`;
  }

  // Front-on cut-outs sit over the eyes. Lens centres should sit
  // at ~26.7% / 73.3% across and 50% down so they land on the eyes.
  const heroPhotos = {};
  styles.forEach((style) => {
    const src = `assets/frames/${style.id}-front.png`;
    const probe = new Image();
    probe.onload = () => {
      heroPhotos[style.id] = src;
      if (styles[state.style] === style) renderHero(false);
    };
    probe.src = src;
  });

  function renderHero(animate) {
    const style = styles[state.style];
    // Arms tuck under the side hair; the frame front sits on top of both.
    const front = heroPhotos[style.id];
    bigGlasses.innerHTML = front
      ? `<img class="hero__frame-photo" src="assets/frames/${style.id}-arms.png" alt="" onerror="this.remove()">
         <img class="hero__hair" src="assets/hair-sides.png" alt="">
         <img class="hero__frame-photo" src="${front}" alt="">`
      : "";
    if (animate) {
      bigGlasses.classList.remove("is-swapping");
      void bigGlasses.offsetWidth;
      bigGlasses.classList.add("is-swapping");
    }
  }

  function syncChecked() {
    const current = styles[state.style].colour;
    [...framesEl.children].forEach((el, idx) => {
      const on = idx === state.style;
      el.setAttribute("aria-checked", on);
      el.tabIndex = on ? 0 : -1;
    });
    [...swatchesEl.children].forEach((el) => {
      const on = el.dataset.id === current;
      el.setAttribute("aria-checked", on);
      el.tabIndex = on ? 0 : -1;
    });
  }

  function selectStyle(idx) {
    if (idx === state.style) return;
    state.style = idx;
    syncChecked();
    renderHero(true);
  }

  function selectColour(id) {
    selectStyle(styles.findIndex((s) => s.colour === id));
  }

  // Arrow-key navigation within each radiogroup.
  function arrowKeys(group, onMove) {
    group.addEventListener("keydown", (e) => {
      const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      const items = [...group.children];
      const at = items.indexOf(document.activeElement);
      const next = items[(at + dir + items.length) % items.length];
      next.focus();
      onMove(next);
    });
  }
  arrowKeys(framesEl, (el) => selectStyle(Number(el.dataset.index)));
  arrowKeys(swatchesEl, (el) => selectColour(el.dataset.id));

  styles.forEach((_, idx) => renderFrame(idx));
  syncChecked();
  renderHero(false);
})();
