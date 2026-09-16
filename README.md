# ArtistYar Website

پلتفرم وب **آرتیست‌یار** — متصل به ربات راه‌یار (دیتابیس + AI).

## اتصال AI

| سطح | کجا | چه کار می‌کند |
|------|-----|----------------|
| دستیار آموزشی | سایت `/assistant` + ربات | همان `ChatAssistantService` |
| Diagnostics | سایت `/admin/ai` | self-check + status agent |
| Developer Agent (کدنویسی/PR) | **فقط تلگرام ادمین** | امن؛ از وب باز نیست |

```env
RAHYAR_API_URL=https://YOUR-BOT-HOST
RAHYAR_WEB_API_SECRET=   # optional, matches bot WEB_API_SECRET
```

Backend endpoints:
- `POST /api/v1/assistant/chat`
- `GET  /api/v1/ai/status`
- `GET  /api/v1/products` · `classes` · `orders` · ...

## اجرا
```bash
npm install
cp .env.example .env.local
npm run dev
```

دمو: `student/student123` · `admin/admin123`
