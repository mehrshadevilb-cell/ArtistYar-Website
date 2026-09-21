# User AI Music Generator

این قابلیت از **Admin AI Assistant** جداست و مسیرهای آن زیر `/ai-music` و `/api/music/*` قرار دارند. طراحی فعلی provider-agnostic است تا بعداً بتوان provider پولی را بدون تغییر UI یا مدل داده اضافه کرد.

## وضعیت فعلی

هستهٔ دامنه، parser فارسی/انگلیسی، انتخاب provider، چرخهٔ job، اعتبارها، variation، اعتبارسنجی صوت، APIهای مالکیت‌محور و migration دیتابیس در repository قرار دارند. در محیط بدون provider واقعی، Stub فقط برای توسعهٔ محلی فعال می‌شود و در production غیرفعال است.

این milestone بدون کلید provider پولی عمداً صدای تجاری تولید نمی‌کند. نبودن کلید به‌عنوان `ProviderUnavailable` گزارش می‌شود و نباید با فعال‌کردن Stub در production دور زده شود.

## راه‌اندازی دیتابیس

فایل زیر را در Supabase اجرا کنید:

```text
supabase/migrations/20260920_user_ai_music_generation.sql
```

این migration جدول‌های زیر را ایجاد می‌کند:

| جدول | کاربرد |
| --- | --- |
| `ai_music_generation_jobs` | درخواست، وضعیت، spec، خطا، retry و lineage |
| `ai_music_generation_outputs` | فایل‌های خروجی و metadata اعتبارسنجی |
| `ai_music_generation_credits` | موجودی و lifetime counters هر کاربر |
| `ai_music_generation_credit_ledger` | ledger idempotent برای grant، charge و refund |
| `ai_music_provider_registry` | محل نگهداری metadata providerهای آینده |

API با service-role به این جدول‌ها دسترسی دارد و مالکیت را با `user_id` حاصل از session cookie اعمال می‌کند. کلید service-role نباید به مرورگر ارسال شود.

## متغیرهای محیطی

برای production حداقل این موارد لازم است:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_BUCKET=artistyar-media
ELEVENLABS_API_KEY=...
```

تنظیمات اختیاری provider:

```env
ELEVENLABS_MUSIC_MODEL=music_v2_5
ELEVENLABS_MUSIC_BASE_URL=https://api.elevenlabs.io/v1
ELEVENLABS_MUSIC_PATH=/music/generate
MUSIC_GEN_FREE_CREDITS=10
```

`MUSIC_GEN_ALLOW_STUB=1` فقط برای development محلی است و نباید در سرویس production تنظیم شود.

## API contract

- `POST /api/music/generate` — ساخت job، charge idempotent، planning، generation و validation
- `GET /api/music/generations/:id` — مشاهدهٔ job فقط برای مالک
- `DELETE /api/music/generations/:id` — cancellation فقط برای مالک
- `POST /api/music/generations/:id/variation` — ساخت variation از خروجی کامل‌شده
- `GET /api/music/library?limit=30` — فهرست خروجی‌های همان کاربر

خطاهای provider به پیام‌های فارسی پایدار map می‌شوند و متن خام پاسخ provider به کاربر برگردانده نمی‌شود.

## افزودن provider جدید

یک adapter جدید باید `MusicGenerationProvider` را پیاده‌سازی کند و فقط در `src/lib/music-generation/registry.ts` ثبت شود. adapter باید capabilityهای واقعی خود را اعلام کند، کلید را فقط روی سرور بخواند، timeout داشته باشد و خروجی را به `ProviderGenerateResult` تبدیل کند. UI و routeها نباید مستقیماً SDK یا endpoint provider را import کنند.

ترتیب اتصال provider:

1. ثبت env key و capabilityها در adapter.
2. اجرای health check و یک generation واقعی در محیط staging.
3. بررسی format، مدت، سکوت و حجم خروجی.
4. اجرای `npm run typecheck`، `npm run build` و `npm run cf:build`.
5. اجرای migration روی Supabase و بررسی ownership، credit charge و refund.
6. تنظیم secretها روی محیط deploy؛ هیچ secretی در `.env.example` مقدار واقعی ندارد.

## محدودیت فعلی و مسیر بعدی

اجرای فعلی برای providerهای کوتاه‌مدت در request lifecycle طراحی شده و نتیجهٔ job را همان request برمی‌گرداند. برای providerهای طولانی یا صف‌محور، باید `runGenerationJob` به worker/queue پایدار منتقل شود تا مرورگر request طولانی باز نگه ندارد. این تغییر نیازمند انتخاب زیرساخت queue و تنظیمات محیط deploy است و بدون آن نباید ادعا کرد generation کاملاً asynchronous و durable است.

تا زمان تنظیم provider واقعی و اجرای migration، issue مربوط به این قابلیت باید باز بماند و PR آن Draft بماند.
