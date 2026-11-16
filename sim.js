/* The rally, ported verbatim from assets/js/court3d.js on the site.
   NODES and KEYS are the same numbers the site's numeric audit checks
   (serve order, actor within reach of the ball, net clearance, landing
   spots), so the film inherits a choreography that is already known to
   teach the rule correctly. Do not retune these here: change them on the
   site, re-run the audit, then copy.                                     */

export const COURT_X = 9, COURT_Z = 4.5, ZONE = 3;
export const NET_TOP = 2.43, NET_BOT = 1.43;
export const BALL_R = 0.105;

export const NODES = [
  /* ---- rally 1: B serves, A dinks short, nobody blocks ---- */
  { t: 0.00,  p: [ 9.70, 2.15,  1.20], act: "B2", cap: "serve", arc: 0.0, srv: "B" },
  { t: 1.60,  p: [-6.30, 0.85, -2.40], act: "A2", cap: "dig",   arc: 3.4 },
  { t: 2.70,  p: [-3.00, 2.25,  0.45], act: "A1", cap: "set",   arc: 3.0 },
  { t: 3.70,  p: [-1.35, 3.15, -0.60], act: "A2", cap: "dink",  arc: 1.5 },
  { t: 4.45,  p: [ 2.00, 0.11,  0.80], act: null, cap: "out",   arc: 0.9, pt: "B" },
  { t: 4.95,  p: [ 2.45, 0.11,  0.88], act: null, cap: "out",   arc: 0.25 },
  { t: 5.50,  p: [ 2.70, 0.11,  0.93], act: null, cap: "out",   arc: 0.1 },
  { t: 6.30,  p: [ 2.70, 1.10,  0.93], act: "B1", cap: "out",   arc: 0.05 },
  /* ---- rally 2: B serves again, A attacks, B blocks it down ---- */
  { t: 7.80,  p: [ 9.70, 2.15, -1.20], act: "B2", cap: "serve", arc: 2.6, srv: "B" },
  { t: 9.40,  p: [-6.20, 0.85, -2.30], act: "A2", cap: "dig",   arc: 3.4 },
  { t: 10.50, p: [-3.00, 2.30,  0.55], act: "A1", cap: "set",   arc: 3.0 },
  { t: 11.55, p: [-1.30, 3.20, -0.55], act: "A2", cap: "spike", arc: 1.5 },
  { t: 12.05, p: [ 0.32, 3.10, -0.48], act: "B1", cap: "block", arc: 0.2 },
  { t: 13.00, p: [-1.85, 0.11, -0.40], act: null, cap: "point", arc: 0.85, pt: "B" },
  { t: 13.50, p: [-2.35, 0.11, -0.42], act: null, cap: "point", arc: 0.25 },
  { t: 14.05, p: [-2.70, 0.11, -0.40], act: null, cap: "point", arc: 0.1 },
  { t: 14.80, p: [-2.70, 1.10, -0.40], act: "A1", cap: "point", arc: 0.05 },
  { t: 16.40, p: [ 9.70, 2.15,  1.20], act: "B2", cap: "serve", arc: 2.6, srv: "B" }
];

/* [t, x, z, jumpHeight] */
export const KEYS = {
  A1: [[0.0, -4.6, 1.6, 0], [2.7, -3.0, 0.45, 0], [4.2, -3.9, 1.0, 0],
       [6.0, -4.6, 1.6, 0], [7.8, -4.8, 1.8, 0], [10.5, -3.0, 0.55, 0],
       [12.1, -3.7, 1.1, 0], [14.8, -2.7, -0.4, 0], [16.4, -4.6, 1.6, 0]],
  A2: [[0.0, -5.6, -1.8, 0], [1.6, -6.3, -2.4, 0], [3.0, -3.6, -1.6, 0],
       [3.7, -1.35, -0.6, 0.92], [4.6, -2.6, -1.2, 0], [6.0, -5.2, -1.8, 0],
       [7.8, -5.6, -1.8, 0], [9.4, -6.2, -2.3, 0], [10.7, -4.4, -1.9, 0],
       [11.55, -1.3, -0.55, 0.92], [12.4, -2.6, -1.6, 0], [13.6, -5.4, -2.2, 0],
       [16.4, -5.6, -1.8, 0]],
  B1: [[0.0, 5.6, -1.9, 0], [2.6, 4.6, -1.4, 0], [3.7, 4.0, -1.2, 0],
       [5.5, 3.2, 0.2, 0], [6.3, 2.7, 0.93, 0], [7.8, 4.8, -0.6, 0],
       [10.8, 2.6, -0.9, 0], [12.05, 0.5, -0.48, 0.78], [12.9, 1.4, -0.6, 0],
       [16.4, 5.6, -1.9, 0]],
  B2: [[0.0, 9.7, 1.2, 0.45], [2.0, 6.8, 1.0, 0], [3.7, 5.6, 1.4, 0],
       [4.6, 5.2, 1.2, 0], [6.3, 6.5, 0.4, 0], [7.8, 9.7, -1.2, 0.45],
       [9.6, 6.8, -0.8, 0], [12.05, 5.4, 0.6, 0], [16.4, 9.7, 1.2, 0]]
};
export const IDS = ["A1", "A2", "B1", "B2"];

