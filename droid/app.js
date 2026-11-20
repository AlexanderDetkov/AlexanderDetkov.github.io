// The hero loop, the app drawer, the task player (Droid's screen framed by Dash, dash.js) and Dash at the download link.
(function () {
  const LINKS = { apk: "#" };   // fill in when Droid's release page is public
  document.getElementById("get-link").href = LINKS.apk;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const narrow = window.matchMedia("(max-width: 760px)").matches;
  const V = 40;
  // run while on screen
  const whileSeen = (el, on, off) => new IntersectionObserver(([e]) => (e.isIntersecting ? on() : off()), { threshold: 0.3 }).observe(el);

  // ---- hero: square on wide screens, 4:5 on narrow ones (picked once, at load); its last frame is its first
  const loop = document.getElementById("loop");
  const tall = window.matchMedia("(max-width: 700px)").matches;
  loop.poster = `media/${tall ? "loop-tall" : "loop"}.jpg?v=${V}`;
  loop.src = `media/${tall ? "loop-tall" : "loop"}.mp4?v=${V}`;
  if (reduced) loop.controls = true;
  else whileSeen(loop, () => loop.play().catch(() => {}), () => loop.pause());

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

  // ---- tasks: one real run per tab. The video is Droid's own screen through the run (changes at 1.5x, stillness cut
  // short); the lines are what the agent wrote as it went, each from the moment it wrote it; the timer is the run's
  // real clock ("clock": video seconds -> seconds since the request).
  // Droid's screen is framed by Dash, as in the app. The frame holds still; he moves in his head (the notch on its top
  // edge): he watches the screen steadily, his eyes go to each tap, his head pops up and he looks at you for each thing
  // it says, his tip brightens as each app opens, and he's pleased (a nod) when it's done
  const frame = document.getElementById("frame"), frameScreen = frame.querySelector(".screen"), frameCanvas = frame.querySelector("canvas");
  const rig = new Dash.Rig({ calm: reduced, feel: "WATCHING" });
  rig.frame.snap(1);
  let geo = null;
  const measure = () => {
    const c = frameCanvas.getBoundingClientRect(), r = frameScreen.getBoundingClientRect();
    geo = { l: r.left - c.left, t: r.top - c.top, r: r.right - c.left, b: r.bottom - c.top };
    frameScreen.style.borderRadius = `${Dash.screenCorner(r.width)}px`;
  };
  new ResizeObserver(measure).observe(frameScreen);
  Dash.mount(frameCanvas, rig, { draw: (ctx, w, h) => {
    if (!geo) measure();
    Dash.draw(ctx, rig, { w, h, screen: geo, edge: 5,
      home: { l: geo.l, t: geo.t - 64, r: geo.l + 44, b: geo.t - 4 }, ripples: true, shadow: false });
  } });

  fetch(`media/tasks/tasks.json?v=${V}`).then((r) => r.json()).then((TASKS) => {
    const stage = document.getElementById("stage"), screen = stage.querySelector(".screen"), tabs = document.getElementById("tabs");
    const video = document.getElementById("task-video"), ask = document.getElementById("task-ask"), list = document.getElementById("task-thoughts");
    const done = document.getElementById("task-done"), timer = document.getElementById("task-timer"), used = document.getElementById("task-used");
    const MAX = narrow ? 1 : 3;   // lines kept on screen
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
    // add line n (1-based), sliding the others up (FLIP) and dropping the oldest past MAX
    function add(n) {
      const before = new Map([...list.children].map((li) => [li, li.getBoundingClientRect().top]));
      [...list.children].forEach((li) => li.classList.remove("now"));
      const li = document.createElement("li"); li.className = "now"; li.textContent = TASKS[cur].lines[n - 1][1];
      list.appendChild(li);
      while (list.children.length > MAX) list.removeChild(list.firstChild);
      const ease = { duration: 420, easing: "cubic-bezier(.2,.7,.2,1)" };
      for (const el of list.children) {
        const was = before.get(el);
        if (was !== undefined) el.animate([{ transform: `translateY(${was - el.getBoundingClientRect().top}px)` }, { transform: "none" }], ease);
      }
      li.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], ease);
      shown = n;
      if (live && rig.time - saidAt > 1.6) { saidAt = rig.time; rig.say(true); clearTimeout(poseTimer); poseTimer = setTimeout(() => rig.setFeel("WATCHING"), 900); }
    }
    let live = false;   // lines added as the video plays (not a reset): Dash reacts to them
    function reset(n) { const was = live; live = false; list.innerHTML = ""; shown = 0; for (let k = 1; k <= n; k++) add(k); live = was; }
    // the apps it has used so far, each popping in as it first opens it or reads from it
    function apps(n) {
      const have = used.children.length, list = TASKS[cur].appsAt || [];
      if (n < have) used.innerHTML = "";
      for (let k = used.children.length; k < n; k++) {
        const img = document.createElement("img"); img.src = `media/apps/${list[k][1]}.webp`; img.alt = list[k][1];
        used.appendChild(img);
        if (live && k > 0) rig.glow.v += 7;   // an app opening: his tip brightens
        img.animate([{ opacity: 0, transform: "scale(.5)" }, { opacity: 1, transform: "scale(1.12)", offset: .6 }, { opacity: 1, transform: "none" }],
          { duration: 420, easing: "cubic-bezier(.2,.7,.2,1)" });
      }
    }
    function show(i, user) {
      clearTimeout(next);
      const t = TASKS[i], first = cur < 0;
      buttons.forEach((b, k) => { b.setAttribute("aria-selected", k === i); b.querySelector(".bar").style.transform = "scaleX(0)"; });
      if (user && narrow) buttons[i].scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      const swap = () => {
        cur = i;
        ask.textContent = t.ask; done.textContent = t.done; done.classList.remove("on");
        timer.textContent = "Working"; live = false; reset(0); apps(0); live = true;
        tapped = 0; lastNow = 0; finished = false; rig.taps.length = 0; rig.setFeel("THINKING");
        video.poster = `media/tasks/${t.id}.jpg?v=${V}`;
        video.src = `media/tasks/${t.id}.mp4?v=${V}`;
        if (reduced) { video.controls = true; live = false; reset(Math.min(MAX, t.lines.length)); apps((t.appsAt || []).length); live = true; done.classList.add("on"); timer.textContent = `Worked for ${fmt(t.worked)}`; rig.setFeel("CONTENT"); finished = true; }
        else if (seen || user) video.play().catch(() => {});
        requestAnimationFrame(() => { stage.classList.remove("swap"); screen.classList.remove("swap"); });
      };
      if (first) swap();
      else { stage.classList.add("swap"); screen.classList.add("swap"); setTimeout(swap, 300); }
    }
    // every frame while it plays: the lines, the timer, the tab's progress bar
    const tick = () => { update(); if (!video.paused && !video.ended) requestAnimationFrame(tick); };
    video.addEventListener("play", () => requestAnimationFrame(tick));
    video.addEventListener("timeupdate", () => { if (video.paused) update(); });
    function update() {
      if (cur < 0 || !video.src.includes(TASKS[cur].id)) return;
      const t = TASKS[cur], now = video.currentTime;
      const back = now < lastNow - .2; lastNow = now;
      if (back) { live = false; tapped = 0; finished = false; }   // seeking back (controls): catch up quietly
      const n = t.lines.filter(([at]) => at <= now).length;
      if (n < shown) reset(n); else while (shown < n) add(shown + 1);
      apps((t.appsAt || []).filter(([at]) => at <= now).length);
      // each tap the agent sent: a ripple where it landed, and his eyes go to it
      const taps = t.taps || [];
      while (tapped < taps.length && taps[tapped][0] <= now) { const [, x, y] = taps[tapped++]; if (live && now - taps[tapped - 1][0] < .5) rig.tap(x, y, true); }
      live = true;
      const fin = now >= t.doneAt;
      if (fin && !finished) { finished = true; clearTimeout(poseTimer); rig.setFeel("CONTENT"); if (live) rig.nod(); }
      if (!fin && finished) { finished = false; rig.setFeel("WATCHING"); }
      done.classList.toggle("on", fin);
      timer.textContent = fin ? `Worked for ${fmt(t.worked)}` : `Working · ${fmt(realAt(now, t.clock))}`;
      buttons[cur].querySelector(".bar").style.transform = `scaleX(${now / (video.duration || 1)})`;
    }
    video.addEventListener("ended", () => { next = setTimeout(() => show((cur + 1) % TASKS.length, false), 2600); });
    show(0, false);
    whileSeen(stage, () => { seen = true; if (!reduced && video.paused && !video.ended) video.play().catch(() => {}); },
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
})();
