import type { StorageService } from '../storage/types';
import {
  MAX_CHAT_MESSAGES,
  MAX_EXAM_RESULTS,
  MAX_QUIZ_ATTEMPTS,
  defaultSettings,
  emptyPersistedData,
  type ChatMessage,
  type Exam_Result,
  type ExamInProgress,
  type Grade,
  type Language,
  type PersistedData,
  type QuizAttempt,
  type RemoteProviderId,
  type Settings,
  type SpmSubject,
} from './types';
import { computeWeakTopics, deriveTopicMastery, type TopicMastery, type WeakTopic } from './weakTopics';

export type StorageStatus = 'ok' | 'write_failed' | 'memory_only' | 'unreadable';

export interface ProfileState extends PersistedData {
  /** False until `init()` has finished loading. */
  ready: boolean;
  language: Language;
  storageStatus: StorageStatus;
  topicMastery: TopicMastery[];
  weakTopics: WeakTopic[];
}

export type ImportOutcome =
  | { status: 'ok'; grade: Grade }
  | { status: 'no_result' };

export type SettingsPatch = {
  demoShortTimer?: boolean;
  remote?: {
    userKey?: Partial<Settings['remote']['userKey']>;
    proxy?: Partial<Settings['remote']['proxy']>;
  };
  share?: Partial<Settings['share']>;
};

export interface ProfileStore {
  getState(): ProfileState;
  subscribe(listener: () => void): () => void;
  /** Load saved data. Safe to call once at start-up. */
  init(): Promise<void>;
  setLanguage(lang: Language): void;
  appendChat(msg: ChatMessage): void;
  recordQuizAttempt(a: QuizAttempt): void;
  addExamResult(r: Exam_Result): void;
  saveExamInProgress(s: ExamInProgress | null): void;
  setGrade(subject: SpmSubject, grade: Grade): void;
  importMathGradeFromLatestExam(): ImportOutcome;
  setSettings(patch: SettingsPatch): void;
  recordRemoteConsent(provider: RemoteProviderId): void;
  revokeRemoteConsent(provider: RemoteProviderId): void;
  /** After an unreadable load, allow writes so new changes replace the old data. */
  startFresh(): void;
  /** Write pending changes now. Resolves when the write has finished or failed. */
  flush(): Promise<void>;
}

export interface ProfileStoreOptions {
  storage: StorageService;
  defaultLanguage?: Language;
  now?: () => Date;
  debounceMs?: number;
}

export const WRITE_DEBOUNCE_MS = 250;

function derive(data: PersistedData) {
  const topicMastery = deriveTopicMastery(data.progress);
  return { topicMastery, weakTopics: computeWeakTopics(topicMastery) };
}

function capData(data: PersistedData): PersistedData {
  return {
    ...data,
    chat: data.chat.slice(-MAX_CHAT_MESSAGES),
    progress: {
      ...data.progress,
      quizAttempts: data.progress.quizAttempts.slice(-MAX_QUIZ_ATTEMPTS),
      examResults: data.progress.examResults.slice(-MAX_EXAM_RESULTS),
    },
  };
}

function toPersisted(s: ProfileState): PersistedData {
  return {
    profile: s.profile,
    progress: s.progress,
    grades: s.grades,
    chat: s.chat,
    examInProgress: s.examInProgress,
    settings: s.settings,
  };
}

