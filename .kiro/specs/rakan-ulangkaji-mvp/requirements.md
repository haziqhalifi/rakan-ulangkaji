# Requirements Document

## Introduction

Rakan Ulangkaji ("study buddy") is a bilingual (Bahasa Melayu and English) progressive web app for Malaysian SPM students. It is a Kiroween 2026 entry in the Frankenstein category. The app stitches three normally separate experiences into one product: a WhatsApp-style study buddy chat (Rakan), a formal timed exam hall (Exam Mode), and a pathway planner (Pathway Board). All three read and write one shared Student Profile and Progress Record. Exam results feed the Pathway Board and change what Rakan says.

The MVP targets a solo developer working about 10 evenings of 2 to 3 hours each, a demo of under 3 minutes, and submission by Friday 4 December 2026. The full demo runs offline with no API key. The MVP covers one subject (Matematik, Form 4 and Form 5 topics), one original paper, and simplified rule-based pathway hints.

## Glossary

- **App**: The Rakan Ulangkaji progressive web app as a whole.
- **Shell**: The App layout, navigation, language toggle, and routing.
- **Student**: A person using the App.
- **Profile_Store**: The browser-side module that holds the Student Profile and Progress Record and exposes them to all features through `core/profile`.
- **Student_Profile**: Name, form, selected subjects, preferred language, and optional grades.
- **Progress_Record**: Per-topic attempt history, exam results, weak-topic list, and last-activity timestamp.
- **Storage_Service**: The wrapper in `core/storage` that persists data in IndexedDB or localStorage with a schema version and migration hook.
- **I18n_Service**: The module in `core/i18n` that returns BM or EN strings.
- **Language**: Either BM (Bahasa Melayu) or EN (English). Internally the values are `bm` and `en`. The document `lang` attribute uses `ms` for BM and `en` for EN.
- **Rakan**: The study buddy chat feature.
- **Intent_Engine**: The deterministic rule-based component that maps a Student message to an intent.
- **Reply_Generator**: The component in `core/ai` exposing `generateReply(request): Promise<Reply>`.
- **Rules_Provider**: The deterministic AI provider that is always available and is the default.
- **UserKey_Provider**: The optional provider that calls a free-tier LLM using a key the Student supplies.
- **Proxy_Provider**: The optional provider that calls a Cloudflare Pages Function backed by Workers AI free tier.
- **Proxy_Function**: The Cloudflare Pages Function in `functions/` that forwards a chat request to Workers AI.
- **Remote_AI_Consent**: The Student's recorded opt-in to send a question to a remote provider.
- **Quiz_Flow**: The Rakan sequence that asks one question at a time from the question bank and checks the answer.
- **Nudge**: A short, gentle Rakan message that suggests revision of a weak topic.
- **Weak_Topic**: A topic whose latest score ratio is below 0.5, or which has fewer than 2 recorded attempts and a score ratio below 0.6.
- **Exam_Mode**: The formal timed paper feature.
- **Paper**: One original Matematik paper made of objective and structured questions.
- **Question**: An item with the typed fields defined in content-integrity: id, subject, form, topic, language, BM and EN text, marks, skema, explanation, `original: true`.
- **Skema**: The typed answer scheme: a list of points, each with marks and an `accepted` list of valid answer variants.
- **Marker**: The deterministic component that scores an answer against a Skema.
- **Exam_Timer**: The countdown component for Exam Mode.
- **Exam_Result**: The marked outcome of one Paper attempt, including per-point awards and a per-topic breakdown.
- **Pathway_Board**: The feature that shows possible pathways for a set of grades.
- **Pathway**: One of Matrikulasi, Asasi, STPM, Diploma, TVET, or Foundation.
- **Eligibility_Engine**: The deterministic rule component that evaluates grades against Pathway_Rules.
- **Pathway_Rule**: A data record with required grades or conditions, a `lastReviewed` date, and a source note.
- **Grade_Set**: A mapping from SPM subject to a grade from A+ to G, entered by hand or imported from an Exam_Result.
- **Hint**: A hedged result for one Pathway with one of three levels: "may be open", "may need more", or "check closely".
- **Disclaimer**: The text "This is guidance only. Requirements change every year. Always check official sources such as UPU and the institution's website." and its BM equivalent.
- **Visual_Identity**: The shared theme: stitched seams, patchwork panels, and muted Kiroween colours, with distinct looks for chat, exam, and board.
- **Service_Worker**: The script that caches App assets for offline use.
- **Data_Export**: The action that downloads all stored Student data as a JSON file.
- **Data_Delete**: The action that removes all stored Student data from the browser.
- **Hosting_Target**: Cloudflare Pages free tier with build command `npm run build` and output directory `dist`.

## Requirements

### Requirement 1: Onboarding and Student Profile

**User Story:** As a Student, I want to set up a simple profile in a few taps, so that Rakan, the exam, and the board all know who I am.

#### Acceptance Criteria

1. WHEN the App starts and no Student_Profile exists in the Storage_Service, THE Shell SHALL show the onboarding flow as the first screen and SHALL not allow navigation to Rakan, Exam_Mode, or Pathway_Board until onboarding is submitted.
2. THE onboarding flow SHALL collect a name or nickname of 1 to 30 characters after trimming surrounding whitespace, a form (Form 4 or Form 5), at least one subject, and a Language (BM or EN).
3. WHEN the Student submits onboarding with every required field valid, THE Profile_Store SHALL save the Student_Profile through the Storage_Service and THE Shell SHALL open the Rakan chat.
4. IF the Student submits onboarding with a required field missing or invalid (including a name that is empty or longer than 30 characters after trimming), THEN THE Shell SHALL show a message in the selected Language that names each affected field, SHALL keep all entered values, and SHALL not save the Student_Profile.
5. THE onboarding flow SHALL offer Matematik as a selectable subject and SHALL show every other subject as disabled with a "coming soon" label.
6. WHEN the Student edits the Student_Profile and the edit passes the same field validation as onboarding, THE Profile_Store SHALL save the change and notify subscribed features within 100 ms of the edit being submitted.
7. THE onboarding flow SHALL complete in no more than 4 screens.
8. THE onboarding flow SHALL show a statement in the selected Language that the Student's data stays in the browser, on a screen before the Student submits onboarding.
9. IF the Storage_Service fails to save the Student_Profile during onboarding, THEN THE Shell SHALL keep the Student on the onboarding flow with all entered values retained and SHALL show a message in the selected Language that the profile could not be saved and that the Student can try again.

