import { useState, useSyncExternalStore } from 'react';
import { remoteStatus } from '../core/ai';
import { useI18n, type StringKey } from '../core/i18n';
import {
  useProfileState,
  useProfileStore,
  type Form,
  type Language,
  type RemoteProviderId,
  type SubjectId,
  type ValidationError,
} from '../core/profile';
import { useNavigate } from './NavigationContext';
import { errorKey, FormField, NameField, SubjectsField } from './ProfileFields';

function exportFileName(): string {
  return `rakan-ulangkaji-data-${new Date().toISOString().slice(0, 10)}.json`;
}

export function SettingsScreen() {
  const { t } = useI18n();
  return (
    <section className="stitched settings" aria-labelledby="settings-title">
      <h1 id="settings-title">{t('settings.title')}</h1>
      <ProfileSection />
      <PracticeSection />
      <RemoteAiSection />
      <DataSection />
      <DeleteSection />
    </section>
  );
}

function ProfileSection() {
  const { t } = useI18n();
  const store = useProfileStore();
  const { profile } = useProfileState();
  const [name, setName] = useState(profile?.name ?? '');
  const [form, setForm] = useState<Form | null>(profile?.form ?? null);
  const [subjects, setSubjects] = useState<SubjectId[]>(profile?.subjects ?? []);
  const [language, setLanguage] = useState<Language>(profile?.language ?? 'bm');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [saved, setSaved] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = store.saveProfile({ name, form, subjects, language });
    if (result.ok) {
      setErrors([]);
      setSaved(true);
    } else {
      setErrors(result.error);
      setSaved(false);
    }
  }

  return (
    <form className="settings-block" onSubmit={onSubmit} aria-labelledby="settings-profile">
      <h2 id="settings-profile">{t('settings.profile.title')}</h2>
      <NameField value={name} onChange={setName} errors={errors} />
      <FormField value={form} onChange={setForm} errors={errors} />
      <SubjectsField value={subjects} onChange={setSubjects} errors={errors} />
      <fieldset className="field">
        <legend>{t('field.language')}</legend>
        {(['bm', 'en'] as const).map((l) => (
          <label key={l} className="choice tap">
            <input type="radio" name="settings-language" checked={language === l} onChange={() => setLanguage(l)} />
            {t(l === 'bm' ? 'lang.bm' : 'lang.en')}
          </label>
        ))}
      </fieldset>
      {errors.length > 0 && (
        <div className="field-error" role="alert">
          <p>{t('error.fieldsIntro')}</p>
          <ul>
            {errors.map((e) => (
              <li key={`${e.field}-${e.code}`}>{t(errorKey(e))}</li>
            ))}
          </ul>
        </div>
      )}
      <button type="submit" className="tap primary">
        {t('settings.profile.save')}
      </button>
      {saved && errors.length === 0 && <p role="status">{t('settings.profile.saved')}</p>}
    </form>
  );
}

function PracticeSection() {
  const { t } = useI18n();
  const store = useProfileStore();
  const { settings } = useProfileState();
  return (
    <div className="settings-block">
      <h2>{t('settings.timer.title')}</h2>
      <label className="choice tap">
        <input
          type="checkbox"
          checked={settings.demoShortTimer}
          onChange={(e) => store.setSettings({ demoShortTimer: e.target.checked })}
        />
        {t('settings.timer.label')}
      </label>
      <p className="field-hint">{t('settings.timer.hint')}</p>
    </div>
  );
}

