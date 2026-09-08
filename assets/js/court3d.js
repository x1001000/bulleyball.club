/* =============================================================
   Bulleyball — pixel 3D court
   A tiny software renderer: perspective projection + near-plane
   clipping + painter's algorithm, drawn into a 384x216 canvas
   that CSS upscales with image-rendering: pixelated.
   No dependencies.
   ============================================================= */
(function () {
  "use strict";

  var W = 384, H = 216;
  var NEAR = 0.2;
  var FOV = 42 * Math.PI / 180;
  var FOCAL = 1 / Math.tan(FOV / 2);

  /* ---------- palettes ---------- */
  var DAY = {
    skyTop: [86, 168, 236], skyBot: [201, 236, 252],
    orb: [255, 246, 198], orbGlow: [255, 236, 150],
    ground: [124, 166, 92], groundAlt: [110, 152, 82],
    court: [198, 98, 58], zone: [150, 60, 36], line: [250, 248, 242],
    net: [246, 246, 246], post: [78, 78, 92],
    lamp: [120, 120, 132],
    teamA: [239, 95, 36], teamB: [47, 127, 214],
    skin: [242, 200, 158], hair: [46, 36, 42], shoe: [40, 38, 48],
    ball: [255, 208, 66], ballDark: [214, 132, 38],
    bldg: [152, 150, 168], win: [206, 224, 244],
    tree: [64, 122, 72], trunk: [92, 64, 46],
    light: [-0.42, 0.82, 0.38], amb: 0.58, dif: 0.46,
    shadow: 0.30, stars: 0, glow: 0
  };
  var NIGHT = {
    skyTop: [8, 10, 30], skyBot: [34, 40, 92],
    orb: [232, 236, 255], orbGlow: [150, 165, 230],
    ground: [34, 46, 70], groundAlt: [29, 40, 62],
    court: [110, 62, 56], zone: [66, 34, 36], line: [226, 224, 240],
    net: [206, 208, 226], post: [40, 42, 62],
    lamp: [255, 236, 168],
    teamA: [255, 122, 53], teamB: [95, 162, 255],
    skin: [214, 172, 138], hair: [30, 24, 34], shoe: [28, 28, 40],
    ball: [255, 214, 106], ballDark: [196, 132, 52],
    bldg: [30, 34, 58], win: [255, 214, 120],
    tree: [26, 52, 46], trunk: [46, 36, 34],
    light: [0.0, 0.95, 0.25], amb: 0.42, dif: 0.42,
    shadow: 0.44, stars: 1, glow: 1
  };

  /* ---------- small math ---------- */
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function mixArr(a, b, t) {
    var o = new Array(a.length);
    for (var i = 0; i < a.length; i++) o[i] = lerp(a[i], b[i], t);
    return o;
  }
  function mixPalette(a, b, t) {
    var o = {};
    for (var k in a) o[k] = Array.isArray(a[k]) ? mixArr(a[k], b[k], t) : lerp(a[k], b[k], t);
    return o;
  }

  /* ---------- scene constants (metres) ---------- */
  var COURT_X = 9, COURT_Z = 4.5, ZONE = 3;
  var NET_TOP = 2.43, NET_BOT = 1.43;

  function Stage(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.opts = opts || {};
    this.prims = [];
    this.pal = NIGHT;
    this.from = NIGHT; this.to = NIGHT; this.mix = 1;
    this.time = 0;
    this.playing = true;
    this.rally = 0;
    this.score = [0, 0];
    this.node = -1;
    this.scenery = this.buildScenery();
    this.ctx.imageSmoothingEnabled = false;
  }

  /* -------------------------------------------------- scenery */
  Stage.prototype.buildScenery = function () {
    var rnd = mulberry32(20260908);
    var b = [], i, j;
    for (i = 0; i < 11; i++) {
      var bw = 3 + rnd() * 4.5;
      var bh = 4 + rnd() * 12;
      var bx = -34 + i * 6.4 + rnd() * 1.6;
      var wins = [];
      var cols = Math.max(1, Math.floor(bw / 1.5));
      var rows = Math.max(1, Math.floor(bh / 2.2));
      for (j = 0; j < cols * rows; j++) {
        if (rnd() < 0.55) continue;
        var c = j % cols, r = (j / cols) | 0;
        wins.push([bx - bw / 2 + 0.55 + c * (bw / cols), 1.4 + r * 2.2]);
      }
      b.push({ x: bx, w: bw, h: bh, d: 3 + rnd() * 3, z: -30 - rnd() * 6, wins: wins });
    }
    var t = [];
    for (i = 0; i < 9; i++) {
      t.push({ x: -26 + i * 6.6 + rnd() * 2.4, z: -17 - rnd() * 4, h: 2.4 + rnd() * 1.8 });
    }
    var s = [];
    for (i = 0; i < 90; i++) s.push([rnd() * W, rnd() * H * 0.62, rnd()]);
    var c = [];
    for (i = 0; i < 7; i++) c.push([rnd() * 1.2 - 0.1, rnd() * 0.28 + 0.04, 0.5 + rnd() * 0.9]);
    return { buildings: b, trees: t, stars: s, clouds: c };
  };

  /* -------------------------------------------------- camera */
  Stage.prototype.setCamera = function (eye, target) {
    var fx = target[0] - eye[0], fy = target[1] - eye[1], fz = target[2] - eye[2];
    var fl = Math.hypot(fx, fy, fz) || 1; fx /= fl; fy /= fl; fz /= fl;
    /* right = normalize(forward x worldUp), worldUp = (0,1,0) */
    var rx = -fz, ry = 0, rz = fx;
    var rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
    /* up = right x forward */
    var ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
    this.cam = { e: eye, f: [fx, fy, fz], r: [rx, ry, rz], u: [ux, uy, uz] };
  };

  Stage.prototype.view = function (p) {
    var c = this.cam;
    var dx = p[0] - c.e[0], dy = p[1] - c.e[1], dz = p[2] - c.e[2];
    return {
      x: dx * c.r[0] + dy * c.r[1] + dz * c.r[2],
      y: dx * c.u[0] + dy * c.u[1] + dz * c.u[2],
      z: dx * c.f[0] + dy * c.f[1] + dz * c.f[2]
    };
  };

  function projectView(v) {
    var s = FOCAL * (H / 2) / v.z;
    return [W / 2 + v.x * s, H / 2 - v.y * s];
  }

  /* clip a view-space polygon against z >= NEAR (Sutherland-Hodgman) */
  function clipNear(poly) {
    var out = [], n = poly.length, i, a, b, t;
    for (i = 0; i < n; i++) {
      a = poly[i]; b = poly[(i + 1) % n];
      var ain = a.z >= NEAR, bin = b.z >= NEAR;
      if (ain) out.push(a);
      if (ain !== bin) {
        t = (NEAR - a.z) / (b.z - a.z);
        out.push({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: NEAR });
      }
    }
    return out;
  }

  /* -------------------------------------------------- primitives */
  Stage.prototype.poly = function (pts, color, shade, layer, alpha) {
    var v = [], i, zsum = 0;
    for (i = 0; i < pts.length; i++) v.push(this.view(pts[i]));
    var c = clipNear(v);
    if (c.length < 3) return;
    var scr = [];
    for (i = 0; i < c.length; i++) { scr.push(projectView(c[i])); zsum += c[i].z; }
    this.prims.push({ s: scr, d: zsum / c.length, c: color, k: shade, l: layer, a: alpha });
  };

  Stage.prototype.quad = function (a, b, c, d, color, shade, layer, alpha) {
    this.poly([a, b, c, d], color, shade, layer, alpha);
  };

  Stage.prototype.sprite = function (p, radius, color, dark) {
    var v = this.view(p);
    if (v.z < NEAR) return;
    var s = projectView(v);
    var r = FOCAL * (H / 2) * radius / v.z;
    this.prims.push({ ball: s, r: r, d: v.z, c: color, c2: dark, l: 10, k: 1 });
  };

  /* flat ground-level rectangle given centre + half sizes on x/z */
  Stage.prototype.rect = function (x0, x1, z0, z1, y, color, shade, layer, alpha) {
    this.quad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], color, shade, layer, alpha);
  };

  /* rotate local point: pitch about X, then yaw about Y */
  function rotate(p, yaw, pitch) {
    var y = p[1] * Math.cos(pitch) + p[2] * Math.sin(pitch);
    var z = -p[1] * Math.sin(pitch) + p[2] * Math.cos(pitch);
    var x = p[0];
    return [x * Math.cos(yaw) + z * Math.sin(yaw), y, -x * Math.sin(yaw) + z * Math.cos(yaw)];
  }

  var BOX_FACES = [
    [[0, 1, 0], [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]]],
    [[0, -1, 0], [[-1, -1, 1], [1, -1, 1], [1, -1, -1], [-1, -1, -1]]],
    [[0, 0, 1], [[-1, -1, 1], [-1, 1, 1], [1, 1, 1], [1, -1, 1]]],
    [[0, 0, -1], [[1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, -1]]],
    [[1, 0, 0], [[1, -1, 1], [1, 1, 1], [1, 1, -1], [1, -1, -1]]],
    [[-1, 0, 0], [[-1, -1, -1], [-1, 1, -1], [-1, 1, 1], [-1, -1, 1]]]
  ];

  Stage.prototype.shadeOf = function (n) {
    var L = this.pal.light;
    var d = n[0] * L[0] + n[1] * L[1] + n[2] * L[2];
    return this.pal.amb + this.pal.dif * Math.max(0, d);
  };

  Stage.prototype.box = function (c, s, yaw, pitch, color, layer, emissive) {
    var hx = s[0] / 2, hy = s[1] / 2, hz = s[2] / 2, i, j;
    for (i = 0; i < BOX_FACES.length; i++) {
      var f = BOX_FACES[i];
      var n = rotate(f[0], yaw, pitch);
      var pts = [];
      for (j = 0; j < 4; j++) {
        var v = f[1][j];
        var p = rotate([v[0] * hx, v[1] * hy, v[2] * hz], yaw, pitch);
        pts.push([c[0] + p[0], c[1] + p[1], c[2] + p[2]]);
      }
      this.poly(pts, color, emissive ? 1.25 : this.shadeOf(n), layer);
    }
  };

  /* -------------------------------------------------- rally script
     Six a side, standard positions. The point is won on the one rule
     that makes this Bulleyball: A2's spike is blocked, the ball drops
     inside Team B's 3 m front zone, and because it came off a block it
     counts instead of being called out.                              */
  var LOOP = 12.4;
  var NODES = [
    { t: 0.00, p: [-9.80, 2.15,  0.00], act: "A5", cap: "serve", arc: 0.0 },
    { t: 1.80, p: [ 6.60, 0.85, -2.60], act: "B4", cap: "dig",   arc: 3.2 },
    { t: 3.00, p: [ 2.40, 2.35,  0.50], act: "B1", cap: "set",   arc: 3.2 },
    { t: 4.30, p: [ 1.20, 3.20, -2.50], act: "B2", cap: "spike", arc: 1.4 },
    { t: 5.20, p: [-5.80, 0.70,  2.40], act: "A4", cap: "dig",   arc: 0.25 },
    { t: 6.40, p: [-2.40, 2.35, -0.50], act: "A1", cap: "set",   arc: 3.0 },
    { t: 7.50, p: [-1.20, 3.25,  2.60], act: "A2", cap: "spike", arc: 1.4 },
    { t: 7.95, p: [ 0.35, 3.15,  2.50], act: "B1", cap: "block", arc: 0.2 },
    { t: 9.00, p: [ 2.40, 0.11,  2.10], act: null, cap: "point", arc: 0.9 },
    { t: 9.50, p: [ 2.90, 0.11,  2.00], act: null, cap: "point", arc: 0.25 },
    { t: 10.0, p: [ 3.15, 0.11,  1.95], act: null, cap: "point", arc: 0.1 }
  ];

  /* per-player movement keyframes: [t, x, z, jumpHeight]
     A1/B1 setter (right pin) · A2/B2 outside hitter · A3/B3 middle blocker
     A4-A6 / B4-B6 back row (A5 serves)                                  */
  var KEYS = {
    A1: [[0.0, -2.7, -2.9, 0], [3.6, -1.1, -2.7, 0], [4.3, -0.55, -2.5, 0.72],
         [5.3, -1.6, -2.4, 0], [6.4, -2.4, -0.5, 0], [7.6, -3.0, -1.3, 0],
         [10.8, -2.7, -2.9, 0]],
    A2: [[0.0, -2.7, 3.0, 0], [4.3, -3.3, 3.2, 0], [6.5, -3.8, 3.5, 0],
         [7.5, -1.2, 2.6, 0.92], [8.5, -2.3, 2.9, 0], [10.8, -2.7, 3.0, 0]],
    A3: [[0.0, -2.7, 0.0, 0], [3.8, -1.0, -1.4, 0], [4.3, -0.55, -1.3, 0.68],
         [5.4, -1.8, -0.7, 0], [7.5, -2.0, 1.1, 0], [10.8, -2.7, 0.0, 0]],
    A4: [[0.0, -7.2, 3.0, 0], [4.3, -6.4, 2.8, 0], [5.2, -5.8, 2.4, 0],
         [6.6, -6.6, 2.8, 0], [10.8, -7.2, 3.0, 0]],
    A5: [[0.0, -9.8, 0.0, 0.35], [2.0, -7.4, 0.3, 0], [4.3, -6.7, -0.4, 0],
         [7.5, -6.2, 0.4, 0], [10.8, -7.2, 0.0, 0]],
    A6: [[0.0, -7.2, -3.0, 0], [4.3, -6.2, -2.6, 0], [6.2, -6.8, -2.2, 0],
         [10.8, -7.2, -3.0, 0]],
    B1: [[0.0, 2.7, 2.9, 0], [2.0, 2.6, 2.2, 0], [3.0, 2.4, 0.5, 0],
         [4.6, 2.6, 1.8, 0], [7.4, 0.7, 2.5, 0], [7.95, 0.5, 2.5, 0.75],
         [8.9, 1.5, 2.6, 0], [10.8, 2.7, 2.9, 0]],
    B2: [[0.0, 2.7, -3.0, 0], [2.6, 3.5, -3.3, 0], [4.3, 1.2, -2.5, 0.92],
         [5.3, 2.4, -2.9, 0], [7.7, 1.9, -1.5, 0], [10.8, 2.7, -3.0, 0]],
    B3: [[0.0, 2.7, 0.0, 0], [3.2, 2.4, -0.9, 0], [7.5, 0.9, 1.3, 0],
         [7.95, 0.6, 1.25, 0.7], [8.9, 1.7, 0.8, 0], [10.8, 2.7, 0.0, 0]],
    B4: [[0.0, 7.2, -3.0, 0], [1.8, 6.6, -2.6, 0], [3.4, 7.0, -2.9, 0],
         [7.9, 6.2, -2.4, 0], [10.8, 7.2, -3.0, 0]],
    B5: [[0.0, 7.2, 0.0, 0], [2.2, 6.6, 0.4, 0], [7.9, 6.0, 0.6, 0],
         [10.8, 7.2, 0.0, 0]],
    B6: [[0.0, 7.2, 3.0, 0], [2.4, 6.6, 2.6, 0], [7.9, 6.2, 2.6, 0],
         [10.8, 7.2, 3.0, 0]]
  };
  var IDS = ["A1", "A2", "A3", "A4", "A5", "A6", "B1", "B2", "B3", "B4", "B5", "B6"];
  function team(id) { return id.charAt(0); }

  function ballAt(t) {
    var i, n = NODES.length;
    if (t <= NODES[0].t) return NODES[0].p.slice();
    for (i = 0; i < n - 1; i++) {
      var a = NODES[i], b = NODES[i + 1];
      if (t >= a.t && t <= b.t) {
        var u = (t - a.t) / (b.t - a.t);
        var arc = b.arc;
        return [
          lerp(a.p[0], b.p[0], u),
          lerp(a.p[1], b.p[1], u) + arc * 4 * u * (1 - u),
          lerp(a.p[2], b.p[2], u)
        ];
      }
    }
    return NODES[n - 1].p.slice();
  }

  function playerAt(id, t) {
    var k = KEYS[id], i;
    if (t <= k[0][0]) return { x: k[0][1], z: k[0][2], v: 0 };
    for (i = 0; i < k.length - 1; i++) {
      if (t >= k[i][0] && t <= k[i + 1][0]) {
        var a = k[i], b = k[i + 1];
        var u = smooth((t - a[0]) / (b[0] - a[0]));
        var dist = Math.hypot(b[1] - a[1], b[2] - a[2]);
        return { x: lerp(a[1], b[1], u), z: lerp(a[2], b[2], u), v: dist / (b[0] - a[0]) };
      }
    }
    var last = k[k.length - 1];
    return { x: last[1], z: last[2], v: 0 };
  }

  function jumpAt(id, t) {
    var k = KEYS[id], i, y = 0;
    for (i = 0; i < k.length; i++) {
      if (!k[i][3]) continue;
      var u = (t - (k[i][0] - 0.44)) / 0.78;
      if (u > 0 && u < 1) y = Math.max(y, k[i][3] * Math.sin(Math.PI * u));
    }
    return y;
  }

  /* arm pitch: 0 = hanging down, PI/2 = forward, PI = straight up */
  function armAt(id, t) {
    var i, best = 0.22;
    for (i = 0; i < NODES.length; i++) {
      var nd = NODES[i];
      if (nd.act !== id) continue;
      var d = t - nd.t;
      if (d < -0.65 || d > 0.55) continue;
      var a;
      if (nd.cap === "spike" || nd.cap === "serve") {
        a = d < 0 ? lerp(0.9, 2.95, clamp((d + 0.65) / 0.65, 0, 1))
                  : lerp(2.95, 0.85, clamp(d / 0.55, 0, 1));
      } else if (nd.cap === "block") {
        a = 3.05;
      } else if (nd.cap === "set") {
        a = 2.5;
      } else {
        a = 1.5; /* dig */
      }
      var w = 1 - Math.abs(d) / 0.65;
      best = lerp(best, a, clamp(w * 1.4, 0, 1));
    }
    return best;
  }

  /* -------------------------------------------------- drawing the world */
  Stage.prototype.drawSky = function (ctx, p) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgb(p.skyTop));
    g.addColorStop(1, rgb(p.skyBot));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    var i, s;
    if (p.stars > 0.02) {
      for (i = 0; i < this.scenery.stars.length; i++) {
        s = this.scenery.stars[i];
        var tw = 0.55 + 0.45 * Math.sin(this.time * 1.6 + s[2] * 21);
        ctx.fillStyle = "rgba(255,255,255," + (p.stars * tw * (0.35 + s[2] * 0.5)).toFixed(3) + ")";
        ctx.fillRect(s[0] | 0, s[1] | 0, 1, 1);
      }
    }
    /* sun / moon */
    var ox = W * 0.78, oy = H * 0.19, r = 11;
    ctx.fillStyle = "rgba(" + p.orbGlow.map(Math.round).join(",") + ",0.28)";
    ctx.beginPath(); ctx.arc(ox, oy, r + 6, 0, 7); ctx.fill();
    ctx.fillStyle = rgb(p.orb);
    ctx.beginPath(); ctx.arc(ox, oy, r, 0, 7); ctx.fill();
    if (p.stars > 0.5) { /* moon bite */
      ctx.fillStyle = rgb(mixArr(p.skyTop, p.skyBot, 0.25));
      ctx.beginPath(); ctx.arc(ox + 5.5, oy - 3.5, r * 0.92, 0, 7); ctx.fill();
    }
    if (p.stars < 0.6) { /* daytime clouds */
      for (i = 0; i < this.scenery.clouds.length; i++) {
        var c = this.scenery.clouds[i];
        var cx = ((c[0] * W + this.time * 3.4 * c[2]) % (W + 90)) - 45;
        var cy = c[1] * H;
        ctx.fillStyle = "rgba(255,255,255," + ((1 - p.stars) * 0.75).toFixed(2) + ")";
        ctx.fillRect(cx | 0, cy | 0, 22, 5);
        ctx.fillRect((cx + 6) | 0, (cy - 4) | 0, 13, 5);
        ctx.fillRect((cx + 14) | 0, (cy + 3) | 0, 16, 4);
      }
    }
  };

  Stage.prototype.buildWorld = function () {
    var p = this.pal, i, j, t = this.time;

    /* --- ground (LAYER_GROUND) --- */
    this.rect(-48, 48, -46, 26, 0, p.ground, 1.0, 0);
    for (i = 0; i < 9; i++) {
      this.rect(-48 + i * 11, -42 + i * 11, -46, 26, 0.004, p.groundAlt, 1.0, 1, 0.35);
    }

    /* --- court surface + zones + lines (one layer each: painter-safe) --- */
    this.rect(-COURT_X - 1.4, COURT_X + 1.4, -COURT_Z - 1.4, COURT_Z + 1.4, 0.01, p.court, 0.92, 2);
    this.rect(-COURT_X, COURT_X, -COURT_Z, COURT_Z, 0.02, p.court, 1.0, 3);
    this.rect(-ZONE, 0, -COURT_Z, COURT_Z, 0.03, p.zone, 1.0, 4);
    this.rect(0, ZONE, -COURT_Z, COURT_Z, 0.03, p.zone, 1.0, 4);

    var lw = 0.07;
    var L = [
      [-COURT_X - lw, COURT_X + lw, -COURT_Z - lw, -COURT_Z + lw],
      [-COURT_X - lw, COURT_X + lw, COURT_Z - lw, COURT_Z + lw],
      [-COURT_X - lw, -COURT_X + lw, -COURT_Z, COURT_Z],
      [COURT_X - lw, COURT_X + lw, -COURT_Z, COURT_Z],
      [-ZONE - lw, -ZONE + lw, -COURT_Z, COURT_Z],
      [ZONE - lw, ZONE + lw, -COURT_Z, COURT_Z],
      [-lw, lw, -COURT_Z, COURT_Z]
    ];
    for (i = 0; i < L.length; i++) this.rect(L[i][0], L[i][1], L[i][2], L[i][3], 0.04, p.line, 1.0, 5);

    /* --- distant scenery --- */
    for (i = 0; i < this.scenery.buildings.length; i++) {
      var b = this.scenery.buildings[i];
      this.box([b.x, b.h / 2, b.z], [b.w, b.h, b.d], 0, 0, p.bldg, 10);
      for (j = 0; j < b.wins.length; j++) {
        var wn = b.wins[j];
        if (wn[1] > b.h - 1) continue;
        this.quad([wn[0], wn[1], b.z + b.d / 2 + 0.02], [wn[0] + 0.7, wn[1], b.z + b.d / 2 + 0.02],
                  [wn[0] + 0.7, wn[1] + 1.1, b.z + b.d / 2 + 0.02], [wn[0], wn[1] + 1.1, b.z + b.d / 2 + 0.02],
                  p.win, p.stars > 0.5 ? 1.2 : 0.75, 10);
      }
    }
    for (i = 0; i < this.scenery.trees.length; i++) {
      var tr = this.scenery.trees[i];
      this.box([tr.x, tr.h * 0.32, tr.z], [0.34, tr.h * 0.64, 0.34], 0, 0, p.trunk, 10);
      this.box([tr.x, tr.h * 0.8, tr.z], [1.9, 1.5, 1.9], 0, 0, p.tree, 10);
      this.box([tr.x, tr.h * 1.22, tr.z], [1.2, 1.0, 1.2], 0, 0, p.tree, 10);
    }

    /* --- floodlight masts --- */
    var masts = [[-11.5, -7.5], [-11.5, 7.5], [11.5, -7.5], [11.5, 7.5]];
    this.lamps = [];
    for (i = 0; i < masts.length; i++) {
      var m = masts[i];
      this.box([m[0], 4.1, m[1]], [0.28, 8.2, 0.28], 0, 0, p.post, 10);
      this.box([m[0], 8.5, m[1]], [1.5, 0.55, 0.8], 0, 0, p.lamp, 10, p.stars > 0.35);
      this.lamps.push([m[0], 8.4, m[1]]);
    }

    /* --- courtside bench and referee stand --- */
    var bx = -7.2, bz = -8.8;
    this.box([bx, 0.44, bz], [4.2, 0.12, 0.5], 0, 0, p.trunk, 10);
    this.box([bx, 0.72, bz - 0.26], [4.2, 0.46, 0.1], 0, 0, p.trunk, 10);
    for (i = 0; i < 4; i++) {
      this.box([bx + (i < 2 ? -1.85 : 1.85), 0.22, bz + (i % 2 ? 0.18 : -0.18)],
        [0.1, 0.44, 0.1], 0, 0, p.post, 10);
    }
    this.box([bx + 2.7, 0.2, bz + 0.5], [0.62, 0.4, 0.4], 0, 0, p.teamA, 10);
    this.box([0, 1.15, -COURT_Z - 1.3], [0.46, 2.3, 0.46], 0, 0, p.post, 10);
    this.box([0, 2.36, -COURT_Z - 1.3], [0.95, 0.12, 0.95], 0, 0, p.trunk, 10);

    /* --- net --- */
    this.box([0, 1.35, -COURT_Z - 0.55], [0.16, 2.7, 0.16], 0, 0, p.post, 10);
    this.box([0, 1.35, COURT_Z + 0.55], [0.16, 2.7, 0.16], 0, 0, p.post, 10);
    this.quad([0, NET_TOP, -COURT_Z - 0.5], [0, NET_TOP, COURT_Z + 0.5],
              [0, NET_TOP - 0.11, COURT_Z + 0.5], [0, NET_TOP - 0.11, -COURT_Z - 0.5], p.net, 1.05, 10);
    for (i = 0; i <= 22; i++) {
      var z = -COURT_Z - 0.5 + i * ((COURT_Z + 0.5) * 2 / 22);
      this.quad([0, NET_TOP - 0.11, z], [0, NET_TOP - 0.11, z + 0.035],
                [0, NET_BOT, z + 0.035], [0, NET_BOT, z], p.net, 1.0, 10, 0.5);
    }
    for (i = 0; i <= 4; i++) {
      var yy = NET_BOT + i * (NET_TOP - 0.11 - NET_BOT) / 4;
      this.quad([0, yy, -COURT_Z - 0.5], [0, yy, COURT_Z + 0.5],
                [0, yy - 0.035, COURT_Z + 0.5], [0, yy - 0.035, -COURT_Z - 0.5], p.net, 1.0, 10, 0.5);
    }
    /* antennae */
    this.box([0, NET_TOP + 0.35, -COURT_Z], [0.06, 1.6, 0.06], 0, 0, [240, 60, 60], 10, true);
    this.box([0, NET_TOP + 0.35, COURT_Z], [0.06, 1.6, 0.06], 0, 0, [240, 60, 60], 10, true);

    /* --- players --- */
    var ball = ballAt(t);
    for (i = 0; i < IDS.length; i++) this.drawPlayer(IDS[i], t, ball);

    /* --- ball + shadow --- */
    this.rect(ball[0] - 0.18, ball[0] + 0.18, ball[2] - 0.18, ball[2] + 0.18, 0.05,
      mixArr(p.court, [0, 0, 0], p.shadow), 1.0, 6, clamp(1 - ball[1] / 6, 0.15, 0.75));
    this.sprite(ball, 0.30, p.ball, p.ballDark);
  };

  Stage.prototype.drawPlayer = function (id, t, ball) {
    var p = this.pal, i;
    var pos = playerAt(id, t);
    var jy = jumpAt(id, t);
    var arm = armAt(id, t);
    var col = team(id) === "A" ? p.teamA : p.teamB;
    var yaw = Math.atan2(ball[0] - pos.x, ball[2] - pos.z);
    var speed = clamp(pos.v, 0, 3.4);
    var step = Math.sin(t * 9 + id.charCodeAt(1)) * speed * 0.10;
    var y0 = jy + Math.abs(Math.sin(t * 9)) * speed * 0.012;

    /* ground shadow */
    var sh = 0.34 + jy * 0.06;
    this.rect(pos.x - sh, pos.x + sh, pos.z - sh * 0.78, pos.z + sh * 0.78, 0.05,
      mixArr(p.court, [0, 0, 0], p.shadow), 1.0, 6, clamp(0.72 - jy * 0.28, 0.2, 0.72));

    var self = this;
    /* local (facing +z) -> world */
    function place(l) {
      var r = rotate(l, yaw, 0);
      return [pos.x + r[0], y0 + r[1], pos.z + r[2]];
    }
    /* a limb hanging from a joint, swung by `ang` about the local X axis */
    function limb(joint, len, thick, ang, color) {
      var mid = rotate([0, -len / 2, 0], 0, ang);
      var c = place([joint[0] + mid[0], joint[1] + mid[1], joint[2] + mid[2]]);
      self.box(c, [thick, len, thick], yaw, ang, color, 10);
      var tip = rotate([0, -len, 0], 0, ang);
      return [joint[0] + tip[0], joint[1] + tip[1], joint[2] + tip[2]];
    }

    var LEG = 0.78, ARM = 0.58;
    /* legs + shoes */
    var hips = [[-0.13, LEG, 0, step], [0.13, LEG, 0, -step]];
    for (i = 0; i < 2; i++) {
      var foot = limb([hips[i][0], hips[i][1], hips[i][2]], LEG, 0.19, hips[i][3], col);
      this.box(place([foot[0], foot[1] + 0.06, foot[2] + 0.05]), [0.22, 0.12, 0.3], yaw, 0, p.shoe, 10);
    }
    /* torso, neck, head, hair */
    this.box(place([0, LEG + 0.31, 0]), [0.52, 0.62, 0.3], yaw, 0, col, 10);
    this.box(place([0, LEG + 0.66, 0]), [0.34, 0.12, 0.3], yaw, 0, p.skin, 10);
    this.box(place([0, LEG + 0.86, 0]), [0.33, 0.33, 0.31], yaw, 0, p.skin, 10);
    this.box(place([0, LEG + 1.02, -0.01]), [0.35, 0.12, 0.33], yaw, 0, p.hair, 10);
    /* arms */
    limb([-0.33, LEG + 0.56, 0], ARM, 0.16, arm + 0.06, p.skin);
    limb([0.33, LEG + 0.56, 0], ARM, 0.16, arm - 0.06, p.skin);
  };

  /* -------------------------------------------------- render */
  function rgb(c) {
    return "rgb(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + ")";
  }
  function shaded(c, k) {
    return "rgb(" + clamp(c[0] * k, 0, 255).toFixed(0) + "," +
      clamp(c[1] * k, 0, 255).toFixed(0) + "," + clamp(c[2] * k, 0, 255).toFixed(0) + ")";
  }

  Stage.prototype.render = function () {
    var ctx = this.ctx, p = this.pal, i, j;
    this.prims.length = 0;

    /* orbiting camera */
    var th = 0.28 * Math.sin(this.time * 0.075) + 0.14;
    var dist = 19.5, hgt = 7.2;
    var eye = [Math.sin(th) * dist, hgt + Math.sin(this.time * 0.11) * 0.45, Math.cos(th) * dist];
    this.setCamera(eye, [0, 1.05, 0]);

    this.drawSky(ctx, p);
    this.buildWorld();

    this.prims.sort(function (a, b) { return a.l - b.l || b.d - a.d; });

    for (i = 0; i < this.prims.length; i++) {
      var q = this.prims[i];
      ctx.globalAlpha = q.a === undefined ? 1 : q.a;
      if (q.ball) {
        ctx.fillStyle = "rgba(0,0,16,0.55)";
        ctx.beginPath(); ctx.arc(q.ball[0], q.ball[1], q.r + 0.9, 0, 7); ctx.fill();
        ctx.fillStyle = rgb(q.c2);
        ctx.beginPath(); ctx.arc(q.ball[0], q.ball[1], q.r, 0, 7); ctx.fill();
        ctx.fillStyle = rgb(q.c);
        ctx.beginPath(); ctx.arc(q.ball[0] - q.r * 0.24, q.ball[1] - q.r * 0.28, q.r * 0.78, 0, 7); ctx.fill();
        continue;
      }
      var col = shaded(q.c, q.k);
      ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(q.s[0][0], q.s[0][1]);
      for (j = 1; j < q.s.length; j++) ctx.lineTo(q.s[j][0], q.s[j][1]);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    /* floodlight bloom at night */
    if (p.glow > 0.02 && this.lamps) {
      ctx.globalCompositeOperation = "lighter";
      for (i = 0; i < this.lamps.length; i++) {
        var v = this.view(this.lamps[i]);
        if (v.z < NEAR) continue;
        var s = projectView(v);
        var r = 26 * p.glow;
        var g = ctx.createRadialGradient(s[0], s[1], 0, s[0], s[1], r);
        g.addColorStop(0, "rgba(255,224,150,0.55)");
        g.addColorStop(1, "rgba(255,224,150,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(s[0], s[1], r, 0, 7); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }
  };

  /* -------------------------------------------------- loop */
  /* palette cross-fade runs even while the rally is paused */
  Stage.prototype.fade = function (dt) {
    if (this.mix >= 1) return;
    this.mix = Math.min(1, this.mix + dt / 0.7);
    this.pal = mixPalette(this.from, this.to, smooth(this.mix));
  };

  Stage.prototype.step = function (dt) {
    this.time += dt;
    if (this.time >= LOOP) {
      this.time -= LOOP;
      this.rally++;
      var w = this.rally % 3 === 2 ? 1 : 0;
      this.score[w]++;
      if (this.score[0] >= 11 || this.score[1] >= 11) this.score = [0, 0];
      if (this.opts.onScore) this.opts.onScore(this.score[0], this.score[1]);
      this.node = -1;
    }
    this.updateCaption();
  };

  Stage.prototype.updateCaption = function () {
    var idx = 0;
    for (var i = 0; i < NODES.length; i++) if (this.time >= NODES[i].t) idx = i;
    if (idx !== this.node) {
      this.node = idx;
      if (this.opts.onCaption) this.opts.onCaption(NODES[idx].cap);
    }
  };

  Stage.prototype.setTheme = function (name, instant) {
    var target = name === "light" ? DAY : NIGHT;
    if (this.to === target && !instant) return;
    this.from = this.pal; this.to = target;
    this.mix = instant ? 1 : 0;
    if (instant) this.pal = target;
  };

  /* -------------------------------------------------- public API */
  var stage = null, raf = null, last = 0, visible = true, wanted = true;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (!stage) return;
    stage.fade(dt);
    if (wanted && visible) stage.step(dt);
    stage.render();
  }

  window.BBCourt = {
    mount: function (canvas, opts) {
      if (!canvas || !canvas.getContext) return null;
      try {
        stage = new Stage(canvas, opts);
      } catch (e) { return null; }
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) { wanted = false; stage.time = 7.4; }
      stage.render();
      last = performance.now();
      raf = requestAnimationFrame(frame);

      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) { visible = es[0].isIntersecting; },
          { threshold: 0.02 }).observe(canvas);
      }
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) visible = false;
        else visible = true;
      });
      return stage;
    },
    setTheme: function (n, instant) { if (stage) stage.setTheme(n, instant); },
    /* deterministic seek — used by the visual tests */
    seek: function (t) { if (stage) { stage.time = t % LOOP; stage.updateCaption(); stage.render(); } },
    playerPositions: function (t) {
      var out = {}, i;
      for (i = 0; i < IDS.length; i++) out[IDS[i]] = playerAt(IDS[i], t);
      return { players: out, ball: ballAt(t) };
    },
    setPlaying: function (v) { wanted = !!v; },
    isPlaying: function () { return wanted; },
    reducedMotion: function () {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
  };
})();
