/*
 * Dash, Droid's character, for the web: the same rig and drawing as the app's Dash.kt, so he looks and moves the same
 * on the site, in the ad and on the phone.
 *
 * How he stays smooth:
 *  - Every number that moves is on an exact damped spring (solved, not stepped), so a change of target never jumps and
 *    no frame rate makes him wobble or stutter.
 *  - Gestures (a hop, a nod, a start, a call) are short curves in time that start and end at rest; they add to the
 *    springs and nothing ever kicks him.
 *  - Each shape is valid by construction: his body is one rounded outline whose corners and head are clamped to the
 *    room they have, and his eyes are two arcs that can't cross. No boolean path ops, no clips, no outline strokes, so
 *    no seams, slivers or jagged joins at any size or pose.
 *  - He is drawn inside his own box: antenna, glow and rings included (see headRoom for a frame's).
 *
 * He has two bodies that are one body: a creature (a soft periwinkle mochi with a hooked antenna), and the frame of
 * Droid's screen with his eyes in a rounded head on its top edge (rig.frame 0..1). Units: CSS pixels (the app's dp).
 *
 *   const rig = new Dash.Rig({ calm, feel: "HAPPY" });
 *   Dash.mount(canvas, rig, { draw: (ctx, w, h) => Dash.draw(ctx, rig, { home }) });
 *
 * A creature stands in home {l,t,r,b}: with u = min(width, height / 1.38) his body is .74u wide, his base .08u above
 * home's bottom, and all of him (antenna, glow, a hop) stays inside.
 */
