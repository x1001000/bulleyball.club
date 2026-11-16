/* Build one cut's narration track: node narrate.mjs <zh|en> [--tts]
   --tts regenerates the per-line mp3s with edge-tts first. Each line is
   dropped at its film time and the track is padded to the film's length. */
import { NARRATION, DURATION } from "./script.js";
import { execFileSync } from "child_process";
import fs from "fs";
const cut = process.argv[2] || "zh", n = NARRATION[cut], dir = `vo/${cut}`;
fs.mkdirSync(dir, { recursive: true });
if (process.argv.includes("--tts"))
  n.lines.forEach((l, i) => execFileSync("/usr/local/bin/python3.13", ["tts.py", l[1], `${dir}/l${i + 1}.mp3`, n.voice, n.rate], { stdio: "inherit" }));
const args = ["-nostdin", "-v", "error", "-y"];
n.lines.forEach((l, i) => args.push("-i", `${dir}/l${i + 1}.mp3`));
const f = n.lines.map((l, i) => `[${i}:a]adelay=${Math.round(l[0] * 1000)}:all=1[a${i}]`).join(";") + ";" +
  n.lines.map((l, i) => `[a${i}]`).join("") + `amix=inputs=${n.lines.length}:normalize=0,apad,atrim=0:${DURATION},loudnorm=I=-16:TP=-1.5:LRA=11[out]`;
execFileSync("ffmpeg", [...args, "-filter_complex", f, "-map", "[out]", "-ar", "48000", "-ac", "2", `${dir}/narration.wav`], { stdio: "inherit" });
console.log(`${dir}/narration.wav  (${n.voice})`);
