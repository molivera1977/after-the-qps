/* =====================================================================
   SOUND — the same rules as the QPS Literacy Hub, so a kid hears the
   same voices on both sites:
     • a single sound (/a/, /oo/) is Mr. O's own recording (sounds/),
       brought to the computer voice's loudness (blend-core.js) — Marcos
       10/15: "the computer cant do vowel sounds";
     • a whole word is the computer voice at rate 0.82, as written (the hub's
       rule for real words), in English (readaloud.js english());
     • letter names ("S", "A") are the computer voice too.
   A tap plays at once: whatever is still playing stops first (the hub,
   Marcos 10/19: "I should hear the sound as soon as I hit the letter").
   Nothing is said until the student taps.
   ===================================================================== */
window.ATQSound = (function () {
  let ctx = null, limiter = null;
  const cache = {}, levelOf = new WeakMap(), playing = new Set();

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const mono = (buf) => {
    if (buf.numberOfChannels === 1) return buf.getChannelData(0);
    const mix = new Float32Array(buf.length);
    for (let c = 0; c < buf.numberOfChannels; c++) { const ch = buf.getChannelData(c); for (let i = 0; i < buf.length; i++) mix[i] += ch[i] / buf.numberOfChannels; }
    return mix;
  };
  // One recording, its silence trimmed the hub's way (BlendCore.blend of one sound keeps its full length).
  // whole = a whole word in his voice: played as he recorded it (already trimmed), like the hub's whole words.
  async function load(name, whole = false) {
    if (name in cache) return cache[name];
    const c = audio();
    let out = null;
    if (c) {
      try {
        const res = await fetch(`sounds/${name}.m4a`);
        if (res.ok) {
          const buf = await c.decodeAudioData(await res.arrayBuffer());
          const data = window.BlendCore && !whole ? BlendCore.blend([mono(buf)], c.sampleRate) : null;
          if (data && data.length) { out = c.createBuffer(1, data.length, c.sampleRate); out.getChannelData(0).set(data); out.__name = name; }
          else out = buf;
          if (whole) out.__whole = true;
        }
      } catch (e) { out = null; }
    }
    cache[name] = out;
    return out;
  }
  // How loud a recording plays. His single sounds: the site's level (-14 dBFS). His whole words: -12 dBFS — the
  // computer voice measured -12.1 to -13.7 on his Mac (10/27), and at -14 his words were the quietest thing in the
  // lesson (Marcos: "my recordings need to be louder"). Never past the limiter's range (MAX_OVER / peak).
  const WORD_TARGET_DB = -12;
  function gainFor(buf) {
    const data = mono(buf);
    const g = BlendCore.levelGain(data, buf.sampleRate);
    if (!buf.__whole) return g;
    let peak = 0;
    for (let i = 0; i < data.length; i++) { const v = Math.abs(data[i]); if (v > peak) peak = v; }
    return Math.min(g * Math.pow(10, (WORD_TARGET_DB - BlendCore.TARGET_DB) / 20), peak ? BlendCore.MAX_OVER / peak : g);
  }
  function play(buf) {
    return new Promise(resolve => {
      const c = audio();
      const src = c.createBufferSource();
      src.buffer = buf;
      let out = c.destination;
      if (window.BlendCore && c.createGain && c.createWaveShaper) {
        if (!limiter) { limiter = c.createWaveShaper(); limiter.curve = BlendCore.limitCurve(); limiter.connect(c.destination); }
        if (!levelOf.has(buf)) levelOf.set(buf, gainFor(buf));
        const gain = c.createGain();
        gain.gain.value = levelOf.get(buf) / BlendCore.MAX_OVER;
        gain.connect(limiter);
        out = gain;
      }
      src.connect(out);
      src.onended = () => { playing.delete(src); try { src.disconnect(); if (out !== c.destination) out.disconnect(); } catch (e) {} resolve(); };
      playing.add(src);
      src.start();
    });
  }

  // Chrome sometimes never reports that a reading ended: never wait forever (the hub's speakComputer)
  function speak(text, rate = 0.82) {
    return new Promise(resolve => {
      if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') { resolve(); return; }
      const u = new SpeechSynthesisUtterance(text);
      if (window.QPSRead) QPSRead.english(u); else u.lang = 'en-US';
      speak.last = u;                                            // held, so Chrome can't let it go mid-word
      let done = false;
      const end = () => { if (done) return; done = true; clearTimeout(limit); resolve(); };
      const limit = setTimeout(end, 2500 + String(text).length * 150);
      u.rate = rate; u.onend = end; u.onerror = end;
      speechSynthesis.speak(u);
    });
  }

  // Stop everything: recordings, the computer voice and any highlighted reading
  function stop() {
    playing.forEach(src => { try { src.stop(); } catch (e) {} });
    playing.clear();
    if (window.QPSRead) QPSRead.stop(); else if (window.speechSynthesis) speechSynthesis.cancel();
  }

  let run = 0;
  // Each public call stops what is playing, then plays. Resolves when its sound is over (or cut off).
  async function guarded(fn) { stop(); audio(); const mine = ++run; await fn(); return mine === run; }
  const sound = (name) => guarded(async () => { const b = await load(name); if (b) await play(b); });
  // A whole word: Mr. O's recording if he made one (lessons.js ATQ_WORD_RECORDINGS), else the computer voice
  const recorded = (w) => (window.ATQ_WORD_RECORDINGS || []).includes(String(w).toLowerCase());
  const word = (w) => guarded(async () => {
    const rec = recorded(w) ? await load('words/' + String(w).toLowerCase(), true) : null;
    if (rec) await play(rec); else await speak((window.ATQ_WORD_SAY || {})[String(w).toLowerCase()] || w, 0.82);
  });
  // Letter names, said lowercase (Marcos 10/27: "why does this say capital w, capital a, capital s"). Measured with
  // Samantha: a lone capital "W" is the same audio as "capital W"; a lone "w", "s", "d"… is the letter's name
  // (22 of 26 letters byte-identical to the spelled-out name), and "s-h" is the same audio as "S-H".
  const letters = (s) => guarded(() => speak(String(s).toLowerCase().split('').join('-'), 0.82));
  const text = (t) => guarded(() => speak(t, 0.82));

  // Leaving the page or the tab ends every sound (Marcos 10/23: "if I leave I still hear the read aloud")
  const hush = () => stop();
  window.addEventListener('pagehide', hush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') hush(); });

  return { sound, word, letters, text, stop, load };
})();