function DataSection() {
  const { t } = useI18n();
  const store = useProfileStore();
  const [note, setNote] = useState<StringKey | null>(null);
  const [exportText, setExportText] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');
  const [importMsg, setImportMsg] = useState<{ ok: boolean; key: StringKey } | null>(null);

  const currentJson = () => JSON.stringify(store.exportData(), null, 2);

  function download() {
    try {
      const blob = new Blob([currentJson()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportFileName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setNote('settings.export.downloaded');
    } catch {
      setExportText(currentJson());
      setNote('settings.export.failed');
    }
  }

  async function copyText() {
    const text = currentJson();
    setExportText(text);
    try {
      await navigator.clipboard.writeText(text);
      setNote('settings.export.copied');
    } catch {
      setNote(null); // the text box stays open so the student can select and copy by hand
    }
  }

  function runImport(text: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setImportMsg({ ok: false, key: 'settings.import.unreadable' });
      return;
    }
    const result = store.importData(parsed);
    if (result.ok) setImportMsg({ ok: true, key: 'settings.import.ok' });
    else setImportMsg({ ok: false, key: `settings.import.${result.error}` as StringKey });
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      runImport(await file.text());
    } catch {
      setImportMsg({ ok: false, key: 'settings.import.unreadable' });
    }
  }

  return (
    <div className="settings-block">
      <h2>{t('settings.data.title')}</h2>
      <p className="field-hint">{t('settings.data.hint')}</p>
      <div className="button-row">
        <button type="button" className="tap" onClick={download}>
          {t('settings.export.download')}
        </button>
        <button type="button" className="tap" onClick={() => void copyText()}>
          {t('settings.export.copy')}
        </button>
      </div>
      {note && <p role="status">{t(note)}</p>}
      {exportText !== null && (
        <label className="field">
          {t('settings.export.textLabel')}
          <textarea readOnly rows={6} value={exportText} onFocus={(e) => e.currentTarget.select()} />
        </label>
      )}

      <h3>{t('settings.import.title')}</h3>
      <p className="field-hint">{t('settings.import.warning')}</p>
      <label className="field">
        {t('settings.import.file')}
        <input type="file" accept="application/json,.json" onChange={(e) => void onFile(e.target.files?.[0])} />
      </label>
      <label className="field">
        {t('settings.import.paste')}
        <textarea rows={4} value={pasted} onChange={(e) => setPasted(e.target.value)} />
      </label>
      <button type="button" className="tap" disabled={pasted.trim() === ''} onClick={() => runImport(pasted)}>
        {t('settings.import.button')}
      </button>
      {importMsg && (
        <p role={importMsg.ok ? 'status' : 'alert'} className={importMsg.ok ? undefined : 'field-error'}>
          {t(importMsg.key)}
        </p>
      )}
    </div>
  );
}

function DeleteSection() {
  const { t } = useI18n();
  const store = useProfileStore();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);

  async function confirmDelete() {
    try {
      await store.deleteAll();
      setConfirming(false);
      navigate('welcome');
    } catch {
      setFailed(true);
      setConfirming(false);
    }
  }

  return (
    <div className="settings-block">
      <h2>{t('settings.delete.title')}</h2>
      {!confirming ? (
        <button type="button" className="tap danger" onClick={() => { setFailed(false); setConfirming(true); }}>
          {t('settings.delete.button')}
        </button>
      ) : (
        <div role="alertdialog" aria-labelledby="delete-title" aria-describedby="delete-body" className="confirm">
          <h3 id="delete-title">{t('settings.delete.confirmTitle')}</h3>
          <p id="delete-body">{t('settings.delete.confirmBody')}</p>
          <div className="button-row">
            <button type="button" className="tap danger" onClick={() => void confirmDelete()}>
              {t('settings.delete.confirm')}
            </button>
            <button type="button" className="tap" autoFocus onClick={() => setConfirming(false)}>
              {t('settings.delete.cancel')}
            </button>
          </div>
        </div>
      )}
      {failed && (
        <p role="alert" className="field-error">
          {t('settings.delete.failed')}
        </p>
      )}
    </div>
  );
}

