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

سایت خودش مدل‌ها را از کلیدهای env کشف می‌کند و به **بهترین مدل موجود** وصل می‌شود.
حداقل یکی از این کلیدها را روی سرویس سایت (Render و غیره) ست کن:

```env
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GROQ_API_KEY=
OPENROUTER_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=   # یا GEMINI_API_KEY / GOOGLE_API_KEY
```

اختیاری — Gateway راه‌یار به‌عنوان fallback:

```env
RAHYAR_AI_GATEWAY_URL=https://YOUR-BOT-HOST
RAHYAR_AI_BRIDGE_SECRET=YOUR_SHARED_SECRET
```

بعد از deploy، `/api/ai/providers` لیست providerها و مدل‌های کشف‌شده را برمی‌گرداند.

## Multi-Agent Development

پنل `/admin/ai` علاوه بر تحلیل Multi-Agent، یک مسیر Development Agent دارد: مدل‌ها plan می‌سازند، چند Coding Agent به‌صورت هم‌زمان پیشنهاد کد می‌دهند، Reviewerها آن را بررسی می‌کنند و نسخه منتخب در یک branch با نام `ai/*` اعمال و به‌صورت Draft PR ساخته می‌شود. تغییر مستقیم روی `main` انجام نمی‌شود.

برای فعال‌سازی write access روی Render:

```env
GITHUB_TOKEN=یک_GitHub_Fine-grained_Token_با_دسترسی_فقط_به_این_Repository
GITHUB_REPOSITORY=mehrshadevilb-cell/ArtistYar-Website
```

دسترسی Token را حداقلی نگه دار: `Contents` برای نوشتن فایل و `Pull requests` برای ساخت PR. پس از ساخت PR، GitHub Actions فایل `.github/workflows/agent-verify.yml` را اجرا می‌کند و `typecheck` و `build` را بررسی می‌کند. Merge و deploy همچنان باید تحت کنترل owner باشد.

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

آپلود از خود پنل و از مسیر سرور انجام می‌شود و **Upload Token جداگانه لازم ندارد**؛ `SUPABASE_SECRET_KEY` فقط در env سرور Render قرار می‌گیرد و هرگز به مرورگر ارسال نمی‌شود. bucket باید عمومی باشد تا لینک‌های گالری قابل مشاهده باشند. برای بررسی اتصال واقعی bucket و جدول، از `/admin/system` بخش diagnostics استفاده کن.

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
# ARTISTYAR_ADMIN_* و حداقل یک AI key را در .env.local پر کن
npm run dev
```
