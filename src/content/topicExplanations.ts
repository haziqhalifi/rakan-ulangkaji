// Short original explanations for each Matematik topic in the question bank.
// Each explanation is 100 words or fewer. Examples use fictional people.

import type { Bilingual, TopicId } from '../core/profile/types';

export interface TopicExplanation {
  /** Lower case words that point at this topic in a chat message. */
  keywords: string[];
  text: Bilingual;
}

export const TOPIC_EXPLANATIONS: Readonly<Record<TopicId, TopicExplanation>> = {
  'f4-indices': {
    keywords: ['indeks', 'indices', 'index', 'exponent', 'eksponen', 'kuasa'],
    text: {
      bm: 'Indeks memberitahu berapa kali satu nombor didarab dengan dirinya. Dalam 3^4, asas ialah 3 dan indeks ialah 4, jadi 3 x 3 x 3 x 3 = 81. Bila mendarab asas yang sama, tambah indeks: 2^3 x 2^2 = 2^5. Bila membahagi, tolak indeks. Indeks negatif bermaksud salingan: 5^-1 = 1/5. Cuba ini: Dina menulis 4^2 x 4^3. Apakah bentuk indeks tunggalnya?',
      en: 'Indices tell you how many times a number is multiplied by itself. In 3^4, the base is 3 and the index is 4, so 3 x 3 x 3 x 3 = 81. When you multiply with the same base, add the indices: 2^3 x 2^2 = 2^5. When you divide, subtract them. A negative index means a reciprocal: 5^-1 = 1/5. Try this: Dina writes 4^2 x 4^3. What is the single index form?',
    },
  },
  'f4-sets': {
    keywords: ['set', 'sets', 'venn', 'union', 'kesatuan', 'persilangan', 'intersection'],
    text: {
      bm: 'Set ialah koleksi benda yang ditulis dalam kurungan kerinting. Katakan set A ialah haiwan peliharaan Hana: A = {kucing, ikan, arnab}. Kesatuan dua set menggabungkan semua ahli. Persilangan hanya mengekalkan ahli yang ada dalam kedua-duanya. Pelengkap A ialah semua ahli set semesta yang bukan dalam A. Gambar rajah Venn membantu: warnakan kawasan yang diminta, kemudian kira. n(A) ialah bilangan ahli dalam A.',
      en: 'A set is a collection of items written in curly brackets. Say set A holds the pets Hana keeps: A = {cat, fish, rabbit}. The union of two sets joins all their members. The intersection keeps only members found in both. The complement of A is everything in the universal set that is not in A. Venn diagrams help: shade the region you need, then count. n(A) means the number of members in A.',
    },
  },
  'f5-variation': {
    keywords: ['variasi', 'variation', 'langsung', 'songsang', 'inverse', 'direct', 'joint'],
    text: {
      bm: 'Dalam variasi langsung, y = kx. Bila x jadi dua kali ganda, y juga. Cari k dahulu. Jika 3 buku nota berharga RM9, maka k = 3 dan 5 buku nota berharga RM15. Dalam variasi songsang, y = k/x. Bila x jadi dua kali ganda, y menjadi separuh. Jika 4 pekerja mengecat dewan dalam 6 jam, k = 24, jadi 8 pekerja perlukan 3 jam. Variasi bergabung mengaitkan y dengan dua kuantiti atau lebih, contohnya y = kxz.',
      en: 'In direct variation, y = kx. When x doubles, y doubles too. Find k first. If 3 notebooks cost RM9, then k = 3, so 5 notebooks cost RM15. In inverse variation, y = k/x. When x doubles, y halves. If 4 workers paint a hall in 6 hours, k = 24, so 8 workers need 3 hours. Joint variation links y to two or more quantities, for example y = kxz.',
    },
  },
  'f5-matrices': {
    keywords: ['matriks', 'matrix', 'matrices', 'matrik'],
    text: {
      bm: 'Matriks ialah susunan nombor berbentuk segi empat dalam baris dan lajur. Matriks dengan 2 baris dan 3 lajur mempunyai peringkat 2 x 3. Untuk menambah, kedua-dua matriks mesti sama peringkat, kemudian tambah unsur yang sepadan. Untuk mendarab, bilangan lajur matriks pertama mesti sama dengan bilangan baris matriks kedua. Setiap unsur hasil darab ialah satu baris didarab satu lajur, kemudian dijumlahkan. Susunan penting: AB biasanya tidak sama dengan BA.',
      en: 'A matrix is a rectangular array of numbers in rows and columns. A matrix with 2 rows and 3 columns has order 2 x 3. To add, both matrices need the same order, then you add matching entries. To multiply, the columns of the first must equal the rows of the second. Each entry of the product is one row times one column, then summed. Order matters: AB is usually not the same as BA.',
    },
  },
};

export function explanationFor(topic: TopicId): Bilingual | undefined {
  return TOPIC_EXPLANATIONS[topic]?.text;
}
