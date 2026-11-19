import { useEffect, useRef, useState, type FormEvent } from 'react';
import { topicLabel } from '../../content/questionBank';
import { useNavigate } from '../../app/NavigationContext';
import { generateReply } from '../../core/ai';
import { useI18n, type StringKey } from '../../core/i18n';
import { pick } from '../../core/i18n';
import { useProfileState, useProfileStore, type ChatMessage, type ChipId, type Language, type TopicId } from '../../core/profile';
import { CHAT_MAX_LENGTH, clampChatInput, validateChatInput } from './input';
import { classifyIntent, findTopic } from './intents';
import { hasNudgeBeenShown, markNudgeShown, nudgeMessage, nudgeTopicThisSession, pickNudgeTopic } from './nudge';
import { IDLE, isQuizActive, quizReducer, type QuizEvent, type QuizState } from './quiz';
import { openingGreeting, ruleReply } from './replies';
import '../../styles/chat.css';

let sequence = 0;
function nextId(): string {
  sequence += 1;
  return `m${Date.now().toString(36)}-${sequence}`;
}

/** Chips a Rakan message can carry that are not quiz topic buttons. */
const CHIP_LABELS: Record<ChipId, StringKey> = {
  quiz: 'chat.chip.quiz',
  exam: 'chat.chip.exam',
  pathways: 'chat.chip.pathways',
  revise: 'chat.chip.revise',
  stop: 'chat.chip.stop',
  quizTopic: 'chat.chip.quizTopic',
};