### Requirement 2: Shared Profile and Progress Store

**User Story:** As a Student, I want my exam results, chat, and grades to connect, so that Rakan and the board react to what I actually did.

#### Acceptance Criteria

1. THE Profile_Store SHALL be the only channel through which Rakan, Exam_Mode, and Pathway_Board share data, and no feature SHALL import another feature's code to read or write shared data.
2. WHEN an Exam_Result is produced, THE Profile_Store SHALL append the Exam_Result to the Progress_Record and SHALL update the per-topic scores for every topic in the Exam_Result within 100 ms.
3. WHEN the Progress_Record changes, THE Profile_Store SHALL recompute the Weak_Topic list using the Weak_Topic definition in the Glossary and SHALL notify subscribed features within 100 ms.
4. WHEN a Quiz_Flow answer is marked, THE Profile_Store SHALL record the topic, the score ratio from 0 to 1, and the timestamp in the Progress_Record as one attempt.
5. WHEN an Exam_Result exists, THE Pathway_Board SHALL offer to import a Matematik grade derived from the latest Exam_Result into the Grade_Set, and the import SHALL replace only the Matematik grade.
6. THE Storage_Service SHALL store a schema version number, as a positive integer, with all persisted data.
7. WHEN the Storage_Service loads data with a schema version lower than the current version, THE Storage_Service SHALL run the migration hook once for each version step, in ascending order, before any feature reads the data.
8. IF the Storage_Service loads data with a schema version higher than the current version or a migration step fails, THEN THE Storage_Service SHALL leave the stored data unchanged, THE Profile_Store SHALL start with empty in-memory state, and THE Shell SHALL show a kind message that saved progress could not be read.
9. IF the Storage_Service fails to read or write data, THEN THE Profile_Store SHALL keep the in-memory state, THE Shell SHALL show a kind message that progress may not be saved, and THE Profile_Store SHALL retry the write on the next change.
10. FOR ALL valid Student_Profile and Progress_Record values, saving then loading through the Storage_Service SHALL produce an equal value (round-trip property).
11. THE Profile_Store SHALL hold chat history, Student_Profile, Progress_Record, and Grade_Set in browser storage only and SHALL send none of them over the network.

### Requirement 3: Rakan Chat Interface

**User Story:** As a Student, I want a casual WhatsApp-style chat with Rakan, so that revising feels friendly and easy.

#### Acceptance Criteria

1. THE Rakan SHALL display messages in a single vertical thread in chronological order, with Student messages and Rakan messages differing in both alignment (Student on one side, Rakan on the other) and a text label or icon that does not rely on colour alone.
2. WHEN the Student opens Rakan, THE Rakan SHALL show a greeting in the selected Language that contains the Student's name or nickname from the Student_Profile.
3. WHEN the Student sends a message of 1 to 500 characters after trimming whitespace, THE Rakan SHALL append the message to the thread within 100 ms and SHALL show a Rakan reply from the Reply_Generator.
4. IF the Student sends a message that is empty after trimming whitespace, THEN THE Rakan SHALL not append it to the thread, SHALL not request a reply, and SHALL keep focus in the input field.
5. IF the Student types more than 500 characters, THEN THE Rakan SHALL block further input beyond 500 characters and SHALL show a character limit notice in the selected Language, while keeping the text already typed.
6. WHILE a reply is being generated, THE Rakan SHALL show a typing indicator and SHALL remove it when the reply is appended.
7. WHEN Rakan replies using the Rules_Provider, THE Rakan SHALL append the reply within 1 second of the Student message being appended.
8. THE Rakan SHALL offer quick-reply chips for "Quiz me", "Start exam", "See my pathways", and "What should I revise?" in the selected Language.
9. WHEN the Student selects the "Quiz me" or "What should I revise?" chip, THE Rakan SHALL append the chip text as a Student message and show the matching Rakan reply in the same thread.
10. WHEN the Student selects the "Start exam" or "See my pathways" chip, THE Rakan SHALL navigate through the Shell to Exam_Mode or Pathway_Board respectively.
11. WHEN a message is appended to the thread, THE Rakan SHALL persist the thread through the Profile_Store within 1 second.
12. WHEN the Student reopens Rakan after a reload, THE Rakan SHALL restore the persisted thread in its original order, up to the latest 200 messages.
13. IF the Profile_Store fails to persist the thread, THEN THE Rakan SHALL keep the thread in memory and stay usable, and THE Shell SHALL show the progress-may-not-be-saved message defined in Requirement 2.
14. WHERE the selected Language is BM, THE Rakan SHALL address the Student with "awak" or "korang" and SHALL not use "kau".

### Requirement 4: Rule-Based Intents and Reply Generation

**User Story:** As a Student, I want Rakan to answer useful questions even with no internet, so that I can study anywhere.

#### Acceptance Criteria

