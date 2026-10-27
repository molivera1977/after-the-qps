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
// Whole words in Mr. O's own voice (sounds/words/<word>.m4a). The computer voice swallows some final
// consonants after a long a (Marcos 10/26: "could not hear the consonant sound after the long A sound");
// he recorded these. Any word on this list plays his recording wherever the lesson says the word alone.
window.ATQ_WORD_RECORDINGS = ['cape', 'gabe', 'gate', 'gave'];
// Words said alone that the voice is handed in another spelling. "a" alone comes out as the letter name
// "ay"; in a sentence it is "uh" (Marcos 10/26 picked "uh": a help tap is a kid stuck mid-sentence).
// The kid still sees the real word.
window.ATQ_WORD_SAY = { a: 'uh' };

window.ATQ_LESSONS = [
  {
    id: 'a_e',
    skill: 'Silent e',
    stop: '5',
    name: 'Silent e with a',
    sayName: 'Silent e with the letter A',
    example: 'cake',
    goal: 'read and spell words where a quiet e makes the a say its name, like cake',
    // Rewritten 10/26 (Marcos picked "New story, same plan"): Kate's Cake was too close to Moon Dog VCe
    // Book 1, The Shape Game (sand, cakes on a plate, a big wave), which his class reads at his table.
    story: {
      title: 'Brave Gabe',
      picture: 'pictures/brave-gabe.svg',
      pictureAlt: 'A red cape stuck on a gate in front of a shed. A cat in a little red cape sits in the grass.',
      pages: [
        'Gabe made a red cape with tape. The cape made Gabe brave!',
        "Jade's cat Pip was stuck up on the shed.",
        '"Pip can not get off the shed!" said Jade.',
        "Gabe came to save Pip. Gabe's cape got stuck on the gate!",
        "Then Pip made a big jump. Pip sat in Jade's lap!",
        'Gabe gave the red cape to Pip. Brave Pip!'
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
    blend: ['m|a|d|e', 'c|a|p|e', 't|a|p|e', 'b|r|a|v|e', 'c|a|m|e', 's|a|v|e', 'g|a|t|e', 'g|a|v|e'],
    // HILL step 5: the blend words, then a review row (short a, from the story); the wait gets shorter each row
    speed: { rows: [['made', 'cape', 'tape', 'brave'], ['came', 'save', 'gate', 'gave'], ['cat', 'can', 'sat', 'lap']], waits: [3, 2, 1] },
    // literal questions: did they read the story? answer = the right choice; page = where the story says it
    questions: [
      { q: 'What did Gabe make with tape?', choices: ['a red cape', 'a red hat', 'a kite'], answer: 'a red cape', page: 1 },
      { q: 'Where was Pip stuck?', choices: ['up on the shed', 'in a box', 'on a bus'], answer: 'up on the shed', page: 2 },
      { q: 'Who got the red cape at the end?', choices: ['Pip', 'Jade', 'Gabe'], answer: 'Pip', page: 6 }
    ],
    // HILL step 7: new a_e words (lane, lake) with the tricky words to and was; none of them is in The Shape Game
    dictation: 'The lane to the lake was shut.'
  }
];
