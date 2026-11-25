// The hero loop, the app drawer, the task player (the app while Dash works: his line, his screen in his ring) and Dash at the
// download link.
(function () {
  const LINKS = { apk: "#", source: "#" };   // fill in at launch: the release's APK, and https://github.com/AlexanderDetkov/droid once it's public
  document.getElementById("get-link").href = LINKS.apk;
  document.getElementById("source-link").href = LINKS.source;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const narrow = window.matchMedia("(max-width: 760px)").matches;
  const V = 50;
  // run while on screen
  const whileSeen = (el, on, off) => new IntersectionObserver(([e]) => (e.isIntersecting ? on() : off()), { threshold: 0.3 }).observe(el);

  // ---- hero: square on wide screens, 4:5 on narrow ones (picked once, at load); its last frame is its first
  const loop = document.getElementById("loop");
  const tall = window.matchMedia("(max-width: 700px)").matches;
  loop.poster = `media/${tall ? "loop-tall" : "loop"}.jpg?v=${V}`;
  loop.src = `media/${tall ? "loop-tall" : "loop"}.mp4?v=${V}`;
  // It plays while on screen, with reduced motion too: it's the demo, and phones with animations off (battery, taste)
  // report reduced motion. A tap on it pauses it, or plays it again (Enter or Space, focused).
  let held = false;
  const toggle = () => { held = !held; if (held) loop.pause(); else loop.play().catch(() => {}); loop.setAttribute("aria-pressed", held); };
  loop.tabIndex = 0; loop.setAttribute("role", "button"); loop.setAttribute("aria-pressed", "false");
  loop.addEventListener("click", toggle);
  loop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
  whileSeen(loop, () => { if (!held) loop.play().catch(() => {}); }, () => loop.pause());

  // ---- any app: a phone's home screen (icons: media/apps/<id>.webp)
  const NAMES = ("gmail:Gmail nike:Nike evernote:Evernote whatsapp:WhatsApp homedepot:Home_Depot hotelscom:Hotels.com instagram:Instagram " +
    "pandora:Pandora acrobat:Acrobat uber:Uber tasks:Tasks lime:Lime amazon:Amazon meet:Meet docusign:Docusign spotify:Spotify home:Home " +
    "trello:Trello chrome:Chrome hue:Hue toogoodtogo:Too_Good_To_Go discord:Discord alltrails:AllTrails mercari:Mercari doordash:DoorDash " +
    "bestbuy:Best_Buy ytmusic:YT_Music airbnb:Airbnb meetup:Meetup soundcloud:SoundCloud youtube:YouTube fandango:Fandango " +
    "myfitnesspal:MyFitnessPal slack:Slack offerup:OfferUp chipotle:Chipotle maps:Maps gchat:Chat costco:Costco messenger:Messenger " +
    "dominos:Domino's excel:Excel tiktok:TikTok delta:Fly_Delta ikea:IKEA lyft:Lyft line:LINE wechat:WeChat instacart:Instacart " +
    "todoist:Todoist ring:Ring booking:Booking.com fitbit:Fitbit tripadvisor:Tripadvisor calendar:Calendar viber:Viber transit:Transit " +
    "reddit:Reddit nextdoor:Nextdoor word:Word snapchat:Snapchat temu:Temu sephora:Sephora opentable:OpenTable kayak:KAYAK twitch:Twitch " +
    "zoom:Zoom grubhub:Grubhub dropbox:Dropbox linkedin:LinkedIn teams:Teams keep:Keep photos:Photos american:American seatgeek:SeatGeek " +
    "facebook:Facebook stubhub:StubHub goodreads:Goodreads x:X tumblr:Tumblr shazam:Shazam ubereats:Uber_Eats southwest:Southwest " +
    "letterboxd:Letterboxd etsy:Etsy rover:Rover marriott:Marriott expedia:Expedia coursera:Coursera translate:Translate " +
    "messages:Messages kindle:Kindle peloton:Peloton telegram:Telegram asana:Asana poshmark:Poshmark pinterest:Pinterest " +
    "thumbtack:Thumbtack hopper:Hopper yelp:Yelp canva:Canva pocketcasts:Pocket_Casts outlook:Outlook redfin:Redfin " +
    "citymapper:Citymapper notion:Notion audible:Audible headspace:Headspace drive:Drive taskrabbit:Taskrabbit calm:Calm signal:Signal " +
    "news:News contacts:Contacts duolingo:Duolingo threads:Threads capcut:CapCut zillow:Zillow bluesky:Bluesky onedrive:OneDrive " +
    "ebay:eBay eventbrite:Eventbrite mcdonalds:McDonald's starbucks:Starbucks sheets:Sheets docs:Docs strava:Strava walmart:Walmart " +
    "target:Target waze:Waze").split(" ").map((x) => x.split(":")).map(([id, n]) => [id, n.replace(/_/g, " ")])
    .sort((a, b) => a[1].localeCompare(b[1], "en", { sensitivity: "base" }));
  // the app drawer, as a Pixel's: every app A to Z, four to a row, each with its name; it scrolls slowly and endlessly
  // (the list twice over, so it wraps round unseen), and Dash hops about on it (scenes.js)
  const NAME = Object.fromEntries(NAMES);
  // every app we have an icon for (not the AIs in the comparison table), so the list is long; trimmed to whole rows of
  // four, so the second copy starts exactly a row below the first and the wrap can't be seen
  NAME.clock = "Clock"; NAME.splitwise = "Splitwise";
  const all = [...Object.keys(NAME)].sort((a, b) => NAME[a].localeCompare(NAME[b], "en", { sensitivity: "base" }));
  const DRAWER = all.slice(0, all.length - all.length % 4);
  const icon = (id) => `<button class="app" type="button" data-id="${id}" aria-label="${NAME[id] || id}"><b class="ic"><img src="media/apps/${id}.webp" alt="" width="48" height="48" decoding="async" fetchpriority="low"></b><span>${NAME[id] || id}</span></button>`;
  const dlist = document.getElementById("dlist");
  if (dlist) dlist.innerHTML = DRAWER.map(icon).join("") + DRAWER.map(icon).join("");

  // ---- tasks: one real run per tab, as the app shows it while Dash works. The video is his screen through the run
  // (changes at 1.5x, stillness cut short), in his ring; the lines are what the agent wrote as it went, each from the
  // moment it wrote it, said by Dash in his bubble; the grey line under it says he's working and for how long, on the run's
  // real clock ("clock": video seconds -> seconds since the request); under them, his steps as he goes, each with the app
  // he did it in ("steps", from the run's transcript: tools/task_steps.py in ../ad).
  // Dash, in his line, watches his screen: his eyes go to each tap (a ripple where it landed), he looks up at you for
  // each thing he says, his tip brightens as each app opens, and he's pleased (a nod) when it's done.
  const lineDash = document.getElementById("task-dash"), frameScreen = document.querySelector("#frame .screen");
  const rig = new Dash.Rig({ calm: reduced, feel: "WORKING" });
  Dash.mount(lineDash, rig, { draw: (ctx, w, h) => {
    const u = Math.min(w, h / 1.38), feet = h - .1 * u;   // his box, as the app's 66 x 74 dp
    Dash.draw(ctx, rig, { w, h, home: { l: w / 2 - u / 2, r: w / 2 + u / 2, b: feet + .08 * u, t: feet + .08 * u - 1.38 * u }, shadow: false });
  } });
  lineDash.addEventListener("click", () => rig.poke());
  // his eyes: on his screen (its middle), or for a moment on where it was just tapped
  let lookBack = 0;
  const lookAt = (fx, fy) => {
    const d = lineDash.getBoundingClientRect(), r = frameScreen.getBoundingClientRect();
    rig.lookAt = Dash.lookToward(d.left + d.width / 2, d.top + d.height * .5, r.left + fx * r.width, r.top + fy * r.height, 420);
  };
  const watchScreen = () => lookAt(.5, .45);
  const ripple = (fx, fy) => {
    const el = document.createElement("i"); el.className = "ripple";
    el.style.left = `${fx * 100}%`; el.style.top = `${fy * 100}%`;
    frameScreen.appendChild(el); el.addEventListener("animationend", () => el.remove());
  };
  new ResizeObserver(() => { frameScreen.style.borderRadius = `${Dash.screenCorner(frameScreen.getBoundingClientRect().width)}px`; }).observe(frameScreen);
  // his first words on each run, until the agent's own come: the same every time it's shown (the app's are fixed for a
  // turn too: firstWords, seeded by the request), from the app's set, as fits what was asked
  const FIRST = { dinner4: "On it!", ready: "Let me look.", doordash: "On it!", discord: "Let me look." };
  // what Dash says when it's done (a few words, as the app has him say them: the result itself is in the card)
  const DONE_SAYS = { dinner4: "Found a night all four of you are free!", ready: "Not quite. Here's what's left.",
    doordash: "Your dinner's ready to order!", discord: "Done! I answered the crew." };
  // what each run came back with, plainly (the run's own answer, as its video ends: nothing it didn't do; the dinner
  // got to the booking and left it for you)
  const RESULT = {
    dinner4: ["Thursday, 7:00 PM", "Saffy's, table for 4: ready for you to book.", "Jo, Priya, Sam and you are all free."],
    ready: ["Not ready yet", "No hotel Friday night.", "A dentist clash.", "The cat sitter needs an answer today."],
    doordash: ["$26.90", "Salmon avocado roll and edamame from What the Fish.", "Ready for you to pay."],
    discord: ["Posted in #trips", "Dec 11–13 or Jan 8–10, the weekends that work for you."],
  };
  const appName = (id) => NAME[id] || { messages: "Messages", calendar: "Calendar", opentable: "OpenTable", gmail: "Gmail" }[id] || id.charAt(0).toUpperCase() + id.slice(1);

  fetch(`media/tasks/tasks.json?v=${V}`).then((r) => r.json()).then((TASKS) => {
    const stage = document.getElementById("stage"), screen = frameScreen, tabs = document.getElementById("tabs");
    const video = document.getElementById("task-video"), ask = document.getElementById("task-ask"), said = document.getElementById("task-said");
    const timer = document.getElementById("task-timer"), steps = document.getElementById("task-steps"), result = document.getElementById("task-result");
    // the result card: the run's answer, then the apps he checked it in
    function card(t) {
      const [big, ...what] = RESULT[t.id] || [t.done], apps = [...new Set((t.steps || []).map((x) => x[2]))];
      const el = (tag, cls, text) => { const e = document.createElement(tag); e.className = cls; if (text) e.textContent = text; return e; };
      const inner = el("div", "in"); inner.append(el("p", "done", "Done"), el("p", "big", big), ...what.map((w) => el("p", "what", w)));
      const checked = el("p", "checked");
      for (const a of apps) { const i = document.createElement("img"); i.src = `media/apps/${a}.webp`; i.alt = appName(a); checked.append(i); }
      checked.append(el("span", "", `Checked in ${apps.length} app${apps.length === 1 ? "" : "s"}`));
      inner.append(checked);
      result.firstElementChild.replaceChildren(inner);
    }
    let cur = -1, shown = 0, seen = false, next = 0, tapped = 0, lastNow = 0, finished = false, poseTimer = 0, saidAt = -9;
    const buttons = TASKS.map((t, i) => {
      const b = document.createElement("button");
      b.className = "tab"; b.setAttribute("role", "tab");
      b.innerHTML = `<span class="ic">${t.apps.map((a) => `<img src="media/apps/${a}.webp" alt="">`).join("")}</span>${t.label}<span class="bar"></span>`;
      b.onclick = () => { if (i !== cur) show(i, true); };
      tabs.appendChild(b); return b;
    });
    const fmt = (s) => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60); return m ? `${m}m ${String(s % 60).padStart(2, "0")}s` : `${s}s`; };
    const realAt = (t, k) => {   // seconds since the request, at video time t
      for (let i = 1; i < k.length; i++) if (t <= k[i][0]) {
        const [a, x] = k[i - 1], [b, y] = k[i];
        return b > a ? x + ((t - a) / (b - a)) * (y - x) : y;
      }
      return k[k.length - 1][1];
    };
    // his words: the new ones fade in as the bubble eases to their size, so it never jumps (the app's SpeechBubble)
    let words = "";
    function say(text, animate) {
      if (text === words) return;
      words = text;
      const was = said.getBoundingClientRect();
      said.innerHTML = ""; const sp = document.createElement("span"); sp.textContent = text; said.appendChild(sp);
      if (!animate || reduced) return;
      const now = said.getBoundingClientRect();
      said.animate([{ width: `${was.width}px`, height: `${was.height}px` }, { width: `${now.width}px`, height: `${now.height}px` }],
        { duration: 320, easing: "cubic-bezier(.2,.8,.2,1)" });
      sp.animate([{ opacity: 0 }, { opacity: 0, offset: .3 }, { opacity: 1 }], { duration: 320, easing: "ease-out" });
    }
    let live = false;   // lines said as the video plays (not a reset): Dash reacts to them
    function line(n) {   // say line n (1-based); 0: his first words
      shown = n;
      say(n ? TASKS[cur].lines[n - 1][1] : FIRST[TASKS[cur].id] || "On it!", live);
      if (n && live && rig.time - saidAt > 1.6) {
        saidAt = rig.time; rig.say(); rig.lookAt = null;   // a look up at you as he says it
        clearTimeout(lookBack); lookBack = setTimeout(watchScreen, 1100);
      }
    }
    // his steps so far: the newest at the foot, lit, the rest going quiet as they rise (FLIP), the oldest fading out at
    // the top; a step in another app brightens his tip
    let stepped = 0;
    const plural = (n) => (n === 1 ? "1 step" : `${n} steps`);
    function stepTo(n) {
      const S = TASKS[cur].steps || [];
      if (n < stepped) { steps.innerHTML = ""; stepped = 0; }
      if (n === stepped) return;
      const before = live && !reduced ? new Map([...steps.children].map((li) => [li, li.getBoundingClientRect().top])) : null;
      const added = [];
      for (let k = stepped; k < n; k++) {
        const [, text, app] = S[k];
        const li = document.createElement("li"), img = document.createElement("img"), sp = document.createElement("span");
        img.src = `media/apps/${app}.webp`; img.alt = appName(app); img.width = img.height = 24; sp.textContent = text;
        li.append(img, sp); steps.appendChild(li); added.push(li);
        if (live && k > 0 && S[k - 1][2] !== app) rig.glow.v += 7;
      }
      while (steps.children.length > 14) steps.removeChild(steps.firstChild);
      [...steps.children].forEach((li, i, all) => li.classList.toggle("now", i === all.length - 1));
      stepped = n;
      if (!before) return;
      const ease = { duration: 380, easing: "cubic-bezier(.2,.7,.2,1)" };
      for (const li of steps.children) {
        const was = before.get(li);
        if (was !== undefined) li.animate([{ transform: `translateY(${was - li.getBoundingClientRect().top}px)` }, { transform: "none" }], ease);
      }
      for (const li of added) li.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], ease);
    }
    function show(i, user) {
      clearTimeout(next);
      const t = TASKS[i], firstShow = cur < 0;
      buttons.forEach((b, k) => { b.setAttribute("aria-selected", k === i); b.querySelector(".bar").style.transform = "scaleX(0)"; });
      if (user && narrow) buttons[i].scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      const swap = () => {
        cur = i;
        ask.textContent = t.ask;
        live = false; words = ""; line(0); stepTo(0); live = true;
        timer.textContent = "Getting started"; notOver();
        tapped = 0; lastNow = 0; finished = false; rig.setFeel("WORKING"); watchScreen();
        video.poster = `media/tasks/${t.id}.jpg?v=${V}`;
        video.src = `media/tasks/${t.id}.mp4?v=${V}`;
        // (it plays with reduced motion too, as the hero does: Dash himself stays calm)
        if (seen || user) video.play().catch(() => {});
        requestAnimationFrame(() => { stage.classList.remove("swap"); screen.classList.remove("swap"); });
      };
      if (firstShow) swap();
      else { stage.classList.add("swap"); screen.classList.add("swap"); setTimeout(swap, 300); }
    }
    // done: the grey line is his steps, as the app says it ("34 steps · 4m 34s")
    const over = (t) => {
      stage.classList.add("over"); timer.textContent = `Done · ${plural((t.steps || []).length)} · ${fmt(t.worked)}`;
      card(t); requestAnimationFrame(() => result.classList.add("on"));
    };
    const notOver = () => { stage.classList.remove("over"); result.classList.remove("on"); };
    // every frame while it plays: his words, the grey line, his eyes, the tab's progress bar
    const tick = () => { update(); if (!video.paused && !video.ended) requestAnimationFrame(tick); };
    video.addEventListener("play", () => requestAnimationFrame(tick));
    video.addEventListener("timeupdate", () => { if (video.paused) update(); });
    function update() {
      if (cur < 0 || !video.src.includes(TASKS[cur].id)) return;
      const t = TASKS[cur], now = video.currentTime;
      const back = now < lastNow - .2; lastNow = now;
      if (back) { live = false; tapped = 0; finished = false; }   // seeking back (controls): catch up quietly
      const fin = now >= t.doneAt;
      const n = t.lines.filter(([at]) => at <= now).length;
      if (!fin && n !== shown) line(n);
      const k = (t.steps || []).filter(([a]) => a <= now).length;
      stepTo(k);
      // each tap the agent sent: a ripple where it landed, and his eyes go to it
      const taps = t.taps || [];
      while (tapped < taps.length && taps[tapped][0] <= now) {
        const [when, x, y] = taps[tapped++];
        if (live && now - when < .5) { ripple(x, y); lookAt(x, y); clearTimeout(lookBack); lookBack = setTimeout(watchScreen, 900); }
      }
      live = true;
      // done: he celebrates (a double hop, his tip lit), then stays pleased
      if (fin && !finished) {
        finished = true; clearTimeout(lookBack); clearTimeout(poseTimer); rig.lookAt = null; say(DONE_SAYS[t.id] || t.done, true); over(t);
        if (live) { rig.setFeel("CELEBRATE"); poseTimer = setTimeout(() => rig.setFeel("HAPPY"), 2200); } else rig.setFeel("HAPPY");
      }
      if (!fin && finished) { finished = false; clearTimeout(poseTimer); notOver(); rig.setFeel("WORKING"); watchScreen(); line(n); }
      if (!fin) timer.textContent = `${k ? plural(k) : "Getting started"} · ${fmt(realAt(now, t.clock))}`;
      buttons[cur].querySelector(".bar").style.transform = `scaleX(${now / (video.duration || 1)})`;
    }
    video.addEventListener("ended", () => { next = setTimeout(() => show((cur + 1) % TASKS.length, false), 2600); });
    show(0, false);
    whileSeen(stage, () => { seen = true; if (video.paused && !video.ended) video.play().catch(() => {}); },
      () => { seen = false; video.pause(); });
  });

  // ---- Dash at the download button: he watches your pointer, gets excited when you go for the button, celebrates a
  // click, and hops when poked
  const free = document.getElementById("dash-free"), get = document.getElementById("get-link");
  const fd = new Dash.Rig({ calm: reduced, feel: "IDLE" });
  Dash.mount(free, fd, { draw: (ctx, w, h) => Dash.draw(ctx, fd, { w, h, home: { l: 0, t: 0, r: w, b: h } }) });
  let moved = 0, party = 0;
  window.addEventListener("pointermove", (e) => {
    const r = free.getBoundingClientRect();
    if (r.bottom < -200 || r.top > innerHeight + 200) return;
    fd.lookAt = Dash.lookToward(r.left + r.width / 2, r.top + r.height * .55, e.clientX, e.clientY, 260);
    clearTimeout(moved); moved = setTimeout(() => { fd.lookAt = null; }, 2500);
  }, { passive: true });
  free.addEventListener("click", () => fd.poke());
  get.addEventListener("pointerenter", () => { if (!party) fd.setFeel("EXCITED"); });
  get.addEventListener("pointerleave", () => { if (!party) fd.setFeel("IDLE"); });
  get.addEventListener("click", () => { fd.setFeel("CELEBRATE"); clearTimeout(party); party = setTimeout(() => { party = 0; fd.setFeel("HAPPY"); setTimeout(() => fd.setFeel("IDLE"), 1500); }, 2600); });
  // a hello the first time he comes into view
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); fd.setFeel("HAPPY"); setTimeout(() => { if (!party) fd.setFeel("IDLE"); }, 1600); } }, { threshold: .6 }).observe(free);

  // ---- the comparison: where it's wider than the screen it scrolls sideways; its far edge fades while there's more
  const table = document.querySelector(".compare .table");
  const more = () => table.classList.toggle("more", table.scrollLeft + table.clientWidth < table.scrollWidth - 2);
  table.addEventListener("scroll", more, { passive: true });
  addEventListener("resize", more);
  more();
})();
