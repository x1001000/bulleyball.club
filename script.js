/* The edit: how film time maps to rally time, and what is on screen and
   on the soundtrack. Film time is seconds of the finished reel; sim time
   is seconds of the rally in sim.js. Slow motion is just a beat whose sim
   span is shorter than its film span.

   The beats are cut to the narration (edge-tts, zh-TW-HsiaoChenNeural,
   rate +0%): each line has to fit inside the beat it describes.         */

export const FPS = 30;

/* which cut this is, from the page address (film.html?cut=en):
     "zh"  Chinese captions with the English line under them, Chinese narration
     "en"  English captions and slogan only, English narration                 */
export const CUT = (typeof location !== "undefined" && new URLSearchParams(location.search).get("cut")) || "zh";

/* film [start, end] of every beat */
export const T = {
  intro:  [ 0.0,  3.6],   /* everyone set, server holding the ball      */
  serve:  [ 3.6,  5.8],   /* toss, serve, flight to the dig             */
  digset: [ 5.8,  7.8],   /* dig, set, approach                         */
  dink:   [ 7.8, 10.6],   /* the dink, slowed, down to the floor        */
  rev1:   [10.6, 14.2],   /* rule: inside the 3 m line is out           */
  rally2: [14.2, 16.6],   /* rally 2 joins mid-serve: dig, set          */
  block:  [16.6, 20.0],   /* spike into the block, slowed               */
  drop:   [20.0, 22.0],   /* the blocked ball drops                     */
  rev2:   [22.0, 25.8],   /* exception: off a block it is not out       */
  outro:  [25.8, 31.6]    /* rise to the plan view, end card            */
};

/* sim [start, end] covered by each beat */
const SIM_SPAN = {
  intro: [-3.60, -0.95], serve: [-0.95, 1.60], digset: [1.60, 3.52], dink: [3.52, 4.45], rev1: [4.45, 4.95],
  rally2: [8.95, 11.28], block: [11.28, 12.22], drop: [12.22, 13.00], rev2: [13.00, 13.48], outro: [13.48, 14.00]
};
export const SEGMENTS = Object.keys(T).map(k => [T[k][0], T[k][1], SIM_SPAN[k][0], SIM_SPAN[k][1]]);
export const DURATION = T.outro[1];

export function simTime(ft) {
  for (const [f0, f1, s0, s1] of SEGMENTS) {
    if (ft <= f1) return s0 + (s1 - s0) * Math.max(0, (ft - f0) / (f1 - f0));
  }
  return SEGMENTS[SEGMENTS.length - 1][3];
}

/* the rule, in the club's own words:
   球落在三米線內算出界，但攔網落在三米線內不算出界。                    */

/* captions: [film start, film end, zh, en] */
export const CAPTIONS = [
  [ 0.3,        4.4,          "兩個人，打整座球場", "Two a side. Full court."],
  [ 4.4,        T.dink[0],    "規則照六人制排球", "Standard indoor rules"],
  [T.dink[0],   T.rev1[0],    "只改一條", "With one change"],
  [T.rev1[0],   T.rev1[1],    "球落在三米線內，算出界", "Inside the 3 m line is out"],
  [T.rally2[0], T.rally2[1],  "唯一的例外", "One exception"],
  [T.block[0],  T.drop[1],    "攔網", "The block"],
  [T.rev2[0],   T.rev2[1],    "攔網落在三米線內，不算出界", "Off a block, it is not out"]
];

/* narration: per cut, the voice and [film start, text] for each line.
   One audio file per line (vo/<cut>/l<n>.mp3); both cuts keep the same times. */
const AT = [0.30, 4.70, 8.05, 10.70, 14.40, 16.95, 22.10, 28.30];
const LINES = {
  zh: { voice: "zh-TW-HsiaoChenNeural", rate: "+0%", text: [
    "鬥牛排球，兩個人，打整座球場。", "規則照六人制排球，", "只改一條。", "球落在三米線內，算出界。",
    "唯一的例外，", "是攔網。", "攔網落在三米線內，不算出界。", "簡單粗暴，攻擊自由。"] },
  en: { voice: "en-US-AvaNeural", rate: "+0%", text: [
    "Bulleyball. Two a side, on a full court.", "Standard indoor rules,", "with one change.",
    "A ball that lands inside the three-meter line is out.", "One exception:", "the block.",
    "Off a block, a ball inside the three-meter line is not out.", "Brutally simple. Attack free."] }
};
export const NARRATION = Object.fromEntries(Object.entries(LINES).map(([k, v]) =>
  [k, { voice: v.voice, rate: v.rate, lines: v.text.map((t, i) => [AT[i], t]) }]));

/* tags pinned to a point on the floor: [film start, film end, world xyz, kind, zh, en] */
export const TAGS = [
  [T.rev1[0] + 0.25, T.rev1[1], [ 2.00, 0.0,  0.80], "out", "出界", "OUT"],
  [T.rev2[0] + 0.25, T.rev2[1], [-1.85, 0.0, -0.40], "in",  "界內", "IN"]
];

export const END_CARD = { from: 27.5, zh: "簡單粗暴、攻擊自由", en: "Brutally Simple. Attack Free.", url: "bulleyball.club" };

export function allText() {
  let s = "鬥牛排球BULLEYBALL三米線3 m@.";
  for (const c of CAPTIONS) s += c[2] + c[3];
  for (const t of TAGS) s += t[4] + t[5];
  s += END_CARD.zh + END_CARD.en + END_CARD.url;
  s += "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,:;!?-—、，。：";
  return [...new Set(s)].join("");
}