1. WHEN the Student sends a message, THE Intent_Engine SHALL classify it into exactly one of these intents: greeting, quiz_request, revise_advice, exam_request, pathway_request, topic_help, language_switch, data_help, or unknown.
2. IF a Student message matches none of the intents greeting, quiz_request, revise_advice, exam_request, pathway_request, topic_help, language_switch, or data_help, or is empty or contains only whitespace, THEN THE Intent_Engine SHALL classify it as unknown.
3. WHEN the Student message matches an intent other than unknown, THE Rules_Provider SHALL return a reply written for that intent in the selected Language.
4. WHEN the Student message is classified as unknown, THE Rules_Provider SHALL reply with a friendly prompt that lists the Rakan capabilities of quiz, revision advice, exam, pathways, topic help, language switch, and data help, in the selected Language.
5. WHEN the Student asks for help on a Matematik topic in the question bank, THE Rules_Provider SHALL reply with an original explanation of no more than 100 words and an offer to start a Quiz_Flow on that topic.
6. THE Reply_Generator SHALL expose one `generateReply(request): Promise<Reply>` interface that the Rules_Provider, UserKey_Provider, and Proxy_Provider all implement.
7. THE Reply_Generator SHALL use the Rules_Provider by default.
8. WHERE the Student enables the UserKey_Provider and has entered a key, THE Reply_Generator SHALL send chat phrasing requests to the UserKey_Provider.
9. WHERE the Student enables the Proxy_Provider, THE Reply_Generator SHALL send chat phrasing requests to the Proxy_Function.
10. IF a remote provider call fails, does not respond within 8 seconds, or returns a rate limit response, THEN THE Reply_Generator SHALL return the Rules_Provider reply for the same request, SHALL show no error message to the Student, and THE Rakan SHALL keep the message input enabled.
11. THE Reply_Generator SHALL leave Marker scores, Weak_Topic calculation, and Eligibility_Engine results to deterministic rule code and SHALL send none of those decisions to an LLM.
12. FOR ALL Student messages and Profile states, THE Rules_Provider SHALL return the same reply for the same input (determinism property).
13. THE Rules_Provider SHALL need no network access and no API key.

### Requirement 5: Remote AI Opt-In and Privacy

**User Story:** As a Student, I want to decide whether my questions leave my phone, so that my privacy stays under my control.

#### Acceptance Criteria

1. WHEN the App starts for the first time, THE App SHALL set every remote AI provider (UserKey_Provider and Proxy_Provider) to disabled, and THE App SHALL keep each one disabled until the Student enables it in settings.
2. WHEN the Student enables a remote provider and Remote_AI_Consent has not been recorded, THE Shell SHALL show a plain-language notice in the selected Language that lists each item to be sent (the current question, the Language, and the current topic name if any) and the name of the receiving provider, and SHALL require the Student to confirm before the provider is enabled.
3. IF the Student dismisses the notice without confirming, THEN THE Shell SHALL leave the provider disabled and SHALL leave Remote_AI_Consent unrecorded.
4. WHILE Remote_AI_Consent is not recorded, THE Reply_Generator SHALL use only the Rules_Provider and SHALL make zero remote calls.
5. WHEN the Reply_Generator makes a remote call, THE Reply_Generator SHALL send only the current question (at most 500 characters), the Language, and at most one current topic name as context.
6. IF the Student has not agreed in settings to share the Student name, school, or Grade_Set, THEN THE Reply_Generator SHALL exclude that item from every remote request.
7. WHERE the Student enters an API key, THE Storage_Service SHALL store the key in browser storage only, and THE UserKey_Provider SHALL send the key only to the chosen provider.
8. WHEN the Student revokes Remote_AI_Consent, THE Reply_Generator SHALL use the Rules_Provider for the next reply and every reply after it, and THE Shell SHALL show the provider as disabled.
9. IF a request body sent to the Proxy_Function is larger than 2 KB, THEN THE Proxy_Function SHALL reject the request and THE Reply_Generator SHALL return the Rules_Provider reply.
10. THE Proxy_Function SHALL write no prompt text to logs.
11. THE App SHALL load no analytics, trackers, third-party fonts, or third-party scripts.
12. WHEN the Student selects Data_Export, THE App SHALL download one JSON file that contains the Student_Profile, Progress_Record, Grade_Set, and chat history, and SHALL exclude API keys.
13. WHEN the Student selects Data_Delete, THE Shell SHALL ask for confirmation before any data is removed.
14. WHEN the Student confirms Data_Delete, THE Storage_Service SHALL remove all stored Student data, Remote_AI_Consent, and API keys, and THE Shell SHALL return to onboarding.
15. IF the Student cancels the Data_Delete confirmation, THEN THE Shell SHALL keep all stored data unchanged.
16. FOR ALL valid stored data, importing the output of Data_Export SHALL reproduce an equal Student_Profile and Progress_Record (round-trip property).

### Requirement 6: Quiz-Me Flow

**User Story:** As a Student, I want Rakan to quiz me one question at a time, so that I can practise in small bites.

#### Acceptance Criteria

1. WHEN the Student requests a quiz, THE Rakan SHALL ask which topic the Student wants and SHALL offer the Weak_Topic with the lowest score ratio as the first choice, WHERE the Weak_Topic list is not empty.
2. WHEN a topic is chosen, THE Quiz_Flow SHALL ask one Question at a time from the question bank for that topic, choosing only Questions not yet answered in the current Quiz_Flow.
3. WHEN the Student answers a Quiz_Flow Question, THE Marker SHALL score the answer against the Skema, and THE Rakan SHALL show the points earned, the points missed, the marks out of the total marks of the Question, and the explanation in the selected Language.
4. WHEN a Quiz_Flow answer earns full marks, THE Rakan SHALL reply with praise of no more than 2 sentences in the selected Language.
5. WHEN a Quiz_Flow answer earns less than full marks, THE Rakan SHALL reply with an encouraging message and the explanation, and the reply SHALL contain no scolding wording.
6. WHEN a Quiz_Flow has marked 5 Questions, or the chosen topic has no Question left that is unanswered in the current Quiz_Flow, THE Quiz_Flow SHALL end and show a summary with the total marks earned out of the total marks available.
7. WHEN the Student types "stop" (matched ignoring case and surrounding whitespace) or selects the stop chip, THE Quiz_Flow SHALL end and SHALL keep the scores of all Questions already marked in the Progress_Record.
8. IF the Student sends an empty answer or an answer containing only whitespace, THEN THE Quiz_Flow SHALL ask the Student to try again, SHALL keep the current Question open, and SHALL not record a score.
9. IF the chosen topic has no Question in the question bank, THEN THE Rakan SHALL tell the Student that the topic has no questions yet and SHALL offer a list of topics that have Questions.
10. THE Quiz_Flow SHALL work fully offline.

