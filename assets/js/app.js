/* =============================================================
   Bulleyball — UI controller: language, theme, nav, stage
   ============================================================= */
(function () {
  "use strict";

  var DICT = window.BB_I18N;
  var html = document.documentElement;
  var lang = html.getAttribute("data-lang") || "zh";
  var theme = html.getAttribute("data-theme") || "dark";

  function t(key) {
    var d = DICT[lang] || DICT.zh;
    return d[key] !== undefined ? d[key] : (DICT.zh[key] !== undefined ? DICT.zh[key] : key);
  }

  /* ---------------- language ---------------- */
  function applyLang(next) {
    lang = next;
    html.setAttribute("data-lang", lang);
    html.setAttribute("lang", lang === "zh" ? "zh-Hant" : "en");

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });
    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var bits = pair.split(":");
        if (bits.length === 2) el.setAttribute(bits[0].trim(), t(bits[1].trim()));
      });
    });

    document.title = t("meta.title");
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", t("meta.desc"));

    syncThemeLabel();
    syncPlayLabel();
    syncCaption();
    try { localStorage.setItem("bb-lang", lang); } catch (e) {}
  }

  /* ---------------- theme ---------------- */
  function applyTheme(next) {
    theme = next;
    html.setAttribute("data-theme", theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#12121f" : "#f4ecdc");
    syncThemeLabel();
    if (window.BBCourt) window.BBCourt.setTheme(theme);
    try { localStorage.setItem("bb-theme", theme); } catch (e) {}
  }

  function syncThemeLabel() {
    var label = document.querySelector("#theme-toggle .theme-label");
    /* the button advertises the mode you are currently in */
    if (label) label.textContent = theme === "dark" ? t("ui.night") : t("ui.day");
  }

  /* ---------------- stage ---------------- */
  var capKey = "stage.serve";
  function syncCaption() {
    var el = document.getElementById("stage-caption");
    if (el) { el.setAttribute("data-i18n", capKey); el.textContent = t(capKey); }
  }
  /* the court itself is the button: its label says what a tap will do,
     and data-state drives the icon (big play while paused) */
  function syncPlayLabel() {
    var btn = document.getElementById("anim-toggle");
    if (!btn || !window.BBCourt) return;
    var playing = window.BBCourt.isPlaying();
    btn.setAttribute("aria-label", playing ? t("ui.pause") : t("ui.play"));
    btn.setAttribute("aria-pressed", playing ? "false" : "true");
    btn.setAttribute("data-state", playing ? "playing" : "paused");
  }

  function bootStage() {
    var canvas = document.getElementById("court-canvas");
    if (!canvas || !window.BBCourt) return;
    var ok = window.BBCourt.mount(canvas, {
      onCaption: function (key) { capKey = "stage." + key; syncCaption(); },
      onScore: function (a, b) {
        var ea = document.getElementById("score-a"), eb = document.getElementById("score-b");
        if (ea) ea.textContent = a;
        if (eb) eb.textContent = b;
      },
      onServe: function (side) {
        var sb = document.getElementById("scoreboard");
        if (sb) sb.setAttribute("data-serve", side.toLowerCase());
      }
    });
    if (!ok) {
      var fb = document.getElementById("stage-fallback");
      if (fb) fb.hidden = false;
      canvas.style.display = "none";
      var toggle = document.getElementById("anim-toggle");
      if (toggle) toggle.hidden = true;
      return;
    }
    window.BBCourt.setTheme(theme, true);
    syncPlayLabel();
  }

  /* ---------------- rules film ----------------
     The button is a plain link to the reel, so phones (and pages without
     JS) go straight to Instagram. On a wide screen with a mouse it opens
     a lightbox instead, and only then is Instagram's embed loaded.       */
  function bootReel() {
    var cover = document.querySelector(".reel-link");
    var dlg = document.getElementById("reel-dialog");
    if (!cover || !dlg || typeof dlg.showModal !== "function") return;
    var frame = dlg.querySelector(".reel-frame");
    var resumeCourt = false;
    var wide = window.matchMedia("(min-width: 760px) and (pointer: fine)");

    cover.addEventListener("click", function (e) {
      if (!wide.matches || e.metaKey || e.ctrlKey || e.shiftKey) return;
      var m = /\/reel\/([\w-]+)/.exec(cover.getAttribute("href") || "");
      if (!m) return;
      e.preventDefault();
      var f = document.createElement("iframe");
      f.src = "https://www.instagram.com/reel/" + m[1] + "/embed/";
      f.title = t("reel.h");
      f.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture; fullscreen");
      f.setAttribute("allowfullscreen", "");
      frame.appendChild(f);
      /* one moving court at a time: hold the animation while the film plays */
      resumeCourt = !!(window.BBCourt && window.BBCourt.isPlaying());
      if (resumeCourt) { window.BBCourt.setPlaying(false); syncPlayLabel(); }
      dlg.showModal();
    });

    /* Instagram's embed reports its own height; size the frame to fit */
    window.addEventListener("message", function (e) {
      if (!/^https:\/\/www\.instagram\.com$/.test(e.origin)) return;
      var f = frame.querySelector("iframe");
      if (!f || e.source !== f.contentWindow) return;
      try {
        var d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (d && d.type === "MEASURE" && d.details && d.details.height) f.style.height = d.details.height + "px";
      } catch (err) {}
    });

    dlg.querySelector(".reel-close").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    /* dropping the iframe is what stops the video */
    dlg.addEventListener("close", function () {
      frame.innerHTML = "";
      if (resumeCourt) { window.BBCourt.setPlaying(true); syncPlayLabel(); resumeCourt = false; }
    });
  }

  /* ---------------- wiring ---------------- */
  document.addEventListener("DOMContentLoaded", function () {
    bootStage();
    applyLang(lang);
    applyTheme(theme);

    var lt = document.getElementById("lang-toggle");
    if (lt) lt.addEventListener("click", function () { applyLang(lang === "zh" ? "en" : "zh"); });

    var tt = document.getElementById("theme-toggle");
    if (tt) tt.addEventListener("click", function () { applyTheme(theme === "dark" ? "light" : "dark"); });

    var at = document.getElementById("anim-toggle");
    if (at) at.addEventListener("click", function () {
      window.BBCourt.setPlaying(!window.BBCourt.isPlaying());
      syncPlayLabel();
      /* a brief flash of the new state, as video players do */
      at.classList.remove("flash"); void at.offsetWidth; at.classList.add("flash");
    });

    var nav = document.getElementById("site-nav");
    var navBtn = document.querySelector(".nav-toggle");
    if (nav && navBtn) {
      navBtn.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        navBtn.setAttribute("aria-expanded", open ? "true" : "false");
      });
      nav.addEventListener("click", function (e) {
        if (e.target.tagName === "A") {
          nav.classList.remove("open");
          navBtn.setAttribute("aria-expanded", "false");
        }
      });
    }

    bootReel();

    var year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
  });
})();
