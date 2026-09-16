export const studentCourses = [
  {
    id: "rahyar",
    title: "راه‌یار",
    status: "فعال",
    progress: 42,
    accessUntil: "۱۴۰۵/۱۲/۲۹",
  },
  {
    id: "mixing",
    title: "میکس — پلن ۸ جلسه",
    status: "فعال",
    progress: 25,
    remainingSessions: 6,
  },
];

export const studentReservations = [
  {
    id: 1,
    course: "میکس",
    date: "۱۴۰۵/۰۶/۲۸",
    time: "۱۸:۰۰",
    status: "تأیید شده",
  },
  {
    id: 2,
    course: "میکس",
    date: "۱۴۰۵/۰۷/۰۵",
    time: "۱۸:۰۰",
    status: "در انتظار",
  },
];

export const adminStats = {
  pendingPayments: 3,
  pendingReservations: 5,
  classesToday: 4,
  activeStudents: 86,
  revenueTodayLabel: "۴٬۲۰۰٬۰۰۰ تومان",
  overdueInstallments: 2,
};

export const adminPayments = [
  { id: 101, student: "سارا م.", amount: "۱۵٬۰۰۰٬۰۰۰", product: "راه‌یار", status: "pending" },
  { id: 102, student: "علی ک.", amount: "۳٬۵۰۰٬۰۰۰", product: "میکس", status: "pending" },
];

export const adminReservations = [
  { id: 201, student: "نیما ر.", course: "پیانو", when: "۱۴۰۵/۰۶/۲۷ · ۱۷:۰۰", status: "payment_submitted" },
  { id: 202, student: "مریم ت.", course: "تنظیم", when: "۱۴۰۵/۰۶/۲۸ · ۱۹:۰۰", status: "pending" },
];