### Requirement 7: Nudges From Weak Topics

**User Story:** As a Student, I want gentle reminders about topics I find hard, so that I know what to revise next without feeling pressured.

#### Acceptance Criteria

1. WHEN the Student opens Rakan, the Weak_Topic list is not empty, and no Nudge has been shown in the current app session, THE Rakan SHALL show one Nudge that names the Weak_Topic with the lowest score ratio, and SHALL name the topic with the earliest topic name in alphabetical order if two or more Weak_Topics share the lowest score ratio.
2. WHEN the Student asks what to revise and the Weak_Topic list is not empty, THE Rakan SHALL list up to 3 Weak_Topics ordered by ascending score ratio, with each entry showing the topic name and its score ratio as a percentage, and SHALL list every Weak_Topic if fewer than 3 exist.
3. IF the Weak_Topic list is empty, THEN THE Rakan SHALL show no Nudge and SHALL suggest taking the exam or a quiz through a message with "Start exam" and "Quiz me" chips in the selected Language.
4. THE Rakan SHALL show at most 1 Nudge per app session, where an app session starts when the App loads and ends when the App is closed or reloaded.
5. WHEN a Nudge is shown, THE Rakan SHALL offer a "Quiz me on this" chip in the selected Language that starts a Quiz_Flow on the topic named in the Nudge.
6. THE Nudge text SHALL contain no guilt wording, no fear wording, and no comparison with other students, and SHALL use "awak" or "korang" when written in BM.
7. WHEN an Exam_Result or a Quiz_Flow answer changes a topic score, THE Profile_Store SHALL recompute the Weak_Topic list, and THE Rakan SHALL base the next Nudge and the next "what should I revise" reply on the recomputed list.
8. IF the Nudge for the current app session has already been shown when the Weak_Topic list changes, THEN THE Rakan SHALL show no additional Nudge until the next app session.

### Requirement 8: Exam Paper Content

**User Story:** As a Student, I want a realistic but original practice paper, so that I can rehearse exam conditions with fresh questions.

#### Acceptance Criteria

1. THE App SHALL ship exactly one Matematik Paper containing 10 to 15 objective Questions and 3 to 4 short structured Questions, where an objective Question has a single-answer Skema and a structured Question has a Skema with 2 or more points.
2. THE Paper SHALL cover at least 4 distinct Matematik topic tags, with at least 1 topic from Form 4 and at least 1 topic from Form 5.
3. THE App SHALL store every Question as typed data containing: BM and EN question text, total marks (integer from 1 to 10), a Skema, a BM and EN explanation, a topic tag, a form tag (Form 4 or Form 5), a subject, a language, and `original: true`.
4. THE Paper SHALL use only fictional names and settings in every Question.
5. THE Paper SHALL contain no text copied or closely paraphrased from past papers, trial papers, or commercial books. A Question that resembles such a source SHALL be rewritten before release.
6. WHEN the Student opens Exam_Mode, THE App SHALL load the Paper content. THE App SHALL not load the Paper content before that point.
7. IF the Paper content fails to load, THEN THE Exam_Mode SHALL show a kind message in the selected Language that offers a retry action, SHALL not start the Exam_Timer, and SHALL keep the Student_Profile and Progress_Record unchanged.
8. FOR ALL Questions, THE test suite SHALL include at least one correct answer that earns full marks and at least one incorrect answer that earns zero marks for the Skema.
9. FOR ALL Questions, THE sum of Skema point marks SHALL equal the total marks of that Question, and each Skema point SHALL have at least 1 entry in its `accepted` list.
10. FOR ALL Questions, THE test suite SHALL fail if any BM or EN text field, including the explanation, is missing or empty.

### Requirement 9: Exam Timer and Paper Runner

**User Story:** As a Student, I want a formal timed paper with a countdown, so that I can practise managing my time.

#### Acceptance Criteria

