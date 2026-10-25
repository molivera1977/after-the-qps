/* =====================================================================
   SIGN-IN — the same as Mr. O's other sites: pick your name, type your
   student number. Three kinds of visitor:
     • a student: their lessons, and their work goes to Mr. O's sheet;
     • Mr. O (Teacher Access, or his name + PIN): a preview of every
       lesson — nothing is saved or sent (Marcos 10/19: "every site should
       have teacher access" · "teacher mode allows me to preview the site");
     • a guest (a guest code, or Mr. O's share link ?share=mro): every
       lesson, nothing is sent.
   ===================================================================== */
window.ATQLogin = (function () {
  const LOGIN_KEY = 'atq_student_v1';

  // ⚠️ ROSTER SYNC — keep identical to the Teacher Dashboard ROSTER
  // and every other student-facing activity.
  const ROSTER = [
    { name: "Mr. O (Teacher)",           id: "9377" },
    { name: "Avery, Jo'Von",             id: "10053632" },
    { name: "Belasquez Bonilla, Eduin",  id: "10058674" },
    { name: "Castaneda, Kelvin",         id: "10053248" },
    { name: "Chicas-Santos, Allison",    id: "10066737" },
    { name: "Collado, Roniel",           id: "10060249" },
    { name: "Dejesus, Michael",          id: "10049434" },
    { name: "Dock, Fakeem",              id: "10059720" },
    { name: "Douglas, Iyana",            id: "10070980" },
    { name: "Dumphrey, Christopher",     id: "10060696" },
    { name: "Flores, Kiara",             id: "10052834" },
    { name: "Johnson, Destiny",          id: "10052926" },
    { name: "Jones, Tahji",              id: "10060315" },
    { name: "Lawrence, Eric",            id: "10057451" },
    { name: "Madero, Jovany",            id: "10076374" },
    { name: "Pettway, Lanaura",          id: "10060616" },
    { name: "Polanco Soriano, Thiara",   id: "10060503" },
    { name: "Roberts, Robyn",            id: "10060925" },
    { name: "Rodriguez-Jimenez, Marcos", id: "10048936" },
    { name: "Rojas, Alanie",             id: "10076388" },
    { name: "Sanchez Rodriguez, Johanelyz", id: "10076767" },
    { name: "Vega, Taishmara",           id: "10054043" },
    { name: "Watts, Autumn",             id: "10039032" },
    { name: "Zelaya-Osorto, Nazareth",   id: "10053626" }
];

  const GUEST_SLOTS = {
    '937701': 'Guest 1', '937702': 'Guest 2', '937703': 'Guest 3',
    '937704': 'Guest 4', '937705': 'Guest 5', '937706': 'Guest 6',
    '937707': 'Guest 7', '937708': 'Guest 8', '937709': 'Guest 9',
    '937710': 'Guest 10'
};

  const TEACHER = 'Mr. O (Teacher)';
  const SHARE = !!window.SHARE_MODE;
  const SHEET_URL = 'https://script.google.com/macros/s/AKfycbzv8CWv1yyi8NeH04now9UxVL4IZm5yMqqsEGMcgGdrcAOWVB-aSp5siTvSSJXIUpzFMA/exec';
  const $ = (id) => document.getElementById(id);

  let who = { name: '', kind: '' };          // kind: 'student' | 'teacher' | 'guest'

  /* ---------- the sign-in screen ---------- */
  function buildNameList() {
    const sel = $('atqName');
    ROSTER.forEach(s => sel.append(new Option(s.name, s.name)));
    const div = new Option('── Guests ──', ''); div.disabled = true; sel.append(div);
    Object.entries(GUEST_SLOTS).forEach(([code, label]) => sel.append(new Option('🙋 ' + label, 'GUEST:' + code)));
  }
  function onNamePick() {
    const val = $('atqName').value;
    const guest = val.startsWith('GUEST:');
    $('atqLoginError').textContent = '';
    $('atqPinBox').hidden = !val;
    $('atqGuestBox').hidden = !guest;
    $('atqPinLabel').textContent = guest ? 'Guest code' : val === TEACHER ? 'Teacher PIN' : 'Your student number';
    if (val) setTimeout(() => $('atqPin').focus(), 60);
  }
  // Teacher Access: picks Mr. O and asks the Teacher PIN (the same as choosing his name)
  function teacherAccess() { $('atqName').value = TEACHER; onNamePick(); }

  function trySignIn() {
    const val = $('atqName').value;
    const pin = $('atqPin').value.trim();
    const err = $('atqLoginError');
    err.textContent = '';
    if (!val) { err.textContent = 'Pick your name first.'; return; }
    if (!pin) { err.textContent = val.startsWith('GUEST:') ? 'Type your guest code.' : val === TEACHER ? 'Type the Teacher PIN.' : 'Type your student number.'; return; }
    if (val.startsWith('GUEST:')) {
      if (pin !== val.slice(6)) { err.textContent = 'That guest code is not right. Try again.'; return; }
      const first = $('atqGuestName').value.trim();
      if (!first) { err.textContent = 'Type your first name.'; return; }
      $('atqPin').value = '';
      return signIn(first + ' (Guest)', 'guest');
    }
    const s = ROSTER.find(r => r.name === val);
    if (!s || s.id !== pin) { err.textContent = val === TEACHER ? 'That PIN is not right. Try again.' : 'That number is not right. Try again.'; $('atqPin').select(); return; }
    $('atqPin').value = '';
    signIn(val, val === TEACHER ? 'teacher' : 'student');
  }

  function showLogin() {
    $('atqName').value = ''; $('atqPin').value = ''; $('atqGuestName').value = '';
    onNamePick();
    if (window.ATQApp) ATQApp.show('loginView');
  }

  function signIn(name, kind) {
    who = { name, kind };
    // A student or a guest stays signed in on this tab; Mr. O's preview does not (a reload ends it)
    if (!SHARE && kind !== 'teacher') { try { sessionStorage.setItem(LOGIN_KEY, name); } catch (e) {} }
    if (window.ATQApp) ATQApp.signedIn(who);
  }
  function signOut() {
    if (SHARE) return;
    if (window.ATQSound) ATQSound.stop();
    who = { name: '', kind: '' };
    try { sessionStorage.removeItem(LOGIN_KEY); } catch (e) {}
    showLogin();
  }

  /* ---------- Mr. O's sheet ---------- */
  // Only a signed-in student's work is sent: never Mr. O's preview, a guest or the share link.
  const sends = () => !SHARE && who.kind === 'student' && !!who.name;
  function send(row) {
    if (!sends() || !row || !row.game) return false;
    const body = { action: 'submit', name: who.name, ...row };
    window.ATQ_LAST_SENT = body;                              // for testing
    try {
      fetch(SHEET_URL, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
    } catch (e) { /* offline: the work still shows on this device */ }
    return true;
  }
  // One tab back from the sheet (one row per name). null = it could not be read in time.
  async function readTab(game, waitMs = 10000) {
    if (SHARE) return [];
    const stop = new AbortController();
    const timer = setTimeout(() => stop.abort(), waitMs);
    try {
      const res = await fetch(`${SHEET_URL}?action=leaderboard&game=${encodeURIComponent(game)}`, { cache: 'no-store', signal: stop.signal });
      const rows = await res.json();
      return Array.isArray(rows) ? rows : null;
    } catch (e) { return null; } finally { clearTimeout(timer); }
  }

  /* ---------- start ---------- */
  function start() {
    buildNameList();
    $('atqName').addEventListener('change', onNamePick);
    ['atqPin', 'atqGuestName'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') trySignIn(); }));
    $('atqSignIn').addEventListener('click', trySignIn);
    $('atqTeacher').addEventListener('click', teacherAccess);
    if (SHARE) return signIn('Guest', 'guest');
    let saved = '';
    try { saved = sessionStorage.getItem(LOGIN_KEY) || ''; } catch (e) {}
    if (saved && ROSTER.some(s => s.name === saved && s.name !== TEACHER)) signIn(saved, 'student');
    else if (saved.endsWith(' (Guest)')) signIn(saved, 'guest');
    else showLogin();
  }

  const firstName = (name) => name.includes(',') ? name.split(',')[1].trim() : name.replace(/ \((Guest|Teacher)\)$/, '');
  const isStudent = (name) => ROSTER.some(s => s.name === name && s.name !== TEACHER);

  return { start, signOut, send, sends, readTab, firstName, isStudent, who: () => who, TEACHER, SHARE };
})();
