export type SpotPlayerLicense = {
  id: string;
  name: string;
  phone: string;
  courses: string[];
  created_at: string;
  activated: boolean;
  activated_at: string | null;
  download_bytes: number;
  watch_seconds: number;
};

/** Imported from SpotPlayer export licenses-2026-09-13.xlsx (keys excluded). */
export const spotplayerLicensesImportedAt = "2026-09-13" as const;
export const spotplayerLicensesSource = "licenses-2026-09-13.xlsx" as const;
export const spotplayerLicenses: SpotPlayerLicense[] = [
  { id: "6a69e4981c0e6921359cefb4", name: "کامیاب کرمی", phone: "09125593083", courses: ["راه‌یار پرو", "تئوری موسیقی", "راه‌یار ِ تنظیم، میکس و مسترینگ", "کیوبیس - Cubase (مهرشاد بنائی)"], created_at: "2026-07-29 16:02:20", activated: true, activated_at: "2026-08-03 23:26:59", download_bytes: 5247324503, watch_seconds: 18505 },
  { id: "6a55321f0f4ef812588f9c34", name: "امیررضا علیزاده", phone: "09026991830", courses: ["راه‌یار پرو", "تئوری موسیقی", "راه‌یار ِ تنظیم، میکس و مسترینگ"], created_at: "2026-07-13 23:15:31", activated: false, activated_at: null, download_bytes: 0, watch_seconds: 0 },
  { id: "6a4fd80174c0f465092fb22a", name: "مهدی بابایی", phone: "09145634366", courses: ["راه‌یار پرو", "تئوری موسیقی", "راه‌یار ِ تنظیم، میکس و مسترینگ", "کیوبیس - Cubase (مهرشاد بنائی)"], created_at: "2026-07-09 21:49:41", activated: true, activated_at: "2026-07-10 03:34:37", download_bytes: 16037715111, watch_seconds: 49275 },
  { id: "6a4ea9bc0870d5d0f2367361", name: "امیر رضا صدوقی", phone: "09306801304", courses: ["راه‌یار ِ تنظیم، میکس و مسترینگ"], created_at: "2026-07-09 00:20:00", activated: true, activated_at: "2026-07-09 00:26:01", download_bytes: 2362814267, watch_seconds: 660 },
  { id: "6a4649f5710159c9ac840864", name: "مهدی ابی", phone: "09154384886", courses: ["راه‌یار پرو", "تئوری موسیقی", "راه‌یار ِ تنظیم، میکس و مسترینگ"], created_at: "2026-07-02 15:53:13", activated: true, activated_at: "2026-07-02 16:09:02", download_bytes: 12155981196, watch_seconds: 49395 },
  { id: "6a4432b945c71723f763d303", name: "مهران ابراهیمی", phone: "09031558065", courses: ["راه‌یار پرو", "تئوری موسیقی", "راه‌یار ِ تنظیم، میکس و مسترینگ", "کیوبیس - Cubase (مهرشاد بنائی)"], created_at: "2026-07-01 01:49:33", activated: false, activated_at: null, download_bytes: 0, watch_seconds: 0 },
  { id: "69f74374170450f92cbfd562", name: "عقیل عمورضا", phone: "09126449981", courses: ["راه‌یار پرو", "تئوری موسیقی", "راه‌یار ِ تنظیم، میکس و مسترینگ", "کیوبیس - Cubase (مهرشاد بنائی)"], created_at: "2026-05-03 17:16:24", activated: false, activated_at: null, download_bytes: 0, watch_seconds: 0 },
  { id: "69f6f9495ab86a5c08a3fb93", name: "Mahdi Nabavizade", phone: "09356191966", courses: ["راه‌یار پرو", "تئوری موسیقی", "راه‌یار ِ تنظیم، میکس و مسترینگ", "کیوبیس - Cubase (مهرشاد بنائی)"], created_at: "2026-05-03 11:59:57", activated: true, activated_at: "2026-05-12 17:54:52", download_bytes: 4457601165, watch_seconds: 9910 },
  { id: "69edd98c9cabe7bccd72caee", name: "Mahdi Asfanani", phone: "09933953880", courses: ["راه‌یار پرو", "تئوری موسیقی", "راه‌یار ِ تنظیم، میکس و مسترینگ", "کیوبیس - Cubase (مهرشاد بنائی)"], created_at: "2026-04-26 13:54:08", activated: true, activated_at: "2026-04-26 15:34:54", download_bytes: 5765366216, watch_seconds: 13190 },
  { id: "69e1e9aa9544cd2751bb2a97", name: "Amir", phone: "09029387686", courses: ["تئوری موسیقی", "راه‌یار ِ تنظیم، میکس و مسترینگ", "کیوبیس - Cubase (مهرشاد بنائی)"], created_at: "2026-04-17 12:35:42", activated: true, activated_at: "2026-05-01 13:37:10", download_bytes: 7106544832, watch_seconds: 13165 },
  { id: "69e1e117c87707d4dc3ccdbc", name: "Mehrshad", phone: "09396951561", courses: ["راه‌یار پرو", "تئوری موسیقی", "راه‌یار ِ تنظیم، میکس و مسترینگ", "کیوبیس - Cubase (مهرشاد بنائی)"], created_at: "2026-04-17 11:59:07", activated: true, activated_at: "2026-04-17 11:59:27", download_bytes: 885604823, watch_seconds: 1650 },
  { id: "69ca818ebbfd505b4196fe36", name: "Mahdi Mataj", phone: "09370745337", courses: ["راه‌یار پرو", "کیوبیس - Cubase (مهرشاد بنائی)"], created_at: "2026-03-30 18:29:22", activated: true, activated_at: "2026-04-01 00:00:21", download_bytes: 2776647052, watch_seconds: 2175 },
  { id: "69c651cc5791e30f2328649b", name: "سیاوش", phone: "09147255617", courses: ["راه‌یار پرو", "تئوری موسیقی", "راه‌یار ِ تنظیم، میکس و مسترینگ", "کیوبیس - Cubase (مهرشاد بنائی)"], created_at: "2026-03-27 14:16:32", activated: true, activated_at: "2026-03-28 13:42:47", download_bytes: 4752326660, watch_seconds: 15740 },
  { id: "6998185fb4b6528882627728", name: "بهزاد مقدم", phone: "09226311265", courses: ["راه‌یار پرو", "راه‌یار ِ تنظیم، میکس و مسترینگ"], created_at: "2026-02-20 11:47:15", activated: true, activated_at: "2026-02-20 12:06:38", download_bytes: 2226820248, watch_seconds: 34935 },
  { id: "69981086fddd4707920cf8b7", name: "بهزاد مقدم", phone: "09226311265", courses: ["تئوری موسیقی", "کیوبیس - Cubase (مهرشاد بنائی)"], created_at: "2026-02-20 11:13:46", activated: true, activated_at: "2026-02-20 12:17:23", download_bytes: 113687802, watch_seconds: 780 },
  { id: "697f518777a6a22982cceb64", name: "علیرضا خوش اخلاق", phone: "09134114003", courses: ["راه‌یار پرو", "تئوری موسیقی", "راه‌یار ِ تنظیم، میکس و مسترینگ", "کیوبیس - Cubase (مهرشاد بنائی)"], created_at: "2026-02-01 16:44:27", activated: true, activated_at: "2026-02-16 12:00:30", download_bytes: 5242880, watch_seconds: 45 },
  { id: "697d0a80114bdce5a7e9a45d", name: "محمدرضا حاجی آقایی", phone: "09015859988", courses: ["راه‌یار پرو", "تئوری موسیقی", "راه‌یار ِ تنظیم، میکس و مسترینگ"], created_at: "2026-01-30 23:16:52", activated: true, activated_at: "2026-01-30 23:45:28", download_bytes: 5388583230, watch_seconds: 44260 },
  { id: "697cd26075827fcfb6b6c960", name: "مهدی متاج", phone: "09370745337", courses: ["تئوری موسیقی", "راه‌یار ِ تنظیم، میکس و مسترینگ"], created_at: "2026-01-30 19:17:24", activated: true, activated_at: "2026-01-30 19:27:32", download_bytes: 10553838625, watch_seconds: 27450 },
  { id: "697cce6a5df4ab9fda72725d", name: "Mohammad Houshmand", phone: "Mehrshad", courses: ["راه‌یار پرو", "تئوری موسیقی", "راه‌یار ِ تنظیم، میکس و مسترینگ", "کیوبیس - Cubase (مهرشاد بنائی)"], created_at: "2026-01-30 19:00:30", activated: true, activated_at: "2026-01-30 19:01:16", download_bytes: 3349552520, watch_seconds: 1575 },
  { id: "697b2e5b030046b1c011882a", name: "حسین", phone: "09162059970", courses: ["راه‌یار پرو", "تئوری موسیقی", "راه‌یار ِ تنظیم، میکس و مسترینگ"], created_at: "2026-01-29 13:25:19", activated: true, activated_at: "2026-01-30 21:00:32", download_bytes: 6275104535, watch_seconds: 21910 },
  { id: "6977c2e13c6f2edac4b8e864", name: "امین راد", phone: "09194942793", courses: ["راه‌یار پرو", "تئوری موسیقی", "راه‌یار ِ تنظیم، میکس و مسترینگ"], created_at: "2026-01-26 23:09:57", activated: true, activated_at: "2026-01-27 00:56:00", download_bytes: 494954277, watch_seconds: 680 },
  { id: "6977ae5e114bdce5a7e578c3", name: "حسن", phone: "09394611371", courses: ["راه‌یار پرو", "تئوری موسیقی", "راه‌یار ِ تنظیم، میکس و مسترینگ"], created_at: "2026-01-26 21:42:26", activated: true, activated_at: "2026-02-14 15:08:29", download_bytes: 4777326112, watch_seconds: 11245 },
  { id: "6977181ef9a45ad345d009b0", name: "عرفان", phone: "09193938193", courses: ["راه‌یار پرو", "تئوری موسیقی", "راه‌یار ِ تنظیم، میکس و مسترینگ", "کیوبیس - Cubase (مهرشاد بنائی)"], created_at: "2026-01-26 11:01:22", activated: true, activated_at: "2026-02-07 13:30:45", download_bytes: 3906550484, watch_seconds: 4325 },
  { id: "69761282bbc714520e01e3f1", name: "Hosein T", phone: "09172050717", courses: ["راه‌یار پرو", "تئوری موسیقی", "راه‌یار ِ تنظیم، میکس و مسترینگ"], created_at: "2026-01-25 16:25:10", activated: true, activated_at: "2026-05-03 19:26:26", download_bytes: 4551262045, watch_seconds: 12430 },
  { id: "697535dc58d9e28807f3df88", name: "ایوب", phone: "09039119621", courses: ["راه‌یار ِ تنظیم، میکس و مسترینگ"], created_at: "2026-01-25 00:43:44", activated: true, activated_at: "2026-01-26 14:13:53", download_bytes: 4270277690, watch_seconds: 22420 },
  { id: "69752dd70812037148cd6e4f", name: "مهدی", phone: "09131083329", courses: ["راه‌یار ِ تنظیم، میکس و مسترینگ"], created_at: "2026-01-25 00:09:31", activated: true, activated_at: "2026-01-25 00:21:42", download_bytes: 5312986636, watch_seconds: 8650 },
  { id: "69752767030046b1c00ce97e", name: "سیاوش", phone: "09147255617", courses: ["راه‌یار پرو"], created_at: "2026-01-24 23:42:03", activated: true, activated_at: "2026-03-25 13:14:47", download_bytes: 138412032, watch_seconds: 140 },
  { id: "6974cab40812037148ccf1a7", name: "رضا بهبهانی", phone: "09033328451", courses: ["راه‌یار پرو"], created_at: "2026-01-24 17:06:32", activated: true, activated_at: "2026-01-24 23:36:15", download_bytes: 7884658728, watch_seconds: 16705 },
];

export function licenseStats() {
  const total = spotplayerLicenses.length;
  const activated = spotplayerLicenses.filter((l) => l.activated).length;
  const inactive = total - activated;
  const watchHours = Math.round(spotplayerLicenses.reduce((s, l) => s + l.watch_seconds, 0) / 3600);
  const downloadGb = Math.round((spotplayerLicenses.reduce((s, l) => s + l.download_bytes, 0) / 1024 ** 3) * 10) / 10;
  return { total, activated, inactive, watchHours, downloadGb };
}
