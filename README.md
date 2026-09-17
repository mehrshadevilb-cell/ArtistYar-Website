# ArtistYar Website

پلتفرم وب **آرتیست‌یار** — متصل به ربات راه‌یار (دیتابیس + AI).

## ورود ادمین

حساب‌های دمو (`admin/admin123` و `student/student123`) حذف شده‌اند.

در Render سایت این دو متغیر را **حتماً** تنظیم کن:

```env
ARTISTYAR_ADMIN_USERNAME=mehrshad
ARTISTYAR_ADMIN_PASSWORD=یک_رمز_قوی_اختصاصی
```

سپس با همان نام کاربری و رمز از `/login` وارد پنل `/admin` شو.

## اتصال AI

AI سایت providerها را مستقیم صدا نمی‌زند؛ سایت به **RahYar AI Gateway** وصل می‌شود.

```env
RAHYAR_AI_GATEWAY_URL=https://YOUR-BOT-HOST
RAHYAR_AI_BRIDGE_SECRET=YOUR_SHARED_SECRET
```

## همگام‌سازی سایت و ربات

ثبت‌نام، ورود هنرجو، سفارش، پرداخت، لایسنس SpotPlayer و لینک‌های ArtistYar از API و دیتابیس مشترک RahYar استفاده می‌کنند. بنابراین متغیر `RAHYAR_API_URL` باید به همان backend ربات اشاره کند. برای نمایش سایت درون تلگرام، در backend مقدار `TELEGRAM_WEB_APP_URL=https://artistyaar.ir` را تنظیم کن و URL را در BotFather از مسیر **Bot Settings → Web Login** به‌عنوان Allowed URL ثبت کن.

## رسانه (Supabase)

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_BUCKET=artistyar-media
ARTISTYAR_SESSION_SECRET=یک_کلید تصادفی طولانی برای امضای نشست ادمین
```

جدول `media_assets` را طبق `supabase/media_assets.sql` بساز (دسته‌ها: `student-work`, `free-training`, `prodby-mehrshad`).

اگر ویرایش عنوان/توضیح ذخیره نمی‌شود، اتصال Supabase، نام bucket، اجرای `supabase/media_assets.sql` و مقدار `ARTISTYAR_SESSION_SECRET` را بررسی کن؛ سپس deploy جدید سایت را تأیید کن.

## لایسنس‌های SpotPlayer

خروجی Excel در `src/data/spotplayer-licenses.ts` وارد شده و در `/admin` و `/admin/students` نمایش داده می‌شود.

برای import داخل دیتابیس ربات:

```bash
python scripts/import_spotplayer_licenses.py path/to/licenses.xlsx --apply
```

## اجرا
```bash
npm install
cp .env.example .env.local
# ARTISTYAR_ADMIN_* را در .env.local پر کن
npm run dev
```
