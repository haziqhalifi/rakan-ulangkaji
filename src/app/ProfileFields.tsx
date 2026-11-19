import { useId } from 'react';
import { useI18n, type StringKey } from '../core/i18n';
import { type Form, type SubjectId, type ValidationError } from '../core/profile';

export function errorKey(e: ValidationError): StringKey {
  return `error.${e.field}.${e.code}` as StringKey;
}

function FieldErrors(props: { errors: ValidationError[]; field: ValidationError['field']; id: string }) {
  const { t } = useI18n();
  const mine = props.errors.filter((e) => e.field === props.field);
  if (mine.length === 0) return null;
  return (
    <p className="field-error" id={props.id}>
      {mine.map((e) => t(errorKey(e))).join(' ')}
    </p>
  );
}

export function NameField(props: {
  value: string;
  onChange: (v: string) => void;
  errors: ValidationError[];
  showHint?: boolean;
}) {
  const { t } = useI18n();
  const id = useId();
  const errId = `${id}-err`;
  const invalid = props.errors.some((e) => e.field === 'name');
  return (
    <div className="field">
      <label htmlFor={id}>{t('field.name')}</label>
      {props.showHint && <p className="field-hint">{t('welcome.name.hint')}</p>}
      <input
        id={id}
        type="text"
        className="tap"
        autoComplete="nickname"
        value={props.value}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errId : undefined}
        onChange={(e) => props.onChange(e.target.value)}
      />
      <FieldErrors errors={props.errors} field="name" id={errId} />
    </div>
  );
}

export function FormField(props: { value: Form | null; onChange: (v: Form) => void; errors: ValidationError[] }) {
  const { t } = useI18n();
  const id = useId();
  const errId = `${id}-err`;
  const invalid = props.errors.some((e) => e.field === 'form');
  return (
    <fieldset className="field" aria-describedby={invalid ? errId : undefined}>
      <legend>{t('field.form')}</legend>
      {([4, 5] as const).map((f) => (
        <label key={f} className="choice tap">
          <input type="radio" name={`${id}-form`} checked={props.value === f} onChange={() => props.onChange(f)} />
          {t(f === 4 ? 'form.4' : 'form.5')}
        </label>
      ))}
      <FieldErrors errors={props.errors} field="form" id={errId} />
    </fieldset>
  );
}

const COMING_SOON: Array<{ id: string; label: StringKey }> = [
  { id: 'bm', label: 'subject.bm' },
  { id: 'bi', label: 'subject.bi' },
  { id: 'sejarah', label: 'subject.sejarah' },
  { id: 'sains', label: 'subject.sains' },
];

export function SubjectsField(props: {
  value: SubjectId[];
  onChange: (v: SubjectId[]) => void;
  errors: ValidationError[];
  showHint?: boolean;
}) {
  const { t } = useI18n();
  const id = useId();
  const errId = `${id}-err`;
  const invalid = props.errors.some((e) => e.field === 'subjects');
  const hasMath = props.value.includes('matematik');
  return (
    <fieldset className="field" aria-describedby={invalid ? errId : undefined}>
      <legend>{t('field.subjects')}</legend>
      {props.showHint && <p className="field-hint">{t('welcome.subjects.hint')}</p>}
      <label className="choice tap">
        <input
          type="checkbox"
          checked={hasMath}
          onChange={() => props.onChange(hasMath ? [] : ['matematik'])}
        />
        {t('subject.matematik')}
      </label>
      {COMING_SOON.map((s) => (
        <label key={s.id} className="choice tap choice-disabled">
          <input type="checkbox" disabled checked={false} readOnly />
          {t(s.label)} ({t('subject.comingSoon')})
        </label>
      ))}
      <FieldErrors errors={props.errors} field="subjects" id={errId} />
    </fieldset>
  );
}