/* Film-only: the serve.
   On the site the server is a dozen pixels tall, and a contact point of
   2.15 m only has to read as "up there". On a life-size figure 2.15 m is
   head height, and the serve looked like a two-handed push. The film makes
   it a jump serve, hit one-handed like an attack: contact at full reach,
   a little in front of the body, off a real jump. Only the first point of
   each serve moves, and it moves up, so net clearance only grows and the
   landing spot is untouched.                                            */
for (const n of NODES) if (n.cap === "serve") { n.p[0] = 9.45; n.p[1] = 2.95; }
for (const k of KEYS.B2) if (k[3]) k[3] = 0.78;

export const lerp = (a, b, u) => a + (b - a) * u;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };

/* Film-only addition: before the first serve the ball is not hanging in
   the air at the contact point (the site covers this with the loop's
   closing lob). The server holds it, then tosses it up into node 0.     */
export const TOSS_T = -0.95;
export const HOLD_P = [9.38, 1.18, 1.28];

export function ballAt(t) {
  const n = NODES.length;
  if (t <= TOSS_T) return HOLD_P.slice();
  if (t <= NODES[0].t) {
    const u = (t - TOSS_T) / (NODES[0].t - TOSS_T), b = NODES[0].p;
    return [lerp(HOLD_P[0], b[0], u), lerp(HOLD_P[1], b[1], u) + 0.8 * 4 * u * (1 - u), lerp(HOLD_P[2], b[2], u)];
  }
  for (let i = 0; i < n - 1; i++) {
    const a = NODES[i], b = NODES[i + 1];
    if (t >= a.t && t <= b.t) {
      const u = (t - a.t) / (b.t - a.t);
      return [lerp(a.p[0], b.p[0], u), lerp(a.p[1], b.p[1], u) + b.arc * 4 * u * (1 - u), lerp(a.p[2], b.p[2], u)];
    }
  }
  return NODES[n - 1].p.slice();
}

export function playerAt(id, t) {
  const k = KEYS[id];
  if (t <= k[0][0]) return { x: k[0][1], z: k[0][2], v: 0 };
  for (let i = 0; i < k.length - 1; i++) {
    if (t >= k[i][0] && t <= k[i + 1][0]) {
      const a = k[i], b = k[i + 1];
      const u = smooth((t - a[0]) / (b[0] - a[0]));
      return { x: lerp(a[1], b[1], u), z: lerp(a[2], b[2], u) };
    }
  }
  const last = k[k.length - 1];
  return { x: last[1], z: last[2] };
}

export function jumpAt(id, t) {
  const k = KEYS[id];
  let y = 0;
  for (let i = 0; i < k.length; i++) {
    if (!k[i][3]) continue;
    const u = (t - (k[i][0] - 0.44)) / 0.78;
    if (u > 0 && u < 1) y = Math.max(y, k[i][3] * Math.sin(Math.PI * u));
  }
  return y;
}
/* takeoff times, for the crouch before a jump and the give after landing */
export function jumpTimes(id) {
  return KEYS[id].filter(k => k[3]).map(k => ({ up: k[0] - 0.44, down: k[0] + 0.34 }));
}

/* distance each player has covered, so a walk cycle can be driven by
   ground actually travelled rather than by the clock */
const DT = 1 / 120, T0 = -5, T1 = 17;
const DIST = {};
for (const id of IDS) {
  const arr = [0];
  let prev = playerAt(id, T0);
  for (let t = T0 + DT; t <= T1; t += DT) {
    const p = playerAt(id, t);
    arr.push(arr[arr.length - 1] + Math.hypot(p.x - prev.x, p.z - prev.z));
    prev = p;
  }
  DIST[id] = arr;
}
export function distAt(id, t) {
  const f = clamp((t - T0) / DT, 0, DIST[id].length - 1.001), i = Math.floor(f);
  return lerp(DIST[id][i], DIST[id][i + 1], f - i);
}
export function velAt(id, t) {
  const a = playerAt(id, t - 0.03), b = playerAt(id, t + 0.03);
  return { x: (b.x - a.x) / 0.06, z: (b.z - a.z) / 0.06 };
}
