// Dash through the page (dash.js): the little Dash as Droid's mark (top bar, chat, table), Dash hopping about on the
// app drawer as it scrolls, and the four tiles acted out by him. Each runs only while on screen. He's subtle: one gentle move at
// a time. With reduced motion he doesn't move on his own.
(function () {
  const D = window.Dash;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lerp = (a, b, t) => a + (b - a) * t, ease = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const box = (cx, feet, u) => ({ l: cx - u / 2, r: cx + u / 2, b: feet + .08 * u, t: feet + .08 * u - 1.38 * u });   // dash.js: body .74u wide
  // his eyes follow the pointer while it moves near him, then he goes back to his own glances
  const follow = (el, rig, reach = 260, cy = .55) => {
    let t = 0;
    window.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) return;
      rig.lookAt = D.lookToward(r.left + r.width / 2, r.top + r.height * cy, e.clientX, e.clientY, reach);
      clearTimeout(t); t = setTimeout(() => { rig.lookAt = null; }, 2200);
    }, { passive: true });
  };
  const roundRect = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

  // ---- the little Dash, as Droid's mark: he blinks and looks about; the top bar's watches your pointer and hops when you
  // point at it
  document.querySelectorAll("canvas[data-mini]").forEach((cv) => {
    const rig = new D.Rig({ calm: reduced, feel: "IDLE" });
    D.mount(cv, rig, { draw: (ctx, w, h) => { const u = Math.min(w, h / 1.38); D.draw(ctx, rig, { w, h, home: box(w / 2, h - .1 * u, u), shadow: false }); } });
    if (cv.dataset.mini === "header") { follow(cv, rig, 500); cv.closest(".brand").addEventListener("pointerenter", () => rig.poke()); }
    if (cv.dataset.mini === "table") follow(cv, rig, 400);
  });

  // ---- the app drawer: it scrolls slowly and endlessly, and Dash hops about on the apps. He rides the one he's on up the
  // screen and, before it's carried too high, looks at one further down and hops to it: a crouch, an arc, a landing that
  // presses it (now and then two hops in a row, or a look at you). Tap an app and he hops to it; his eyes follow your
  // pointer; poke him and he hops. With reduced motion nothing moves on its own.
  const screen = document.querySelector(".drawer .screen"), dlist = document.getElementById("dlist");
  if (screen && dlist) {
    const cv = screen.querySelector("canvas.hopper"), view = screen.querySelector(".dview");
    const rig = new D.Rig({ calm: reduced, feel: "IDLE" });
    const sstep = (t) => t * t * (3 - 2 * t);
    const apps = [...dlist.querySelectorAll(".app")], N = apps.length / 2, COLS = 4, SPEED = 15;   // px a second: slow
    let scrollY = 0, copyH = 0;
    const rel = (el) => { const a = el.getBoundingClientRect(), s = screen.getBoundingClientRect(); return { l: a.left - s.left, t: a.top - s.top, w: a.width, h: a.height }; };
    // where he stands on an app: his feet just onto its icon's top edge, his body about as wide as the icon
    const spot = (app) => { const r = rel(app.querySelector("img")); return { x: r.l + r.w / 2, y: r.t + r.w * .2, w: r.w }; };
    // whether an app's icon is between fractions lo and hi of the visible list (0 its top, 1 its bottom)
    const within = (app, lo, hi) => { const v = rel(view), y = spot(app).y; return y > v.t + v.h * lo && y < v.t + v.h * hi; };
    const toward = (a, b) => ({ x: clamp((b.x - a.x) / 60, -1, 1), y: clamp((b.y - a.y) / 90, -.8, .8) });
    let cur = null, hop = null, next = null, queued = null, wait = 1.4, T = 0, lookUntil = 0;
    // where next: a neighbour, lower down rather than higher (the list carries him up), comfortably in view
    const choose = () => {
      const i = apps.indexOf(cur), r = Math.floor(i / COLS), c = i % COLS;
      const ok = (k) => k !== i && Math.abs(k % COLS - c) <= 1 && within(apps[k], .34, .86);
      let pool = apps.map((_, k) => k).filter((k) => ok(k) && Math.floor(k / COLS) - r >= 0 && Math.floor(k / COLS) - r <= 2);
      if (!pool.length) pool = apps.map((_, k) => k).filter((k) => k !== i && within(apps[k], .38, .82));
      return pool.length ? apps[pool[Math.floor(Math.random() * pool.length)]] : null;
    };
    const press = (app) => { app.classList.remove("press"); void app.offsetWidth; app.classList.add("press"); };
    const go = (app) => {
      if (!app || app === cur) return;
      if (reduced) { cur = app; return; }
      const a = spot(cur), b = spot(app), dist = Math.hypot(b.x - a.x, b.y - a.y);
      hop = { from: a, to: app, t: -.14, T: clamp(.38 + dist / 700, .44, .7), up: false };
      rig.squash.v += 2.2; rig.lookAt = toward(a, b);                  // a little crouch, eyes on where he's going
    };
    const land = () => {
      cur = hop.to; hop = null; press(cur);
      rig.squash.v += 3.2; rig.lookAt = null;
      const r = Math.random();
      wait = r < .18 ? .35 : 1.1 + Math.random() * .8;                // now and then straight on again
      if (r > .78) { rig.lookAt = { x: 0, y: -.25 }; lookUntil = T + .9; }   // a look at you
      else if (r > .64) rig.beat("CONTENT", .8);                      // pleased with himself
    };
    // the list scrolls; when it has gone round once it starts again from the top, unseen (the second copy sits exactly
    // where the first was), and whatever he's on or headed for is swapped for its twin in the first copy
    const twin = (a) => { const k = a ? apps.indexOf(a) : -1; return k >= N ? apps[k - N] : a; };
    const scroll = (dt) => {
      if (!copyH) copyH = apps[N].offsetTop - apps[0].offsetTop;
      if (!copyH) return;
      scrollY += SPEED * dt;
      if (scrollY >= copyH) { scrollY -= copyH; cur = twin(cur); next = twin(next); queued = twin(queued); if (hop) hop.to = twin(hop.to); }
      dlist.style.transform = `translateY(${-scrollY}px)`;
    };
    screen.addEventListener("click", (e) => {
      if (!cur) return;
      const s = screen.getBoundingClientRect(), p = spot(cur), u = p.w * 1.3, x = e.clientX - s.left, y = e.clientY - s.top;
      if (!hop && Math.abs(x - p.x) < u * .4 && y < p.y && y > p.y - u * 1.1) { rig.poke(); wait = Math.max(wait, 1); return; }
      const app = e.target.closest(".app"); if (!app) return;
      if (hop) queued = app; else { next = null; go(app); }
    });
    screen.addEventListener("pointermove", (e) => {
      if (hop || !cur || e.pointerType === "touch") return;
      const s = screen.getBoundingClientRect(), p = spot(cur);
      rig.lookAt = D.lookToward(s.left + p.x, s.top + p.y - p.w * .6, e.clientX, e.clientY, 140); lookUntil = T + 1.2;
    });
    D.mount(cv, rig, {
      before: (dt) => {
        T += dt;
        if (!cur) { cur = apps[9] || apps[0]; return true; }
        if (reduced) return false;
        scroll(dt);
        if (lookUntil && T > lookUntil && !hop && !next) { rig.lookAt = null; lookUntil = 0; }
        if (hop) {
          hop.t += dt;
          if (hop.t >= 0 && !hop.up) { hop.up = true; rig.squash.v -= 3.4; rig.lean.v += Math.sign(spot(hop.to).x - hop.from.x) * 1; }   // up, stretching, leaning in
          if (hop.t >= hop.T) land();
        } else if (queued) { const q = queued; queued = null; go(q); }
        else {
          wait -= dt;
          if (!within(cur, .28, 1.2) && wait > .45) wait = .45;      // carried up near the top: time to go
          if (wait < .4 && !next) { next = choose(); if (next) { rig.lookAt = toward(spot(cur), spot(next)); lookUntil = 0; } }
          if (wait <= 0) { const n = next; next = null; if (n) go(n); else wait = .3; }
        }
        return true;
      },
      draw: (ctx, w, h) => {
        if (!cur) return;
        let p = spot(cur);
        if (hop && hop.t > 0) {
          const a = hop.from, b = spot(hop.to), t = Math.min(1, hop.t / hop.T);
          const k = lerp(t, sstep(t), .5), lift = 18 + Math.hypot(b.x - a.x, b.y - a.y) * .2 + Math.max(0, a.y - b.y) * .35;
          p = { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, t) - lift * 4 * t * (1 - t), w: lerp(a.w, b.w, t) };
        }
        D.draw(ctx, rig, { w, h, home: box(p.x, p.y, p.w * 1.3), shadow: false });
      },
    });
  }

  // ---- the tiles, acted out by him (his whole self, not just his eyes)
  const scenes = {
    // your phone off, and Dash beside it, still at work
    background(cv) {
      const rig = new D.Rig({ calm: reduced, feel: "WORKING" });
      D.mount(cv, rig, { draw: (ctx, w, h) => {
        ctx.fillStyle = "#121212"; roundRect(ctx, 8, 8, 24, 44, 6); ctx.fill();
        ctx.fillStyle = "#2a2a2a"; ctx.beginPath(); ctx.arc(20, 12.5, 1.4, 0, 7); ctx.fill();
        D.draw(ctx, rig, { w, h, home: box(58, 50, 34) });
      } });
    },
    // several at once: three of him, each busy with something else
    several(cv) {
      const feels = ["READING", "WORKING", "THINKING"];
      const rigs = feels.map((f) => new D.Rig({ calm: reduced, feel: f }));
      D.mount(cv, rigs[0], { before: (dt) => { rigs[1].step(dt); rigs[2].step(dt); }, draw: (ctx, w, h) => {
        rigs.forEach((r, i) => D.draw(ctx, r, { w, h, home: box(14 + i * 27, 50, 27) }));
      } });
    },
    // listening: his tip glowing with your voice
    voice(cv) {
      const rig = new D.Rig({ calm: reduced, feel: "LISTENING" });
      rig.level = () => { const t = rig.time; return clamp(Math.abs(Math.sin(t * 7.3)) * (.55 + .45 * Math.sin(t * 2.1)) * (Math.sin(t * .9) > -.4 ? 1 : .1), 0, 1); };
      D.mount(cv, rig, { draw: (ctx, w, h) => D.draw(ctx, rig, { w, h, home: box(w / 2, 50, 38) }) });
      follow(cv, rig);
    },
    // he lives on your phone: Dash inside a phone
    phone(cv) {
      const rig = new D.Rig({ calm: reduced, feel: "IDLE" });
      D.mount(cv, rig, { draw: (ctx, w, h) => {
        ctx.strokeStyle = "#121212"; ctx.lineWidth = 2.2; roundRect(ctx, w / 2 - 16, 4, 32, 52, 7); ctx.stroke();
        D.draw(ctx, rig, { w, h, home: box(w / 2, 47, 24), shadow: false });
      } });
      follow(cv, rig);
    },
  };
  document.querySelectorAll("canvas[data-scene]").forEach((cv) => scenes[cv.dataset.scene] && scenes[cv.dataset.scene](cv));
})();