function RemoteAiSection() {
  const { t } = useI18n();
  const store = useProfileStore();
  const { settings } = useProfileState();
  const unreachable = useSyncExternalStore(remoteStatus.subscribe, remoteStatus.get, remoteStatus.get);
  const [pending, setPending] = useState<RemoteProviderId | null>(null);
  const [key, setKey] = useState('');
  const [keyNote, setKeyNote] = useState<StringKey | null>(null);

  const vendor = settings.remote.userKey.provider;
  const providerKey = (id: RemoteProviderId): StringKey =>
    id === 'proxy' ? 'settings.remote.provider.proxy' : `settings.remote.provider.${vendor}`;

  function toggle(id: RemoteProviderId, on: boolean) {
    if (!on) {
      store.setSettings({ remote: { [id]: { enabled: false } } });
      setPending(null);
    } else if (settings.remote[id].consentAt) {
      store.setSettings({ remote: { [id]: { enabled: true } } });
    } else {
      setPending(id);
    }
  }

  function confirm(id: RemoteProviderId) {
    store.recordRemoteConsent(id);
    store.setSettings({ remote: { [id]: { enabled: true } } });
    setPending(null);
  }

  async function revoke(id: RemoteProviderId) {
    store.revokeRemoteConsent(id);
    setPending(null);
    if (id === 'userKey') {
      try {
        await store.saveApiKey('');
      } catch {
        // The provider is already off. A leftover key is removed from Settings on the next try.
      }
      setKey('');
    }
  }

  async function saveKey(value: string) {
    try {
      await store.saveApiKey(value);
      setKeyNote(value.trim() === '' ? 'settings.remote.key.removed' : 'settings.remote.key.saved');
      setKey('');
    } catch {
      setKeyNote('settings.remote.key.failed');
    }
  }

  const ids: RemoteProviderId[] = ['proxy', 'userKey'];
  return (
    <div className="settings-block" aria-labelledby="settings-remote">
      <h2 id="settings-remote">{t('settings.remote.title')}</h2>
      <p className="field-hint">{t('settings.remote.intro')}</p>
      {ids.map((id) => {
        const s = settings.remote[id];
        return (
          <div key={id} className="field">
            <label className="choice tap">
              <input type="checkbox" checked={s.enabled && Boolean(s.consentAt)} onChange={(e) => toggle(id, e.target.checked)} />
              {t(id === 'proxy' ? 'settings.remote.proxy.label' : 'settings.remote.userKey.label')}
            </label>
            {id === 'proxy' && <p className="field-hint">{t('settings.remote.proxy.note')}</p>}
            <p role="status">{t(s.enabled && s.consentAt ? 'settings.remote.status.on' : 'settings.remote.status.off')}</p>
            {pending === id && (
              <div role="alertdialog" aria-labelledby={`consent-title-${id}`} className="confirm">
                <h3 id={`consent-title-${id}`}>{t('settings.remote.consent.title')}</h3>
                <p>{t('settings.remote.consent.intro')}</p>
                <ul>
                  <li>{t('settings.remote.consent.item.question')}</li>
                  <li>{t('settings.remote.consent.item.language')}</li>
                  <li>{t('settings.remote.consent.item.topic')}</li>
                </ul>
                <p>{t('settings.remote.consent.to', { provider: t(providerKey(id)) })}</p>
                <p>{t('settings.remote.consent.none')}</p>
                <div className="button-row">
                  <button type="button" className="tap primary" onClick={() => confirm(id)}>
                    {t('settings.remote.consent.confirm')}
                  </button>
                  <button type="button" className="tap" autoFocus onClick={() => setPending(null)}>
                    {t('settings.remote.consent.dismiss')}
                  </button>
                </div>
              </div>
            )}
            {s.consentAt && (
              <button type="button" className="tap" onClick={() => void revoke(id)}>
                {t('settings.remote.revoke')}
              </button>
            )}
          </div>
        );
      })}

      <fieldset className="field">
        <legend>{t('settings.remote.vendor')}</legend>
        {(['gemini', 'openrouter'] as const).map((v) => (
          <label key={v} className="choice tap">
            <input
              type="radio"
              name="remote-vendor"
              checked={vendor === v}
              onChange={() => {
                store.setSettings({ remote: { userKey: { provider: v } } });
                // A new provider needs its own consent and key.
                if (settings.remote.userKey.consentAt) void revoke('userKey');
              }}
            />
            {t(`settings.remote.vendor.${v}`)}
          </label>
        ))}
      </fieldset>
      <label className="field">
        {t('settings.remote.key.label')}
        <input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} />
      </label>
      <p className="field-hint">{t('settings.remote.key.hint')}</p>
      <div className="button-row">
        <button type="button" className="tap" disabled={key.trim() === ''} onClick={() => void saveKey(key)}>
          {t('settings.remote.key.save')}
        </button>
        <button type="button" className="tap" onClick={() => void saveKey('')}>
          {t('settings.remote.key.remove')}
        </button>
      </div>
      {keyNote && <p role="status">{t(keyNote)}</p>}

      <fieldset className="field">
        <legend>{t('settings.remote.share.title')}</legend>
        {(['name', 'school', 'grades'] as const).map((k) => (
          <label key={k} className="choice tap">
            <input
              type="checkbox"
              checked={settings.share[k]}
              onChange={(e) => store.setSettings({ share: { [k]: e.target.checked } })}
            />
            {t(`settings.remote.share.${k}`)}
          </label>
        ))}
        <p className="field-hint">{t('settings.remote.share.hint')}</p>
      </fieldset>
      {unreachable && <p role="status">{t('settings.remote.unreachable')}</p>}
    </div>
  );
}
