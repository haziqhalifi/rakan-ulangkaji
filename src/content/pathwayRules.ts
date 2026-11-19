import type { PathwayRule } from './types';

// Simplified, rule-based hints. Real requirements change every year and differ by programme.
// Only the five subjects the board collects are used, so these are rough sketches, not official rules.
const REVIEWED = '2026-11-20';
const SOURCE =
  'Simplified by the app authors from general public programme descriptions. Not official. Check UPU and the institution.';

export const PATHWAY_RULES: readonly PathwayRule[] = [
  {
    pathway: 'matrikulasi',
    name: { bm: 'Matrikulasi', en: 'Matriculation' },
    usuallyNeeds: {
      bm: 'Biasanya memerlukan kredit dalam Bahasa Melayu, gred yang baik dalam Matematik, dan sekurang-kurangnya empat mata pelajaran pada gred C ke atas. Gred Sains yang baik membantu.',
      en: 'Usually needs a credit in Bahasa Melayu, a good grade in Matematik, and at least four subjects at C or better. A good Sains grade helps.',
    },
    nextStep: {
      bm: 'Baca syarat program di laman web rasmi dan semak tarikh permohonan di UPU.',
      en: 'Read the programme requirements on the official website and check the application dates on UPU.',
    },
    conditions: [
      { id: 'mat-bm', kind: 'minGrade', subject: 'bm', grade: 'C', strength: 'core' },
      { id: 'mat-math', kind: 'minGrade', subject: 'matematik', grade: 'B', strength: 'core' },
      { id: 'mat-count', kind: 'minCount', subjects: 'any', grade: 'C', count: 4, strength: 'core' },
      { id: 'mat-sains', kind: 'minGrade', subject: 'sains', grade: 'B', strength: 'soft' },
    ],
    lastReviewed: REVIEWED,
    sourceNote: SOURCE,
  },
  {
    pathway: 'asasi',
    name: { bm: 'Asasi', en: 'Asasi (foundation year at a university)' },
    usuallyNeeds: {
      bm: 'Biasanya memerlukan gred yang kukuh dalam Matematik dan Sains, kredit dalam Bahasa Melayu, dan sekurang-kurangnya empat mata pelajaran pada gred C ke atas. Bahasa Inggeris yang baik membantu.',
      en: 'Usually needs strong grades in Matematik and Sains, a credit in Bahasa Melayu, and at least four subjects at C or better. A good Bahasa Inggeris grade helps.',
    },
    nextStep: {
      bm: 'Senaraikan program asasi yang menarik minat awak dan semak syarat khusus setiap satu.',
      en: 'List the Asasi programmes that interest you and check the specific requirements for each one.',
    },
    conditions: [
      { id: 'asa-math', kind: 'minGrade', subject: 'matematik', grade: 'B+', strength: 'core' },
      { id: 'asa-sains', kind: 'minGrade', subject: 'sains', grade: 'B+', strength: 'core' },
      { id: 'asa-bm', kind: 'minGrade', subject: 'bm', grade: 'C', strength: 'core' },
      { id: 'asa-count', kind: 'minCount', subjects: 'any', grade: 'C', count: 4, strength: 'core' },
      { id: 'asa-bi', kind: 'minGrade', subject: 'bi', grade: 'B', strength: 'soft' },
    ],
    lastReviewed: REVIEWED,
    sourceNote: SOURCE,
  },
  {
    pathway: 'stpm',
    name: { bm: 'STPM', en: 'STPM' },
    usuallyNeeds: {
      bm: 'Biasanya memerlukan kredit dalam Bahasa Melayu dan sekurang-kurangnya tiga mata pelajaran pada gred C ke atas. Matematik yang baik membuka lebih banyak pilihan.',
      en: 'Usually needs a credit in Bahasa Melayu and at least three subjects at C or better. A good Matematik grade opens more choices.',
    },
    nextStep: {
      bm: 'Semak mata pelajaran STPM yang ditawarkan di sekolah dekat awak dan syarat kemasukannya.',
      en: 'Check which STPM subjects are offered at schools near you and what they usually need.',
    },
    conditions: [
      { id: 'stp-bm', kind: 'minGrade', subject: 'bm', grade: 'C', strength: 'core' },
      { id: 'stp-count', kind: 'minCount', subjects: 'any', grade: 'C', count: 3, strength: 'core' },
      { id: 'stp-math', kind: 'minGrade', subject: 'matematik', grade: 'C', strength: 'soft' },
    ],
    lastReviewed: REVIEWED,
    sourceNote: SOURCE,
  },
  {
    pathway: 'diploma',
    name: { bm: 'Diploma', en: 'Diploma' },
    usuallyNeeds: {
      bm: 'Biasanya memerlukan lulus Bahasa Melayu dan Sejarah, serta sekurang-kurangnya tiga mata pelajaran pada gred C ke atas. Matematik pada gred C membantu.',
      en: 'Usually needs a pass in Bahasa Melayu and Sejarah, and at least three subjects at C or better. A C in Matematik helps.',
    },
    nextStep: {
      bm: 'Bandingkan beberapa program diploma dan semak syarat khusus bidang yang awak pilih.',
      en: 'Compare a few diploma programmes and check the specific requirements for the field you choose.',
    },
    conditions: [
      { id: 'dip-bm', kind: 'minGrade', subject: 'bm', grade: 'D', strength: 'core' },
      { id: 'dip-sej', kind: 'minGrade', subject: 'sejarah', grade: 'E', strength: 'core' },
      { id: 'dip-count', kind: 'minCount', subjects: 'any', grade: 'C', count: 3, strength: 'core' },
      { id: 'dip-math', kind: 'minGrade', subject: 'matematik', grade: 'C', strength: 'soft' },
    ],
    lastReviewed: REVIEWED,
    sourceNote: SOURCE,
  },
  {
    pathway: 'tvet',
    name: { bm: 'TVET', en: 'TVET' },
    usuallyNeeds: {
      bm: 'Biasanya memerlukan lulus Bahasa Melayu dan Matematik pada tahap asas. Tiga mata pelajaran pada gred D ke atas membantu.',
      en: 'Usually needs basic passes in Bahasa Melayu and Matematik. Three subjects at D or better help.',
    },
    nextStep: {
      bm: 'Lawati institusi latihan berdekatan, tanya tentang kursus, dan semak syarat serta peluang kerja.',
      en: 'Visit a nearby training institution, ask about courses, and check the requirements and job outcomes.',
    },
    conditions: [
      { id: 'tvt-bm', kind: 'minGrade', subject: 'bm', grade: 'E', strength: 'core' },
      { id: 'tvt-math', kind: 'minGrade', subject: 'matematik', grade: 'E', strength: 'core' },
      { id: 'tvt-count', kind: 'minCount', subjects: 'any', grade: 'D', count: 3, strength: 'soft' },
    ],
    lastReviewed: REVIEWED,
    sourceNote: SOURCE,
  },
  {
    pathway: 'foundation',
    name: { bm: 'Foundation', en: 'Foundation (private or college)' },
    usuallyNeeds: {
      bm: 'Biasanya memerlukan Matematik pada gred C ke atas, Bahasa Inggeris yang memuaskan, dan tiga mata pelajaran pada gred C ke atas. Dua gred B membantu.',
      en: 'Usually needs Matematik at C or better, a fair Bahasa Inggeris grade, and three subjects at C or better. Two B grades help.',
    },
    nextStep: {
      bm: 'Semak yuran, biasiswa dan syarat kemasukan di laman web kolej, dan bandingkan beberapa pilihan.',
      en: 'Check fees, scholarships and entry requirements on college websites, and compare a few options.',
    },
    conditions: [
      { id: 'fnd-math', kind: 'minGrade', subject: 'matematik', grade: 'C', strength: 'core' },
      { id: 'fnd-bi', kind: 'minGrade', subject: 'bi', grade: 'D', strength: 'core' },
      { id: 'fnd-count', kind: 'minCount', subjects: 'any', grade: 'C', count: 3, strength: 'core' },
      { id: 'fnd-b', kind: 'minCount', subjects: 'any', grade: 'B', count: 2, strength: 'soft' },
    ],
    lastReviewed: REVIEWED,
    sourceNote: SOURCE,
  },
];