1. WHEN the Student selects Start exam, THE Exam_Mode SHALL show an instructions screen that states the Paper duration in minutes, the number of Questions, and the total marks, and THE Exam_Timer SHALL remain stopped until the Student confirms.
2. WHEN the Student confirms the instructions, THE Exam_Timer SHALL record the start timestamp and start a countdown from the Paper duration.
3. WHILE the Exam_Timer is running, THE Exam_Mode SHALL display the remaining time in minutes and seconds (format mm:ss) and SHALL refresh the display at least once every 1 second.
4. WHILE the Exam_Timer is running, THE Exam_Mode SHALL let the Student move to any Question and change any answer, and SHALL keep each entered answer when the Student moves between Questions.
5. WHEN 5 minutes of remaining time is reached, THE Exam_Mode SHALL show a visible time warning and announce it through a screen-reader live region exactly once per attempt.
6. WHEN the Exam_Timer reaches zero, THE Exam_Mode SHALL stop the Exam_Timer, submit the current answers without Student confirmation, and pass them to the Marker, and SHALL announce the auto-submit through a screen-reader live region.
7. WHEN the Student selects Submit, THE Exam_Mode SHALL ask for confirmation, and WHEN the Student confirms, THE Exam_Mode SHALL stop the Exam_Timer and pass the answers to the Marker.
8. THE Exam_Timer SHALL compute remaining time from the recorded start timestamp and the current time, so that the displayed time is correct within 1 second after the tab is hidden or the device sleeps.
9. WHILE an exam is in progress, THE Exam_Mode SHALL save the current answers and the start timestamp through the Profile_Store at least once every 10 seconds and after each answer change.
10. WHEN the App reloads while an exam is in progress and the remaining time is greater than zero, THE Exam_Mode SHALL offer to resume the exam with the saved answers and the remaining time computed from the saved start timestamp.
11. WHEN the App reloads while an exam is in progress and the remaining time is zero, THE Exam_Mode SHALL submit the saved answers to the Marker without Student confirmation and show the Exam_Result.
12. IF the Student cancels the Submit confirmation, THEN THE Exam_Mode SHALL keep the Exam_Timer running and keep all entered answers.
13. IF the Profile_Store fails to save the exam progress, THEN THE Exam_Mode SHALL keep the exam running with the in-memory answers and show a kind message that progress may not be saved.
14. THE Exam_Mode SHALL use a formal visual style distinct from the Rakan chat.
15. FOR ALL start timestamps and current timestamps, THE Exam_Timer SHALL return remaining time equal to the Paper duration minus elapsed time, with a minimum of zero and a maximum of the Paper duration.

### Requirement 10: Skema Marking and Results

**User Story:** As a Student, I want my answers marked fairly against the skema with clear explanations, so that I learn what I got right and what to fix.

#### Acceptance Criteria

1. WHEN an Exam_Mode submission occurs, THE Marker SHALL score every Question in the Paper against its Skema without network access and SHALL produce the Exam_Result within 2 seconds on a mid-range phone.
2. THE Marker SHALL normalise the Student answer and each `accepted` variant before comparing, by converting to lower case, trimming leading and trailing whitespace, collapsing runs of internal whitespace to one space, and removing unit text that is listed for that Skema point.
3. WHEN a normalised Student answer equals a normalised `accepted` variant of a Skema point, THE Marker SHALL award the marks of that point.
4. THE Marker SHALL award marks per Skema point and SHALL not award the same Skema point more than once for one Question.
5. THE Exam_Result SHALL list, for each Question, the Skema points that earned marks and the Skema points that were missed, with the marks awarded for each point.
6. THE Exam_Result SHALL show a per-topic breakdown with marks earned, marks available, and a score ratio from 0 to 1 (rounded to 2 decimal places) for each topic in the Paper.
7. THE Exam_Result SHALL show the total marks earned out of the total marks available and an overall SPM-style grade band for Matematik, chosen from the grades A+ to G, using the percentage-to-grade mapping stored as typed data.
8. THE Exam_Result SHALL show the explanation in the selected Language for every Question, including Questions answered fully correctly and Questions left unanswered.
9. THE Exam_Result SHALL use encouraging wording in the selected Language, taken from the I18n_Service, and SHALL contain no scolding wording.
10. WHEN the Exam_Result is produced, THE Exam_Mode SHALL show a button that opens the Pathway_Board with the derived Matematik grade ready to import.
11. IF a Student left a Question unanswered (no answer, or an answer that is empty after trimming whitespace), THEN THE Marker SHALL award zero marks for that Question and THE Exam_Result SHALL mark the Question as unanswered.
12. FOR ALL answers, THE Marker SHALL return marks between zero and the total marks of the Question, inclusive.
13. FOR ALL answers, THE Marker SHALL return the same marks when the answer is changed only by letter case or by extra leading, trailing, or repeated internal whitespace (metamorphic property).
14. FOR ALL answers, THE Marker SHALL return the same result when applied twice to the same input (determinism property).
15. THE Marker SHALL not call any LLM.
16. WHEN the Exam_Result is produced, THE Profile_Store SHALL save the Exam_Result so that it remains available after the App reloads.
17. IF the Marker fails to score a Question, THEN THE Exam_Mode SHALL keep the Student's saved answers, show a kind message that marking could not finish, and offer a retry action.

### Requirement 11: Pathway Board Grade Entry

**User Story:** As a Student, I want to enter or import grades and try "what if" grades, so that I can see options before and after results.

#### Acceptance Criteria

1. THE Pathway_Board SHALL let the Student select, for each supported SPM subject, one grade from exactly these 10 values: A+, A, A-, B+, B, C+, C, D, E, G.
2. THE Pathway_Board SHALL include at least Bahasa Melayu, Bahasa Inggeris, Matematik, Sejarah, and Sains in the grade entry list.
3. WHEN the Student changes any grade, THE Pathway_Board SHALL update every Hint within 200 ms.
4. WHEN the Student selects the import action and an Exam_Result exists, THE Pathway_Board SHALL set the Matematik grade to the grade derived from the latest Exam_Result and SHALL leave the other subject grades unchanged.
5. IF the Student selects the import action and no Exam_Result exists, THEN THE Pathway_Board SHALL show a kind message in the selected Language that says no exam result is available yet and SHALL leave all grades unchanged.
6. WHERE the Student turns on "what if" mode, THE Pathway_Board SHALL label the grades as predicted and SHALL keep the saved Grade_Set unchanged until the Student turns the mode off.
7. WHEN the Student changes a grade while "what if" mode is off, THE Pathway_Board SHALL save the updated Grade_Set through the Profile_Store within 1 second.
8. WHEN the Student turns "what if" mode off, THE Pathway_Board SHALL discard the predicted grades and show the saved Grade_Set.
9. IF no grade has been entered for any subject, THEN THE Pathway_Board SHALL show a friendly prompt in the selected Language to enter grades and SHALL show no Hints.
10. THE Pathway_Board SHALL be usable on a 360 px wide screen without horizontal scrolling.

