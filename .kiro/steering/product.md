---
inclusion: always
---

# Product: Rakan Ulangkaji

Rakan Ulangkaji ("study buddy") is a bilingual (Bahasa Melayu / English) web app for Malaysian SPM students. It is a Kiroween 2026 entry in the Frankenstein category: three normally separate experiences stitched into one app.

## Users

- Primary: Form 4 and Form 5 students preparing for SPM, often on a phone, often on patchy data.
- Secondary: school leavers who just got results and want to see their options.
- Comfortable in BM, English, or a mix. The app must work in both with a toggle.

## The three stitched parts

1. **Rakan chat.** A WhatsApp-style study buddy. Answers questions, quizzes the student, and sends gentle nudges.
2. **Exam mode.** A formal, SPM-style timed paper. Original questions, countdown timer, then marking against a skema (answer scheme) with explanations.
3. **Pathway board.** The student enters predicted or actual grades ("what if these grades?") and sees possible pathways: Matrikulasi, Asasi, STPM, Diploma, TVET, Foundation. Rule-based eligibility hints only.

All three share one student profile and progress record. Exam results feed the pathway board and change what Rakan says in chat. This shared state is the point of the project. Do not build the parts as isolated pages.

## Judging goals (Devpost)

- **Impact:** real use for Malaysian students, free to run, works offline, low data use.
- **Technical implementation:** clean typed code, tests for marking and eligibility rules, AI provider abstraction with a deterministic fallback.
- **Design:** distinct looks for the three modes (casual chat, formal exam, clear board) that still feel like one product. Accessible, mobile first.
- **Idea:** a believable Frankenstein: chat + exam hall + pathway planner, joined by one profile.
- **Presentation:** the full demo runs with no key and no network. Public materials (README, Devpost text) are in English.

## MVP non-goals

- No accounts, login, or backend database.
- No payments or paid services.
- No real UPU or MOE integration, and no claim of official eligibility results.
- No copied past-paper content.
- No full syllabus coverage. A small, polished set of topics and subjects is enough.
- No social features, leaderboards, or teacher dashboards.
