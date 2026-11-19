# Manual test checklist

Checks that automated tests cannot cover. Use fictional data. Tick each box per release.

## Install and offline

- [ ] Visit the live site online, finish onboarding, open Exam and Pathways once.
- [ ] Install as a PWA (browser install option). It opens in its own window with the right name and icon.
- [ ] Turn the network off, fully close the app, and reopen it. Onboarding or home loads.
- [ ] Offline, run the full demo: Rakan quiz, Paper, results, nudge, board import and hints. No error screens.

## First visit and lazy content

- [ ] On a fresh profile with the network off after only loading home, open Exam. A clear message appears, not a blank screen, and Rakan chat still works.
- [ ] After one online visit to Exam and Pathways, both open offline.
- [ ] Check the first load transfer size in DevTools stays small (the build size gate also reports it).

## New build during an exam

- [ ] Start a Paper, then deploy or simulate a new build. An update notice appears but the page does not reload mid exam.
- [ ] Submit the Paper. The answers and result are intact. The update applies on the next open.

## Screen reader smoke test

- [ ] With TalkBack or VoiceOver, go through onboarding, send a chat message, answer a quiz question, answer one exam question and open one pathway.
- [ ] Every control has a clear name. New chat replies and the timer warning are announced. Bubbles say who spoke.
- [ ] The language toggle changes the spoken language.

## Small screen

- [ ] At 360 x 640, the "Guidance only" disclaimer is visible on the board, on a pathway detail and on the empty state without hunting for it.
- [ ] No horizontal scroll on chat, exam or board. Tap targets are easy to hit.

## Reduced motion

- [ ] Turn on "reduce motion" in the OS. The seam wipe and other animations are off or minimal. Nothing depends on motion.

## Timed run of the demo script

- [ ] Follow [`demo-script.md`](demo-script.md) from empty storage, offline, no key. Finish in 180 seconds or less.
- [ ] The nudge names a weak topic from the result, and the board shows the imported Matematik grade.

## Privacy

- [ ] Before opting in to remote AI, DevTools Network shows no third-party calls.
- [ ] Export my data downloads a file without any API key in it. Delete my data clears everything and returns to onboarding.
