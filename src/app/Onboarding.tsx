import { useRef, useState } from 'react';
import { useI18n } from '../core/i18n';
import {
  useProfileStore,
  type Form,
  type ProfileField,
  type SubjectId,
  type ValidationError,
} from '../core/profile';
import { useNavigate } from './NavigationContext';
import { errorKey, FormField, NameField, SubjectsField } from './ProfileFields';

export const ONBOARDING_STEPS = 4;
const FIELD_STEP: Record<ProfileField, number> = { name: 1, form: 2, subjects: 3, language: 4 };

/** Four short screens: name, form, subjects, then the privacy statement and submit. */
export function Onboarding() {
  const { t, lang } = useI18n();
  const store = useProfileStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [form, setForm] = useState<Form | null>(null);
  const [subjects, setSubjects] = useState<SubjectId[]>(['matematik']);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  async function submit() {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setSaveFailed(false);
    const outcome = await store.createProfile({ name, form, subjects, language: lang });
    busy.current = false;
    setSaving(false);
    if (outcome.ok) {
      navigate('rakan');
      return;
    }
    if (outcome.error.kind === 'invalid') {
      setErrors(outcome.error.errors);
      const first = Math.min(...outcome.error.errors.map((e) => FIELD_STEP[e.field]));
      setStep(first);
    } else {
      setErrors([]);
      setSaveFailed(true);
    }
  }

  return (
    <section className="stitched onboarding" aria-labelledby="onboarding-title">
      <p className="onboarding-step">{t('welcome.step', { n: step, total: ONBOARDING_STEPS })}</p>
      <h1 id="onboarding-title">{t('welcome.title')}</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step < ONBOARDING_STEPS) setStep(step + 1);
          else void submit();
        }}
      >
        {step === 1 && <NameField value={name} onChange={setName} errors={errors} showHint />}
        {step === 2 && <FormField value={form} onChange={setForm} errors={errors} />}
        {step === 3 && <SubjectsField value={subjects} onChange={setSubjects} errors={errors} showHint />}
        {step === 4 && (
          <div className="field">
            <h2>{t('welcome.privacy.title')}</h2>
            <p>{t('welcome.privacy.body')}</p>
            <p>{t('welcome.privacy.language', { language: t(lang === 'bm' ? 'lang.bm' : 'lang.en') })}</p>
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
          </div>
        )}
        {saveFailed && (
          <p className="field-error" role="alert">
            {t('welcome.saveFailed')}
          </p>
        )}
        <div className="onboarding-actions">
          {step > 1 && (
            <button type="button" className="tap" onClick={() => setStep(step - 1)}>
              {t('welcome.back')}
            </button>
          )}
          <button type="submit" className="tap primary" disabled={saving}>
            {saving ? t('welcome.saving') : step < ONBOARDING_STEPS ? t('welcome.next') : t('welcome.submit')}
          </button>
        </div>
      </form>
    </section>
  );
}
