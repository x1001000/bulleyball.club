/* Drive film.html in headless Chromium and write frames.
     node render.js stills 1.5,4.2,9      -> out/still-<t>.jpg
     node render.js video [from] [to] [name]  -> out/<name>.mp4 (film seconds)   */
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const http = require("http"), fs = require("fs"), path = require("path"), cp = require("child_process");
const ROOT = __dirname, OUT = path.join(ROOT, "out");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".ttf": "font/ttf", ".png": "image/png", ".json": "application/json" };

(async () => {
  const srv = http.createServer((q, s) => {
    try {
      const f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]));
      if (!f.startsWith(ROOT)) throw 0;
      s.setHeader("content-type", MIME[path.extname(f)] || "application/octet-stream");
      s.end(fs.readFileSync(f));
    } catch (e) { s.statusCode = 404; s.end("404"); }
  });
  await new Promise(r => srv.listen(0, "127.0.0.1", r));
  const port = srv.address().port;
  const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  p.on("console", m => { if (m.type() === "error") console.log("[page]", m.text()); });
  p.on("pageerror", e => console.log("[pageerror]", e.message));
  await p.goto(`http://127.0.0.1:${port}/film.html?cut=${process.env.CUT || "zh"}`);   /* CUT=en for the English cut */
  await p.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
  const { DURATION, FPS } = await p.evaluate(() => ({ DURATION: window.DURATION, FPS: window.FPS }));
  const mode = process.argv[2] || "stills";

  if (mode === "stills") {
    for (const t of (process.argv[3] || "1").split(",").map(Number)) {
      const t0 = Date.now();
      const st = await p.evaluate(x => window.renderFrame(x), t);
      await p.screenshot({ path: path.join(OUT, `still-${t}.jpg`), type: "jpeg", quality: 90 });
      console.log(`film ${t}s  sim ${st.toFixed(2)}s  ${Date.now() - t0}ms`);
    }
  } else {
    const from = Number(process.argv[3] || 0), to = Number(process.argv[4] || DURATION), name = process.argv[5] || "film";
    const f0 = Math.round(from * FPS), f1 = Math.round(to * FPS);
    const ff = cp.spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
      "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
      path.join(OUT, name + ".mp4")], { stdio: ["pipe", "inherit", "inherit"] });
    const t0 = Date.now();
    for (let i = f0; i < f1; i++) {
      await p.evaluate(x => window.renderFrame(x), i / FPS);
      const buf = await p.screenshot({ type: "jpeg", quality: 95 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
      if ((i - f0) % 60 === 0) console.log(`${name}: frame ${i - f0}/${f1 - f0}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end(); await new Promise(r => ff.on("close", r));
    console.log(`${name}: done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await b.close(); srv.close();
})();