(function () {
  "use strict";
  const PI = Math.PI, TAU = 2 * PI;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  /** A smooth bump over 0..1: zero (with zero slope) at both ends, 1 in the middle. */
  const bump = (p) => (p <= 0 || p >= 1 ? 0 : Math.sin(PI * p) ** 2);
  const K = 0.5523;   // a quarter circle as a cubic

  // ---- colors
  const C = {
    BodyTop: "#BAC0FF", Body: "#A3ABFF", Pale: "#ECEEFF", Stalk: "#8A91EC", Tip: "#D2C4FF", Ink: "#16151B",
    Glow: "#FFF0C8", Blush: "#FF8DB6", Mark: "#5A5FD6", Accent: "#A9B0FF",
  };
  const LIGHT_GLOW = "#7D83F2", DARK_LIT = "#C7CBFF", SHADE = "#2A1E6E";
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgba = (h, a) => { const [r, g, b] = typeof h === "string" ? hex(h) : h; return `rgba(${r},${g},${b},${clamp(a, 0, 1)})`; };
  const lerpC = (a, b, t) => { const x = typeof a === "string" ? hex(a) : a, y = typeof b === "string" ? hex(b) : b;
    return [0, 1, 2].map((i) => Math.round(mix(x[i], y[i], clamp(t, 0, 1)))); };

  // ---- feelings: targets for the rig (Feel in Dash.kt)
  //  open: lids (0 closed); smile: + his eyes curve up (a crescent, ^ when closed), - they droop (u when closed);
  //  size, asym (+ right eye bigger); lookX/Y (-1..1); glances: looks about on his own; scan: how his eyes move by
  //  themselves; lean, tilt (radians), stretch (1 = rest); sway: a slow rock; depth: how deep he breathes;
  //  antenna (its angle, + right), curl (how it hooks), length; glow: his tip's light; pulse: lit by your voice;
  //  tick: his tip pulsing this many times a second (working); blush; call: your turn; enter: a gesture on arriving.
  const D = { open: 1, smile: 0, size: 1, asym: 0, lookX: 0, lookY: 0, glances: true, scan: "NONE", scanX: 0, scanY: 0,
    lean: 0, tilt: 0, stretch: 1, sway: 0, depth: 1, antenna: .15, curl: .5, length: 1, glow: 0, pulse: false, tick: 0,
    blush: 0, call: false, enter: "" };
  const F = (o) => Object.assign({}, D, o);
  const FEELS = {
    IDLE: F({}),
    HAPPY: F({ open: .95, smile: .8, blush: .55, lookY: -.12, stretch: 1.03, antenna: .05, curl: .35, glances: false, enter: "hop" }),
    EXCITED: F({ size: 1.12, smile: .25, lookY: -.15, stretch: 1.05, antenna: 0, curl: .12, length: 1.1, glow: .35, glances: false, enter: "hop" }),
    LOVE: F({ open: .9, smile: .85, blush: 1, glow: .5, stretch: 1.02, antenna: .05, curl: .3, glances: false }),
    CURIOUS: F({ size: 1.06, asym: .09, lookX: .7, lookY: -.12, tilt: .1, lean: .04, antenna: .7, curl: .45, stretch: 1.03, glances: false }),
    /** Looking down at what you type. */
    READING: F({ open: .86, lookY: .8, lean: .04, tilt: .03, stretch: .98, antenna: .5, glances: false }),
    /** Eyes up on you, antenna straight up, tip lit by your voice. */
    LISTENING: F({ size: 1.06, lookY: -.28, antenna: 0, curl: .12, glow: .4, pulse: true, stretch: 1.02, glances: false }),
    THINKING: F({ open: .92, lookX: -.5, lookY: -.7, tilt: -.07, lean: -.03, antenna: .1, curl: 1.1, glow: .18, scan: "DRIFT", glances: false }),
    CONFUSED: F({ asym: -.12, smile: -.1, lookX: .25, lookY: -.4, tilt: -.13, lean: -.03, antenna: -.25, curl: -1, glances: false }),
    SURPRISED: F({ size: 1.18, stretch: 1.07, antenna: 0, curl: 0, length: 1.1, glances: false, enter: "start" }),
    FOCUSED: F({ open: .64, lookX: .6, lookY: .5, tilt: .05, lean: .04, antenna: .9, curl: .4, stretch: .98, glances: false }),
    /** Droid at work: looking over its screen, tip softly pulsing. */
    WORKING: F({ open: .9, antenna: .55, curl: .5, tick: 1.1, scan: "WORK", glances: false }),
    /** Taking in a screen: eyes wide, reading it line by line. */
    LOOKING: F({ size: 1.06, lookY: -.05, scan: "READ", scanX: .7, scanY: .45, lean: .04, stretch: 1.02, antenna: .7, curl: .38, glances: false }),
    /** Typing: eyes down, moving along like a caret. */
    TYPING: F({ open: .82, lookY: .72, scan: "CARET", scanX: .45, antenna: .45, curl: .6, tick: 2.4, stretch: .97, lean: .03, glances: false }),
    /** Scrolling: his eyes ride the page. */
    SCROLLING: F({ open: .95, lookX: .1, scan: "SCROLL", scanY: .5, antenna: .5, glances: false }),
    /** Waiting for an app: lids low, a slow rock, tip slowly pulsing. */
    WAITING: F({ open: .6, lookY: .2, sway: .05, antenna: .85, curl: .75, tick: .45, stretch: .96, depth: 1.6, glances: false }),
    /** Looking something up: eyes sweeping side to side. */
    SEARCHING: F({ size: 1.04, lookY: -.18, scan: "SWEEP", scanX: .75, antenna: .25, curl: .95, stretch: 1.02, glances: false }),
    STRAINING: F({ open: .2, smile: -.25, stretch: .95, antenna: .15, curl: .6, glances: false }),
    /** Your turn: tall, eyes on you, tip lit, signal rings; now and then a wave of his antenna. */
    NEEDS_YOU: F({ size: 1.12, lookY: -.25, stretch: 1.05, antenna: 0, curl: .06, length: 1.04, glow: .9, call: true, glances: false }),
    /** You took over his screen: eyes closed, hands off. */
    DRIVING: F({ open: 0, smile: -.5, antenna: .35, curl: .9, stretch: .98, glances: false }),
    SHY: F({ open: .8, size: .94, lookX: -.7, lookY: .6, tilt: -.08, lean: -.03, blush: .85, stretch: .97, antenna: .9, curl: .8, glances: false }),
    OOPS: F({ size: 1.05, asym: .08, lookX: .7, lookY: -.6, tilt: -.08, lean: -.03, stretch: .96, antenna: .95, curl: .75, glances: false }),
    SLEEPY: F({ open: .36, smile: -.25, lookY: .35, sway: .04, depth: 1.8, stretch: .96, antenna: .95, curl: .85, glances: false }),
    ASLEEP: F({ open: 0, smile: -.6, depth: 2.2, stretch: .94, antenna: 1.05, curl: .8, glances: false }),
    /** Watching his screen work, steadily (the site's calm working pose). */
    WATCHING: F({ open: .92, lookY: .3, antenna: .4, curl: .5, glances: false }),
    /** Pleased, without the hop (a job done, quietly). */
    CONTENT: F({ open: .92, smile: .7, blush: .3, lookY: -.1, antenna: .1, curl: .4, stretch: 1.02, glances: false }),
    CELEBRATE: F({ smile: .85, blush: .6, glow: .6, size: 1.04, stretch: 1.04, antenna: 0, curl: .15, glances: false, enter: "hop2" }),
  };

  // ---- an exact damped spring: never jumps, keeps its speed when the target moves, the same at any frame rate.
  // calm (reduced motion): never bounces (at least critically damped), and rests exactly on its target once there.
  class Spring {
    constructor(x, k, z, calm) { this.x = x; this.t = x; this.v = 0; this.w = Math.sqrt(k); this.z = calm ? Math.max(z, 1) : z; this.calm = calm; }
    step(dt) {
      if (dt <= 0) return;
      const w = this.w, z = this.z, x0 = this.x - this.t, v0 = this.v;
      let x, v;
      if (z < .999) {
        const wd = w * Math.sqrt(1 - z * z), e = Math.exp(-z * w * dt), c = Math.cos(wd * dt), s = Math.sin(wd * dt);
        x = e * (x0 * c + (v0 + z * w * x0) / wd * s);
        v = e * (v0 * c - (z * w * v0 + w * w * x0) / wd * s);
      } else if (z > 1.001) {
        const q = w * Math.sqrt(z * z - 1), r1 = -z * w + q, r2 = -z * w - q;
        const c2 = (v0 - r1 * x0) / (r2 - r1), c1 = x0 - c2, e1 = Math.exp(r1 * dt), e2 = Math.exp(r2 * dt);
        x = c1 * e1 + c2 * e2; v = r1 * c1 * e1 + r2 * c2 * e2;
      } else {
        const e = Math.exp(-w * dt), b = v0 + w * x0;
        x = (x0 + b * dt) * e; v = (v0 - w * b * dt) * e;
      }
      this.x = this.t + x; this.v = v;
      if (this.calm && Math.abs(x) < 2e-4 && Math.abs(v) < 2e-3) { this.x = this.t; this.v = 0; }
    }
    snap(to) { this.x = to; this.t = to; this.v = 0; }
  }

  // ---- gestures: [length s]; each is a curve over its length that starts and ends at rest
  const MOVES = { hop: .7, nod: .5, start: .55, peek: .7, wave: 1.6, squish: .6 };
  const REST = { lift: 0, sq: 0, ln: 0, st: 0, wave: 0, callE: 0 };

  class Rig {
    /** o: { calm, feel, random } (random: a seeded generator, for renders that must come out the same every time). */
    constructor(o = {}) {
      const calm = this.calm = !!o.calm;
      this.R = o.random || Math.random;
      const s = (x, k, z) => new Spring(x, k, z, calm);
      // body
      this.frame = s(0, 80, .95);        // 0 creature .. 1 the frame of a screen
      this.present = s(1, 90, 1);        // 0: gone (a creature shrinks away; a frame lets go of its screen)
      this.squash = s(0, 260, .45);      // a quick squish (a poke, a push off): it rings once and settles
      this.tilt = s(0, 70, .9); this.lean = s(0, 70, .9); this.stretch = s(1, 90, .8);
      this.depth = s(1, 30, 1);          // how deep he breathes
      // eyes
      this.lookX = s(0, 520, 1); this.lookY = s(0, 520, 1);
      this.open = s(1, 260, 1); this.smile = s(0, 160, 1);
      this.eyes = s(1, 200, .8); this.eyeL = s(1, 200, .9); this.eyeR = s(1, 200, .9);
      this.blush = s(0, 30, 1);
      // antenna: a little looser, so it follows his body through, and settles
      this.antenna = s(.15, 55, .5); this.curl = s(.5, 55, .55); this.length = s(1, 120, .75);
      this.glow = s(0, 60, 1);
      // looks
      this.pale = s(0, 70, 1); this.lit = s(0, 50, 1); this.drain = s(0, 40, 1); this.call = s(0, 40, 1);
      this.all = ["frame", "present", "squash", "tilt", "lean", "stretch", "depth", "lookX", "lookY", "open", "smile", "eyes",
        "eyeL", "eyeR", "blush", "antenna", "curl", "length", "glow", "pale", "lit", "drain", "call"].map((k) => this[k]);
      /** His height above the ground (px at a 100 px box), from his gestures: read-only. */
      this.hop = { x: 0, v: 0 };
      this.G = REST;
      this.moves = [];
      this.feelName = o.feel || "IDLE"; this.f = FEELS[this.feelName] || FEELS.IDLE;
      this.feelFor = 0; this.poked = 0; this.beatName = "IDLE"; this.beatFor = 0; this.sayFor = 0;
      this.level = () => 0; this.lookAt = null;
      this.time = 0; this.blink = 0; this.blinkT = -1; this.nextBlink = 1.2 + this.R() * 2.4; this.breath = this.R() * TAU;
      this.glance = 1 + this.R() * 2; this.gx = 0; this.gy = 0;
      this.callT = 1; this.callHops = 0;
      this.fidget = 0;   // (kept for older callers; he has no idle hops)
      this.taps = []; this.selfTaps = false; this.tapClock = 1;
      if (this.feelName !== "IDLE") this.settle();   // made in a feeling: he's in it already
    }
    get feel() { return this.feelName; }

    /** Starts a gesture after delay seconds (none with reduced motion, and not the same one twice at once). */
    move(kind, amp = 1, delay = 0) {
      if (this.calm) return;
      if (this.moves.some((g) => g.kind === kind && g.t < MOVES[kind] * .75 && g.t > -delay - .01)) return;
      this.moves.push({ kind, t: -delay, dur: MOVES[kind], amp });
    }
    enter(f) {
      if (f.enter === "hop") this.move("hop", 6);
      else if (f.enter === "hop2") { this.move("hop", 8); this.move("hop", 5, .62); }
      else if (f.enter === "start") this.move("start");
    }
    setFeel(name) {
      if (name === this.feelName || !FEELS[name]) return;
      this.feelName = name; this.f = FEELS[name]; this.feelFor = 0;
      this.enter(this.f);
      if (this.f.call) { this.callT = .35 + this.R() * .4; this.callHops = 0; }
    }
    /** A poke: a squish, a little hop and a moment of happy (calm: just the squish). */
    poke() {
      if (this.calm) this.squash.v += 1.2; else { this.move("squish"); this.move("hop", 4, .3); }
      if (!["LISTENING", "ASLEEP", "DRIVING"].includes(this.feelName)) this.poked = .9;
    }
    /** A step done: a small nod. */
    nod() { this.move("nod"); }
    /** Something to say: a look up at you, his tip brightening, a little rise (as a frame, his head peeks up). */
    say() { this.move("peek"); this.sayFor = 1.3; }
    /** name for secs, then back to his feeling. */
    beat(name, secs) { if (!FEELS[name]) return; this.beatName = name; this.beatFor = secs; this.enter(FEELS[name]); }
    /** Droid tapped its screen at fx, fy (0..1): a ripple there, and his eyes go to it (quiet: no flash of his tip). */
    tap(fx, fy, quiet = false) { this.taps.push({ fx, fy, age: 0, quiet }); if (!quiet) this.glow.v += 3; }
    /** Jumps to where he'd be by now (no gestures): for a rig that wasn't stepped while it couldn't be seen. */
    settle() {
      this.beatFor = 0; this.sayFor = 0; this.moves = []; this.G = REST; this.hop.x = 0;
      this.targets(this.poked > 0 ? FEELS.HAPPY : this.f, 0, REST);
      for (const sp of this.all) sp.snap(sp.t);
    }
    /** Advances him by dt seconds. False when nothing moved (calm and at rest): no need to draw again. */
    step(dt) {
      const before = this.calm ? this.all.map((sp) => sp.x) : null;
      this.time += dt; this.feelFor += dt;
      if (this.poked > 0) this.poked -= dt;
      if (this.beatFor > 0) this.beatFor -= dt;
      if (this.sayFor > 0) this.sayFor -= dt;
      const f = this.poked > 0 ? FEELS.HAPPY : this.beatFor > 0 ? FEELS[this.beatName] : this.f;
      this.life(dt);
      for (const g of this.moves) g.t += dt;
      this.moves = this.moves.filter((g) => g.t < g.dur);
      const lift0 = this.hop.x;
      const G = this.G = this.gestures();
      this.targets(f, dt, G);
      if (!this.calm) {
        // follow-through: his antenna lags behind his body, and dips as he rises
        this.antenna.v -= (this.tilt.v * 1.4 + this.lean.v * 2.2) * dt * 6;
        this.curl.v += (G.lift - lift0) * .05;
      }
      for (const sp of this.all) sp.step(dt);
      this.hop.v = dt > 0 ? (G.lift - lift0) / dt : 0; this.hop.x = G.lift;
      for (const t of this.taps) t.age += dt;
      this.taps = this.taps.filter((t) => t.age < 3);
      if (!this.calm) return true;
      return this.taps.length > 0 || this.all.some((sp, i) => sp.x !== before[i]);
    }
    life(dt) {
      // blinks: quick to close, a little slower to open; now and then two
      if (this.blinkT >= 0) {
        this.blinkT += dt;
        const p = this.blinkT / .2;
        this.blink = p < .35 ? smooth(0, .35, p) : 1 - smooth(.45, 1, p);
        if (p >= 1) { this.blinkT = -1; this.blink = 0; }
      } else if (!this.calm) {
        this.nextBlink -= dt;
        if (this.nextBlink <= 0) { this.blinkT = 0; this.nextBlink = this.R() < .18 ? .34 : 2.4 + this.R() * 3.6; }
      }
      this.breath += dt * TAU * (this.feelName === "ASLEEP" ? .16 : this.feelName === "EXCITED" ? .38 : .24);
      this.glance -= dt;
      if (this.glance <= 0) {
        this.glance = 1.6 + this.R() * 3;
        if (this.R() < .35) { this.gx = 0; this.gy = 0; } else { this.gx = (this.R() * 2 - 1) * .6; this.gy = (this.R() * 2 - 1) * .32; }
      }
    }
    gestures() {
      const G = { lift: 0, sq: 0, ln: 0, st: 0, wave: 0, callE: 0 };
      for (const g of this.moves) {
        const p = g.t / g.dur;
        if (p <= 0) continue;
        switch (g.kind) {
          case "hop": {   // a crouch, up and over, a soft landing
            const q = clamp((p - .2) / .62, 0, 1);
            G.lift += g.amp * bump(q);
            G.sq += .07 * bump(p / .3) - .05 * bump((p - .16) / .3) + .06 * bump((p - .72) / .28);
            break;
          }
          case "nod": G.sq += .045 * bump(p); G.ln += .025 * bump(p); break;
          case "squish": G.sq += .1 * bump(p / .34) - .04 * bump((p - .26) / .36) + .012 * bump((p - .58) / .42); break;
          case "start": G.st += .07 * bump(p / .6); G.lift += 2.5 * bump(p / .7); break;
          case "peek": G.lift += 3 * bump(p); G.st += .02 * bump(p); break;
          case "wave": { const e = bump(p); G.wave += e * Math.sin(TAU * 1.3 * g.t); G.callE = Math.max(G.callE, e); break; }
        }
      }
      return G;
    }
    targets(f, dt, G) {
      const calm = this.calm, t = this.feelFor, T = this.time;
      this.open.t = f.open; this.smile.t = f.smile; this.eyes.t = f.size + .05 * G.callE;
      this.eyeL.t = 1 - f.asym; this.eyeR.t = 1 + f.asym;
      this.blush.t = f.blush; this.depth.t = f.depth;
      // where he looks
      let lx = f.lookX, ly = f.lookY;
      if (f.glances && !calm) { lx += this.gx; ly += this.gy; }
      if (!calm) switch (f.scan) {
        case "WORK": lx = this.gx * 1.1; ly = .35 + this.gy * .8; break;                   // looking over the screen
        case "READ": {                                                                      // a line, then the next
          const c = Math.floor(t / 2.2), q = (t % 2.2) / 2.2;
          lx += f.scanX * (q < .78 ? mix(-1, 1, smooth(0, .78, q)) : mix(1, -1, smooth(.78, 1, q)));
          ly += f.scanY * ((c % 3) - 1) * .5; break;
        }
        case "SWEEP": lx += f.scanX * Math.sin(t * 1.5); break;
        case "SCROLL": { const q = (t % 1.8) / 1.8; ly += f.scanY * (q < .72 ? mix(-1, 1, smooth(0, .72, q)) : mix(1, -1, smooth(.72, 1, q))); break; }
        case "CARET": { const q = (t % 2.6) / 2.6; lx += f.scanX * (q < .8 ? mix(-1, 1, q / .8) : mix(1, -1, smooth(.8, 1, q))); break; }
        case "DRIFT": lx += .12 * Math.sin(t * .9); ly += .08 * Math.sin(t * 1.3 + 1); break;
      }
      else if (f.scan === "WORK") ly = .35;
      if (this.sayFor > 0) { lx = 0; ly = -.4; }
      const tap = this.taps[this.taps.length - 1], tapping = tap && tap.age < 1.6;
      if (tapping) { lx = (tap.fx - .5) * 1.6; ly = (tap.fy - .35) * 1.2; }
      if (this.lookAt && (f.glances || this.feelName === "IDLE" || this.feelName === "CURIOUS")) { lx = this.lookAt.x; ly = this.lookAt.y; }
      this.lookX.t = lx; this.lookY.t = ly;
      // his body: the pose, a little of his look, a slow rock
      let ln = f.lean, tl = f.tilt, st = f.stretch;
      if (!calm) {
        ln += this.lookX.x * .03; tl += this.lookX.x * .02;
        if (f.sway) tl += f.sway * Math.sin(t * 1.3);
        if (f.scan === "SWEEP") ln += .05 * Math.sin(t * 1.5);
        if (f.call) st += .015 * Math.sin(T * 2.2);
      }
      if (f.pulse) st += .05 * clamp(this.level(), 0, 1);
      if (tapping && !tap.quiet) ln = (tap.fx - .5) * .3;     // his head goes to where he taps
      if (this.sayFor > 0) { ln *= .3; st = Math.max(st, 1.04); }
      this.lean.t = ln; this.tilt.t = tl; this.stretch.t = st;
      // his antenna: a slow drift of its own, and a call's wave
      let an = f.antenna, cu = f.curl;
      if (!calm) { an += .05 * Math.sin(T * 1.05) + .03 * Math.sin(T * .61 + 2) + .6 * G.wave; cu -= .3 * G.wave; }
      this.antenna.t = an; this.curl.t = cu; this.length.t = f.length + .12 * G.callE;
      // his tip's light
      let gl = f.glow;
      if (f.pulse) { const lv = clamp(this.level(), 0, 1); gl = .3 + .7 * (calm ? lv : Math.max(lv, .18 + .12 * Math.sin(T * 2.4))); }
      else if (f.tick) gl = calm ? .3 : .12 + .4 * Math.pow(.5 + .5 * Math.sin(TAU * f.tick * T), 2);
      else if (f.call && !calm) gl = f.glow * (.85 + .15 * Math.sin(T * 2.2));
      gl += .4 * G.callE;
      if (this.sayFor > 0) gl = Math.max(gl, .85 * smooth(0, .4, this.sayFor));
      this.glow.t = gl;
      this.lit.t = f.call ? 1 : 0; this.call.t = f.call ? 1 : 0;
      // calling you: now and then a wave of his antenna (the first two with a little hop), less often after a while
      if (f.call && !calm) {
        this.callT -= dt;
        if (this.callT <= 0) { this.callT = t < 30 ? 6 : 10; this.move("wave"); if (this.callHops < 2) { this.callHops++; this.move("hop", 4, .15); } }
      }
      if (this.selfTaps && this.frame.x > .85 && this.feelName === "WORKING") {
        this.tapClock -= dt;
        if (this.tapClock <= 0) { const p = TAP_SPOTS[Math.floor(this.R() * TAP_SPOTS.length)]; this.tap(p[0], p[1]); this.tapClock = .9 + this.R() * .8; }
      }
    }
  }
  const TAP_SPOTS = [[.78, .16], [.3, .42], [.5, .6], [.7, .86], [.25, .24], [.62, .36]];

  // ---- drawing
  /** The corner radius of Droid's screen drawn w wide: one rule at every size, so his frame and a plain still match. */
  function screenCorner(w) { return clamp(w * .1, 5, 28); }
  /** The head's scale for a frame fw wide (its screen plus edges) shown at scale. */
  function headScale(fw, scale = 1) { return clamp(fw * scale / 122, .6, 1.6) / scale; }
  /** Room above a frame's top edge that all of his head (at its tallest: antenna, glow and rings included) fits in. */
  function headRoom(ns, hook = true) { return ns * (hook ? 33 : 16) + 2; }

  function fillP(ctx, p, style, alpha = 1) { ctx.globalAlpha = clamp(alpha, 0, 1); ctx.fillStyle = style; ctx.fill(p); ctx.globalAlpha = 1; }
  function strokeP(ctx, p, style, width, alpha = 1, cap = "round", join = "round") {
    ctx.globalAlpha = clamp(alpha, 0, 1); ctx.strokeStyle = style; ctx.lineWidth = width; ctx.lineCap = cap; ctx.lineJoin = join; ctx.stroke(p); ctx.globalAlpha = 1;
  }
  const ellipse = (x, y, rx, ry) => { const p = new Path2D(); p.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), 0, 0, TAU); return p; };
  function circle(ctx, x, y, r, style, alpha = 1) { if (r > 0) fillP(ctx, ellipse(x, y, r, r), style, alpha); }
  function radial(ctx, x, y, r, stops) { const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(.01, r)); for (const [o, c] of stops) g.addColorStop(o, c); return g; }
  /** A soft spot: color at its middle fading to nothing at its edge, rx by ry. */
  function soft(ctx, x, y, rx, ry, color, a) {
    if (a < .005 || rx <= 0 || ry <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
    fillP(ctx, ellipse(0, 0, rx, rx), radial(ctx, 0, 0, rx, [[0, rgba(color, a)], [.55, rgba(color, a * .55)], [1, rgba(color, 0)]]));
    ctx.restore();
  }

  function roundRect(l, t, r, b, rad) {
    const rr = clamp(rad, 0, Math.max(0, Math.min(r - l, b - t) / 2)), p = new Path2D();
    p.moveTo(l + rr, t); p.lineTo(r - rr, t); p.bezierCurveTo(r - rr + rr * K, t, r, t + rr - rr * K, r, t + rr);
    p.lineTo(r, b - rr); p.bezierCurveTo(r, b - rr + rr * K, r - rr + rr * K, b, r - rr, b);
    p.lineTo(l + rr, b); p.bezierCurveTo(l + rr - rr * K, b, l, b - rr + rr * K, l, b - rr);
    p.lineTo(l, t + rr); p.bezierCurveTo(l, t + rr - rr * K, l + rr - rr * K, t, l + rr, t);
    p.closePath(); return p;
  }

  /**
   * His body, base center at (0, 0): a rounded outline whose corners go from the mochi's (a dome on top, a soft base) to
   * the frame's, with his head on its top edge as a frame. Every radius is clamped to the room it has, so it never
   * folds, at any size or in any pose.
   */
  function bodyPath(L) {
    const { w, h, rtx, rty, rbx, rby, hw, hh, fil, hx } = L;
    const x0 = -w / 2, x1 = w / 2, y0 = -h, y1 = 0, p = new Path2D();
    p.moveTo(x0 + rtx, y0);
    if (hh > .3 && hw > .5) {
      const l = hx - hw, r = hx + hw, top = y0 - hh, f = fil, rn = Math.max(0, Math.min(hw, hh - f)) * .96;
      p.lineTo(l - f, y0);
      p.bezierCurveTo(l - f + f * K, y0, l, y0 - f + f * K, l, y0 - f);
      p.lineTo(l, top + rn);
      p.bezierCurveTo(l, top + rn - rn * K, l + rn - rn * K, top, l + rn, top);
      p.lineTo(r - rn, top);
      p.bezierCurveTo(r - rn + rn * K, top, r, top + rn - rn * K, r, top + rn);
      p.lineTo(r, y0 - f);
      p.bezierCurveTo(r, y0 - f + f * K, r + f - f * K, y0, r + f, y0);
    }
    p.lineTo(x1 - rtx, y0); p.bezierCurveTo(x1 - rtx + rtx * K, y0, x1, y0 + rty - rty * K, x1, y0 + rty);
    p.lineTo(x1, y1 - rby); p.bezierCurveTo(x1, y1 - rby + rby * K, x1 - rbx + rbx * K, y1, x1 - rbx, y1);
    p.lineTo(x0 + rbx, y1); p.bezierCurveTo(x0 + rbx - rbx * K, y1, x0, y1 - rby + rby * K, x0, y1 - rby);
    p.lineTo(x0, y0 + rty); p.bezierCurveTo(x0, y0 + rty - rty * K, x0 + rtx - rtx * K, y0, x0 + rtx, y0);
    p.closePath(); return p;
  }

  /**
   * One eye, as one filled outline: an upper and a lower half-oval over the same width, so they can never cross. Open, an
   * oval; smiling, the lower edge rises into a crescent; closing, both meet in one fine curved line, tapered at its ends
   * (up when happy, down when relaxed), with nothing swapped or cross-faded. line: how thick a closed eye's line is.
   */
  function drawEye(ctx, rig, cx, cy, rx, ry, lx, ly, line, alpha) {
    const o = clamp(rig.open.x * (1 - rig.blink), 0, 1), sm = clamp(rig.smile.x, -1, 1), h = line / 2;
    const ery = Math.max(.3, ry - h);
    const Topen = ery * (1 + .1 * Math.max(0, sm) + .45 * Math.min(0, sm)), Bopen = ery * (1 - 2.15 * Math.max(0, sm));
    const bow = ery * (sm >= 0 ? mix(-.12, .5, sm) : mix(-.12, -.42, -sm));
    const T = mix(bow, Topen, o) + h, B = mix(-bow, Bopen, o) + h;
    const y = cy + ery * .18 * (1 - o) * (1 - Math.max(0, sm));
    const p = new Path2D();
    p.moveTo(cx - rx, y);
    p.bezierCurveTo(cx - rx, y - T * K, cx - rx * K, y - T, cx, y - T);
    p.bezierCurveTo(cx + rx * K, y - T, cx + rx, y - T * K, cx + rx, y);
    p.bezierCurveTo(cx + rx, y + B * K, cx + rx * K, y + B, cx, y + B);
    p.bezierCurveTo(cx - rx * K, y + B, cx - rx, y + B * K, cx - rx, y);
    p.closePath();
    fillP(ctx, p, C.Ink, alpha);
    // a catchlight, in the open part only: it shrinks away as the eye closes or smiles
    const sp = smooth(.5, .92, (T + B - 2 * h) / (2 * ery));
    if (sp > .01 && rx > 1.6) circle(ctx, cx + rx * .3 - lx * rx * .06, y - T * .42 - ly * ry * .04, rx * .36 * sp, "#ffffff", alpha * .95);
  }

  /** His call (your turn): signal rings going out left and right from his tip, as from an antenna. */
  function drawCall(ctx, rig, x, y, r, reach, width, color, amt) {
    const r0 = r * 1.9 + width;
    const ring = (k, a) => {
      if (a < .01) return;
      const rr = r0 + reach * k, p = new Path2D();
      p.arc(x, y, rr, -38 * PI / 180, 38 * PI / 180); strokeP(ctx, p, color, width, a);
      const q = new Path2D(); q.arc(x, y, rr, 142 * PI / 180, 218 * PI / 180); strokeP(ctx, q, color, width, a);
    };
    if (rig.calm) { ring(.15, amt * .8); ring(.55, amt * .45); return; }
    const boost = 1 + .4 * rig.G.callE;
    for (let i = 0; i < 2; i++) {
      const k = (rig.time / 1.8 + i * .5) % 1;
      ring(k, clamp(amt * smooth(0, .18, k) * (1 - k) * (1 - k) * boost, 0, 1));
    }
  }

  /** Where everything is for rig (see draw): his size and place, his pose, the morph, his head. */
  function layout(rig, o) {
    const onLight = o.onLight !== false;
    const m = clamp(rig.frame.x, 0, 1), present = clamp(rig.present.x, 0, 1);
    const edge = o.edge ?? 3, hookAmt = o.hookAmt ?? 1, scale = o.scale ?? 1;
    const box = o.home || { l: 0, t: 0, r: o.w, b: o.h };
    const u = Math.min(box.r - box.l, (box.b - box.t) / 1.38), w0 = u * .74, h0 = w0 * 1.02;
    const groundC = box.b - u * .08;
    const small = clamp((56 - w0) / 36, 0, 1);   // features grow relative to him when he's small, as an icon's do
    const sr = o.screen || { l: 0, t: 0, r: o.w, b: o.h };
    const srW = sr.r - sr.l, srH = sr.b - sr.t, fw = srW + 2 * edge, fh = srH + 2 * edge;
    const w = mix(w0, fw, m), h = mix(h0, fh, m);
    const ground = mix(groundC, sr.b + edge, m), cx = mix((box.l + box.r) / 2, (sr.l + sr.r) / 2, m);
    const ns = headScale(fw, scale);
    // the morph, in order: his eyes rise to the top as his head grows out of it, then the screen opens inside him
    const em = smooth(.06, .7, m), nm = smooth(.2, .78, m) * present, sa = smooth(.45, .95, m);
    // his pose, as a creature (about his base); a frame holds still and its head does the moving
    const k = 1 - m, kl = 1 - smooth(0, .45, m), G = rig.G || REST;
    const breath = rig.calm ? 0 : Math.sin(rig.breath) * rig.depth.x;
    const st = clamp(rig.stretch.x + G.st, .82, 1.2), sq = clamp(rig.squash.x + G.sq, -.35, .35);
    const sx = 1 + ((1 + sq * .9) / Math.sqrt(st) * (1 - .008 * breath) - 1) * k;
    const sy = 1 + ((1 - sq) * st * (1 + .012 * breath) - 1) * k;
    const sizeK = clamp(u / 100, .35, 1);
    const lift = Math.max(0, rig.hop.x) * sizeK * k;
    const tilt = rig.tilt.x * k, shear = (rig.lean.x + G.ln) * kl;
    const screenR = screenCorner(srW * scale) / scale, frameR = screenR + edge;
    const rtx = mix(w0 / 2, frameR, m), rty = mix(h0 * .53, frameR, m), rbx = mix(w0 * .45, frameR, m), rby = mix(h0 * .41, frameR, m);
    // his head, as a frame: taller when he stands tall, up with a hop or a breath, wider with wide eyes; it slides along
    // the edge the way he leans (to where he taps), and shrinks to fit what room the edge has
    const hs = w / 2 - rtx;
    let hw = 14 * ns * nm * (1 + .3 * (rig.eyes.x - 1));
    let hh = ns * nm * clamp(11 * (1 + (st - 1) * 1.6), 8, 13) + nm * em * (Math.max(0, rig.hop.x) * .45 * ns + breath * .35 * ns);
    let fil = Math.min(3.6 * ns * nm, hh * .4);
    const fit = clamp((hs - 1) / Math.max(1e-3, hw + fil), 0, 1);
    hw *= fit; hh *= fit; fil *= fit;
    const room = Math.max(0, hs - 1 - hw - fil);
    const hx = clamp(rig.lean.x * hw * 3 * em, -room, room);
    // a creature that leaves shrinks away; a frame that lets go fades instead
    const gone = mix(present, 1, smooth(0, .5, m));
    return { onLight, m, present, edge, hookAmt, scale, box, u, w0, h0, small, sr, srW, srH, w, h, ground, cx, ns, em, nm, sa,
      k, breath, sx, sy, sizeK, lift, tilt, shear, screenR, frameR, rtx, rty, rbx, rby, hw, hh, fil, hx, fit, gone };
  }

  /**
   * Where the screen inside him is, for content laid over the canvas (a video): place it at (x, y), rotate by rot,
   * scale by sx, sy (about that point), then the rect l, t, w, h with corner radius r, at opacity a. (His lean is gone
   * before the screen shows, so there's no skew to carry.)
   */
  function screenAt(rig, o) {
    const L = layout(rig, o);
    return { x: L.cx, y: L.ground - L.lift, rot: L.tilt, sx: L.sx * L.gone, sy: L.sy * L.gone,
      l: -L.w / 2 + L.edge, t: -L.h + L.edge, w: L.w - 2 * L.edge, h: L.h - 2 * L.edge, r: L.screenR, a: L.sa * (L.gone >= .01 ? 1 : 0) };
  }

  /**
   * Draws the rig. As a creature he stands in o.home {l,t,r,b} (default: the whole w x h); as a frame (rig.frame 1) his
   * body is o.screen {l,t,r,b} grown by o.edge on every side (the screen itself is left to whatever sits under the
   * canvas, a video; o.fillScreen paints it). o.onLight (default true): his lights in periwinkle, not white.
   * o.shadow: false for no shadow; o.ripples: Droid's taps as ripples; o.hookAmt, o.scale: see the app's DashScreen.
   */
  function draw(ctx, rig, o) {
    const L = layout(rig, o);
    const { onLight, m, present, edge, hookAmt, w0, h0, small, w, h, ground, cx, ns, em, nm, sa, k, sx, sy, lift, tilt, shear,
      screenR, hw, hh, hx, fit, gone } = L;
    if (gone < .01) return;
    const pale = clamp(rig.pale.x, 0, 1);

    // a soft shadow on the ground, smaller as he rises
    if (o.shadow !== false && k > .01) {
      const sk = 1 - clamp(lift / (40 * L.sizeK), 0, .45);
      soft(ctx, cx, ground + .5, w0 * .42 * sk * gone, Math.max(1.2, w0 * .06) * sk * gone, SHADE, .17 * k * gone * sk);
    }

    ctx.save();
    ctx.translate(cx, ground - lift);
    ctx.rotate(tilt);
    ctx.transform(1, 0, -shear, 1, 0, 0);
    ctx.scale(sx * gone, sy * gone);
    const y0 = -h;

    // the antenna, behind the body: from his crown, or from his head's top as a frame
    const showHook = mix(1, hookAmt, em) * mix(1, present, m);
    const len = rig.length.x * mix(w0 * .27 * (1 + .2 * small), 8 * ns, em) * showHook;
    if (len > .5) {
      const bx = hx * em, by = mix(y0 + Math.max(1.5, w0 * .05), y0 - hh + Math.min(1.5, hh * .3), em);
      const stalkW = mix(Math.max(w0 * .037 * (1 + .45 * small), 1.3), 1.9 * ns, em);
      const tipR = mix(w0 * .058 * (1 + .35 * small), 2.7 * ns, em) * Math.min(1, showHook * 1.5) * (1 + .15 * clamp(rig.call.x, 0, 1));
      const a0 = rig.antenna.x, cu = rig.curl.x, n = 12;
      const pts = [[bx, by]];
      let x = bx, y = by;
      for (let i = 1; i <= n; i++) { const a = a0 + cu * 2 * Math.pow((i - .5) / n, 1.4); x += Math.sin(a) * len / n; y -= Math.cos(a) * len / n; pts.push([x, y]); }
      const stalk = new Path2D(); stalk.moveTo(bx, by);
      for (let i = 1; i < n; i++) stalk.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
      stalk.lineTo(x, y);
      strokeP(ctx, stalk, rgba(lerpC(C.Stalk, [196, 199, 232], pale * .7), 1), stalkW);
      const gl = clamp(rig.glow.x, 0, 1.3);
      if (gl > .02) soft(ctx, x, y, tipR * mix(2.6, 2.4, em), tipR * mix(2.6, 2.4, em), onLight ? LIGHT_GLOW : C.Glow, .55 * Math.min(1, gl));
      circle(ctx, x, y, tipR, rgba(lerpC(lerpC(C.Tip, "#FFF8E2", Math.min(1, gl * .7)), "#E4E5F4", pale), 1));
      if (small < .8 && tipR > 2) circle(ctx, x - tipR * .3, y - tipR * .32, tipR * .3, "#ffffff", .8 * (1 - small));
      const cl = clamp(rig.call.x, 0, 1) * showHook * mix(1 - smooth(.3, .7, small), 1, em);
      if (cl > .01) drawCall(ctx, rig, x, y, tipR, mix(tipR * 4.2, 6 * ns, em), Math.max(stalkW * .9, 1.1), onLight ? C.Mark : DARK_LIT, cl);
      if (o.probe) o.probe.tip = at(ctx, x, y);
    }

    // the body: one outline, mochi to frame
    const body = bodyPath(L);
    const bodyA = mix(1, 0, (1 - present) * m);   // a frame letting go fades, leaving the still's hairline
    const lit = clamp(rig.lit.x, 0, 1);
    if (lit > .01) {
      // your turn: a soft glow round him (under the body, so only its outside shows), pulsing with each call
      const pulse = rig.calm ? 1 : (.75 + .25 * Math.sin(rig.time * 2.2)) * (1 + .5 * rig.G.callE);
      const lc = onLight ? LIGHT_GLOW : DARK_LIT, gw = mix(Math.max(w0 * .07, 1.6), 4.5, m);
      strokeP(ctx, body, lc, gw * 2 * lit, Math.min(1, .1 * lit * pulse));
      strokeP(ctx, body, lc, gw * lit, Math.min(1, .2 * lit * pulse));
    }
    const top = lerpC(C.BodyTop, C.Pale, pale), bot = lerpC(C.Body, C.Pale, pale);
    const vg = ctx.createLinearGradient(0, y0 - hh, 0, 0); vg.addColorStop(0, rgba(top, 1)); vg.addColorStop(1, rgba(bot, 1));
    fillP(ctx, body, vg, bodyA);
    // a soft light from above, on the creature
    const hl = (1 - smooth(.05, .5, m)) * (1 - pale * .6);
    if (hl > .01) fillP(ctx, body, radial(ctx, -w * .18, -h * .76, w * .62, [[0, rgba("#FFFFFF", .42 * hl)], [.5, rgba("#FFFFFF", .12 * hl)], [1, rgba("#FFFFFF", 0)]]), bodyA);
    if (lit > .01) fillP(ctx, body, radial(ctx, hx, y0 - hh * .4, Math.max(1, hw * 2.2), [[0, rgba("#FFFFFF", .5 * lit * smooth(1, 4, hh))], [1, rgba("#FFFFFF", 0)]]));

    // the screen inside the frame (left to a video under the canvas, unless o.fillScreen)
    if (sa > .01) {
      const l = -w / 2 + edge, t = y0 + edge, r = w / 2 - edge, b = -edge;
      if (o.fillScreen) fillP(ctx, roundRect(l, t, r, b, screenR), o.fillScreen, sa);
      else { ctx.save(); ctx.globalCompositeOperation = "destination-out"; fillP(ctx, roundRect(l + .5, t + .5, r - .5, b - .5, screenR - .5), "#000", sa); ctx.restore(); }
      if (o.ripples) {
        ctx.save(); ctx.clip(roundRect(l, t, r, b, screenR));
        for (const tp of rig.taps) {
          const q = tp.age / .9; if (q > 1) continue;
          const a = (1 - q) * Math.min(1, tp.age / .08), x = l + tp.fx * (r - l), y = t + tp.fy * (b - t), rr = (5 + q * 16) * ns;
          circle(ctx, x, y, rr, C.Accent, a * .3);
          strokeP(ctx, ellipse(x, y, rr, rr), C.Mark, 1.6, a * .8);
        }
        ctx.restore();
      }
      if (present < 1) strokeP(ctx, roundRect(l + .5, t + .5, r - .5, b - .5, screenR - .5), o.hairline || "rgba(42,30,110,.2)", 1, (1 - present) * sa);
    }

    // eyes: low on his face as a creature, in his head as a frame
    const eyeVis = mix(1, present, m);
    if (eyeVis > .02) {
      const lx = clamp(rig.lookX.x, -1.2, 1.2), ly = clamp(rig.lookY.x, -1.2, 1.2);
      const rx = mix(w0 * .076 * (1 + .45 * small), 3.5 * ns * fit, em) * rig.eyes.x * mix(1, .6 + .4 * present, m), ry = rx * 1.32;
      const sep = mix(w0 * (.175 + .02 * small), hw * .46, em);
      const ey = mix(-h0 * .43, y0 - hh * .5, em), ex = hx * em;
      const ox = lx * mix(w0 * .085, hw * .16, em), oy = ly * mix(h0 * .065, hh * .1, em);
      const sepT = sep * (1 - .1 * Math.abs(lx));                       // turning: the eyes come a little together
      const tiltE = rig.tilt.x * rx * 1.4 * em;                          // as a frame, a tilt is in his eyes
      const line = Math.max(1.1, rx * .42);
      if (o.probe) { o.probe.eyeL = at(ctx, ex - sepT + ox, ey + oy - tiltE); o.probe.eyeR = at(ctx, ex + sepT + ox, ey + oy + tiltE); o.probe.top = at(ctx, hx * em, y0 - hh); o.probe.side = at(ctx, w / 2, -h * .5); }
      drawEye(ctx, rig, ex - sepT + ox, ey + oy - tiltE, rx * rig.eyeL.x * (1 - .14 * Math.max(0, -lx)), ry * rig.eyeL.x, lx, ly, line, eyeVis);
      drawEye(ctx, rig, ex + sepT + ox, ey + oy + tiltE, rx * rig.eyeR.x * (1 - .14 * Math.max(0, lx)), ry * rig.eyeR.x, lx, ly, line, eyeVis);
      const bl = clamp(rig.blush.x, 0, 1) * (1 - em) * (1 - smooth(.5, .9, small));
      if (bl > .01) for (const s of [-1, 1]) soft(ctx, ex + s * (sepT + rx * 1.3) + ox * .6, ey + ry * 1.15 + oy * .4, rx * 1.2, rx * .66, C.Blush, .75 * bl);
    }
    ctx.restore();
  }

  /** Where the point x, y of the current drawing lands on the canvas, in its pixels (for tests). */
  function at(ctx, x, y) { const m = ctx.getTransform(); return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]; }

  /** Where a point is, for rig.lookAt: target relative to from, normalised to -1..1 with distance reach. */
  function lookToward(fx, fy, tx, ty, reach) {
    const dx = tx - fx, dy = ty - fy, d = Math.max(1, Math.hypot(dx, dy)), k = Math.min(1, d / reach);
    return { x: dx / d * k, y: dy / d * k * .8 };
  }

  /**
   * Runs a rig on a canvas: sized to its box at the device's pixel ratio, stepped every frame while on screen (paused
   * off screen and in a hidden tab), drawn by o.draw(ctx, w, h); o.before(dt) runs first each frame (true: draw again even
   * if the rig is at rest). Returns { redraw() }.
   */
  function mount(canvas, rig, o) {
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, raf = 0, last = 0, seen = false, dirty = true;
    const size = () => {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1);
      w = r.width; h = r.height;
      const cw = Math.max(1, Math.round(w * dpr)), ch = Math.max(1, Math.round(h * dpr));
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      ctx.setTransform(cw / Math.max(1, w), 0, 0, ch / Math.max(1, h), 0, 0); dirty = true;
    };
    const paint = () => { ctx.clearRect(0, 0, w, h); o.draw(ctx, w, h); dirty = false; };
    const frame = (now) => {
      raf = 0;
      if (!seen || document.hidden) return;
      const dt = last ? clamp((now - last) / 1000, 0, .05) : 1 / 60; last = now;
      if (o.before && o.before(dt)) dirty = true;
      if (rig.step(dt) || dirty) paint();
      raf = requestAnimationFrame(frame);
    };
    const go = () => { if (!raf && seen && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };
    new ResizeObserver(() => { size(); if (!raf) paint(); }).observe(canvas);
    new IntersectionObserver(([e]) => { seen = e.isIntersecting; if (seen) go(); }, { rootMargin: "80px" }).observe(canvas);
    document.addEventListener("visibilitychange", go);
    size();
    return { redraw() { dirty = true; go(); }, get w() { return w; }, get h() { return h; } };
  }

  const api = { Rig, draw, screenAt, mount, lookToward, screenCorner, headScale, headRoom, FEELS: Object.keys(FEELS), colors: C };
  if (typeof module === "object" && module.exports) module.exports = api;   // the ad (Remotion) imports it too
  else window.Dash = api;
})();
