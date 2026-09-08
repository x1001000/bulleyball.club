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
  function syncPlayLabel() {
    var btn = document.getElementById("anim-toggle");
    if (!btn || !window.BBCourt) return;
    btn.textContent = window.BBCourt.isPlaying() ? t("ui.pause") : t("ui.play");
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

    var year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
  });
})();
