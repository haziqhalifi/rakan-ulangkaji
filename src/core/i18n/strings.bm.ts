// Bahasa Melayu strings. Typed against the English keys, so a missing key fails to compile.
// Use "awak" or "korang", never the informal pronoun banned in the copy rules.
import type { StringKey } from './t';

export const stringsBm: Record<StringKey, string> = {
  'app.name': 'Rakan Ulangkaji',
  'app.tagline': 'Kawan ulang kaji SPM awak',
  'lang.toggle': 'Bahasa',
  'lang.bm': 'BM',
  'lang.en': 'EN',
  'nav.main': 'Navigasi utama',
  'nav.rakan': 'Rakan',
  'nav.exam': 'Peperiksaan',
  'nav.board': 'Laluan',
  'nav.settings': 'Tetapan',
  'nav.home': 'Utama',
  'home.title': 'Hai {name}! Nak mula dari mana?',
  'home.caption':
    'Sembang Rakan, latihan peperiksaan dan papan laluan dijahit jadi satu dengan satu profil. Profil ini kekal dalam pelayar awak.',
  'home.mode.rakan': 'Rakan: sembang, kuiz kecil dan peringatan lembut',
  'home.mode.exam': 'Peperiksaan: kertas latihan bermasa dengan skema jawapan',
  'home.mode.board': 'Laluan: tengok laluan yang mungkin terbuka untuk gred awak',
  'welcome.title': 'Selamat datang ke Rakan Ulangkaji',
  'welcome.body': 'Jom sediakan profil dulu. Ambil masa seminit dan kekal dalam pelayar awak.',
  'rakan.title': 'Rakan',
  'rakan.placeholder': 'Rakan sedang bersiap. Sembang akan dibuka di sini tidak lama lagi.',
  'exam.title': 'Peperiksaan',
  'exam.placeholder': 'Kertas latihan sedang disiapkan. Ia akan dibuka di sini tidak lama lagi.',
  'board.title': 'Laluan',
  'board.placeholder': 'Papan laluan sedang disiapkan. Ia akan dibuka di sini tidak lama lagi.',
  'settings.title': 'Tetapan',
  'settings.placeholder': 'Tetapan akan ada di sini tidak lama lagi.',
  'loading': 'Sedang dimuatkan...',
  'status.dismiss': 'Tutup',
  'status.writeFailed': 'Kemajuan awak mungkin tidak disimpan pada peranti ini. Kami cuba lagi pada perubahan seterusnya.',
  'status.memoryOnly': 'Pelayar ini tidak membenarkan kami menyimpan. Kemajuan awak mungkin hilang selepas halaman ditutup.',
  'status.unreadable':
    'Kami tidak dapat membaca kemajuan yang tersimpan. Tiada apa yang dipadam. Kalau awak teruskan, awak akan mula baharu dan data lama akan diganti.',
  'error.title': 'Ada sesuatu yang tidak kena',
  'error.body': 'Itu salah pihak kami, bukan awak. Muat semula halaman dan cuba lagi. Kemajuan awak selamat.',
  'error.reload': 'Muat semula',
  'error.offlineTitle': 'Bahagian ini perlu dibuka sekali dalam talian dahulu',
  'error.offlineBody': 'Buka sekali semasa ada internet, selepas itu ia boleh digunakan tanpa talian. Rakan masih berfungsi.',
  'error.backToRakan': 'Kembali ke Rakan',
  disclaimer:
    'Ini panduan sahaja. Syarat berubah setiap tahun. Sentiasa semak sumber rasmi seperti UPU dan laman web institusi.',
};
