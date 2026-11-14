/* ═══════════════════════════════════════════════════════
   AVA VOICE — Marcos 11/12/2026: "I want Ava saying everything
   where computer voice was." The QPS hub's copy of the class
   sites' Kokoro player (website data/kokoro-voice/
   kokoro-voice.js), pointed at Ava's recordings: same logic,
   only the names and the folder differ.

   Load it AFTER ava-lines.js and BEFORE readaloud.js,
   next-waits.js and the page's own scripts:
     <script src="ava-lines.js?v=…"></script>
     <script src="ava-voice.js?v=…"></script>
   It stands in for the browser's voice
   (window.speechSynthesis). A line the hub hands to the
   voice that has a recording (ava-lines.js, made by
   make_ava_lines.py: Microsoft's Ava, en-US-AvaNeural −12%)
   is played from ava/s/<id>.webm, and the hub hears what
   Chrome's voice would tell it: start, each word as it is
   said (charIndex, so the highlight follows), end, and on
   Stop an "interrupted" error. speaking / pending stay true
   while a recording plays, so the hub's highlight, its
   no-sound waits and next-waits.js all work unchanged.

   Never silent because of it: a line with no recording, a
   recording that will not load or play within 2.5 s (the
   hub's own no-sound wait is 4 s), or a browser that cannot
   play it, is said by the device's own voice. Those lines
   are kept in AvaVoice.misses / .fellBack. Lines with a
   student's name are never recorded (a name is not sent to
   Microsoft): those stay on the device's voice.

   ?voice=device on the address turns it off (to compare).
   Under the site tests' stand-in voices it only listens
   (AvaVoice.mode 'audit'): every line passes to the
   stand-in, and a line with no recording is kept in
   AvaVoice.misses for the spec to report.
═══════════════════════════════════════════════════════ */
(function () {
  var START_GIVE_UP = 2500;   // no sound from the recording by then: the device's voice says the line
  var WORD_POLL_MS = 40;      // how often the word being said is checked (a word lasts ~250 ms)
  var NORMAL_RATE = window.AVA_NORMAL_RATE || 0.82;   // the hub's reading rate = the recording's own speed
  var END_STOP = /[.!?:,]["”’]?$/;
  var real = window.speechSynthesis;
  var LINES = window.AVA_LINES;

  function canon(t) {   // a line is keyed with a stop at its end; make_ava_lines.py keys lines the same way
    t = String(t == null ? '' : t).trim();
    return END_STOP.test(t) ? t : t + '.';
  }
  // Sentences of a line, each with where it starts in the line. A line is cut after . ! ? and a space, never
  // after Mr. / Mrs. / Ms. / Dr. (make_ava_lines.py cuts the same way).
  var CUT = /[.!?]["”’)]?\s+/g, TITLE = /(?:^|\s)(?:Mr|Mrs|Ms|Dr)\.["”’)]?\s+$/;
  function sentences(t) {
    var out = [], from = 0, m;
    CUT.lastIndex = 0;
    while ((m = CUT.exec(t))) {
      var end = m.index + m[0].length;
      if (TITLE.test(t.slice(from, end))) continue;
      out.push({ text: t.slice(from, end).replace(/\s+$/, ''), at: from });
      from = end;
    }
    if (from < t.length && /\S/.test(t.slice(from))) out.push({ text: t.slice(from), at: from });
    return out;
  }
  function entry(k) { return LINES && Object.prototype.hasOwnProperty.call(LINES, k) ? LINES[k] : null; }
  // What plays: the whole line's recording, or (a line put together from pieces: "You got 85%. You passed!")
  // each sentence's own recording, one after another. [{ id, marks: [charIndex in the line, seconds, …] }]
  function lookup(t) {
    t = String(t == null ? '' : t);
    var lead = t.length - t.replace(/^\s+/, '').length;
    var whole = entry(canon(t));
    if (whole) return [{ id: whole[0], marks: shift(whole[2] || [], lead) }];
    var parts = sentences(t);
    if (parts.length < 2) return null;
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var e = entry(canon(parts[i].text));
      if (!e) return null;
      var at = parts[i].at + (parts[i].text.length - parts[i].text.replace(/^\s+/, '').length);
      out.push({ id: e[0], marks: shift(e[2] || [], at) });
    }
    return out;
  }
  function shift(marks, by) { var m = marks.slice(); for (var i = 0; i < m.length; i += 2) m[i] += by; return m; }
  var api = window.AvaVoice = {
    mode: 'off', misses: [], fellBack: [], played: 0,
    has: function (t) { return !!lookup(t); }
  };
  function miss(t) { t = String(t); if (api.misses.indexOf(t) < 0) api.misses.push(t); }

  if (!real || typeof real.speak !== 'function' || !LINES || typeof Audio === 'undefined') return;
  if (/[?&]voice=device\b/.test(location.search)) return;
  var native = typeof SpeechSynthesis !== 'undefined' && real instanceof SpeechSynthesis;
  api.mode = window.AVA_MODE || (native ? 'play' : 'audit');

  if (api.mode === 'audit') {
    var standInSpeak = real.speak;
    real.speak = function (u) {
      if (u && !lookup(u.text)) miss(u.text);
      return standInSpeak.apply(real, arguments);
    };
    return;
  }

  var queue = [], cur = null;

  // Tell the page what Chrome's voice would: a real event on the utterance runs both u.onend and its listeners
  function fire(u, type, extra) {
    extra = extra || {};
    var init = { utterance: u, charIndex: extra.charIndex || 0, charLength: extra.charLength || 0,
                 elapsedTime: extra.elapsedTime || 0, name: extra.name || '' };
    var ev = null;
    try {
      if (type === 'error') { init.error = extra.error || 'interrupted'; ev = new SpeechSynthesisErrorEvent('error', init); }
      else ev = new SpeechSynthesisEvent(type, init);
    } catch (e) { ev = null; }
    if (ev && typeof u.dispatchEvent === 'function') { u.dispatchEvent(ev); return; }
    var h = u['on' + type];
    if (typeof h === 'function') h.call(u, Object.assign({ type: type }, init));
  }

  function quietDown(it) {
    clearInterval(it.poll); clearInterval(it.watch);
    clearTimeout(it.giveUp); clearTimeout(it.waitTimer); clearTimeout(it.gap);
    if (it.audio) {
      var a = it.audio; it.audio = null;
      a.pause(); a.removeAttribute('src'); a.load();   // stop the download too
    }
  }

  function next() {
    if (cur) return;
    var it = queue.shift();
    if (!it) return;
    cur = it;
    if (!it.line) { toDevice(it, null); return; }
    playWhenQuiet(it);
  }

  // A line the device's voice is still saying (a line with no recording) finishes first, as in Chrome's queue
  function playWhenQuiet(it) {
    if (cur !== it) return;
    if (real.speaking || real.pending) { it.waitTimer = setTimeout(function () { playWhenQuiet(it); }, 100); return; }
    play(it);
  }

  var BETWEEN = 0.35;   // seconds between two sentences played from their own recordings (Ava's own pause ≈ 0.3–0.4 s)
  function play(it) {
    var u = it.u, parts = it.line, p = 0;
    // Only this line's own recording, still playing it, counts: a recording that was stopped or handed to the
    // device's voice reports a failure as it is shut down, and that must not hand the line on a second time
    // (found 10/31 on the Kokoro sites: a line given up on was said twice)
    function part() {
      var marks = parts[p].marks, k = 0;
      var a = it.audio = new Audio('ava/s/' + parts[p].id + '.webm');
      a.preload = 'auto';
      if (typeof u.volume === 'number' && u.volume >= 0 && u.volume <= 1) a.volume = u.volume;
      if (typeof u.rate === 'number' && u.rate > 0) {
        a.playbackRate = Math.max(0.5, Math.min(2, u.rate / NORMAL_RATE));
        a.preservesPitch = true;
      }
      var mine = function () { return cur === it && it.audio === a; };
      var words = function () {
        if (!mine()) return;
        var t = a.currentTime;
        while (k < marks.length && marks[k + 1] <= t + 0.02) {
          fire(u, 'boundary', { name: 'word', charIndex: marks[k], elapsedTime: Math.round(marks[k + 1] * 1000) });
          k += 2;
        }
      };
      a.addEventListener('playing', function () {
        if (!mine()) return;
        clearInterval(it.poll);
        it.poll = setInterval(words, WORD_POLL_MS);
        if (!it.started) {
          it.started = true;
          clearTimeout(it.giveUp);
          api.played++;
          fire(u, 'start');
        }
        words();
      });
      a.addEventListener('ended', function () {
        if (!mine()) return;
        words();
        it.ms = (it.ms || 0) + Math.round((a.duration || 0) * 1000);
        if (++p < parts.length) {                       // the next sentence, after a sentence's pause
          clearInterval(it.poll);
          it.gap = setTimeout(function () { if (cur === it && it.audio === a) part(); }, BETWEEN * 1000);
          return;
        }
        quietDown(it);
        cur = null;
        fire(u, 'end', { charIndex: String(u.text).length, elapsedTime: it.ms });
        next();   // a line the page started from its own onend is already in the queue
      });
      a.addEventListener('error', function () {
        if (!mine()) return;
        if (!it.started) { toDevice(it, 'would not load'); return; }
        quietDown(it);
        cur = null;
        fire(u, 'error', { error: 'audio-hardware' });
        next();
      });
      var pr = a.play();
      if (pr && typeof pr.catch === 'function') pr.catch(function () { if (mine() && !it.started) toDevice(it, 'not allowed to play'); });
    }
    it.giveUp = setTimeout(function () { if (cur === it && !it.started) toDevice(it, 'too slow to start'); }, START_GIVE_UP);
    part();
  }

  // The device's own voice says it; the queue goes on once that voice is done (or never starts)
  function toDevice(it, why) {
    quietDown(it);
    if (why) api.fellBack.push({ text: String(it.u.text), why: why });
    it.sent = true;
    var u = it.u, at = Date.now(), quiet = 0, done = false;
    var settle = function () {
      if (done) return;
      done = true;
      clearInterval(it.watch);
      if (cur === it) { cur = null; next(); }
    };
    if (typeof u.addEventListener === 'function') { u.addEventListener('end', settle); u.addEventListener('error', settle); }
    it.watch = setInterval(function () {   // some voices never say they ended, some never start
      if (real.speaking || real.pending) { quiet = 0; return; }
      if (++quiet >= 3 && Date.now() - at > 600) settle();
    }, 200);
    real.speak(u);
  }

  var voice = {
    speak: function (u) {
      if (!u) return;
      var line = lookup(u.text);
      if (!line) miss(u.text);
      queue.push({ u: u, line: line });
      next();
    },
    cancel: function () {
      var gone = (cur ? [cur] : []).concat(queue);
      queue = [];
      if (cur) quietDown(cur);
      cur = null;
      real.cancel();   // the device's voice reports its own cut-off lines
      gone.forEach(function (it) {
        if (!it.sent) Promise.resolve().then(function () { fire(it.u, 'error', { error: 'interrupted' }); });
      });
    },
    pause: function () { if (cur && cur.audio) cur.audio.pause(); real.pause(); },
    resume: function () { if (cur && cur.audio) cur.audio.play(); real.resume(); },
    getVoices: function () { return real.getVoices(); },
    addEventListener: function () { return real.addEventListener.apply(real, arguments); },
    removeEventListener: function () { return real.removeEventListener.apply(real, arguments); },
    dispatchEvent: function () { return real.dispatchEvent.apply(real, arguments); }
  };
  Object.defineProperty(voice, 'speaking', { get: function () { return !!cur || real.speaking; } });
  Object.defineProperty(voice, 'pending', { get: function () { return queue.length > 0 || real.pending; } });
  Object.defineProperty(voice, 'paused', { get: function () { return real.paused; } });
  Object.defineProperty(voice, 'onvoiceschanged', {
    get: function () { return real.onvoiceschanged; },
    set: function (f) { real.onvoiceschanged = f; }
  });
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, get: function () { return voice; } });
})();
