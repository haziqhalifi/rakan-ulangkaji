# Demo script

Target length: 170 seconds or less. Recorded on a phone as a screen recording with a voice-over. Narration is in English for the judges. The app runs in English except for one short BM beat. All names, grades and answers are fictional.

Narration pace is about 2.3 words per second. Read each "Say" line within its time slot.

## Pre-recording checklist

- [ ] Open the live site once while online, so the app, exam and board content are cached. The app must be opened online once before offline mode can work.
- [ ] Reload once and wait for the page to settle, so the service worker is active.
- [ ] Clear the site data for the app, so onboarding starts fresh. Then open the site online once more, to re-cache it, and leave it on the first onboarding screen.
- [ ] Phone in Do Not Disturb. Hide the notification banner and turn off auto-rotate.
- [ ] Screen recording at 1080p, portrait. Record the system audio off and the microphone on.
- [ ] Battery above 50 percent, brightness up, text size at the default.
- [ ] Keep the Airplane mode toggle one swipe away.
- [ ] Rehearse once with a timer. If you run over, shorten the exam beat first.

## Beats

| # | Time | Tap on screen | Say |
|---|---|---|---|
| 1 | 0:00 to 0:09 | Show the first onboarding screen, then the app name. | "Revising, marking and planning usually live in three apps. Rakan Ulangkaji joins them in one." |
| 2 | 0:09 to 0:21 | Type a fictional name. Tap "Next". Pick "Form 5". Tap "Next". Keep Matematik. Tap "Next". Tap "Start with Rakan". | "Setup takes a few taps. Your profile stays in this browser. There is no account and no server." |
| 3 | 0:21 to 0:28 | Tap "Settings". Switch on "Demo short timer for the exam". Tap "Rakan". | "For the demo, I turn on a short timer. Marking does not change." |
| 4 | 0:28 to 0:45 | Tap "Quiz me". Pick an option. Show the feedback and the short explanation. | "This is Rakan, the chat buddy. It quizzes me, and it explains the answer. Replies come from built-in rules, so no key and no network are needed." |
| 5 | 0:45 to 1:08 | Tap "Exam". Tap "Start the paper". Answer two or three questions, leaving the Indices questions blank. Let the countdown show. Tap "Submit paper", then "Yes, submit". | "Now the exam hall. A formal, timed paper with 16 original questions. The countdown is running. I submit, and if the timer reached zero, it would submit for me." |
| 6 | 1:08 to 1:26 | Show "Your results", "By topic", then scroll to "Question by question". Point at a "correct option (B)" line and a "Why" explanation. | "Marking follows the skema, point by point. I see marks by topic, the correct option letter, and a short reason for each answer. A rule engine marks this, never an AI." |
| 7 | 1:26 to 1:35 | Tap "Rakan". Show the nudge naming the weakest topic. Tap "Quiz me on this". | "Rakan has read my result and nudges me about my weakest topic. That is the shared profile." |
| 8 | 1:35 to 2:03 | Tap "Pathways". Tap "Use my latest exam grade for Matematik". Turn on "What if mode". Change one or two grades with "Choose a grade". Open one card. Point at "Guidance only". | "The pathway board imports that grade. In what-if mode I try predicted grades, and nothing is saved. Cards say things like 'May be open', never promises. The disclaimer is always here: guidance only. Check UPU." |
| 9 | 2:03 to 2:11 | Tap "BM" in the language toggle. Show the board or chat in Bahasa Melayu. Tap "EN". | "Everything works in Bahasa Melayu too, one tap away." |
| 10 | 2:11 to 2:30 | Switch on Airplane mode. Reload the page. Open "Rakan" and send a message with "Send". Show the offline notice. | "Now offline. Airplane mode on, page reloaded. Rakan still replies, because the app was opened once online and cached itself." |
| 11 | 2:30 to 2:50 | Cut to the repo on GitHub, open the `.kiro` folder, then the `hooks` and `specs` folders. | "We built this with Kiro in headless mode. Steering files, a 20-requirement spec with 10 tasks, and hooks like copy-guard. Everything is in the dot kiro folder." |

Total: 2:50 (170 seconds).

## Optional BM line on screen

Beat 9 may show this on screen only, with no narration:

- Chat chip "Kuiz saya".
- The nav item "Laluan" for the board.
- The label "Panduan sahaja" for the disclaimer.

If the nudge or any reply appears in BM, it uses "awak" or "korang".

## Narration word count

Beats 1 to 11 together are about 235 words. At 2.3 words per second that is about 102 seconds of speech, which leaves about 68 seconds for taps, the countdown and screen changes. Do not rush the narration. Cut a sentence before you cut a tap.

## Shot list

1. Close-up of the phone screen, portrait, no frame. Onboarding, steps 1 to 4.
2. Settings with the demo timer switch, then back to chat.
3. Chat quiz: question, option tap, feedback.
4. Exam: instructions, start, countdown visible, submit and confirm.
5. Results: total, grade note, "By topic", one expanded question.
6. Chat again: the nudge message naming a weak topic.
7. Board: import button, "What if mode" badge, one card detail, disclaimer.
8. Language toggle: EN to BM and back.
9. System controls: Airplane mode on, browser reload, offline notice, one reply.
10. Desktop or phone browser: the repo `.kiro` folder.

## Notes

- Say clearly that the board gives guidance only. It is not an official result.
- If you want the timer to visibly hit zero, start the paper, answer one question, and wait the 60 seconds. Speed up that part in editing, or trim another beat to stay within 170 seconds.
- The nudge appears only after a result has weak topics. Leave one topic mostly blank in the exam so the nudge shows up.
- Add the final YouTube link to `docs/devpost-submission.md` and `README.md` after upload.
