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

## رسانه (Supabase)

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_BUCKET=artistyar-media
ARTISTYAR_UPLOAD_ADMIN_TOKEN=یک_کلید_تصادفی_قوی
```

جدول `media_assets` را طبق `supabase/media_assets.sql` بساز (دسته‌ها: `student-work`, `free-training`, `prodby-mehrshad`).

اگر ویرایش عنوان/توضیح ذخیره نمی‌شود:
1. توکن `ARTISTYAR_UPLOAD_ADMIN_TOKEN` را در Render و در فیلد پنل یکی کن.
2. constraint دسته در Supabase را با اسکریپت SQL به‌روز کن.
3. Deploy جدید سایت را روی Render تأیید کن.

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