### Requirement 12: Pathway Eligibility Hints

**User Story:** As a Student, I want to see which routes may be open for my grades, so that I can plan the next step without false promises.

#### Acceptance Criteria

1. WHEN the Grade_Set changes or the Student opens the Pathway_Board with a non-empty Grade_Set, THE Eligibility_Engine SHALL evaluate the Grade_Set against the Pathway_Rules for Matrikulasi, Asasi, STPM, Diploma, TVET, and Foundation and SHALL return exactly one Hint for each of the 6 Pathways.
2. THE Eligibility_Engine SHALL set the level of each Hint to exactly one of "may be open", "may need more", or "check closely".
3. THE Eligibility_Engine SHALL return, for each Hint, a reason that names at least one SPM subject and grade, or one Pathway_Rule condition, that decided the level, in the selected Language.
4. IF a Grade_Set has no grade for a subject that a Pathway_Rule requires, THEN THE Eligibility_Engine SHALL treat the requirement as not met, SHALL set the Hint level for that Pathway to "may need more" or "check closely" and SHALL name the missing subject in the reason.
5. THE Eligibility_Engine SHALL use rule code only and SHALL not call any LLM or network.
6. THE App SHALL store every Pathway_Rule as typed data with a `lastReviewed` date in ISO 8601 date format (YYYY-MM-DD) and a non-empty source note.
7. THE Pathway_Board SHALL use hedged wording such as "may be open" and "usually needs" in BM and EN, and SHALL not use "you are eligible", "you will get in", or their BM equivalents.
8. THE Pathway_Board SHALL not show official logos and SHALL not state or imply endorsement by MOE, UPU, or any institution.
9. WHEN the Student selects a Pathway card, THE Pathway_Board SHALL show the usual requirements, the reason for the Hint, the `lastReviewed` date, and a suggested next step.
10. WHEN a Hint is "may need more" or "check closely", THE Pathway_Board SHALL name at least one subject and the grade that would change the Hint to a better level.
11. IF the Grade_Set Hints contain no "may be open" level for any Pathway, THEN THE Pathway_Board SHALL show a supportive message that frames the grades as a starting point and SHALL name at least one Pathway with the best available Hint level as the next one to explore.
12. WHEN at least one Pathway has the Hint level "may be open" and the Student views a Pathway with a different level, THE Pathway_Board SHALL list at least one Pathway that has the Hint level "may be open".
13. FOR ALL Grade_Sets, THE Eligibility_Engine SHALL return the same Hints for the same Grade_Set (determinism property).
14. FOR ALL pairs of Grade_Sets where every grade in the second is equal to or better than the same subject's grade in the first, THE Eligibility_Engine SHALL return, for each Pathway, a Hint level equal to or better than that of the first, where the order from best to worst is "may be open", "may need more", "check closely" (monotonicity property).
15. THE test suite SHALL include at least one fictional Student case for each of the 6 Pathways that checks the Hint level and the reason.

### Requirement 13: Pathway Disclaimer

**User Story:** As a Student, I want a clear reminder that the board is guidance only, so that I check the official sources.

#### Acceptance Criteria

1. THE Pathway_Board SHALL show the full Disclaimer text, unabridged, in the selected Language on the board view and on every Pathway detail view, including when no grades have been entered.
2. WHEN Rakan replies to a pathway_request intent, THE Rakan SHALL include either the full Disclaimer text in the selected Language or a link that opens the Pathway_Board view showing the Disclaimer.
3. WHEN the Exam_Result shows the button to open the Pathway_Board, THE Exam_Mode SHALL show, in the selected Language and next to that button, a note of at most 120 characters stating that the board gives guidance only.
4. WHEN the board view finishes rendering the Hints, THE Pathway_Board SHALL show the full Disclaimer within the visible area, without scrolling, on a 360 px wide by 640 px high viewport.
5. WHEN the Student switches Language, THE Pathway_Board SHALL replace the Disclaimer with the text in the other Language within 200 ms, in the same view, without navigating away and without changing the Grade_Set or the open Pathway detail view.
6. IF the Disclaimer text for the selected Language is unavailable, THEN THE Pathway_Board SHALL show the Disclaimer in the other Language so that the board never appears without a Disclaimer.

### Requirement 14: Bilingual Support

**User Story:** As a Student, I want to use the App in BM, EN, or switch between them, so that I can learn in the language I am comfortable with.

#### Acceptance Criteria

1. THE Shell SHALL show a Language toggle on every screen, including Rakan, Exam_Mode, Pathway_Board, and onboarding, reachable without scrolling at a 360 px viewport width and with a touch target of at least 44 by 44 CSS px.
2. WHEN the Student toggles the Language, THE I18n_Service SHALL switch all visible UI strings, Question text, Skema explanations, and Rakan replies on the current screen to the selected Language within 300 ms and without a page reload.
3. WHEN the Student toggles the Language during an Exam_Mode attempt, THE App SHALL keep the Exam_Timer running, SHALL retain all entered answers, and SHALL keep the current Question displayed.
4. WHEN the Student toggles the Language, THE Rakan SHALL keep earlier chat messages in the Language in which they were sent and SHALL use the selected Language for later replies.
5. THE App SHALL store every UI string in both BM and EN in `core/i18n` and SHALL not hardcode user-visible strings in components.
6. WHEN the Student toggles the Language, THE Profile_Store SHALL persist the selected Language so that it is applied on the next App launch, including when the device is offline.
7. IF no Language has been stored, THEN THE I18n_Service SHALL default to the browser's preferred language when it is BM or EN, and to BM otherwise.
8. IF a string is missing in the selected Language, THEN THE I18n_Service SHALL return the other Language's string and SHALL not display an empty string or a raw key.
9. THE test suite SHALL fail IF any i18n key has a missing or empty BM or EN value.
10. THE App SHALL use "awak" or "korang" for the second person in BM copy and SHALL not use the informal "kau".
11. THE App SHALL contain no em dash character in UI strings or public documents.
12. THE App SHALL display the terms SPM, STPM, UPU, TVET, and KSSM unchanged in both Languages.

