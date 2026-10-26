/* =====================================================================
   READ ALOUD WITH HIGHLIGHT — every 🔊 on the hub lights each word as
   it is read (Marcos 10/15: "where's the highlighting for the read
   aloud"). Same method as the science lessons:
     • voices that report each word (onboundary) move the highlight;
     • voices that never report (many Chromebook voices) get a highlight
       paced by hand from the length of the text.
   Rate 0.82 for sentences, directions, lessons and passages (Marcos
   10/15: "the read aloud part for the directions seems very fast") — the
   pace he approved for the science lessons. Single words read on their
   own (speakComputer) went to 0.82 too on 10/26: "0.82 sounds way better
   and not rushed".
   ===================================================================== */
window.QPSRead = (function () {
  const RATE = 0.82;
  const MS_PER_LETTER = 58, PACE_BASE = 0.92;   // measured on the science lessons at 0.92
  let current = null, timer = null, endCurrent = null, gen = 0, held = null;

  // Put each word of `text` in its own span (class rw) inside host.
  function wrap(host, text) {
    host.textContent = '';
    String(text).split(/(\s+)/).forEach(tok => {
      if (!tok) return;
      if (/^\s+$/.test(tok)) { host.append(document.createTextNode(tok)); return; }
      const w = document.createElement('span');
      w.className = 'rw';
      w.textContent = tok;
      host.append(w);
    });
    return host;
  }

  // Every reading is in English, on an English voice (10/21: one child heard garbled sounds on stop 6 that no one
  // else heard — a Chromebook whose own voice is another language reads English words with that language's
  // sounds). The device's own voice is kept when it is English, so nothing changes on the devices that were fine.
  const isEnglish = (v) => /^en([-_]|$)/i.test((v && v.lang) || '');
  let enVoice = null;
  function englishVoice() {
    if (enVoice) return enVoice;
    const all = (window.speechSynthesis && speechSynthesis.getVoices && speechSynthesis.getVoices()) || [];
    const us = (v) => /^en[-_]US$/i.test(v.lang || '');
    enVoice = all.find(v => v.default && isEnglish(v)) || all.find(v => us(v) && v.localService) || all.find(us) || all.find(isEnglish) || null;
    return enVoice;                        // null until the device lists its voices (Chrome lists them late): asked again next time
  }
  function english(u) {
    u.lang = 'en-US';
    const v = englishVoice();
    if (v) { try { u.voice = v; } catch (e) { /* a voice the browser won't take: en-US still asks for English */ } }
    return u;
  }

  // Only real words are lit: a comma or "·" on its own (after a marked word, or between a stop's
  // number and name) is not said, so lighting it put the highlight one word behind the voice.
  const isWord = (s) => /[A-Za-z0-9]/.test(s);
  function wordsOf(host) { return [...host.querySelectorAll('.rw, .c-w')].filter(w => isWord(w.textContent)); }
  function light(words, i) { words.forEach((w, k) => w.classList.toggle('lit', k === i)); }
  function clear() {
    if (timer) { clearInterval(timer); timer = null; }
    if (current) wordsOf(current).forEach(w => w.classList.remove('lit'));
    current = null;
  }

  function stop() {
    const end = endCurrent;
    endCurrent = null;
    if (window.speechSynthesis) speechSynthesis.cancel();
    clear();
    if (end) end();
  }

  // Read a block aloud, lighting its words. Resolves when the voice is done, with HOW it ended:
  //   'end'     — heard to the end
  //   'stopped' — cut off (another speaker, leaving the screen) or the voice failed
  //   'novoice' — nothing started within NO_VOICE_MS: this device has no voice to read with
  // (Practice uses it to open a step only once its directions are heard — Marcos 10/19.)
  const NO_VOICE_MS = 4000;
  function say(host) {
    stop();
    const mine = ++gen;
    return new Promise(resolve => {
      const words = wordsOf(host);
      const text = host.dataset.say || words.map(w => w.textContent).join(' ') || host.textContent;
      if (!text) { resolve('end'); return; }
      if (!window.speechSynthesis) { resolve('novoice'); return; }
      const u = english(new SpeechSynthesisUtterance(text));
      held = u;                                            // held, so Chrome can't let it go mid-reading
      u.rate = RATE;
      current = host;
      let reported = false, started = false, settled = false;
      // A reading that was cut off still reports its end later (Chrome: an "interrupted" error);
      // by then another block is being read, so only the reading still going may clear the light.
      const finish = (how = 'stopped') => {
        if (endCurrent === finish) endCurrent = null;
        if (mine === gen) clear();
        if (!settled) { settled = true; clearTimeout(watch); clearTimeout(tooLong); resolve(how); }
      };
      const watch = setTimeout(() => { if (!started && !settled) { if (mine === gen) { endCurrent = null; speechSynthesis.cancel(); } finish('novoice'); } }, NO_VOICE_MS);
      // Chrome can go quiet without ever reporting the end (a long reading, or an utterance it let go
      // of): after twice the time the text should take, it counts as read, so nothing waits forever.
      let tooLong = null;
      endCurrent = finish;
      // charIndex → the word it falls in (count the words before it)
      u.onboundary = (e) => {
        if (e.name && e.name !== 'word') return;
        reported = true;
        if (timer) { clearInterval(timer); timer = null; }
        light(words, text.slice(0, e.charIndex).split(/\s+/).filter(isWord).length);
      };
      u.onstart = () => {
        started = true;
        tooLong = setTimeout(() => { if (!settled) { if (mine === gen) { endCurrent = null; speechSynthesis.cancel(); } finish('end'); } }, 2500 + text.length * 2 * MS_PER_LETTER * (PACE_BASE / RATE));
        if (!words.length) return;
        const per = Math.max(170, (text.length * MS_PER_LETTER) / words.length * (PACE_BASE / RATE));
        let i = 0;
        light(words, i);
        timer = setInterval(() => {
          if (reported) { clearInterval(timer); timer = null; return; }
          i++;
          if (i >= words.length) { clearInterval(timer); timer = null; return; }
          light(words, i);
        }, per);
      };
      u.onend = () => finish(started ? 'end' : 'stopped');
      u.onerror = () => finish('stopped');
      try { speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { finish('stopped'); }
    });
  }

  // Static directions in the page (a .p-direction with a 🔊 button and a <p>):
  // wrap the words and make the button read that <p> with the highlight.
  function upgradeStatic(root) {
    (root || document).querySelectorAll('.p-direction').forEach(row => {
      const btn = row.querySelector('.p-say');
      const p = row.querySelector('p');
      if (!btn || !p || p.querySelector('.rw')) return;
      wrap(p, p.textContent);
      btn.removeAttribute('onclick');
      btn.onclick = () => say(p);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => upgradeStatic());
  else upgradeStatic();

  // Several blocks in a row (a lesson). Stops early if another speaker is tapped.
  async function sayAll(hosts) {
    for (const h of hosts) {
      const p = say(h);
      const mine = gen;
      await p;
      await new Promise(r => setTimeout(r, 120));
      if (gen !== mine) return;
    }
  }

  return { wrap, say, sayAll, stop, upgradeStatic, english };
})();
