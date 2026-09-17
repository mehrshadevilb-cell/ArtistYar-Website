# ArtistYar Website

پلتفرم وب **آرتیست‌یار** — متصل به ربات راه‌یار (دیتابیس + AI).

## اتصال AI

AI سایت از این به بعد providerها را مستقیم صدا نمی‌زند؛ سایت به **RahYar AI Gateway** وصل می‌شود تا همان `ChatAssistantService`، provider router، failover، cooldown، دانش داخلی، کاتالوگ دوره‌ها و web research در ربات و سایت مشترک باشد.

| سطح | کجا | چه کار می‌کند |
|------|-----|----------------|
| دستیار آموزشی | سایت `/assistant` + ربات | همان `ChatAssistantService` و provider pool |
| Diagnostics | سایت `/admin/ai` | self-check + status agent |
| Developer Agent (کدنویسی/PR) | **فقط تلگرام ادمین** | امن؛ از وب باز نیست |

### Environment

در Render سایت:

```env
RAHYAR_AI_GATEWAY_URL=https://YOUR-BOT-HOST
RAHYAR_AI_BRIDGE_SECRET=YOUR_SHARED_SECRET
```

در Render ربات، همین مقدار secret را تنظیم کنید:

```env
RAHYAR_AI_BRIDGE_SECRET=YOUR_SHARED_SECRET
```

`RAHYAR_AI_BRIDGE_SECRET` باید یک مقدار تصادفی قوی و یکسان در هر دو سرویس باشد. این مقدار را داخل Git commit نکنید.

Backend endpoints:
- `POST /api/v1/assistant/chat`
- `GET  /api/v1/ai/status`
- `GET  /api/v1/products` · `classes` · `orders` · ...

## آپلود محتوای رسانه‌ای
برای نگهداری پایدار فایل‌های نمونه‌کار هنرجو و آموزش رایگان، از Supabase Storage استفاده می‌شود. این متغیرها را در محیط Render تنظیم کنید:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_BUCKET=artistyar-media
ARTISTYAR_UPLOAD_ADMIN_TOKEN=یک_کلید_تصادفی_قوی
```

در Supabase یک Storage bucket عمومی با نام `artistyar-media` بسازید و جدول `media_assets` را طبق migration پروژه ایجاد کنید. بعد از ورود به `/admin`، از منوی **مدیریت محتوا** فایل صوتی، ویدیویی، تصویری یا PDF را آپلود کنید. برای نمونه‌کار هنرجو تأیید رضایت انتشار الزامی است. فایل‌ها در Supabase Storage ذخیره می‌شوند و محتوای منتشرشده در گالری عمومی نمایش داده خواهد شد. پلن رایگان Supabase سقف ۵۰MB برای هر فایل دارد.

## اجرا
```bash
npm install
cp .env.example .env.local
npm run dev
```

دمو: `student/student123` · `admin/admin123`
