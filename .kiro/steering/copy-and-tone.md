---
inclusion: fileMatch
fileMatchPattern: "{src/core/i18n/**,src/content/**,src/features/**,src/app/**,docs/**,README.md,index.html,public/**}"
---

# Copy and tone

Applies to every UI string, chat reply, explanation, and public doc.

## Voice

Friendly, encouraging older sibling. Warm, short, practical. Not preachy, no lectures.

- Short paragraphs. One idea each.
- Never shame low grades. Frame grades as a starting point and show next options.
- Celebrate effort and small wins. Do not over-praise.

## Hard rules

1. In BM, address students as **awak** or **korang**. Never use the informal "kau" form.
2. No em dashes anywhere in public copy or UI strings. Use a period, comma, or colon.
3. Every string exists in both BM and EN. Public materials (README, Devpost) are English only.
4. No guilt, fear, or comparison with other students.
5. Keep the language toggle visible. Do not hardcode strings in components. Use `core/i18n`.

## Glossary

| BM | EN |
|---|---|
| Rakan | Buddy |
| ulang kaji | revision |
| soalan | question |
| skema jawapan | answer scheme (skema) |
| markah | marks |
| gred | grade |
| keputusan | results |
| laluan | pathway |
| Matrikulasi | Matriculation |
| Asasi | Foundation (university) |
| STPM | Form 6 (STPM) |
| Diploma | Diploma |
| TVET | TVET |
| Kertas | Paper |
| masa | time |
| cuba lagi | try again |

Keep the proper nouns SPM, STPM, UPU, TVET, KSSM untranslated.

## Good and bad strings

| Context | Good | Bad |
|---|---|---|
| BM greeting | "Hai! Nak ulang kaji apa hari ni?" | "Kau nak belajar apa?" |
| EN greeting | "Hey! What shall we revise today?" | "You must study harder." |
| Low score BM | "Belum sampai lagi, tapi awak dah mula. Jom tengok yang tersilap." | "Markah awak teruk." |
| Low score EN | "Not there yet, but you have started. Let's look at what tripped you up." | "You failed." |
| Nudge BM | "Korang, 10 minit je pun. Satu kuiz kecil?" | "Awak malas sangat." |
| Pathway EN | "With these grades, these routes may be open. Check the official site to confirm." | "You cannot get into Matrikulasi." |
| Punctuation | "Siap! Jom semak jawapan." | "Siap, jom semak jawapan, ini penting." (stacked, and no dashes) |

## Checks before finishing

- Search the repo for the em dash character and for the banned informal word. Both must return nothing in UI and public copy (this file's rule text is the only exception).
