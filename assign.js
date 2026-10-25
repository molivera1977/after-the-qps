/* =====================================================================
   📌 LESSONS FROM MR. O — the same idea as the fact sites' assign.js
   (Marcos 10/25/2026: "I can just assign them lessons based on my need
   for their need of practice"). He assigns from the Teacher Dashboard
   (✨ After the QPS → 📌 Assign a Lesson). He chose (10/25):
     • the lesson he assigned comes first: the banner holds the kid on
       it until the lesson is done;
     • after that (or when nothing is assigned) the kid may re-read the
       story of any lesson he has EVER assigned them — and nothing else.
   "Done" = the whole lesson finished.

   THE SHEET — the atq-assign tab, one row per assignment, written with the
   sheet's usual 'submit' (the Apps Script did not change):
     name       '<student> #<order>' — order is the ms it was assigned (end of the list)
                or minus that (front of the list). The leaderboard read gives back ONE row
                per name, so every assignment comes back.
     sessionId  'AQ-<ms assigned>-<n>'   one per assignment
     form       the lesson's id ('a_e'), or 'None' = taken away
     score      the ms it was written (taking one away = a newer 'None' row with its name)
     correct    steps of the lesson finished (the sheet stores the score in Correct when
                Correct is 0, so a Correct equal to the score means 0) · total = the steps
     done       true once the kid finishes the lesson (this page)
   A done row stays: it is how the kid's "My Lessons" list is kept.
   If the sheet can't be reached at sign-in, the list this device saw last is used.
   ===================================================================== */
window.ATQAssign = (function () {
  const GAME = 'atq-assign';
  const CACHE = 'atq_assign_v1:';
  const MAX_KEY = 1e15;
  const lessonOf = (id) => (window.ATQ_LESSONS || []).find(l => l.id === id) || null;

  /* One sheet row → one of this student's assignments, or null (someone else's, taken away, a lesson
     this page doesn't have, or unreadable — a row this page can't read never locks a kid out). */
  function parse(row, student) {
    if (!row || !row.sessionId || typeof row.name !== 'string' || typeof row.form !== 'string') return null;
    const m = /^(.*) #(-?\d+)$/.exec(row.name);
    if (!m || m[1] !== student) return null;
    const lesson = lessonOf(row.form.trim());
    if (!lesson) return null;
    const key = Number(row.score) || 0;
    const steps = Number(row.correct) === key ? 0 : Math.max(0, Number(row.correct) || 0);
    return {
      id: String(row.sessionId), rowName: row.name, lessonId: lesson.id, key, order: Number(m[2]),
      steps, done: row.done === true || row.done === 'true'
    };
  }
  const valid = (a) => !!(a && typeof a.id === 'string' && typeof a.rowName === 'string' && lessonOf(a.lessonId) &&
    Number.isFinite(a.order) && Number.isFinite(a.key) && Number.isFinite(a.steps));

  function saved(name) {
    try { const l = JSON.parse(localStorage.getItem(CACHE + name) || 'null'); return Array.isArray(l) ? l.filter(valid) : []; } catch (e) { return []; }
  }
  function keep(name, list) { try { localStorage.setItem(CACHE + name, JSON.stringify(list)); } catch (e) { /* private window */ } }

  // The sheet's rows joined with this device's copy (the most progress wins). One finished here whose
  // done row the sheet never got is sent again.
  function build(rows, name, mine) {
    return rows.map(r => parse(r, name)).filter(Boolean)
      .sort((a, b) => a.order - b.order || a.key - b.key)
      .map(s => {
        const here = mine.find(x => x.id === s.id);
        const a = here ? { ...s, steps: Math.max(s.steps, here.steps), done: s.done || here.done } : s;
        if (a.done && !s.done) post(a);
        return a;
      });
  }

  // The student's list: from the sheet, or (sheet out of reach) what this device saw last
  async function load(name) {
    const rows = await ATQLogin.readTab(GAME);
    if (rows === null) return { list: saved(name), fromSheet: false };
    const list = build(rows, name, saved(name));
    keep(name, list);
    return { list, fromSheet: true };
  }
  const current = (list) => list.find(a => !a.done) || null;
  // Every lesson Mr. O has given this kid and the kid has finished — the ones they may re-read
  const library = (list) => [...new Set(list.filter(a => a.done).map(a => a.lessonId))].map(lessonOf).filter(Boolean);

  // Progress (steps finished) or the finish, back to the assignment's own row
  function post(a) {
    ATQLogin.send({
      game: GAME, sessionId: a.id, name: a.rowName, form: a.lessonId,
      score: a.key, maxScore: MAX_KEY, correct: a.steps, total: window.ATQLesson ? ATQLesson.STEP_COUNT : 0,
      percent: 0, done: !!a.done, elapsed: 0, tabSwitches: 0, wrongQuestions: ''
    });
  }
  function update(name, list, a) {
    const next = list.map(x => (x.id === a.id ? a : x));
    keep(name, next);
    post(a);
    return next;
  }

  return { GAME, MAX_KEY, parse, build, load, current, library, update, lessonOf };
})();