export function ChatScreen() {
  const { t, lang, setLanguage } = useI18n();
  const store = useProfileStore();
  const navigate = useNavigate();
  const state = useProfileState();
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(0);
  const [quiz, setQuizState] = useState<QuizState>(IDLE);
  const quizRef = useRef<QuizState>(IDLE);
  const [topicChoices, setTopicChoices] = useState<TopicId[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const name = state.profile?.name ?? '';
  const messages = state.chat;

  useEffect(() => {
    if (typeof endRef.current?.scrollIntoView === 'function') endRef.current.scrollIntoView({ block: 'end' });
  }, [messages.length, typing]);

  // Rakan opens with at most one gentle nudge per app session. It reads the live weak list from
  // the store when the screen opens, so a fresh exam result changes what Rakan says.
  useEffect(() => {
    if (hasNudgeBeenShown()) return;
    const weak = pickNudgeTopic(store.getState().weakTopics);
    if (!weak) return;
    markNudgeShown(weak.topic);
    const nudge = nudgeMessage(weak, lang);
    store.appendChat({
      id: nextId(),
      from: 'rakan',
      text: nudge.text,
      lang,
      at: new Date().toISOString(),
      chips: nudge.chips,
      source: 'rules',
    });
    // Runs once per mount on purpose. The session flag blocks any second nudge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setQuiz(next: QuizState) {
    quizRef.current = next;
    setQuizState(next);
  }

  /** Run one quiz event: show the reply, record at most one attempt, keep the quiz state. */
  function runQuiz(event: QuizEvent, language: Language) {
    const out = quizReducer(quizRef.current, event, { language, weak: store.getState().weakTopics });
    setQuiz(out.state);
    setTopicChoices(out.topicChoices ?? []);
    if (out.attempt) store.recordQuizAttempt(out.attempt);
    if (out.text === '') return;
    store.appendChat({
      id: nextId(),
      from: 'rakan',
      text: out.text,
      lang: language,
      at: new Date().toISOString(),
      chips: out.chips,
      source: 'rules',
    });
  }

  /** A topic button: show it as the student's message, then start the quiz on that topic. */
  function startQuizOn(topic: TopicId, language: Language) {
    store.appendChat({
      id: nextId(),
      from: 'student',
      text: pick(topicLabel(topic), language),
      lang: language,
      at: new Date().toISOString(),
    });
    runQuiz({ type: 'chooseTopic', topic }, language);
  }

  function onChip(id: ChipId) {
    if (id === 'exam') navigate('exam');
    else if (id === 'pathways') navigate('board');
    else if (id === 'stop') void send('stop', lang);
    else if (id === 'quizTopic') {
      const topic = nudgeTopicThisSession();
      if (topic !== null) startQuizOn(topic, lang);
    } else void send(t(CHIP_LABELS[id]), lang);
  }

  /** Append the student message at once, then the Rakan reply. The input is never disabled. */
  async function send(raw: string, language: Language) {
    const checked = validateChatInput(raw);
    if (!checked.ok) return false;
    const text = checked.text;
    store.appendChat({ id: nextId(), from: 'student', text, lang: language, at: new Date().toISOString() });
    if (isQuizActive(quizRef.current)) {
      runQuiz({ type: 'answer', text }, language);
      return true;
    }
    if (classifyIntent(text) === 'quiz_request') {
      runQuiz({ type: 'request' }, language);
      return true;
    }
    const current = store.getState();
    const latest = current.progress.examResults[current.progress.examResults.length - 1];
    const intent = classifyIntent(text);
    const rule = ruleReply(intent, {
      language,
      name: current.profile?.name ?? '',
      message: text,
      weakTopics: current.weakTopics,
      latestExam: latest ? { percent: latest.percent, grade: latest.grade } : undefined,
    });
    setTyping((n) => n + 1);
    try {
      const reply = await generateReply({
        question: text,
        language,
        topic: findTopic(text),
        intent,
        ruleReply: rule,
      });
      store.appendChat({
        id: nextId(),
        from: 'rakan',
        text: reply.text,
        lang: reply.action?.lang ?? language,
        at: new Date().toISOString(),
        chips: reply.chips,
        source: reply.source,
      });
      if (reply.action?.action === 'setLanguage') setLanguage(reply.action.lang);
    } finally {
      setTyping((n) => n - 1);
    }
    return true;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const checked = validateChatInput(draft);
    if (!checked.ok) {
      inputRef.current?.focus();
      return;
    }
    setDraft('');
    inputRef.current?.focus();
    void send(draft, lang);
  }

  // Chips: while a quiz runs only Stop. Otherwise the last Rakan message's chips, then the usual four.
  const last = messages[messages.length - 1];
  const messageChips: ChipId[] = last?.from === 'rakan' ? (last.chips ?? []) : [];
  const chipIds: ChipId[] = isQuizActive(quiz)
    ? ['stop']
    : Array.from(new Set<ChipId>([...messageChips.filter((c) => c !== 'stop' && (c !== 'quizTopic' || nudgeTopicThisSession() !== null)), 'quiz', 'revise', 'exam', 'pathways']));

  function label(m: ChatMessage): string {
    return m.from === 'rakan' ? t('chat.label.rakan') : t('chat.label.you');
  }

  return (
    <section className="chat" aria-labelledby="chat-title">
      <h1 id="chat-title" className="chat-title">
        {t('rakan.title')}
      </h1>
      <div className="chat-thread" role="log" aria-live="polite" aria-label={t('chat.log')}>
        <div className="bubble-row bubble-row-rakan">
          <div className="bubble bubble-rakan">
            <span className="bubble-label">{t('chat.label.rakan')}</span>
            <p>{openingGreeting(lang, name)}</p>
          </div>
        </div>
        {messages.map((m) => (
          <div key={m.id} className={`bubble-row bubble-row-${m.from}`}>
            <div className={`bubble bubble-${m.from}`} lang={m.lang === 'bm' ? 'ms' : 'en'}>
              <span className="bubble-label">{label(m)}</span>
              <p>{m.text}</p>
            </div>
          </div>
        ))}
        {typing > 0 && (
          <div className="bubble-row bubble-row-rakan">
            <div className="bubble bubble-rakan typing" role="status">
              {t('chat.typing')}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="chat-chips" role="group" aria-label={t('chat.chips')}>
        {quiz.phase === 'choosing_topic' &&
          topicChoices.map((topic) => (
            <button key={topic} type="button" className="chip tap" onClick={() => startQuizOn(topic, lang)}>
              {pick(topicLabel(topic), lang)}
            </button>
          ))}
        {chipIds.map((id) => (
          <button key={id} type="button" className="chip tap" onClick={() => onChip(id)}>
            {t(CHIP_LABELS[id])}
          </button>
        ))}
      </div>

      <form className="chat-form" onSubmit={onSubmit}>
        <label className="visually-hidden" htmlFor="chat-input">
          {t('chat.input')}
        </label>
        <textarea
          id="chat-input"
          ref={inputRef}
          rows={2}
          maxLength={CHAT_MAX_LENGTH}
          value={draft}
          aria-describedby={draft.length >= CHAT_MAX_LENGTH ? 'chat-limit' : undefined}
          onChange={(e) => setDraft(clampChatInput(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button type="submit" className="tap send">
          {t('chat.send')}
        </button>
        {draft.length >= CHAT_MAX_LENGTH && (
          <p id="chat-limit" className="chat-limit" role="status">
            {t('chat.limit')}
          </p>
        )}
      </form>
    </section>
  );
}
