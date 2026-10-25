/* =====================================================================
   Run before every push:   node tools/check-lesson.js
   Checks each lesson in lessons.js against the plan Marcos approved
   (10/25/2026) and HILL's rules for planning from the story:
     - the story is 80–90% decodable (HILL: "100% makes stilted text;
       below 80% means helping with every fourth word"), with lots of the
       lesson's spelling; 4–6 pages of 1–2 sentences; about 60–80 words
     - the blend and speed words come out of the story and use the spelling
     - the tricky words are irregular words from the story
     - the sentence to spell uses NEW words with the spelling and a tricky word
     - each question's answer is on the page it names
     - no "it" in what a kid reads (Marcos 10/10: "say what you are talking about")
     - every recording and picture the lesson uses is in the folder
   "Decodable" here = what a kid who passed QPS stops 1–5 can sound out: one
   syllable, short vowels, sh ch th wh ck ng, blends, double letters, the
   quiet e (a_e i_e o_e u_e), plus s or 's at the end. Anything else is not.
   Exits 1 if a rule is broken.
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const ctx = { window: {} };
vm.createContext(ctx);
// node tools/check-lesson.js [lessons file] — the test suite hands it a copy with a planted defect
vm.runInContext(fs.readFileSync(process.argv[2] || path.join(ROOT, 'lessons.js'), 'utf8'), ctx);
const LESSONS = ctx.window.ATQ_LESSONS;

// Irregular for this reader, even when the letters look regular (the quiet-e lookalikes first)
const IRREGULAR = new Set(('have give live come some done gone none one once love dove glove move lose whose were there where ' +
  'the a to do two too who was said of you your they what are or for from be he she we me no go so my by i').split(' '));
const CONS = 'bcdfghjklmnpqrstvwxyz';
const ONSET = new RegExp(`^(?:qu|sh|ch|th|wh|[${CONS}])*$`);

// One syllable a kid who passed stops 1–5 can sound out
function decodable(raw) {
  let w = raw.toLowerCase();
  if (IRREGULAR.has(w)) return false;
  if (/'s$/.test(w)) w = w.slice(0, -2);
  const tries = [w];
  if (/[^s]s$/.test(w)) tries.push(w.slice(0, -1));          // cakes → cake, but not "less"
  return tries.some(x => !IRREGULAR.has(x) && (closed(x) || quietE(x)));
}
function split(x) {
  const m = /^((?:qu|[bcdfghjklmnpqrstvwxyz])*)([aeiou])(.*)$/.exec(x);
  return m && { onset: m[1], vowel: m[2], rest: m[3] };
}
function closed(x) {
  const p = split(x);
  if (!p || !ONSET.test(p.onset)) return false;
  if (!p.rest) return false;                                  // an open syllable (go, he) is not taught yet
  if (/[aeiouyrw]/.test(p.rest[0]) || /[aeiouy]/.test(p.rest)) return false;   // vowel teams, bossy r, aw/ow
  if (/^(ll|lk|lt|ld)$/.test(p.rest) && 'ao'.includes(p.vowel)) return false;   // all, talk, old: glued sounds
  if (/^(nd|ld)$/.test(p.rest) && p.vowel === 'i') return false;               // kind, mild
  return /^(?:ck|ng|nk|sh|ch|th|tch|ff|ll|ss|zz|[bcdfghjklmnpqstvxz])+$/.test(p.rest);
}
function quietE(x) {
  const p = split(x);
  if (!p || !ONSET.test(p.onset)) return false;
  return /^(?:[bcdfgklmnpstvz]|th)e$/.test(p.rest) && 'aiou'.includes(p.vowel);
}
const hasPattern = (w, pattern) => {
  const v = pattern[0];
  const x = w.toLowerCase().replace(/'s$/, '').replace(/([^s])s$/, '$1');
  const p = split(x);
  return !!p && quietE(x) && p.vowel === v;
};

const words = text => (String(text).match(/[A-Za-z']+/g) || []).map(t => t.replace(/^'+|'+$/g, '')).filter(Boolean);
// sentences: . ! ? that end a sentence (not the ! inside "…!" said Jake)
function sentences(text) {
  return String(text).split(/(?<=[.!?]["”]?)\s+(?!said\b)/).filter(s => /[A-Za-z]/.test(s)).length;
}

let failed = 0;
const fail = (lesson, msg) => { failed++; console.log(`  ❌ ${msg}`); };
const ok = msg => console.log(`  ✓ ${msg}`);
const warn = msg => console.log(`  ⚠️  ${msg}`);

for (const L of LESSONS) {
  console.log(`\n${L.id} · ${L.name} · "${L.story.title}"`);
  const pages = L.story.pages;
  const storyWords = [...words(L.story.title), ...pages.flatMap(words)];
  const lower = storyWords.map(w => w.toLowerCase());
  const inStory = w => lower.includes(w) || lower.includes(w + 's') || lower.includes(w + "'s");
  const tricky = L.tricky.words.map(t => t.word);

  // the story
  const dec = storyWords.filter(decodable);
  const strict = Math.round(dec.length / storyWords.length * 1000) / 10;
  const withTricky = Math.round(storyWords.filter(w => decodable(w) || tricky.includes(w.toLowerCase())).length / storyWords.length * 1000) / 10;
  const notDec = [...new Set(storyWords.filter(w => !decodable(w)).map(w => w.toLowerCase()))];
  (strict >= 80 ? ok : m => fail(L, m))(`decodable: ${dec.length} of ${storyWords.length} words = ${strict}% (HILL 80–90%); with the lesson's tricky words ${withTricky}%`);
  if (strict > 90) warn('over 90% decodable: HILL says 100% makes stilted text');
  console.log(`     not decodable: ${notDec.join(', ')}`);
  const target = storyWords.filter(w => hasPattern(w, L.id));
  (target.length / storyWords.length >= 0.25 ? ok : m => fail(L, m))(`the spelling ${L.id}: ${target.length} of ${storyWords.length} words (${Math.round(target.length / storyWords.length * 100)}%) — "lots of the pattern"`);
  (pages.length >= 4 && pages.length <= 6 ? ok : m => fail(L, m))(`${pages.length} pages (4–6)`);
  pages.forEach((p, i) => { const n = sentences(p); if (n < 1 || n > 2) fail(L, `page ${i + 1} has ${n} sentences (1–2): ${p}`); });
  (storyWords.length >= 55 && storyWords.length <= 85 ? ok : m => fail(L, m))(`${storyWords.length} words in the story with its title (about 60–80)`);
  const unknown = storyWords.filter(w => !decodable(w) && !tricky.includes(w.toLowerCase()) && !['a', 'the'].includes(w.toLowerCase()));
  if (unknown.length) fail(L, `words that are neither decodable nor a tricky word (nor a or the): ${[...new Set(unknown)].join(', ')}`);

  // tricky words
  tricky.forEach(t => {
    if (!inStory(t)) fail(L, `tricky word "${t}" is not in the story`);
    if (decodable(t)) fail(L, `tricky word "${t}" is decodable — not tricky`);
  });
  L.tricky.words.forEach(t => {
    if (t.parts.join('') !== t.word) fail(L, `tricky word "${t.word}": its parts spell ${t.parts.join('')}`);
    Object.keys(t.odd).forEach(k => { if (!t.parts.includes(k)) fail(L, `tricky word "${t.word}": the odd part ${k} is not one of its parts`); });
  });
  tricky.forEach(t => { if (L.tricky.practice.filter(x => x === t).length < 2) fail(L, `"${t}" is in the tricky-word practice fewer than 2 times`); });
  ok(`tricky words ${tricky.join(', ')}: in the story, irregular, practiced twice each`);

  // blend and speed
  const blendWords = L.blend.map(b => b.replace(/\|/g, ''));
  blendWords.forEach(w => {
    if (!inStory(w)) fail(L, `blend word "${w}" is not in the story`);
    if (!hasPattern(w, L.id)) fail(L, `blend word "${w}" does not use ${L.id}`);
  });
  (blendWords.length >= 8 && blendWords.length <= 12 ? ok : m => fail(L, m))(`${blendWords.length} blend words from the story (HILL 8–12)`);
  const rows = L.speed.rows, top = rows.slice(0, -1).flat(), review = rows[rows.length - 1];
  if ([...top].sort().join() !== [...blendWords].sort().join()) fail(L, `the speed grid's top rows (${top.join(', ')}) are not the blend words`);
  review.forEach(w => { if (!inStory(w)) fail(L, `review word "${w}" is not in the story`); if (!decodable(w)) fail(L, `review word "${w}" is not decodable`); });
  if (L.speed.waits.length !== rows.length || L.speed.waits.some((s, i) => i && s >= L.speed.waits[i - 1])) fail(L, 'each speed row needs a wait, shorter than the row before');
  ok(`speed grid: ${top.length} blend words + ${review.length} review words, waits ${L.speed.waits.join(' → ')} s`);

  // questions
  L.questions.forEach((q, i) => {
    if (!q.choices.includes(q.answer)) fail(L, `question ${i + 1}: the answer is not a choice`);
    if (new Set(q.choices).size !== q.choices.length) fail(L, `question ${i + 1}: two choices are the same`);
    const page = pages[q.page - 1];
    if (!page) { fail(L, `question ${i + 1}: page ${q.page} does not exist`); return; }
    const key = words(q.answer).filter(w => !['a', 'the', 'big'].includes(w.toLowerCase()) || words(q.answer).length === 1);
    const pageWords = words(page).map(w => w.toLowerCase());
    key.forEach(w => { if (!pageWords.includes(w.toLowerCase())) fail(L, `question ${i + 1}: "${w}" (from the answer) is not on page ${q.page}`); });
  });
  (L.questions.length === 3 ? ok : m => fail(L, m))(`${L.questions.length} questions, each answer on its page`);

  // the sentence to spell
  const dict = words(L.dictation).map(w => w.toLowerCase());
  const practiced = new Set([...blendWords, ...rows.flat()]);
  const newPattern = dict.filter(w => hasPattern(w, L.id));
  if (!newPattern.length) fail(L, `the sentence to spell has no ${L.id} word`);
  newPattern.forEach(w => { if (practiced.has(w)) fail(L, `"${w}" in the sentence to spell was already practiced — use a new word`); });
  if (!dict.some(w => tricky.includes(w))) fail(L, 'the sentence to spell has none of the tricky words');
  dict.forEach(w => { if (!decodable(w) && !tricky.includes(w) && !['a', 'the'].includes(w)) fail(L, `"${w}" in the sentence to spell is not decodable or taught`); });
  ok(`spell: "${L.dictation}" — new ${L.id} words ${newPattern.join(', ')}; tricky ${dict.filter(w => tricky.includes(w)).join(', ')}`);

  // no "it" in what a kid reads
  const kidText = [L.name, L.goal, ...pages, ...L.sound.lines, ...L.questions.flatMap(q => [q.q, ...q.choices])];
  kidText.forEach(t => { if (/\bit\b/i.test(t)) fail(L, `"it" in kid text: ${t}`); });
  ok('no "it" in the lesson\'s kid text');

  // recordings and picture
  const sounds = new Set([
    ...Object.values(L.sound.sounds),
    ...L.tricky.words.flatMap(t => Object.values(t.odd)),
    ...L.sound.lines.flatMap(l => [...l.matchAll(/\/([a-z_]+)(?:=([a-z_]+))?\//g)].map(m => m[2] || m[1]))
  ]);
  sounds.forEach(s => { if (!fs.existsSync(path.join(ROOT, 'sounds', s + '.m4a'))) fail(L, `recording sounds/${s}.m4a is missing`); });
  L.sound.grid.forEach(g => { if (!L.sound.sounds[g]) fail(L, `the sound grid's "${g}" has no recording named`); });
  if (!fs.existsSync(path.join(ROOT, L.story.picture))) fail(L, `picture ${L.story.picture} is missing`);
  ok(`recordings ${[...sounds].join(', ')} and the picture are in the folder`);
}

console.log(failed ? `\n❌ ${failed} problem${failed > 1 ? 's' : ''}` : '\n✅ every lesson passes');
process.exit(failed ? 1 : 0);
