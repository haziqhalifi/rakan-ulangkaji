import { buildExport, parseImport, type ExportBundle, type ImportError } from '../storage/exportImport';
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
  type Result,
  type Settings,
  type StudentProfile,
  type SpmSubject,
} from './types';
import { validateProfileInput, type ProfileInput, type ValidationError } from './validation';
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

export type SaveProfileError = { kind: 'invalid'; errors: ValidationError[] } | { kind: 'storage' };

export interface ProfileStore {
  getState(): ProfileState;
  subscribe(listener: () => void): () => void;
  /** Load saved data. Safe to call once at start-up. */
  init(): Promise<void>;
  /** Validate and save an edit. Listeners are told synchronously. The write follows shortly. */
  saveProfile(input: ProfileInput): Result<StudentProfile, ValidationError[]>;
  /**
   * Validate, then write to storage first. The profile only appears in the state if the
   * write worked, so onboarding can stay open with its values when storage fails.
   */
  createProfile(input: ProfileInput): Promise<Result<StudentProfile, SaveProfileError>>;
  /** The profile, progress, grades and chat. Never API keys, settings or exam state. */
  exportData(): ExportBundle;
  /** Replace profile, progress, grades and chat with a validated import. Settings stay as they are. */
  importData(bundle: unknown): Result<void, ImportError>;
  /** Remove every stored item (data, consent, keys, language preference) and reset to empty. */
  deleteAll(): Promise<void>;
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
  /** The user's own API key. Kept in browser storage only, never exported. */
  loadApiKey(): Promise<string | null>;
  /** An empty string removes the key. */
  saveApiKey(key: string): Promise<void>;
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

  /** A fresh start is allowed once the student chooses to replace unreadable data. */
  function unblock() {
    if (!writesBlocked) return;
    writesBlocked = false;
    if (state.storageStatus === 'unreadable') commit({ ...state, storageStatus: 'ok' });
  }

  function validated(input: ProfileInput) {
    return validateProfileInput(input, (state.profile?.createdAt ?? now().toISOString()));
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

    saveProfile(input) {
      const checked = validated(input);
      if (!checked.ok) return checked;
      unblock();
      const profile = checked.value;
      mutate((d) => ({ ...d, profile }), { immediate: true });
      commit({ ...state, language: profile.language });
      void storage.savePref('lang', profile.language).catch(() => undefined);
      return checked;
    },

    async createProfile(input) {
      const checked = validated(input);
      if (!checked.ok) return { ok: false, error: { kind: 'invalid', errors: checked.error } };
      const profile = checked.value;
      const next = capData({ ...toPersisted(state), profile });
      // Let any earlier write finish first, so the order on disk matches the order of calls.
      await writeChain;
      try {
        await storage.save(next);
      } catch {
        return { ok: false, error: { kind: 'storage' } };
      }
      unblock();
      dirty = false;
      commit({ ...state, ...next, ...derive(next), language: profile.language, storageStatus: 'ok' });
      void storage.savePref('lang', profile.language).catch(() => undefined);
      return { ok: true, value: profile };
    },

    exportData: () => buildExport(toPersisted(state), now()),

    importData(bundle) {
      const parsed = parseImport(bundle);
      if (!parsed.ok) return parsed;
      unblock();
      const incoming = parsed.value;
      mutate((d) => ({ ...d, ...incoming, examInProgress: null }), { immediate: true });
      if (incoming.profile) commit({ ...state, language: incoming.profile.language });
      return { ok: true, value: undefined };
    },

    async deleteAll() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      await writeChain;
      // If this throws, nothing changed in memory, so the student can try again.
      await storage.clearAll();
      dirty = false;
      writesBlocked = false;
      const empty = emptyPersistedData();
      commit({ ...state, ...empty, ...derive(empty), storageStatus: state.storageStatus === 'memory_only' ? 'memory_only' : 'ok' });
    },

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

    async loadApiKey() {
      try {
        const v = await storage.loadSecret('userKeyApiKey');
        return v && v.trim() !== '' ? v : null;
      } catch {
        return null;
      }
    },

    async saveApiKey(key) {
      await storage.saveSecret('userKeyApiKey', key.trim());
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
