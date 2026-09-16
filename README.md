# ArtistYar Website

پلتفرم وب **آرتیست‌یار** — مدرن، مینیمال، RTL فارسی.

ریپو: private · هم‌تراز با ربات `RahYar-Academy-Management-System-V14`

## آنچه آماده است

### عمومی
- خانه، دوره‌ها، کلاس آنلاین، درباره، تماس
- هویت بصری ink / sand / gold

### حساب کاربری
- ورود و ثبت‌نام (دمو محلی)
- حساب دمو:
  - هنرجو: `student` / `student123`
  - ادمین: `admin` / `admin123`

### پنل هنرجو `/panel`
- نمای کلی، دوره‌ها، رزروها، پروفایل + همگام‌سازی تلگرام (دمو)

### پنل ادمین `/admin`
- گزارش امروز، پرداخت‌ها، رزروها، هنرجویان، وضعیت سیستم

### API
- `GET /api/health`
- `POST /api/auth/login` (اسکلت اتصال backend)

## اجرا

```bash
npm install
npm run dev
```

## فاز بعدی (backend)

1. `RAHYAR_API_URL` به سرویس مشترک ربات
2. JWT / session واقعی به‌جای localStorage
3. لینک امن اکانت وب ↔ telegram_id
4. دامنه + TLS

## برند

آرتیست‌یار / ArtistYar — آموزش جدی موسیقی، UI بدون شلوغی.
