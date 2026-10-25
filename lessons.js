/* =====================================================================
   AFTER THE QPS — the lessons (Marcos 10/25/2026: "This is just for
   reinforcement and practice." Graduating happens on the QPS hub).
   One lesson per spelling, in HILL's Foundational Skills Lesson Plan
   order, sized for a kid working alone:
     tricky words → the sound → blend → beat the voice → the story
     (read 3 times) → 3 questions → spell a sentence.
   Every story is ORIGINAL (Moon Dog and HILL's cards are copyrighted).
   Planned back to front, as HILL does: the blend and speed words come
   out of the story; the tricky words are the story's irregular words;
   the sentence to spell uses NEW words with the same spelling.
   tools/check-lesson.js checks all of that before a push:
     node tools/check-lesson.js
   Markup in a lesson line:
     {e}        LETTER NAMES — shown in bold; the voice says "E"
     /a/        a SOUND — a sound tile, played with Mr. O's recording
     /a_e=ai/   a sound tile that shows a_e and plays his "ai" recording
   ===================================================================== */
window.ATQ_LESSONS = [
  {
    id: 'a_e',
    skill: 'Silent e',
    stop: '5',
    name: 'Silent e with a',
    sayName: 'Silent e with the letter A',
    example: 'cake',
    goal: 'read and spell words where a quiet e makes the a say its name, like cake',
    story: {
      title: "Kate's Cake",
      picture: 'pictures/kates-cake.svg',
      pictureAlt: 'A lake with a big wave. On the sand: a plate with a wet cake, and ten sand cakes. A flag on the best sand cake says Lake Cake.',
      pages: [
        'Kate made a cake. Jake and Kate came to Pine Lake.',
        'Jake and Kate sat in the shade. Kate set the cake on a plate.',
        'Splash! A big wave came up the sand and hit the cake.',
        "Kate's cake got wet. Kate was sad.",
        'Then Jake had a plan. "Let\'s make sand cakes!" said Jake.',
        'Jake and Kate made ten sand cakes. Kate gave the best sand cake a name: Lake Cake!'
      ]
    },
    // HILL steps 1–2: the story's irregular words. odd = the part that does not say the sound you expect,
    // and the sound it says instead (a recording in sounds/).
    tricky: {
      words: [
        { word: 'said', parts: ['s', 'ai', 'd'], odd: { ai: 'e' } },
        { word: 'was',  parts: ['w', 'a', 's'],  odd: { a: 'u', s: 'z' } },
        { word: 'to',   parts: ['t', 'o'],       odd: { o: 'oo' } }
      ],
      // the practice grid: the new words twice, then a review word from the story
      practice: ['said', 'was', 'to', 'to', 'said', 'was', 'the']
    },
    // HILL step 3: the sound-spelling
    sound: {
      lines: [
        'An {e} at the end of a word is quiet. You do not hear the {e}.',
        'The quiet {e} makes the {a} say its name: /a_e=ai/.',
        'In cap, there is no {e}, so the {a} says /a/. Add an {e}, and cap turns into cape.'
      ],
      examples: [['cap', 'cape'], ['mad', 'made'], ['tap', 'tape'], ['can', 'cane']],
      grid: ['a_e', 'a', 'a_e', 'a_e', 'a', 'a_e', 'a', 'a_e'],
      sounds: { a_e: 'ai', a: 'a' }
    },
    // HILL step 4: 8 words from the story, one sound per part (the a and the quiet e are linked)
    blend: ['m|a|d|e', 'c|a|k|e', 'c|a|m|e', 'sh|a|d|e', 'p|l|a|t|e', 'w|a|v|e', 'g|a|v|e', 'n|a|m|e'],
    // HILL step 5: the blend words, then a review row (short a, from the story); the wait gets shorter each row
    speed: { rows: [['made', 'cake', 'came', 'shade'], ['plate', 'wave', 'gave', 'name'], ['sat', 'had', 'plan', 'sand']], waits: [3, 2, 1] },
    // literal questions: did they read the story? answer = the right choice; page = where the story says it
    questions: [
      { q: 'What did Kate make?', choices: ['a cake', 'a kite', 'a hat'], answer: 'a cake', page: 1 },
      { q: "What hit Kate's cake?", choices: ['a big wave', 'a dog', 'a rock'], answer: 'a big wave', page: 3 },
      { q: 'What did Jake and Kate make with the sand?', choices: ['sand cakes', 'a sand castle', 'a big hole'], answer: 'sand cakes', page: 6 }
    ],
    // HILL step 7: new a_e words (snake, late, game) with the tricky words was and to
    dictation: 'The snake was late to the game.'
  }
];
