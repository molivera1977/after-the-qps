/* =====================================================================
   ONE LESSON — HILL's Foundational Skills Lesson Plan order, sized for a
   kid working alone (all of it decided with Marcos, 10/25/2026):
     1 Tricky words   — HILL's way: the expected letters, the tricky part,
                         spell it letter by letter, read it again; then practice
     2 The sound      — the quiet-e lesson (read aloud, Mr. O's recordings), then practice
     3 Blend          — tap each part (NO sound), whisper, then 🔊 to check, then mark
     4 Beat the voice — one word at a time; the voice waits 3 → 2 → 1 s; not scored
     5 The story      — read 3 times, whispering; read 1 may tap a word for help
                         (each tap is saved); reads 2–3 have no help and the Next
                         button waits about 1 second per word; the picture after read 3
     6 Questions      — 3 literal questions, read aloud with their answers
     7 Spell a sentence — one box per word; a wrong word shows the right spelling
                         and is typed again at once
   Read aloud: directions, the lessons, the questions and answers, the sentence
   to spell. SILENT on purpose (the kid does the decoding): the blend parts, the
   speed words until the voice catches up, and the story itself.
   "Read, hear, mark" is honor-system on purpose; the questions catch a kid
   who clicks through. A word marked "I missed it" comes back two words later
   (HILL: back up and present it again), once.
   A re-read (a lesson Mr. O gave before) is just the story and the questions.
   ===================================================================== */