### Requirement 15: Offline and Progressive Web App

**User Story:** As a Student on patchy mobile data, I want the App to install and work offline, so that I can study anywhere.

#### Acceptance Criteria

1. THE App SHALL provide a web manifest with a name, at least one icon of 192 px and one of 512 px, a theme colour, and `display` set to standalone, so that a supporting browser offers installation.
2. WHEN the App finishes its first online load, THE Service_Worker SHALL cache the App shell, styles, scripts, and Rules_Provider code, so that all of them are available with no network.
3. WHEN the App is opened with no network after the first online load, THE App SHALL start within 3 seconds and show the Shell, Rakan, Exam_Mode, and Pathway_Board, each using only cached content.
4. WHEN the Student first opens Exam_Mode or Pathway_Board while online, THE Service_Worker SHALL cache the lazy-loaded content for that feature for offline use.
5. IF the device is offline and the Student opens Exam_Mode or Pathway_Board before its lazy-loaded content was cached, THEN THE Shell SHALL show a message in the selected Language saying the feature needs one online visit first, and SHALL keep Rakan and all other cached features usable.
6. WHILE the device is offline, THE Shell SHALL show an offline notice in the selected Language and SHALL keep all Rules_Provider features working.
7. WHILE the device is offline, THE Reply_Generator SHALL not call a remote provider and SHALL return the Rules_Provider reply.
8. WHEN a new App version is available, THE Service_Worker SHALL install it in the background and activate it on the next App launch.
9. WHILE an exam is in progress, THE Service_Worker SHALL not reload the page or replace the running App version, so that the Exam_Timer and the Student's answers are not interrupted or lost.
10. THE App SHALL keep the initial JavaScript payload at or below 200 KB gzipped, excluding lazy-loaded exam and pathway content.
11. THE App SHALL run the complete demo flow (onboarding, Rakan chat, one Exam_Mode attempt with marking, and Pathway_Board with the Disclaimer) with no API key and no network, once the first online load and the lazy-loaded content caching in criterion 4 have completed.

### Requirement 16: Accessibility and Mobile-First Design

**User Story:** As a Student on a phone, I want an App that is easy to read and use, so that I can study comfortably regardless of ability.

#### Acceptance Criteria

1. THE App SHALL render every screen from 360 px to 1280 px viewport width with no horizontal scrolling of the page and with no content clipped or overlapping.
2. THE App SHALL provide a contrast ratio of at least 4.5:1 for normal text and at least 3:1 for large text (at least 24 px, or at least 18.66 px bold) and for interface component boundaries, each measured against its background.
3. THE App SHALL make every interactive control reachable with the Tab key and operable with the Enter key or Space key, with no keyboard trap on any screen.
4. WHILE an interactive control has keyboard focus, THE App SHALL show a visible focus indicator with a contrast ratio of at least 3:1 against adjacent colours and a thickness of at least 2 CSS pixels.
5. THE App SHALL give every interactive control a touch target of at least 44 by 44 CSS pixels.
6. THE App SHALL give every form field, button, and icon-only control a non-empty accessible name in the selected Language.
7. WHEN Rakan appends a message, THE Rakan SHALL announce the message text to screen readers through a polite live region within 1 second.
8. WHEN the Exam_Timer shows a time warning or auto-submits the Paper, THE Exam_Mode SHALL announce the event to screen readers through a live region within 1 second.
9. WHERE the device sets the reduced-motion preference, THE App SHALL disable decorative animations and the Rakan typing indicator animation, and SHALL keep the typing indicator visible as a static element.
10. THE App SHALL pair every state conveyed by colour (including correct, incorrect, missed, selected, Hint level, and timer warning) with a text label or an icon.
11. WHEN the Student changes the Language, THE Shell SHALL set the document `lang` attribute to `ms` for BM or `en` for EN to match the selected Language within 1 second.
12. WHEN the App first loads, THE Shell SHALL set the document `lang` attribute to the Language stored in the Student_Profile, or to the default determined by Requirement 14 if no Language is stored.

### Requirement 17: Kiroween Frankenstein Visual Identity

**User Story:** As a Judge and a Student, I want a tasteful stitched-together look, so that the three modes feel distinct yet clearly one product.

#### Acceptance Criteria

1. THE Visual_Identity SHALL render a shared stitched-seam motif, made of dashed stitch lines and patch corners, on every top-level panel in Rakan, Exam_Mode, and Pathway_Board.
2. THE Rakan chat SHALL render Student and Rakan messages as rounded bubbles on a warm-toned background, using a different panel background and corner style from Exam_Mode and Pathway_Board.
3. THE Exam_Mode SHALL render questions on a plain paper-style layout with square corners and no chat bubbles, and SHALL show the Exam_Timer remaining time at a font size at least 1.5 times the question body text size.
4. THE Pathway_Board SHALL render each Pathway as a card in a grid, and SHALL show each Hint level as both a text label and an icon, so that the level is identifiable without relying on colour alone.
5. THE Shell SHALL show a persistent navigation bar on every screen after onboarding, with one link each to Rakan, Exam_Mode, and Pathway_Board, and SHALL mark the current mode as active.
6. WHEN the Student moves between modes, THE Shell SHALL show a stitched-seam transition lasting no more than 400 ms and SHALL complete the navigation within that time.
7. WHILE the operating system reduced-motion setting is enabled, THE Shell SHALL show no animated transition between modes and SHALL switch modes immediately.
8. THE Visual_Identity SHALL load all fonts, icons, and images from files bundled with the App and SHALL make no network request to third-party hosts for them.
9. THE Visual_Identity SHALL use a muted Kiroween palette and SHALL NOT include gore imagery, fear imagery, or text intended to frighten the Student.
10. THE Visual_Identity SHALL keep body text contrast at a ratio of at least 4.5:1 against its background in all three modes.
11. WHEN the Student opens the home screen, THE Shell SHALL show a caption of no more than 160 characters in the selected Language that names Rakan, Exam_Mode, Pathway_Board, and the shared Student_Profile.

