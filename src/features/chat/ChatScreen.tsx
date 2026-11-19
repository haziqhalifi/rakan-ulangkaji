import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from '../../app/NavigationContext';
import { generateReply } from '../../core/ai';
import { useI18n, type StringKey } from '../../core/i18n';
import { useProfileState, useProfileStore, type ChatMessage, type Language } from '../../core/profile';
import { CHAT_MAX_LENGTH, clampChatInput, validateChatInput } from './input';
import { classifyIntent, findTopic } from './intents';
import { openingGreeting, ruleReply } from './replies';
import '../../styles/chat.css';

let sequence = 0;
function nextId(): string {
  sequence += 1;
  return `m${Date.now().toString(36)}-${sequence}`;
}

const SEND_CHIPS: Array<{ id: 'quiz' | 'revise'; label: StringKey }> = [
  { id: 'quiz', label: 'chat.chip.quiz' },
  { id: 'revise', label: 'chat.chip.revise' },
];

const NAV_CHIPS: Array<{ route: 'exam' | 'board'; label: StringKey }> = [
  { route: 'exam', label: 'chat.chip.exam' },
  { route: 'board', label: 'chat.chip.pathways' },
];

export function ChatScreen() {
  const { t, lang, setLanguage } = useI18n();
  const store = useProfileStore();
  const navigate = useNavigate();
  const state = useProfileState();
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const name = state.profile?.name ?? '';
  const messages = state.chat;

  useEffect(() => {
    if (typeof endRef.current?.scrollIntoView === 'function') endRef.current.scrollIntoView({ block: 'end' });
  }, [messages.length, typing]);

  /** Append the student message at once, then the Rakan reply. The input is never disabled. */
  async function send(raw: string, language: Language) {
    const checked = validateChatInput(raw);
    if (!checked.ok) return false;
    const text = checked.text;
    store.appendChat({ id: nextId(), from: 'student', text, lang: language, at: new Date().toISOString() });
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
        {SEND_CHIPS.map((c) => (
          <button key={c.id} type="button" className="chip tap" onClick={() => void send(t(c.label), lang)}>
            {t(c.label)}
          </button>
        ))}
        {NAV_CHIPS.map((c) => (
          <button key={c.route} type="button" className="chip tap" onClick={() => navigate(c.route)}>
            {t(c.label)}
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
