// Original Matematik questions, written from scratch for this app.
// Fictional names and settings only. Numbers and wording are fresh.
// Plain text maths: ^ is a power, / is a fraction bar.

import type { Form } from '../core/profile/types';
import type { Bilingual, Question, QuestionOption } from './types';

const same = (s: string): Bilingual => ({ bm: s, en: s });

function opts(...labels: string[]): QuestionOption[] {
  return labels.map((label, i) => ({ id: 'ABCD'[i] as string, label: same(label) }));
}

function objective(
  id: string,
  form: Form,
  topic: string,
  question: Bilingual,
  options: QuestionOption[],
  answer: string,
  explanation: Bilingual,
): Question {
  return {
    id,
    subject: 'matematik',
    form,
    topic,
    language: 'both',
    kind: 'objective',
    question,
    options,
    marks: 1,
    skema: [
      {
        id: `${id}-p1`,
        point: { bm: 'Pilihan jawapan yang betul', en: 'The correct option' },
        marks: 1,
        accepted: [answer, `(${answer})`],
      },
    ],
    explanation,
    original: true,
  };
}

export const MATEMATIK_QUESTIONS: Question[] = [
  // Form 4: indices
  objective(
    'mat-f4-ind-01',
    4,
    'f4-indices',
    {
      bm: 'Ringkaskan (2a^3)^2 x a^(-1).',
      en: 'Simplify (2a^3)^2 x a^(-1).',
    },
    opts('2a^5', '4a^5', '4a^6', '4a^7'),
    'B',
    {
      bm: 'Kuasakan dahulu: (2a^3)^2 = 4a^6. Kemudian tolak indeks: 6 + (-1) = 5. Jadi jawapan ialah 4a^5.',
      en: 'Expand the power first: (2a^3)^2 = 4a^6. Then add the indices: 6 + (-1) = 5. So the answer is 4a^5.',
    },
  ),
  objective(
    'mat-f4-ind-02',
    4,
    'f4-indices',
    { bm: 'Nilaikan 8^(2/3).', en: 'Evaluate 8^(2/3).' },
    opts('2', '4', '6', '16'),
    'B',
    {
      bm: 'Punca kuasa tiga 8 ialah 2, dan 2^2 = 4. Cuba buat punca dahulu, kiraan jadi lebih mudah.',
      en: 'The cube root of 8 is 2, and 2^2 = 4. Taking the root first makes the sum easier.',
    },
  ),
  objective(
    'mat-f4-ind-03',
    4,
    'f4-indices',
    {
      bm: 'Diberi 2^(x + 1) = 32. Cari nilai x.',
      en: 'Given 2^(x + 1) = 32. Find the value of x.',
    },
    opts('2', '3', '5', '4'),
    'D',
    {
      bm: '32 = 2^5, jadi x + 1 = 5 dan x = 4. Apabila asas sama, indeks juga sama.',
      en: '32 = 2^5, so x + 1 = 5 and x = 4. When the bases are equal, the indices are equal.',
    },
  ),
  objective(
    'mat-f4-ind-04',
    4,
    'f4-indices',
    { bm: 'Nilaikan 27^(-1/3).', en: 'Evaluate 27^(-1/3).' },
    opts('-9', '-3', '1/3', '1/9'),
    'C',
    {
      bm: 'Indeks negatif bermaksud songsangan: 27^(-1/3) = 1 / 27^(1/3) = 1/3.',
      en: 'A negative index means the reciprocal: 27^(-1/3) = 1 / 27^(1/3) = 1/3.',
    },
  ),
  // Form 4: sets
  objective(
    'mat-f4-set-01',
    4,
    'f4-sets',
    {
      bm: 'Diberi n(A) = 14, n(B) = 9 dan n(A \u2229 B) = 5. Cari n(A \u222A B).',
      en: 'Given n(A) = 14, n(B) = 9 and n(A \u2229 B) = 5. Find n(A \u222A B).',
    },
    opts('28', '23', '18', '9'),
    'C',
    {
      bm: 'n(A \u222A B) = 14 + 9 - 5 = 18. Kita tolak unsur yang sama kerana ia dikira dua kali.',
      en: 'n(A \u222A B) = 14 + 9 - 5 = 18. We subtract the shared elements because they were counted twice.',
    },
  ),
  objective(
    'mat-f4-set-02',
    4,
    'f4-sets',
    {
      bm: 'Set semesta \u03BE ialah integer dari 1 hingga 12. Set P ialah gandaan 3. Cari n(P\u2032).',
      en: 'The universal set \u03BE is the integers from 1 to 12. Set P is the multiples of 3. Find n(P\u2032).',
    },
    opts('4', '8', '9', '12'),
    'B',
    {
      bm: 'P = {3, 6, 9, 12}, jadi n(P) = 4. Pelengkap P\u2032 ada 12 - 4 = 8 unsur.',
      en: 'P = {3, 6, 9, 12}, so n(P) = 4. The complement P\u2032 has 12 - 4 = 8 elements.',
    },
  ),
  objective(
    'mat-f4-set-03',
    4,
    'f4-sets',
    {
      bm: '\u03BE = {1, 2, 3, ..., 10}. A ialah nombor genap dan B ialah faktor bagi 12. Cari A \u2229 B.',
      en: '\u03BE = {1, 2, 3, ..., 10}. A is the even numbers and B is the factors of 12. Find A \u2229 B.',
    },
    opts('{1, 3}', '{2, 4, 6, 8}', '{2, 4, 6, 12}', '{2, 4, 6}'),
    'D',
    {
      bm: 'A = {2, 4, 6, 8, 10}. Faktor 12 dalam \u03BE ialah {1, 2, 3, 4, 6}. Unsur sepunya ialah {2, 4, 6}. Ingat, 12 tidak ada dalam \u03BE.',
      en: 'A = {2, 4, 6, 8, 10}. The factors of 12 inside \u03BE are {1, 2, 3, 4, 6}. The shared elements are {2, 4, 6}. Remember, 12 is not in \u03BE.',
    },
  ),
  // Form 5: variation
  objective(
    'mat-f5-var-01',
    5,
    'f5-variation',
    {
      bm: 'y berubah secara langsung dengan x. Diberi y = 12 apabila x = 4. Cari y apabila x = 7.',
      en: 'y varies directly as x. Given y = 12 when x = 4. Find y when x = 7.',
    },
    opts('16', '19', '21', '28'),
    'C',
    {
      bm: 'y = kx. Daripada 12 = 4k, k = 3. Apabila x = 7, y = 3 x 7 = 21.',
      en: 'y = kx. From 12 = 4k, k = 3. When x = 7, y = 3 x 7 = 21.',
    },
  ),
  objective(
    'mat-f5-var-02',
    5,
    'f5-variation',
    {
      bm: 'y berubah secara songsang dengan x. Diberi y = 9 apabila x = 2. Cari y apabila x = 6.',
      en: 'y varies inversely as x. Given y = 9 when x = 2. Find y when x = 6.',
    },
    opts('1', '3', '12', '27'),
    'B',
    {
      bm: 'y = k/x. Daripada 9 = k/2, k = 18. Apabila x = 6, y = 18/6 = 3.',
      en: 'y = k/x. From 9 = k/2, k = 18. When x = 6, y = 18/6 = 3.',
    },
  ),
  objective(
    'mat-f5-var-03',
    5,
    'f5-variation',
    {
      bm: 'z berubah secara langsung dengan x dan secara songsang dengan y. Diberi z = 6 apabila x = 8 dan y = 4. Cari z apabila x = 10 dan y = 2.',
      en: 'z varies directly as x and inversely as y. Given z = 6 when x = 8 and y = 4. Find z when x = 10 and y = 2.',
    },
    opts('15', '7.5', '30', '6'),
    'A',
    {
      bm: 'z = kx/y. Daripada 6 = k(8)/4, k = 3. Apabila x = 10 dan y = 2, z = 3 x 10 / 2 = 15.',
      en: 'z = kx/y. From 6 = k(8)/4, k = 3. When x = 10 and y = 2, z = 3 x 10 / 2 = 15.',
    },
  ),
  // Form 5: matrices
  objective(
    'mat-f5-mat-01',
    5,
    'f5-matrices',
    {
      bm: 'Matriks M ada baris 1: 2, 1 dan baris 2: 3, 4. Cari nilai penentu M.',
      en: 'Matrix M has row 1: 2, 1 and row 2: 3, 4. Find the determinant of M.',
    },
    opts('-5', '5', '11', '8'),
    'B',
    {
      bm: 'Penentu = (2 x 4) - (1 x 3) = 8 - 3 = 5. Darabkan pepenjuru utama, kemudian tolak pepenjuru satu lagi.',
      en: 'Determinant = (2 x 4) - (1 x 3) = 8 - 3 = 5. Multiply the main diagonal, then subtract the other diagonal.',
    },
  ),
  objective(
    'mat-f5-mat-02',
    5,
    'f5-matrices',
    {
      bm: 'Cari hasil darab matriks baris (1  2) dengan matriks lajur yang unsurnya 3 dan 4.',
      en: 'Find the product of the row matrix (1  2) and the column matrix with elements 3 and 4.',
    },
    opts('11', '10', '14', '7'),
    'A',
    {
      bm: 'Darab baris dengan lajur: (1 x 3) + (2 x 4) = 3 + 8 = 11. Hasilnya satu nombor sahaja.',
      en: 'Multiply row by column: (1 x 3) + (2 x 4) = 3 + 8 = 11. The result is a single number.',
    },
  ),
  // Structured
  {
    id: 'mat-f4-ind-s1',
    subject: 'matematik',
    form: 4,
    topic: 'f4-indices',
    language: 'both',
    kind: 'structured',
    question: {
      bm: 'Daniel menyelesaikan 3^(2x - 1) = 81.\n(a) Tulis 81 sebagai kuasa bagi 3.\n(b) Bentukkan persamaan linear dalam x.\n(c) Cari nilai x.\nTulis setiap jawapan pada baris baharu.',
      en: 'Daniel solves 3^(2x - 1) = 81.\n(a) Write 81 as a power of 3.\n(b) Form a linear equation in x.\n(c) Find the value of x.\nWrite each answer on a new line.',
    },
    marks: 4,
    skema: [
      {
        id: 'mat-f4-ind-s1-a',
        point: { bm: '81 sebagai kuasa 3', en: '81 as a power of 3' },
        marks: 1,
        accepted: ['3^4', '3**4'],
      },
      {
        id: 'mat-f4-ind-s1-b',
        point: { bm: 'Persamaan linear daripada indeks', en: 'Linear equation from the indices' },
        marks: 1,
        accepted: ['2x - 1 = 4', '2x-1=4', '2x = 5', '2x=5'],
      },
      {
        id: 'mat-f4-ind-s1-c',
        point: { bm: 'Nilai x', en: 'The value of x' },
        marks: 2,
        accepted: ['x = 2.5', 'x=2.5', '2.5', 'x = 5/2', 'x=5/2', '5/2', 'x = 2 1/2', '2 1/2'],
      },
    ],
    explanation: {
      bm: '81 = 3^4. Asas sama, jadi 2x - 1 = 4. Maka 2x = 5 dan x = 2.5. Langkah demi langkah memang membantu.',
      en: '81 = 3^4. The bases are equal, so 2x - 1 = 4. Then 2x = 5 and x = 2.5. Working step by step really helps.',
    },
    original: true,
  },
  {
    id: 'mat-f4-set-s1',
    subject: 'matematik',
    form: 4,
    topic: 'f4-sets',
    language: 'both',
    kind: 'structured',
    question: {
      bm: 'Dalam sebuah kelab sekolah ada 40 murid. Seramai 22 murid menyertai robotik (R), 17 murid menyertai debat (D) dan 9 murid menyertai kedua-duanya.\n(a) Cari n(R \u222A D).\n(b) Cari bilangan murid yang tidak menyertai kedua-duanya.\n(c) Cari bilangan murid yang menyertai robotik sahaja.\n(d) Cari bilangan murid yang menyertai debat sahaja.\nTulis setiap jawapan pada baris baharu.',
      en: 'A school club has 40 pupils. There are 22 pupils in robotics (R), 17 pupils in debate (D) and 9 pupils in both.\n(a) Find n(R \u222A D).\n(b) Find the number of pupils in neither activity.\n(c) Find the number of pupils in robotics only.\n(d) Find the number of pupils in debate only.\nWrite each answer on a new line.',
    },
    marks: 4,
    skema: [
      {
        id: 'mat-f4-set-s1-a',
        point: { bm: 'n(R \u222A D) = 30', en: 'n(R \u222A D) = 30' },
        marks: 1,
        accepted: ['30'],
        stripUnits: ['murid', 'pupils', 'pupil'],
      },
      {
        id: 'mat-f4-set-s1-b',
        point: { bm: 'Tiada kedua-duanya = 10', en: 'Neither activity = 10' },
        marks: 1,
        accepted: ['10'],
        stripUnits: ['murid', 'pupils', 'pupil'],
      },
      {
        id: 'mat-f4-set-s1-c',
        point: { bm: 'Robotik sahaja = 13', en: 'Robotics only = 13' },
        marks: 1,
        accepted: ['13'],
        stripUnits: ['murid', 'pupils', 'pupil'],
      },
      {
        id: 'mat-f4-set-s1-d',
        point: { bm: 'Debat sahaja = 8', en: 'Debate only = 8' },
        marks: 1,
        accepted: ['8'],
        stripUnits: ['murid', 'pupils', 'pupil'],
      },
    ],
    explanation: {
      bm: 'n(R \u222A D) = 22 + 17 - 9 = 30. Tiada kedua-duanya: 40 - 30 = 10. Robotik sahaja: 22 - 9 = 13. Debat sahaja: 17 - 9 = 8. Lukis gambar rajah Venn untuk semak jawapan.',
      en: 'n(R \u222A D) = 22 + 17 - 9 = 30. Neither: 40 - 30 = 10. Robotics only: 22 - 9 = 13. Debate only: 17 - 9 = 8. A Venn diagram is a good way to check.',
    },
    original: true,
  },
  {
    id: 'mat-f5-var-s1',
    subject: 'matematik',
    form: 5,
    topic: 'f5-variation',
    language: 'both',
    kind: 'structured',
    question: {
      bm: 'Masa t (minit) untuk mengisi sebuah tangki air berubah secara songsang dengan bilangan paip n. Mei Ling mendapati 3 paip mengisi tangki itu dalam 20 minit.\n(a) Cari nilai pemalar k.\n(b) Tulis hubungan antara t dan n.\n(c) Cari masa, dalam minit, untuk 5 paip mengisi tangki itu.\nTulis setiap jawapan pada baris baharu.',
      en: 'The time t (minutes) to fill a water tank varies inversely as the number of pipes n. Mei Ling finds that 3 pipes fill the tank in 20 minutes.\n(a) Find the value of the constant k.\n(b) Write the relationship between t and n.\n(c) Find the time, in minutes, for 5 pipes to fill the tank.\nWrite each answer on a new line.',
    },
    marks: 4,
    skema: [
      {
        id: 'mat-f5-var-s1-a',
        point: { bm: 'Nilai k', en: 'The value of k' },
        marks: 1,
        accepted: ['k = 60', 'k=60', '60'],
      },
      {
        id: 'mat-f5-var-s1-b',
        point: { bm: 'Hubungan t = k/n', en: 'The relationship t = k/n' },
        marks: 1,
        accepted: ['t = 60/n', 't=60/n', 't = 60 / n', 't=60 / n'],
      },
      {
        id: 'mat-f5-var-s1-c',
        point: { bm: 'Masa untuk 5 paip', en: 'Time for 5 pipes' },
        marks: 2,
        accepted: ['12', 't = 12', 't=12'],
        stripUnits: ['minit', 'minutes', 'minute', 'min'],
      },
    ],
    explanation: {
      bm: 't = k/n. Daripada 20 = k/3, k = 60. Maka t = 60/n. Apabila n = 5, t = 60/5 = 12 minit. Lebih banyak paip, masa lebih singkat, jadi 12 munasabah.',
      en: 't = k/n. From 20 = k/3, k = 60. So t = 60/n. When n = 5, t = 60/5 = 12 minutes. More pipes means less time, so 12 makes sense.',
    },
    original: true,
  },
  {
    id: 'mat-f5-mat-s1',
    subject: 'matematik',
    form: 5,
    topic: 'f5-matrices',
    language: 'both',
    kind: 'structured',
    question: {
      bm: 'Ravi diberi matriks A dengan baris 1: 3, 2 dan baris 2: 4, 3. Dia ingin menyelesaikan 3x + 2y = 7 dan 4x + 3y = 10.\n(a) Cari penentu A.\n(b) Tulis nilai x.\n(c) Tulis nilai y.\nTulis setiap jawapan pada baris baharu.',
      en: 'Ravi is given matrix A with row 1: 3, 2 and row 2: 4, 3. He wants to solve 3x + 2y = 7 and 4x + 3y = 10.\n(a) Find the determinant of A.\n(b) Write the value of x.\n(c) Write the value of y.\nWrite each answer on a new line.',
    },
    marks: 3,
    skema: [
      {
        id: 'mat-f5-mat-s1-a',
        point: { bm: 'Penentu A = 1', en: 'Determinant of A = 1' },
        marks: 1,
        accepted: ['1', 'det = 1'],
      },
      {
        id: 'mat-f5-mat-s1-b',
        point: { bm: 'Nilai x = 1', en: 'The value of x = 1' },
        marks: 1,
        accepted: ['x = 1', 'x=1', '1'],
      },
      {
        id: 'mat-f5-mat-s1-c',
        point: { bm: 'Nilai y = 2', en: 'The value of y = 2' },
        marks: 1,
        accepted: ['y = 2', 'y=2', '2'],
      },
    ],
    explanation: {
      bm: 'Penentu = (3 x 3) - (2 x 4) = 1. Songsangan A ialah (3, -2 pada baris 1 dan -4, 3 pada baris 2). Darabkan dengan (7, 10): x = 21 - 20 = 1 dan y = -28 + 30 = 2. Semak: 3 + 4 = 7 dan 4 + 6 = 10.',
      en: 'Determinant = (3 x 3) - (2 x 4) = 1. The inverse of A has 3, -2 in row 1 and -4, 3 in row 2. Multiply by (7, 10): x = 21 - 20 = 1 and y = -28 + 30 = 2. Check: 3 + 4 = 7 and 4 + 6 = 10.',
    },
    original: true,
  },
];