window.ATQLesson = (function () {
  const STEPS = [
    { key: 'tricky',    name: 'Tricky words',     icon: '🧩' },
    { key: 'sound',     name: 'The sound',        icon: '🔤' },
    { key: 'blend',     name: 'Blend',            icon: '👆' },
    { key: 'speed',     name: 'Beat the voice',   icon: '⚡' },
    { key: 'story',     name: 'The story',        icon: '📖' },
    { key: 'questions', name: 'Questions',        icon: '❓' },
    { key: 'spell',     name: 'Spell a sentence', icon: '✏️' }
  ];
  const REREAD = ['story', 'questions'];
  const RESULTS_GAME = 'atq-lessons';
  const RUN_KEY = 'atq_run_v1:';
  const THINK_MS = 2000;                 // HILL: 2 seconds of think time before the check
  const STORY_MS_PER_WORD = 1000;        // reads 2–3: Next waits about 1 second per word (HILL 6b's tap pace)
  const READ_MS_PER_WORD = 450, READ_MIN_MS = 3000;   // a device with no voice: time to read the directions
  const PAUSE = { word: 150, sound: 450, line: 900 }; // the hub's pauses in a lesson
  const $ = (id) => document.getElementById(id);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  let run = null;                        // the lesson being done now
  let readRun = 0;                       // a newer reading ends an older one

  /* ---------- small helpers ---------- */
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function button(cls, text, onClick, label) { const b = el('button', cls, text); b.type = 'button'; if (label) b.setAttribute('aria-label', label); if (onClick) b.onclick = onClick; return b; }
  const wordsIn = (text) => String(text).split(/\s+/).filter(Boolean);
  const bare = (w) => w.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '').replace(/^'+|'+$/g, '');
  const cancelled = () => { const e = new Error('left the lesson'); e.left = true; return e; };
  // Every wait for the kid goes through here, so leaving the lesson ends it
  function ask(build) {
    const mine = run;
    return new Promise((resolve, reject) => {
      if (!mine || mine.over) return reject(cancelled());
      mine.cancel = () => reject(cancelled());
      build(resolve);
    }).then(v => { if (mine.over) throw cancelled(); return v; });
  }

  /* ---------- reading aloud ---------- */
  function wrapLine(text) { const p = el('p', ''); if (window.QPSRead) QPSRead.wrap(p, text); else p.textContent = text; return p; }
  function sayEl(p) { if (window.QPSRead) return QPSRead.say(p); return ATQSound.text(p.textContent).then(() => 'end'); }

  // A line of a lesson: words, {letter names} and /sounds/ (lessons.js explains the markup)
  function lessonLine(line) {
    const p = el('p', 'l-line');
    const segs = [];
    let run_ = null;
    String(line).split(/(\/[a-z_]+(?:=[a-z_]+)?\/|\{[a-z]+\})/).forEach(tok => {
      if (!tok) return;
      const sound = /^\/([a-z_]+)(?:=([a-z_]+))?\/$/.exec(tok);
      if (sound) {
        const chip = button('l-sound', sound[1], null, `Hear the sound for ${sound[1]}`);
        chip.onclick = () => lightWhile([chip], () => ATQSound.sound(sound[2] || sound[1]));
        p.append(chip);
        segs.push({ kind: 'sound', file: sound[2] || sound[1], el: chip });
        run_ = null;
        return;
      }
      if (!run_) { run_ = { kind: 'text', el: el('span', 'l-run'), say: [] }; p.append(run_.el); segs.push(run_); }
      const letters = /^\{([a-z]+)\}$/.exec(tok);
      if (letters) {
        run_.el.append(el('span', 'rw l-letters', letters[1]));
        run_.say.push(letters[1].toUpperCase().split('').join('-'));     // capitals: the voice says letter names
      } else {
        tok.split(/(\s+)/).forEach(t => {
          if (!t) return;
          if (/^\s+$/.test(t)) { run_.el.append(document.createTextNode(t)); return; }
          run_.el.append(el('span', 'rw', t));
          run_.say.push(t);
        });
      }
    });
    segs.forEach(sg => { if (sg.kind === 'text') sg.el.dataset.say = sg.say.join(' ').replace(/^[\s.,;:!?)]+/, ''); });
    return { el: p, segs };
  }
  async function lightWhile(els, play) {
    els.forEach(e => e.classList.add('lit'));
    try { return await play(); } finally { els.forEach(e => e.classList.remove('lit')); }
  }
  // Read lesson lines in order (sound tiles play his recordings). 'end' only when read to the end.
  async function readLines(lines, onLine) {
    const mine = ++readRun;
    for (const [i, line] of lines.entries()) {
      if (onLine) onLine(i);
      // only the parts with something to say (a "." left after a sound tile is not a pause of its own)
      const segs = line.segs.filter(sg => sg.kind === 'sound' || /[a-z0-9]/i.test(sg.el.dataset.say));
      for (const [k, sg] of segs.entries()) {
        if (mine !== readRun) return 'stopped';
        if (sg.kind === 'sound') await lightWhile([sg.el], () => ATQSound.sound(sg.file));
        else {
          const how = await sayEl(sg.el);
          if (how === 'novoice') return 'novoice';
          if (how !== 'end') return 'stopped';
        }
        const next = segs[k + 1];
        await wait(!next ? PAUSE.line : sg.kind === 'sound' || next.kind === 'sound' ? PAUSE.sound : PAUSE.word);
      }
    }
    if (onLine) onLine(-1);
    return mine === readRun ? 'end' : 'stopped';
  }

  /* ---------- directions that must be heard first ----------
     The hub's rule (Marcos 10/19: "the directions should be forced to be hit before they can hit
     anything"): the work stays locked until the directions are heard to the end. A device with no
     voice gets a reading wait, then "I read it". Afterwards the 🔊 reads them again any time. */
  function direction(host, text) {
    const row = el('div', 'l-direction');
    const p = wrapLine(text);
    const btn = button('l-say', '🔊', null, 'Hear the directions');
    btn.onclick = () => { ++readRun; sayEl(p); };
    row.append(btn, p);
    host.append(row);
    return { row, btn, p, text };
  }
  function mustHear(dir, work, onOpen) {
    let open = false, reading = false;
    work.inert = true;
    work.classList.add('l-locked');
    dir.row.classList.add('l-must-hear');
    const note = el('p', 'l-hear-note', '👆 Tap 🔊 to hear the directions first.');
    dir.row.after(note);
    const unlock = () => {
      if (open) return;
      open = true;
      work.inert = false;
      work.classList.remove('l-locked');
      dir.row.classList.remove('l-must-hear');
      note.remove();
      dir.btn.onclick = () => { ++readRun; sayEl(dir.p); };
      if (onOpen) onOpen();
    };
    dir.btn.onclick = async () => {
      if (reading) return;                               // a second tap must not cut the reading off
      reading = true;
      ++readRun;
      const how = await sayEl(dir.p);
      reading = false;
      if (open) return;
      if (how === 'end') return unlock();
      if (how === 'novoice') return readItYourself(note, dir.text, unlock);
      note.textContent = '👆 The reading stopped early. Tap 🔊 to hear the directions to the end.';
    };
    return { unlock };
  }
  function readItYourself(note, text, unlock) {
    note.textContent = '📖 Read the directions. Then tap I read it.';
    const ok = button('l-btn l-read-it', '⏳ Read the directions first', unlock);
    ok.disabled = true;
    note.append(' ', ok);
    setTimeout(() => { ok.disabled = false; ok.textContent = '✅ I read it'; }, Math.max(READ_MIN_MS, wordsIn(text).length * READ_MS_PER_WORD));
  }

  /* ---------- the screen ---------- */
  function screen(title, sub) {
    ++readRun;
    ATQSound.stop();
    const area = $('lessonArea');
    area.innerHTML = '';
    area.dataset.screen = title;
    const head = el('div', 'l-head');
    head.append(el('h2', 'l-title', title));
    if (sub) head.append(el('p', 'l-sub', sub));
    area.append(head);
    window.scrollTo(0, 0);
    return area;
  }
  // The next thing to press comes onto the screen (Marcos 10/10: "the page should move up so" it shows)
  const onScreen = (e) => { if (e && e.scrollIntoView) setTimeout(() => e.scrollIntoView({ block: 'nearest' }), 30); return e; };
  function nextButton(host, text, sub, resolve) {
    const b = button('l-btn l-next', '', () => { b.disabled = true; resolve(); });
    b.append(el('span', '', text));
    if (sub) b.append(el('span', 'l-btn-sub', sub));
    host.append(b);
    return onScreen(b);
  }
  function renderPath() {
    const box = $('lessonPath');
    box.innerHTML = '';
    if (!run) return;
    run.steps.forEach((key, i) => {
      const s = STEPS.find(x => x.key === key);
      const chip = el('span', 'l-path-step' + (i < run.at ? ' done' : i === run.at ? ' now' : ''), `${i < run.at ? '✅' : s.icon} ${s.name}`);
      box.append(chip);
    });
  }

  /* ---------- read, hear, mark (tricky words, the sound, blending) ----------
     items: [{ show: el builder, hear: () => Promise, label }]; returns the labels marked missed the first time */
  async function readHearMark(host, items, { before, kind }) {
    const queue = items.map((it, i) => ({ ...it, i, again: false }));
    const missed = [];
    let n = 0;
    while (queue.length) {
      const it = queue.shift();
      n++;
      const marked = await ask(resolve => {
        host.innerHTML = '';
        const count = el('p', 'l-count', it.again ? `🔁 One more time` : `${kind} ${it.i + 1} of ${items.length}`);
        const card = el('div', 'l-card');
        let ready = null;
        // a blend word: the check opens only after the last part is tapped, then the think time
        const shown = it.show(card, () => { hear.textContent = '⏳ Think…'; setTimeout(() => ready && ready(), THINK_MS); });
        const hint = el('p', 'l-hint', before || 'Whisper the word. Then tap the 🔊 Check button.');
        const hear = button('l-btn l-hear', it.gated ? '👆 Tap every part first' : '⏳ Think…', null, `Hear ${it.label}`);
        hear.disabled = true;
        const marks = el('div', 'l-marks');
        marks.hidden = true;
        const yes = button('l-btn l-yes', '✓ I got it', () => resolve(true));
        const no = button('l-btn l-no', '✗ I missed it', () => resolve(false));
        marks.append(yes, no);
        host.append(count, card, hint, hear, marks);
        ready = () => {
          hear.disabled = false; hear.textContent = '🔊 Check';
          hear.onclick = async () => {
            hear.disabled = true;
            await lightWhile([hear, ...(shown || [])], it.hear);
            hear.disabled = false; hear.textContent = '🔊 Hear again';
            marks.hidden = false;
            onScreen(marks);
          };
        };
        if (!it.gated) setTimeout(ready, THINK_MS);       // a blend word waits for its last part to be tapped
      });
      if (!marked && !it.again) {
        missed.push(it.label);
        queue.splice(Math.min(2, queue.length), 0, { ...it, again: true });   // back two, then once more
      }
      save();
    }
    return missed;
  }

  /* ========== STEP 1: TRICKY WORDS (HILL steps 1–2) ========== */
  async function stepTricky() {
    const L = run.lesson, words = L.tricky.words;
    for (const [i, t] of words.entries()) {
      await ask(resolve => {
        const area = screen(`🧩 Tricky word ${i + 1} of ${words.length}`);
        const dir = direction(area, i === 0
          ? `A tricky word has a part that does not say the sound you expect. Listen to learn the tricky word ${t.word}.`
          : `Listen to learn the tricky word ${t.word}.`);
        const work = el('div', 'l-work');
        area.append(work);
        // the word, part by part: expected parts and the tricky part
        const word = el('div', 'l-word l-tricky');
        const tiles = t.parts.map(part => { const s = el('span', 'l-part' + (t.odd[part] ? ' odd' : ''), part); word.append(s); return s; });
        work.append(word);
        const exp = t.parts.filter(p => !t.odd[p]), odd = t.parts.filter(p => t.odd[p]);
        const list = (xs) => xs.map(x => `{${x}}`).join(xs.length > 2 ? ', ' : ' and the ').replace(/, (\{[a-z]+\})$/, ', and the $1');
        const lines = [
          lessonLine(`This word is ${t.word}.`),
          lessonLine(exp.length === 1 ? `The ${list(exp)} says the sound you expect.` : `The ${list(exp)} say the sounds you expect.`),
          lessonLine(`${odd.length === 1 ? `The ${list(odd)} is the tricky part.` : `The ${list(odd)} are the tricky parts.`} In ${t.word}, ` +
            odd.map(o => `the {${o}} says /${t.odd[o]}/`).join(', and ') + '.')
        ];
        const lesson = el('div', 'l-lesson');
        lines.forEach(l => lesson.append(l.el));
        const listen = button('l-btn l-listen', '▶ Listen to the lesson');
        work.append(lesson, listen);
        const spell = el('div', 'l-spell-tiles');
        spell.hidden = true;
        work.append(spell);
        const glow = (k) => tiles.forEach((tile, j) => tile.classList.toggle('lit', k === 1 ? !t.odd[t.parts[j]] : k === 2 ? !!t.odd[t.parts[j]] : false));
        let heard = false;
        listen.onclick = async () => {
          listen.disabled = true;
          const how = await readLines(lines, glow);
          listen.disabled = false;
          listen.textContent = '▶ Listen again';
          if (how === 'novoice' && !heard) { heard = true; spellIt(); }
          if (how === 'end' && !heard) { heard = true; spellIt(); }
        };
        // HILL: "Spell ___" (tap each letter), then "Word?"
        function spellIt() {
          spell.hidden = false;
          spell.append(el('p', 'l-hint', `Spell ${t.word}. Tap each letter.`));
          const row = el('div', 'l-letters-row');
          const letters = t.word.split('').map((ch, j) => {
            const b = button('l-letter', ch, null, `Letter ${j + 1}`);
            b.disabled = j > 0;
            b.onclick = async () => {
              b.disabled = true; b.classList.add('done');
              await lightWhile([b], () => ATQSound.letters(ch));
              if (letters[j + 1]) letters[j + 1].disabled = false; else readAgain();
            };
            row.append(b);
            return b;
          });
          spell.append(row);
          letters[0].focus();
          onScreen(row);
        }
        function readAgain() {
          spell.append(el('p', 'l-hint', `Now whisper the word ${t.word}. Then tap the 🔊 Check button.`));
          const hear = button('l-btn l-hear', '🔊 Check', async () => {
            hear.disabled = true;
            await lightWhile([hear, word], () => ATQSound.word(t.word));
            hear.disabled = false; hear.textContent = '🔊 Hear again';
            if (!next) next = nextButton(spell, i + 1 < words.length ? 'Next tricky word ▶' : 'Practice the tricky words ▶', '', resolve);
          });
          let next = null;
          spell.append(hear);
          onScreen(hear);
        }
        mustHear(dir, work);
      });
    }
    // HILL step 2: the practice grid
    await ask(resolve => {
      const area = screen('🧩 Tricky word practice');
      const dir = direction(area, 'Read each tricky word. Whisper the word. Then tap the 🔊 Check button. Then tap I got it, or tap I missed it.');
      const work = el('div', 'l-work');
      area.append(work);
      const go = button('l-btn l-next', 'Start ▶');
      work.append(go);
      mustHear(dir, work);
      go.onclick = () => resolve();
    });
    const host = screen('🧩 Tricky word practice');
    const box = el('div', 'l-work');
    host.append(box);
    const missed = await readHearMark(box, L.tricky.practice.map(w => ({
      label: w, show: (card) => { const s = el('div', 'l-word', w); card.append(s); return [s]; }, hear: () => ATQSound.word(w)
    })), { kind: 'Word' });
    run.data.missed.tricky.push(...missed);
  }

  /* ========== STEP 2: THE SOUND (HILL step 3) ========== */
  async function stepSound() {
    const L = run.lesson, S = L.sound;
    await ask(resolve => {
      const area = screen('🔤 The sound');
      const dir = direction(area, 'Listen to the lesson about the quiet e.');
      const work = el('div', 'l-work');
      area.append(work);
      const lines = S.lines.map(lessonLine);
      const lesson = el('div', 'l-lesson');
      lines.forEach(l => lesson.append(l.el));
      // the examples: a word with no e, then the same word with a quiet e
      const ex = el('div', 'l-examples');
      const exLines = S.examples.map(([a, b]) => {
        const row = el('p', 'l-example');
        const wa = button('l-exword', a, null, `Hear ${a}`), wb = button('l-exword', b, null, `Hear ${b}`);
        wa.onclick = () => lightWhile([wa], () => ATQSound.word(a));
        wb.onclick = () => lightWhile([wb], () => ATQSound.word(b));
        row.append(wa, el('span', 'l-arrow', '→'), wb);
        ex.append(row);
        return [wa, wb, a, b];
      });
      const listen = button('l-btn l-listen', '▶ Listen to the lesson');
      work.append(lesson, ex, listen);
      let heard = false;
      listen.onclick = async () => {
        listen.disabled = true;
        const mine = readRun + 1;
        let how = await readLines(lines);
        for (const [wa, wb, a, b] of exLines) {
          if (how !== 'end' || readRun !== mine) break;
          await lightWhile([wa], () => ATQSound.word(a)); await wait(PAUSE.sound);
          await lightWhile([wb], () => ATQSound.word(b)); await wait(PAUSE.line);
          if (readRun !== mine) how = 'stopped';
        }
        listen.disabled = false;
        listen.textContent = '▶ Listen again';
        if ((how === 'end' || how === 'novoice') && !heard) { heard = true; nextButton(work, 'Practice the sound ▶', '', resolve); }
      };
      mustHear(dir, work);
    });
    await ask(resolve => {
      const area = screen('🔤 Sound practice');
      const dir = direction(area, 'Look at each spelling. Whisper the sound for the spelling. Then tap the 🔊 Check button. Then tap I got it, or tap I missed it.');
      const work = el('div', 'l-work');
      area.append(work);
      const go = button('l-btn l-next', 'Start ▶');
      work.append(go);
      mustHear(dir, work);
      go.onclick = () => resolve();
    });
    const host = screen('🔤 Sound practice');
    const box = el('div', 'l-work');
    host.append(box);
    const missed = await readHearMark(box, S.grid.map(g => ({
      label: g,
      show: (card) => { const s = spelling(g); card.append(s); return [s]; },
      hear: () => ATQSound.sound(S.sounds[g])
    })), { kind: 'Spelling', before: 'Whisper the sound. Then tap the 🔊 Check button.' });
    run.data.missed.sound.push(...missed);
  }
  // a_e shown as a, a gap, e (HILL's sound-spelling card)
  function spelling(g) {
    const s = el('div', 'l-word l-spelling');
    if (g.includes('_')) { const [a, b] = g.split('_'); s.append(el('span', '', a), el('span', 'l-gap', ''), el('span', '', b)); s.setAttribute('aria-label', `${a} blank ${b}`); }
    else s.textContent = g;
    return s;
  }

  /* ========== STEP 3: BLEND (HILL step 4a) ========== */
  async function stepBlend() {
    const L = run.lesson;
    await ask(resolve => {
      const area = screen('👆 Blend');
      const dir = direction(area, 'Tap each part of the word, and whisper the sound for that part. Then whisper the whole word. Then tap the 🔊 Check button.');
      const work = el('div', 'l-work');
      area.append(work);
      const go = button('l-btn l-next', 'Start ▶');
      work.append(go);
      mustHear(dir, work);
      go.onclick = () => resolve();
    });
    const host = screen('👆 Blend');
    const box = el('div', 'l-work');
    host.append(box);
    const missed = await readHearMark(box, L.blend.map(w => {
      const parts = w.split('|'), word = parts.join('');
      return {
        label: word,
        gated: true,
        show: (card, ready) => blendTiles(card, parts, ready),
        hear: () => ATQSound.word(word)
      };
    }), { kind: 'Word', before: 'Tap each part. Whisper each sound. Then whisper the whole word.' });
    run.data.missed.blend.push(...missed);
  }
  // The parts of a word as tiles, tapped left to right with NO sound. A vowel and a quiet e at the end are
  // one sound: they light up together, and the quiet e is not tapped.
  function blendTiles(card, parts, ready) {
    const word = el('div', 'l-word l-blend');
    const last = parts.length - 1;
    const quiet = parts[last] === 'e' && parts.length >= 3 && /^[aiou]$/.test(parts[last - 2]) && !/[aeiou]/.test(parts[last - 1]);
    const tiles = parts.map((p, i) => {
      const t = button('l-tile' + (quiet && i === last ? ' quiet' : '') + (quiet && i === last - 2 ? ' pair' : ''), p, null, quiet && i === last ? 'quiet e' : `part ${i + 1}`);
      word.append(t);
      return t;
    });
    card.append(word);
    const order = tiles.filter((t, i) => !(quiet && i === last));
    order.forEach((t, k) => {
      t.disabled = k > 0;
      t.classList.toggle('next', k === 0);
      t.onclick = () => {
        t.classList.add('tapped'); t.classList.remove('next');
        if (quiet && t === tiles[last - 2]) tiles[last].classList.add('tapped');
        t.disabled = true;
        const nxt = order[k + 1];
        if (nxt) { nxt.disabled = false; nxt.classList.add('next'); nxt.focus(); }
        else {
          card.append(el('p', 'l-hint l-whole', 'Now whisper the whole word.'));
          ready();
        }
      };
    });
    setTimeout(() => order[0].focus(), 50);
    return [word];
  }

  /* ========== STEP 4: BEAT THE VOICE (HILL step 5) ========== */
  async function stepSpeed() {
    const L = run.lesson, rows = L.speed.rows, waits = L.speed.waits;
    await ask(resolve => {
      const area = screen('⚡ Beat the voice');
      const dir = direction(area, 'A word will show. Whisper the word before the voice says the word. Try to beat the voice!');
      const work = el('div', 'l-work');
      area.append(work);
      const go = button('l-btn l-next', 'Start row 1 ▶');
      work.append(go);
      mustHear(dir, work);
      go.onclick = () => resolve();
    });
    for (const [r, row] of rows.entries()) {
      if (r > 0) {
        await ask(resolve => {
          const area = screen('⚡ Beat the voice', `Row ${r + 1} of ${rows.length}`);
          const dir = direction(area, `Row ${r} is done! In row ${r + 1}, the voice waits ${waits[r]} ${waits[r] === 1 ? 'second' : 'seconds'}. Be fast!`);
          const work = el('div', 'l-work');
          area.append(work);
          nextButton(work, `Start row ${r + 1} ▶`, '', resolve);
          mustHear(dir, work);
        });
      }
      const area = screen('⚡ Beat the voice', `Row ${r + 1} of ${rows.length} · the voice waits ${waits[r]} ${waits[r] === 1 ? 'second' : 'seconds'}`);
      const work = el('div', 'l-work');
      area.append(work);
      for (const [k, w] of row.entries()) {
        await ask(async resolve => {
          work.innerHTML = '';
          work.append(el('p', 'l-count', `Word ${k + 1} of ${row.length}`));
          const card = el('div', 'l-card');
          const word = el('div', 'l-word l-speed', w);
          const bar = el('div', 'l-timer'); const fill = el('span', '');
          bar.append(fill);
          card.append(word, bar);
          work.append(card);
          fill.style.transitionDuration = waits[r] + 's';
          requestAnimationFrame(() => requestAnimationFrame(() => fill.classList.add('go')));
          await wait(waits[r] * 1000);
          if (!run || run.over) return;
          await lightWhile([word], () => ATQSound.word(w));
          await wait(500);
          resolve();
        });
      }
    }
  }

  /* ========== STEP 5: THE STORY, 3 READS (HILL step 6) ========== */
  async function stepStory() {
    const L = run.lesson, title = L.story.title;
    for (let read = 1; read <= 3; read++) {
      if (run.data.reads[read - 1] != null) continue;     // a read already done (picked up again)
      await ask(resolve => {
        const area = screen(`📖 ${title}`, `Read ${read} of 3`);
        const dir = direction(area, read === 1
          ? `Read the story ${title}. Whisper every word. If you get stuck on a word, tap the word to hear the word.`
          : read === 2 ? `Read ${title} again. No help this time. Whisper every word.`
          : `Read ${title} one more time. No help this time. Whisper every word.`);
        const work = el('div', 'l-work');
        area.append(work);
        nextButton(work, `Start read ${read} ▶`, read === 1 ? 'You can tap a word for help.' : 'No help this time.', resolve);
        mustHear(dir, work);
      });
      const started = Date.now();
      for (const [i, page] of L.story.pages.entries()) {
        await ask(resolve => storyPage(L, i, page, read, resolve));
      }
      run.data.reads[read - 1] = Math.round((Date.now() - started) / 1000);
      save();
      sendProgress();
    }
    // the picture, after read 3 (Marcos 10/25: words only on the story pages)
    await ask(resolve => {
      const area = screen(`🎉 You read ${title} 3 times!`);
      const dir = direction(area, `You read ${title} 3 times! Here is a picture of the story.`);
      const work = el('div', 'l-work');
      area.append(work);
      const img = el('img', 'l-picture');
      img.src = L.story.picture; img.alt = L.story.pictureAlt || title;
      work.append(img);
      nextButton(work, 'Answer the questions ▶', '', resolve);
      mustHear(dir, work);
    });
  }
  function storyPage(L, i, page, read, resolve) {
    const area = screen(`📖 ${L.story.title}`, `Read ${read} of 3 · page ${i + 1} of ${L.story.pages.length}`);
    const sheet = el('div', 'l-story');
    if (i === 0) sheet.append(el('h3', 'l-story-title', L.story.title));
    const text = el('p', 'l-story-text');
    wordsIn(page).forEach((tok, k) => {
      if (k) text.append(' ');
      if (read === 1) {
        // read 1: a word is a button — tap it to hear it; every tap is saved (Marcos 10/25)
        const w = button('l-sword', tok, null, `Hear ${bare(tok)}`);
        w.onclick = () => {
          run.data.taps.push({ word: bare(tok).toLowerCase(), page: i + 1 });
          save();
          lightWhile([w], () => ATQSound.word(bare(tok).toLowerCase()));   // lowercase: a lone "A" would be said as the letter name
        };
        text.append(w);
      } else text.append(el('span', 'l-sw', tok));
    });
    sheet.append(text);
    area.append(sheet);
    const last = i === L.story.pages.length - 1;
    const label = last ? `I finished read ${read} ✓` : 'Next page ▶';
    const b = nextButton(area, label, '', resolve);
    if (read > 1) {
      // reads 2–3: Next waits about 1 second per word, so a page can't be skipped
      const ms = wordsIn(page).length * STORY_MS_PER_WORD;
      b.disabled = true;
      b.classList.add('l-waiting');
      b.style.setProperty('--wait', ms + 'ms');
      requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add('go')));
      setTimeout(() => { b.disabled = false; b.classList.remove('l-waiting'); }, ms);
    }
  }

  /* ========== STEP 6: QUESTIONS ========== */
  async function stepQuestions() {
    const L = run.lesson, qs = L.questions;
    await ask(resolve => {
      const area = screen('❓ Questions');
      const dir = direction(area, `Answer ${qs.length} questions about ${L.story.title}. Tap a 🔊 button to hear a question or an answer.`);
      const work = el('div', 'l-work');
      area.append(work);
      nextButton(work, 'Start ▶', '', resolve);
      mustHear(dir, work);
    });
    for (const [i, q] of qs.entries()) {
      if (run.data.answers[i]) continue;
      await ask(resolve => {
        const area = screen('❓ Questions', `Question ${i + 1} of ${qs.length}`);
        const qrow = el('div', 'l-question');
        const qp = wrapLine(q.q);
        qp.className = 'l-qtext';
        const qsay = button('l-say', '🔊', () => { ++readRun; sayEl(qp); }, 'Hear the question');
        qrow.append(qsay, qp);
        const all = button('l-btn l-hear-all', '🔊 Hear the question and the answers');
        area.append(qrow, all);
        const choices = el('div', 'l-choices');
        const order = shuffle(q.choices);
        const texts = [];
        order.forEach(c => {
          const b = button('l-choice', '');
          const spk = el('span', 'l-choice-say', '🔊');
          spk.setAttribute('role', 'button'); spk.setAttribute('aria-label', `Hear ${c}`); spk.tabIndex = 0;
          const t = wrapLine(c); t.className = 'l-choice-text';
          texts.push(t);
          spk.onclick = (e) => { e.stopPropagation(); ++readRun; sayEl(t); };
          spk.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); ++readRun; sayEl(t); } };
          b.append(spk, t);
          b.onclick = () => answer(c, b);
          choices.append(b);
        });
        area.append(choices);
        all.onclick = async () => {
          const mine = ++readRun;
          for (const p of [qp, ...texts]) { if (mine !== readRun) return; const how = await sayEl(p); if (how !== 'end') return; await wait(300); }
        };
        const fb = el('div', 'l-feedback');
        area.append(fb);
        function answer(c, b) {
          if (run.data.answers[i]) return;
          ++readRun; ATQSound.stop();
          const right = c === q.answer;
          run.data.answers[i] = { q: i + 1, picked: c, right };
          save();
          [...choices.children].forEach(x => { x.disabled = true; });
          b.classList.add(right ? 'right' : 'wrong');
          if (!right) [...choices.children].find(x => x.textContent.replace('🔊', '').trim() === q.answer).classList.add('right');
          const line = wrapLine(right ? `✅ Yes! The answer is ${q.answer}.` : `Not quite. The answer is ${q.answer}.`);
          const say = button('l-say', '🔊', () => { ++readRun; sayEl(line); }, 'Hear this');
          const row = el('div', 'l-direction'); row.append(say, line);
          fb.append(row);
          nextButton(fb, i + 1 < qs.length ? 'Next question ▶' : run.kind === 'reread' ? 'Finish ▶' : 'Spell a sentence ▶', '', resolve);
        }
      });
    }
  }
  function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  /* ========== STEP 7: SPELL A SENTENCE (HILL step 7b) ========== */
  async function stepSpell() {
    const L = run.lesson, sentence = L.dictation, want = wordsIn(sentence).map(w => bare(w));
    const norm = (s) => String(s).toLowerCase().replace(/[^a-z']/g, '');
    await ask(resolve => {
      const area = screen('✏️ Spell a sentence');
      const dir = direction(area, 'Listen to the sentence. Type each word in a box. Then tap Check.');
      const work = el('div', 'l-work');
      area.append(work);
      const hear = button('l-btn l-listen', '🔊 Hear the sentence');
      const boxes = el('div', 'l-boxes');
      const inputs = want.map((w, i) => {
        const cell = el('div', 'l-box');
        const inp = el('input', 'l-input');
        inp.type = 'text'; inp.autocomplete = 'off'; inp.spellcheck = false; inp.setAttribute('autocapitalize', 'off');
        inp.setAttribute('aria-label', `Word ${i + 1}`);
        inp.size = Math.max(4, w.length + 2);
        inp.addEventListener('paste', e => e.preventDefault());
        inp.addEventListener('drop', e => e.preventDefault());
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
        const fix = el('p', 'l-fix');
        cell.append(inp, fix);
        boxes.append(cell);
        return { inp, fix, cell, want: w, firstTry: true, right: false };
      });
      const check = () => {
        if (inputs.some(x => !x.right && !x.inp.value.trim())) { msg.textContent = 'Type a word in every box.'; return; }
        msg.textContent = '';
        inputs.forEach(x => {
          if (x.right) return;
          const typed = x.inp.value.trim();
          if (norm(typed) === norm(x.want)) {
            x.right = true; x.inp.readOnly = true; x.cell.classList.remove('wrong'); x.cell.classList.add('right'); x.fix.textContent = '';
          } else {
            if (x.firstTry) run.data.spell.push({ want: x.want.toLowerCase(), typed: norm(typed) });
            x.cell.classList.add('wrong');
            x.fix.textContent = `✏️ The spelling is: ${x.want.toLowerCase()}. Type the word again.`;
            x.inp.value = '';
          }
          x.firstTry = false;
        });
        save();
        const wrong = inputs.find(x => !x.right);
        if (wrong) { wrong.inp.focus(); return; }
        checkBtn.hidden = true;
        const line = wrapLine('✅ You spelled the sentence!');
        const row = el('div', 'l-direction'); row.append(button('l-say', '🔊', () => { ++readRun; sayEl(line); }, 'Hear this'), line);
        work.append(row);
        nextButton(work, 'Finish ▶', '', resolve);
      };
      const checkBtn = button('l-btn l-check', '✓ Check', check);
      const msg = el('p', 'l-msg');
      const say = el('p', ''); say.dataset.say = sentence;
      if (window.QPSRead) QPSRead.wrap(say, sentence);
      say.hidden = true;                                 // the sentence is heard, not shown
      work.append(hear, say);
      const typing = el('div', 'l-typing');
      typing.append(boxes, checkBtn, msg);
      typing.inert = true; typing.classList.add('l-locked');
      work.append(typing);
      hear.onclick = async () => {
        hear.disabled = true;
        ++readRun;
        await ATQSound.text(sentence);
        hear.disabled = false; hear.textContent = '🔊 Hear the sentence again';
        typing.inert = false; typing.classList.remove('l-locked');
        const first = inputs.find(x => !x.right); if (first) first.inp.focus();
      };
      mustHear(dir, work);
    });
  }

  const STEP_FNS = { tricky: stepTricky, sound: stepSound, blend: stepBlend, speed: stepSpeed, story: stepStory, questions: stepQuestions, spell: stepSpell };

  /* ---------- the run: start, pick up again, save, results ---------- */
  const freshData = () => ({ missed: { tricky: [], sound: [], blend: [] }, taps: [], reads: [null, null, null], answers: [], spell: [] });
  const runKey = (who, key) => RUN_KEY + who + ':' + key;
  function save() {
    if (!run || run.over || !run.saveKey) return;
    try { localStorage.setItem(run.saveKey, JSON.stringify({ at: run.at, data: run.data, startedAt: run.startedAt, elapsedBefore: run.elapsedBefore + seconds(), sessionId: run.sessionId })); } catch (e) {}
  }
  const seconds = () => Math.round((Date.now() - run.segmentStart) / 1000);
  function savedRun(who, key) { try { return JSON.parse(localStorage.getItem(runKey(who, key)) || 'null'); } catch (e) { return null; } }
  function forget(who, key) { try { localStorage.removeItem(runKey(who, key)); } catch (e) {} }

  // What Mr. O's dashboard shows for a finished lesson (Marcos 10/25 picked all four)
  function summary(d) {
    const uniq = (xs) => [...new Set(xs)];
    const taps = d.taps.map(t => t.word);
    const marked = uniq([...d.missed.tricky.map(w => `${w} (tricky word)`), ...d.missed.sound.map(w => `${w} (sound)`), ...d.missed.blend.map(w => `${w} (blend)`)]);
    const qMissed = d.answers.filter(a => a && !a.right).map(a => `Q${a.q}`);
    return [
      `Help taps (read 1): ${taps.length}${taps.length ? ' — ' + uniq(taps).join(', ') : ''}`,
      `Marked missed: ${marked.length ? marked.join(', ') : 'none'}`,
      `Spelled: ${d.spell.length ? d.spell.map(s => `${s.want} → ${s.typed || '(blank)'}`).join(', ') : 'all right the first time'}`,
      `Questions missed: ${qMissed.length ? qMissed.join(', ') : 'none'}`,
      `Reads: ${d.reads.map(s => (s == null ? '—' : s + ' s')).join(' · ')}`
    ].join(' | ');
  }
  function resultRow(done) {
    const L = run.lesson, d = run.data;
    const right = d.answers.filter(a => a && a.right).length;
    const elapsed = run.elapsedBefore + seconds();
    return {
      game: RESULTS_GAME, sessionId: run.sessionId,
      form: `${L.id} · ${L.name} · ${L.story.title} · ${run.kind === 'reread' ? 'Re-read' : 'Lesson'}`,
      score: right, correct: right, total: L.questions.length, maxScore: L.questions.length,
      percent: Math.round(right / L.questions.length * 100), done, elapsed, tabSwitches: 0,
      wrongQuestions: summary(d),
      startedAt: new Date(run.startedAt).toISOString(), finishedAt: done ? new Date().toISOString() : '',
      events: JSON.stringify({ v: 1, lesson: L.id, kind: run.kind, step: run.steps[run.at] || 'done', steps: run.at,
        taps: d.taps, missed: d.missed, spell: d.spell, reads: d.reads, answers: d.answers })
    };
  }
  function sendProgress() {
    if (!run || run.preview) return;
    ATQLogin.send(resultRow(false));
    if (run.onStep) run.onStep(run.at);
  }

  /**
   * Start (or pick up) a lesson.
   * opts: { kind: 'lesson' | 'reread', preview: true = nothing saved or sent, saveKey: what the run is saved under
   *         (the assignment's id), startAt: a step to start at (Mr. O's preview), onStep(stepsDone), onDone(result) }
   */
  async function start(lesson, opts = {}) {
    quit();
    const who = ATQLogin.who().name || 'guest';
    const kind = opts.kind || 'lesson';
    const steps = kind === 'reread' ? REREAD : STEPS.map(s => s.key);
    const key = opts.saveKey ? (kind + ':' + opts.saveKey) : null;
    const old = key && !opts.preview ? savedRun(who, key) : null;
    run = {
      lesson, kind, steps, preview: !!opts.preview, onStep: opts.onStep, onDone: opts.onDone,
      saveKey: key && !opts.preview ? runKey(who, key) : null,
      at: old ? Math.min(old.at, steps.length - 1) : Math.max(0, steps.indexOf(opts.startAt || steps[0])),
      data: old ? { ...freshData(), ...old.data } : freshData(),
      startedAt: old ? old.startedAt : Date.now(), segmentStart: Date.now(), elapsedBefore: old ? old.elapsedBefore || 0 : 0,
      sessionId: old ? old.sessionId : `ATQ-${lesson.id}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      over: false
    };
    const mine = run;
    renderPath();                                        // never the chips of the lesson before
    if (window.ATQApp) ATQApp.show('lessonView');
    $('lessonName').textContent = `${lesson.name} · ${lesson.story.title}`;
    $('previewBar').hidden = !(run.preview && ATQLogin.who().kind === 'teacher');   // a guest has share.js's own strip
    try {
      if (!old && !opts.startAt) await intro(lesson, kind);
      while (run.at < steps.length) {
        renderPath();
        save();
        // a step that was cut off starts again from its beginning (answers from finished parts are kept)
        const key = steps[run.at];
        if (key === 'tricky') run.data.missed.tricky = [];
        if (key === 'sound') run.data.missed.sound = [];
        if (key === 'blend') run.data.missed.blend = [];
        if (key === 'spell') run.data.spell = [];
        if (key === 'story' && run.data.reads[0] == null) run.data.taps = [];
        await STEP_FNS[key]();
        if (run !== mine) return;
        run.at++;
        if (run.at < steps.length) { save(); sendProgress(); }
      }
      await finish();
    } catch (e) {
      if (!e.left) throw e;
    }
  }
  async function intro(lesson, kind) {
    await ask(resolve => {
      const area = screen(kind === 'reread' ? `📖 Read ${lesson.story.title} again` : `📌 ${lesson.name}`);
      const dir = direction(area, kind === 'reread'
        ? `You will read the story ${lesson.story.title} 3 times. Then you will answer ${lesson.questions.length} questions.`
        : `Today you will practice words like ${lesson.example}, where a quiet e makes the a say its name. At the end, you will read a story called ${lesson.story.title}.`);
      const work = el('div', 'l-work');
      area.append(work);
      const list = el('ol', 'l-plan');
      run.steps.forEach(k => { const s = STEPS.find(x => x.key === k); list.append(el('li', '', `${s.icon} ${s.name}`)); });
      work.append(list);
      nextButton(work, 'Start ▶', '', resolve);
      mustHear(dir, work);
    });
  }
  async function finish() {
    const L = run.lesson, d = run.data, mine = run;
    run.at = run.steps.length;
    renderPath();
    const right = d.answers.filter(a => a && a.right).length;
    if (!run.preview) ATQLogin.send(resultRow(true));
    if (run.saveKey) { try { localStorage.removeItem(run.saveKey); } catch (e) {} }
    const result = { right, total: L.questions.length, data: d };
    const area = screen(run.kind === 'reread' ? `🎉 You read ${L.story.title} again!` : `🎉 You finished ${L.name}!`);
    const dir = direction(area, `${run.kind === 'reread' ? `You read ${L.story.title} 3 more times.` : `You finished the lesson ${L.name}.`} You got ${right} of ${L.questions.length} questions right.`);
    dir.row.classList.add('l-end');
    const work = el('div', 'l-work');
    area.append(work);
    run.over = true;
    if (mine.onDone) mine.onDone(result, work);
    return result;
  }
  // Leave the lesson (Back to My Lessons, sign out): what was done stays saved on this device
  function quit() {
    if (!run) return;
    if (!run.over && !run.preview) { save(); }
    run.over = true;
    if (run.cancel) run.cancel();
    ++readRun;
    ATQSound.stop();
    run = null;
  }
  const hasSaved = (key, kind = 'lesson') => !!savedRun(ATQLogin.who().name || 'guest', kind + ':' + key);
  // Mr. O's preview: skip to the next step
  function skip() {
    if (!run || !run.preview || run.over) return;
    const { lesson, kind, steps, at, onDone } = run;
    if (at + 1 >= steps.length) return;
    start(lesson, { preview: true, kind, startAt: steps[at + 1], onDone });
  }

  return { STEPS, REREAD, STEP_COUNT: STEPS.length, RESULTS_GAME, start, quit, skip, hasSaved, summary, _forget: forget };
})();