export function createProfileStore(options: ProfileStoreOptions): ProfileStore {
  const { storage } = options;
  const now = options.now ?? (() => new Date());
  const debounceMs = options.debounceMs ?? WRITE_DEBOUNCE_MS;
  const listeners = new Set<() => void>();

  const base = emptyPersistedData();
  let state: ProfileState = {
    ...base,
    ready: false,
    language: options.defaultLanguage ?? 'bm',
    storageStatus: 'ok',
    ...derive(base),
  };

  let timer: ReturnType<typeof setTimeout> | null = null;
  let dirty = false;
  let writesBlocked = false;
  let writeChain: Promise<void> = Promise.resolve();

  function emit() {
    listeners.forEach((l) => l());
  }

  function commit(next: ProfileState) {
    state = next;
    emit();
  }

  /** Apply a change to persisted data, derive values, notify synchronously, schedule a write. */
  function mutate(fn: (d: PersistedData) => PersistedData, opts: { immediate?: boolean } = {}) {
    const data = capData(fn(toPersisted(state)));
    commit({ ...state, ...data, ...derive(data) });
    scheduleWrite(opts.immediate === true);
  }

  function scheduleWrite(immediate: boolean) {
    if (writesBlocked) return;
    dirty = true;
    if (timer !== null) clearTimeout(timer);
    if (immediate) {
      timer = null;
      void write();
    } else {
      timer = setTimeout(() => {
        timer = null;
        void write();
      }, debounceMs);
    }
  }

  function write(): Promise<void> {
    writeChain = writeChain.then(async () => {
      if (!dirty || writesBlocked) return;
      dirty = false;
      try {
        await storage.save(toPersisted(state));
        if (state.storageStatus === 'write_failed') commit({ ...state, storageStatus: 'ok' });
      } catch {
        dirty = true; // retried on the next mutation, which schedules a new write
        if (state.storageStatus !== 'write_failed') commit({ ...state, storageStatus: 'write_failed' });
      }
    });
    return writeChain;
  }

  function setLang(lang: Language) {
    if (state.language === lang && (!state.profile || state.profile.language === lang)) return;
    const profile = state.profile ? { ...state.profile, language: lang } : null;
    commit({ ...state, language: lang, profile });
    void storage.savePref('lang', lang).catch(() => undefined);
    if (profile) scheduleWrite(false);
  }

  function patchSettings(s: Settings, patch: SettingsPatch): Settings {
    return {
      demoShortTimer: patch.demoShortTimer ?? s.demoShortTimer,
      remote: {
        userKey: { ...s.remote.userKey, ...patch.remote?.userKey },
        proxy: { ...s.remote.proxy, ...patch.remote?.proxy },
      },
      share: { ...s.share, ...patch.share },
    };
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    async init() {
      const [outcome, kind, pref] = await Promise.all([
        storage.load(),
        storage.backendKind(),
        storage.loadPref('lang'),
      ]);
      const prefLang: Language | null = pref === 'bm' || pref === 'en' ? pref : null;
      let next: ProfileState = { ...state, ready: true };
      if (outcome.status === 'ok') {
        const data = capData(outcome.data);
        next = {
          ...next,
          ...data,
          settings: patchSettings(defaultSettings(), data.settings as SettingsPatch),
          language: data.profile?.language ?? prefLang ?? state.language,
          ...derive(data),
        };
        // A migrated document is written back on the next change, never on load.
      } else if (outcome.status === 'unreadable') {
        writesBlocked = true;
        next = { ...next, language: prefLang ?? state.language, storageStatus: 'unreadable' };
      } else {
        next = { ...next, language: prefLang ?? state.language };
      }
      if (kind === 'memory' && next.storageStatus === 'ok') next = { ...next, storageStatus: 'memory_only' };
      commit(next);
    },

    setLanguage: setLang,

    appendChat: (msg) => mutate((d) => ({ ...d, chat: [...d.chat, msg] })),

    recordQuizAttempt: (a) =>
      mutate((d) => ({
        ...d,
        progress: { ...d.progress, quizAttempts: [...d.progress.quizAttempts, a], lastActivityAt: a.at },
      })),

    addExamResult: (r) =>
      mutate(
        (d) => ({
          ...d,
          progress: { ...d.progress, examResults: [...d.progress.examResults, r], lastActivityAt: r.submittedAt },
        }),
        { immediate: true },
      ),

    saveExamInProgress: (s) => mutate((d) => ({ ...d, examInProgress: s }), { immediate: true }),

    setGrade: (subject, grade) => mutate((d) => ({ ...d, grades: { ...d.grades, [subject]: grade } })),

    importMathGradeFromLatestExam() {
      const latest = state.progress.examResults.at(-1);
      if (!latest) return { status: 'no_result' };
      const grade = latest.grade;
      mutate((d) => ({ ...d, grades: { ...d.grades, matematik: grade } }));
      return { status: 'ok', grade };
    },

    setSettings: (patch) => mutate((d) => ({ ...d, settings: patchSettings(d.settings, patch) })),

    recordRemoteConsent(provider) {
      const consentAt = now().toISOString();
      mutate((d) => ({ ...d, settings: patchSettings(d.settings, { remote: { [provider]: { consentAt } } }) }));
    },

    revokeRemoteConsent(provider) {
      mutate((d) => {
        const remote = { ...d.settings.remote, [provider]: { ...d.settings.remote[provider], enabled: false } };
        delete (remote[provider] as { consentAt?: string }).consentAt;
        return { ...d, settings: { ...d.settings, remote } };
      });
    },

    startFresh() {
      if (!writesBlocked) return;
      writesBlocked = false;
      commit({ ...state, storageStatus: 'ok' });
    },

    async flush() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
        dirty = true;
      }
      await write();
    },
  };
}
