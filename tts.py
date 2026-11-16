"""One narration line -> mp3, with edge-tts through the session proxy.
   python tts.py "text" out.mp3 [voice] [rate]
edge-tts builds its TLS context from certifi, which does not know the
proxy's CA, so point it at the session's CA bundle (verification stays on)."""
import asyncio, os, ssl, sys, edge_tts, edge_tts.communicate as c
CA = "/root/.ccr/ca-bundle.crt"
if os.path.exists(CA):
    ctx = ssl.create_default_context(cafile=CA)
    for name in dir(c):
        if isinstance(getattr(c, name), ssl.SSLContext):
            setattr(c, name, ctx)
text, out = sys.argv[1], sys.argv[2]
voice = sys.argv[3] if len(sys.argv) > 3 else "zh-TW-HsiaoChenNeural"
rate = sys.argv[4] if len(sys.argv) > 4 else "+0%"
asyncio.run(edge_tts.Communicate(text, voice, rate=rate).save(out))
