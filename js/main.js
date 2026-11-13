(function () {
  var doc = document.documentElement;
  doc.classList.add("js");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- smooth scrolling (Lenis, optional) ---------- */
  var lenis = null;
  if (!reduce && window.Lenis) {
    try {
      lenis = new window.Lenis({ lerp: 0.12 });
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    } catch (e) { lenis = null; }
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (ev) {
      var id = a.getAttribute("href");
      var target = id.length > 1 ? document.querySelector(id) : document.body;
      if (!target || !lenis) return;
      ev.preventDefault();
      lenis.scrollTo(id === "#top" ? 0 : target, { offset: -84 });
    });
  });

  /* ---------- mobile menu ---------- */
  var header = document.querySelector(".site-header");
  var btn = document.querySelector(".menu-btn");
  if (header && btn) {
    btn.addEventListener("click", function () {
      var open = header.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$(".main-nav a", header).forEach(function (a) {
      a.addEventListener("click", function () {
        header.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- the one scroll-lit paragraph ---------- */
  var lits = $$(".lit").map(function (el) {
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            var s = document.createElement("span");
            s.className = "lw" + (reduce ? " on" : "");
            s.textContent = part;
            frag.appendChild(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) { walk(n); }
      });
    })(el);
    return { el: el, words: $$(".lw", el) };
  });

  /* ---------- reveal on scroll: one quiet fade per block ---------- */
  $$("[data-split]").forEach(function (el) { el.setAttribute("data-reveal", ""); });
  $$("[data-stagger]").forEach(function (group) {
    Array.prototype.slice.call(group.children).forEach(function (child, i) {
      child.setAttribute("data-reveal", "");
      child.style.setProperty("--d", Math.min(i, 5));
    });
  });
  // once an element has animated in, drop the attribute so the reveal
  // transition can't interfere with hover effects
  function settle(el) {
    var d = parseFloat(el.style.getPropertyValue("--d")) || 0;
    setTimeout(function () { el.removeAttribute("data-reveal"); }, 1000 + d * 70);
  }
  var revealables = $$("[data-reveal]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); settle(e.target); }
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- logo marquee: duplicate the set for a seamless loop ---------- */
  $$(".track").forEach(function (track) {
    var set = track.querySelector(".set");
    if (!set) return;
    var clone = set.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);
  });

  /* ---------- count-up numbers ---------- */
  function runCount(el) {
    var raw = el.getAttribute("data-count");
    var to = parseFloat(raw);
    var pre = el.getAttribute("data-prefix") || "";
    var suf = el.getAttribute("data-suffix") || "";
    var dec = (raw.split(".")[1] || "").length;
    var fmt = function (v) { return pre + v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf; };
    if (reduce) { el.textContent = fmt(to); return; }
    var t0 = null;
    var step = function (t) {
      if (t0 === null) t0 = t;
      var p = clamp((t - t0) / 1100, 0, 1);
      el.textContent = fmt(to * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { runCount(e.target); cio.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    $$("[data-count]").forEach(function (el) { cio.observe(el); });
  }

  /* ---------- hero dot grid: faint, lights up near the cursor ---------- */
  var canvas = document.querySelector(".hero canvas");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, gap = 36, mx = -9999, my = -9999, visible = true, running = false;
    var size = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    var draw = function () {
      ctx.clearRect(0, 0, W, H);
      var ox = (W % gap) / 2, R = 190;
      for (var y = gap / 2; y < H; y += gap) {
        for (var x = ox; x < W; x += gap) {
          var dx = x - mx, dy = y - my, d = Math.sqrt(dx * dx + dy * dy);
          var k = d < R ? 1 - d / R : 0;
          ctx.globalAlpha = 0.11 + k * 0.6;
          ctx.fillStyle = k > 0.05 ? "#4fc9e6" : "#ffffff";
          ctx.beginPath();
          ctx.arc(x, y, 1 + k * 1.2, 0, 6.2832);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };
    var loop = function () {
      if (!visible) { running = false; return; }
      draw();
      requestAnimationFrame(loop);
    };
    var start = function () { if (!running && !reduce) { running = true; requestAnimationFrame(loop); } };
    size();
    window.addEventListener("resize", function () { size(); draw(); });
    var hero = canvas.parentElement;
    hero.addEventListener("pointermove", function (ev) {
      var r = canvas.getBoundingClientRect();
      mx = ev.clientX - r.left; my = ev.clientY - r.top;
    });
    hero.addEventListener("pointerleave", function () { mx = my = -9999; });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible) start();
      }).observe(hero);
    }
    draw();
    start();
  }

  /* ---------- hero workflow: step through nodes and the run log ---------- */
  var log = document.querySelector(".flow-log");
  if (log) {
    var lines = $$(".ln", log);
    var nodes = $$(".flow-card .node");
    var show = function (n) {
      lines.forEach(function (l, i) { l.classList.toggle("on", i <= n); });
      nodes.forEach(function (nd) { nd.classList.toggle("on", Number(nd.getAttribute("data-step")) <= n); });
    };
    if (reduce) {
      show(lines.length - 1);
    } else {
      var i = -2;
      setInterval(function () {
        i += 1;
        if (i > lines.length + 2) i = -1; // hold the finished run, then restart
        show(Math.min(i, lines.length - 1));
      }, 1100);
    }
  }

  /* ---------- scroll-linked effects ---------- */
  var device = document.querySelector(".device");
  var stack = $$(".stack-card");
  var timelines = $$(".timeline").map(function (tl) { return { el: tl, steps: $$(".tl-step", tl) }; });
  var parallax = $$("[data-parallax]");
  var ticking = false;

  function update() {
    ticking = false;
    var vh = window.innerHeight;

    if (device && !reduce) {
      var r0 = device.getBoundingClientRect();
      var p0 = clamp((vh - r0.top) / (vh * 0.7), 0, 1);
      device.style.setProperty("--rx", (16 * (1 - p0)).toFixed(2) + "deg");
      device.style.setProperty("--sc", (0.94 + 0.06 * p0).toFixed(4));
    }

    if (!reduce) {
      lits.forEach(function (l) {
        var r = l.el.getBoundingClientRect();
        var p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.3), 0, 1);
        var n = Math.round(p * l.words.length);
        l.words.forEach(function (w, i) { w.classList.toggle("on", i < n); });
      });

      stack.forEach(function (card, i) {
        var inner = card.firstElementChild;
        var next = stack[i + 1];
        if (!next || !inner) return;
        var r = card.getBoundingClientRect();
        var n = next.getBoundingClientRect();
        var p = clamp(1 - (n.top - r.top) / r.height, 0, 1);
        inner.style.transform = "scale(" + (1 - p * 0.05).toFixed(4) + ")";
        inner.style.filter = p > 0.01 ? "brightness(" + (1 - p * 0.35).toFixed(3) + ")" : "";
      });

      parallax.forEach(function (el) {
        var host = el.closest("[data-parallax-host]") || el.parentElement;
        var r = host.getBoundingClientRect();
        var off = (r.top + r.height / 2 - vh / 2) * parseFloat(el.getAttribute("data-parallax"));
        el.style.setProperty("--py", off.toFixed(1) + "px");
      });
    }

    timelines.forEach(function (t) {
      var r = t.el.getBoundingClientRect();
      var line = vh * 0.62;
      var p = reduce ? 1 : clamp((line - r.top) / r.height, 0, 1);
      t.el.style.setProperty("--p", p.toFixed(4));
      t.steps.forEach(function (s) {
        s.classList.toggle("on", reduce || s.getBoundingClientRect().top + 16 < line);
      });
    });
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);
  if (lenis) lenis.on("scroll", request);
  update();

  /* ---------- footer year ---------- */
  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();
})();
