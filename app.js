/* =====================================================================
   THE SCREENS — sign-in → home → a lesson.
   Home for a student (Marcos 10/25/2026):
     • a lesson from Mr. O that is not finished → ONLY the banner for that
       lesson ("📌 Your lesson from Mr. O"), until the lesson is done;
     • nothing open → "My Lessons": every lesson Mr. O has given them, to
       re-read the story (3 reads + the questions). Nothing else.
     • never given a lesson → "Mr. O will give you a lesson."
   Mr. O (Teacher Access) and guests see every lesson; nothing is sent.
   Buttons say where they go (Marcos 10/14), and a student stays signed in.
   ===================================================================== */
window.ATQApp = (function () {
  const $ = (id) => document.getElementById(id);
  const VIEWS = ['loginView', 'homeView', 'lessonView'];
  let who = { name: '', kind: '' }, list = [], turn = 0;

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function button(cls, text, sub, onClick) {
    const b = el('button', cls); b.type = 'button';
    b.append(el('span', '', text));
    if (sub) b.append(el('span', 'l-btn-sub', sub));
    b.onclick = onClick;
    return b;
  }
  // A line with its own 🔊 (everything a kid reads can be heard, Marcos 10/8)
  // (the screen says "Mr. O"; the voice is handed "Mister O")
  function sayLine(host, text, cls = '') {
    const row = el('div', 'l-direction ' + cls);
    const p = el('p', '');
    if (window.QPSRead) QPSRead.wrap(p, text); else p.textContent = text;
    if (/Mr\. O\b/.test(text)) p.dataset.say = text.replace(/Mr\. O\b/g, 'Mister O');
    const b = el('button', 'l-say', '🔊'); b.type = 'button'; b.setAttribute('aria-label', 'Listen');
    b.onclick = () => (window.QPSRead ? QPSRead.say(p) : ATQSound.text(text));
    row.append(b, p);
    host.append(row);
    return row;
  }

  // A name that ends in one letter ("Silent e with a") gets its example word after it: the voice reads "a." like an
  // initial and runs into the next sentence (Marcos 10/26: "no stop at the period")
  const nameLine = (l) => (/\b[a-z]$/i.test(l.name) ? `${l.name}, like ${l.example}` : l.name);

  function show(id) {
    VIEWS.forEach(v => { $(v).hidden = v !== id; });
    $('topBar').hidden = id === 'loginView';
    document.body.classList.toggle('on-login', id === 'loginView');   // the bright front page (style.css)
    window.scrollTo(0, 0);
  }

  function signedIn(w) {
    who = w;
    $('whoName').textContent = ATQLogin.firstName(w.name);
    $('signOutBtn').hidden = ATQLogin.SHARE;
    $('guestNote').hidden = w.kind !== 'guest' || ATQLogin.SHARE;
    home();
  }

  /* ---------- home ---------- */
  async function home() {
    ATQLesson.quit();
    ATQSound.stop();
    show('homeView');
    const box = $('homeBox');
    box.innerHTML = '';
    if (who.kind !== 'student') return renderAll(box);
    const t = ++turn;
    box.append(el('p', 'h-checking', '⏳ Getting your lesson ready…'));
    const got = await ATQAssign.load(who.name);
    if (t !== turn || ATQLogin.who().name !== who.name) return;     // signed out, or someone else signed in
    list = got.list;
    box.innerHTML = '';
    const a = ATQAssign.current(list);
    if (a) banner(box, a); else myLessons(box);
  }

  function lessonCard(lesson, extra) {
    const card = el('div', 'h-card');
    const img = el('img', 'h-pic'); img.src = lesson.story.picture; img.alt = '';
    const words = el('div', 'h-card-words');
    words.append(el('p', 'h-card-name', lesson.name), el('p', 'h-card-story', `Story: ${lesson.story.title}`));
    card.append(img, words);
    if (extra) card.append(extra);
    return card;
  }

  // The banner: the only thing a student with an open lesson sees
  function banner(box, a) {
    const lesson = ATQAssign.lessonOf(a.lessonId);
    const sec = el('section', 'h-banner');
    sec.append(el('p', 'h-eyebrow', '📌 Your lesson from Mr. O'));
    const started = a.steps > 0 || ATQLesson.hasSaved(a.id);
    sayLine(sec, started
      ? `Keep going with your lesson, ${nameLine(lesson)}. You will read the story ${lesson.story.title}.`
      : `Your lesson from Mr. O is ${nameLine(lesson)}. You will read the story ${lesson.story.title}.`);
    sec.append(lessonCard(lesson));
    sec.append(button('l-btn h-go', started ? '▶️ Keep Going' : '▶️ Start My Lesson', 'Finish the whole lesson.', () => startAssigned(a)));
    const more = list.filter(x => !x.done).length - 1;
    if (more > 0) sayLine(sec, `After this lesson, you have ${more} more ${more === 1 ? 'lesson' : 'lessons'} from Mr. O.`, 'h-more');
    sayLine(sec, 'Finish this lesson first. Then you can read your old stories again.', 'h-rule');
    box.append(sec);
  }

  function startAssigned(a) {
    const lesson = ATQAssign.lessonOf(a.lessonId);
    let mine = a;
    ATQLesson.start(lesson, {
      kind: 'lesson', saveKey: a.id,
      onStep: (steps) => { mine = { ...mine, steps: Math.max(mine.steps, steps) }; list = ATQAssign.update(who.name, list, mine); },
      onDone: (result, work) => {
        mine = { ...mine, steps: ATQLesson.STEP_COUNT, done: true };
        list = ATQAssign.update(who.name, list, mine);
        endButtons(work);
      }
    });
  }

  // My Lessons: every lesson Mr. O has given this kid, to read the story again
  function myLessons(box) {
    const lib = ATQAssign.library(list);
    const sec = el('section', 'h-lessons');
    sec.append(el('h2', 'h-title', '📚 My Lessons'));
    if (!lib.length) {
      sayLine(sec, 'Mr. O will give you a lesson. Check back soon!');
      box.append(sec);
      return;
    }
    sayLine(sec, `You finished every lesson from Mr. O. You can read a story again. You will read the story 3 times and answer ${lib[0].questions.length} questions.`);
    lib.forEach(lesson => {
      sec.append(lessonCard(lesson, button('l-btn h-again', '🔁 Read the story again', `${lesson.story.title}: 3 reads and the questions.`,
        () => ATQLesson.start(lesson, { kind: 'reread', onDone: (r, work) => endButtons(work) }))));
    });
    box.append(sec);
  }

  // Mr. O and guests: every lesson, the whole lesson or the story only
  function renderAll(box) {
    const teacher = who.kind === 'teacher';
    const sec = el('section', 'h-lessons');
    sec.append(el('h2', 'h-title', teacher ? '🔍 Every lesson (Teacher Preview)' : '📚 Every lesson'));
    sayLine(sec, teacher
      ? 'Teacher Preview: nothing is saved or sent. Open a whole lesson, the story only, or start at any step.'
      : 'Guest view: nothing is saved or sent. Open a whole lesson, or just the story.');
    (window.ATQ_LESSONS || []).forEach(lesson => {
      const tools = el('div', 'h-tools');
      tools.append(button('l-btn h-go', '▶️ Whole lesson', 'Every step, in order.', () => ATQLesson.start(lesson, { kind: 'lesson', preview: true, onDone: (r, w) => endButtons(w) })));
      tools.append(button('l-btn h-again', '📖 Story only', '3 reads and the questions.', () => ATQLesson.start(lesson, { kind: 'reread', preview: true, onDone: (r, w) => endButtons(w) })));
      if (teacher) {
        const pick = el('label', 'h-start-at', 'Start at ');
        const sel = el('select', '');
        sel.id = 'startAt-' + lesson.id;
        ATQLesson.STEPS.forEach(s => sel.append(new Option(`${s.icon} ${s.name}`, s.key)));
        const go = el('button', 'h-start-go', 'Go'); go.type = 'button';
        go.onclick = () => ATQLesson.start(lesson, { kind: 'lesson', preview: true, startAt: sel.value, onDone: (r, w) => endButtons(w) });
        pick.append(sel, go);
        tools.append(pick);
      }
      sec.append(lessonCard(lesson, tools));
    });
    box.append(sec);
  }

  function endButtons(work) {
    work.append(button('l-btn h-back', '📋 Back to My Lessons', who.kind === 'student' ? 'You stay signed in.' : 'Back to every lesson.', home));
  }

  /* ---------- start ---------- */
  function start() {
    $('signOutBtn').onclick = () => { ATQLesson.quit(); ATQLogin.signOut(); };
    $('lessonBack').onclick = home;
    $('previewSkip').onclick = () => ATQLesson.skip();
    $('previewExit').onclick = home;
    ATQLogin.start();
  }

  return { start, show, signedIn, home };
})();

ATQApp.start();