### Requirement 18: Zero-Cost Hosting and Build

**User Story:** As a solo developer, I want a free and simple deployment, so that the project costs nothing to run.

#### Acceptance Criteria

1. WHEN `npm run build` is run, THE App SHALL complete the TypeScript type check and write the production build into the `dist` directory with exit code 0.
2. IF the TypeScript type check or the build fails, THEN THE App SHALL exit `npm run build` with a non-zero exit code and SHALL NOT report the build as successful.
3. THE Hosting_Target SHALL serve the contents of `dist` as a static site with no server-side runtime required for the App to load and for the Rules_Provider flow of Rakan, Exam_Mode, and Pathway_Board to work.
4. THE App SHALL declare only dependencies and dev dependencies that are free and open source, and SHALL use only services that have a free tier with no payment method required.
5. WHERE the Proxy_Function is deployed, THE Proxy_Function SHALL run as a Cloudflare Pages Function and call Workers AI free tier.
6. THE repository SHALL provide `npm run dev`, `npm run build`, `npm run lint`, and `npm test` scripts, each runnable with project-local dependencies only and no global package installs.
7. WHEN `npm test` is run, THE App SHALL run all tests once without watch mode, with no network access and no API key, and exit with code 0 if all tests pass or a non-zero code if any test fails.
8. WHEN `npm run lint`, `npm test`, and `npm run build` are each run on the submission commit, THE repository SHALL complete each with exit code 0, zero ESLint errors, and zero failing tests.
9. THE repository SHALL include an English README that explains the project, the three stitched parts, how to run it with the four npm scripts, and the privacy approach, and that states the full demo works offline with no API key.

### Requirement 19: Test Coverage for Core Logic

**User Story:** As a Judge, I want evidence that the rules and logic work, so that I can trust the technical quality.

#### Acceptance Criteria

1. WHEN the test suite is run once in non-watch mode, THE test suite SHALL execute at least one passing test for each of the Marker, Exam_Timer, Eligibility_Engine, Storage_Service, and Reply_Generator fallback path, and SHALL exit with a non-zero status if any test fails.
2. THE test suite SHALL use only original, fictional Students in all test data, with no real person's name, school, or grades.
3. THE test suite SHALL run without network access and without any API key, and SHALL use test doubles for the UserKey_Provider and Proxy_Provider.
4. WHEN a remote provider test double fails, times out, or returns a rate limit response, THE test suite SHALL confirm that the Reply_Generator returns the Rules_Provider reply, with no error shown to the Student, and that the chat remains usable for the next request.
5. THE test suite SHALL confirm that the Marker awards marks per Skema point, using at least one correct answer and one incorrect answer for every Question's Skema, and that matching ignores differences in letter case, spacing, and units.
6. THE test suite SHALL confirm that the Exam_Timer counts down, stops at 0 seconds, and triggers submission exactly once at expiry.
7. THE test suite SHALL confirm that the Weak_Topic calculation returns a topic as weak if and only if its latest score ratio is below 0.5, or it has fewer than 2 recorded attempts and a score ratio below 0.6, including the boundary values 0.5 and 0.6.
8. THE test suite SHALL confirm that every Pathway_Rule data record contains a `lastReviewed` date and a non-empty source note.

### Requirement 20: MVP Scope and Demo Readiness

**User Story:** As a solo developer, I want a bounded scope with a clear demo script, so that I can finish in about 10 evenings and present in under 3 minutes.

#### Acceptance Criteria

1. THE App SHALL include exactly one subject (Matematik), exactly one Paper, and exactly six Pathways (Matrikulasi, Asasi, STPM, Diploma, TVET, and Foundation) in the MVP.
2. THE App SHALL contain no accounts, login, payments, backend database, social features, leaderboards, or teacher dashboards.
3. WHEN the Student follows the demo script starting from empty browser storage, with no network connection and no API key, THE App SHALL let the Student reach onboarding completion, one answered Rakan Quiz_Flow question, a displayed Exam_Result, and a displayed Pathway_Board Hint in order within 180 seconds of first launch.
4. WHERE the demo setting is enabled, THE Exam_Mode SHALL set the Exam_Timer duration to 60 seconds, and THE Exam_Mode SHALL keep the Paper questions, Skema, and Marker results identical to those used when the demo setting is disabled.
5. WHEN the Student submits or times out a Paper attempt, THE App SHALL, within 2 seconds, show an updated Rakan Nudge that names a Weak_Topic from that Exam_Result, show the Exam_Result, and show a Pathway_Board Hint computed from the Grade_Set that includes the Matematik grade imported from that Exam_Result, with all three read from the Profile_Store.
6. THE repository SHALL include an English demo script in `docs/` that lists each demo step in order, with a target time per step and a total target time of no more than 180 seconds.
7. THE project SHALL be submission-ready by the end of Friday 4 December 2026, where submission-ready means `npm run lint`, `npm test`, and `npm run build` each exit with code 0 and the English demo script from criterion 6 exists in `docs/`.
