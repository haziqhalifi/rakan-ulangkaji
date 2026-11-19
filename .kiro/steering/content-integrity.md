---
inclusion: always
---

# Content integrity and privacy

## Original questions only

- Write every question from scratch. Never copy, paraphrase closely, or reconstruct questions from official MOE or Lembaga Peperiksaan past papers, trial papers, or commercial books.
- Align to KSSM topics and exam style (formats, command words, mark allocation), but use fresh numbers, contexts, and wording.
- Use fictional names and settings. Mark each item `original: true` and give it a `topic` and `form` tag.
- When unsure whether something resembles a real paper, rewrite it.

## Skema format

Each question ships with a typed skema:

```
id, subject, form, topic, language
question          (BM and EN)
marks             total
skema[]           list of { point, marks, accepted[] }  accepted = valid answer variants
explanation       (BM and EN) short, kind, says why
```

- Marking is deterministic: match against `accepted` variants after normalising case, spacing, and units.
- Awarding is per point. Show which points earned marks and which were missed.
- Explanations teach, never scold.
- Unit-test every skema with at least one correct and one incorrect answer.

## Pathway data and disclaimer

- Pathway rules (Matrikulasi, Asasi, STPM, Diploma, TVET, Foundation) are simplified, rule-based hints. Store them as data with a `lastReviewed` date and a source note.
- Use hedged wording: "may be open", "usually needs". Never "you are eligible" or "you will get in".
- Show this disclaimer wherever the board appears, in BM and EN: "This is guidance only. Requirements change every year. Always check official sources such as UPU and the institution's website."
- Do not imply endorsement by MOE, UPU, or any institution. Do not use official logos.

## Privacy

- No personal data leaves the browser by default. Profile, grades, progress, and chat history stay in browser storage.
- Remote AI is opt-in. Before the first remote call, tell the student in plain words what will be sent. Send only the current question and minimal context, never name, school, or full grade history unless needed and the student agrees.
- User API keys stay in browser storage and are never sent anywhere except the chosen provider.
- No analytics, trackers, or third-party fonts and scripts that call out by default.
- Provide "export my data" and "delete my data" actions.
