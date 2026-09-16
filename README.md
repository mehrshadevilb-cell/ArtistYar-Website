# ArtistYar Website

پلتفرم وب **آرتیست‌یار** — Next.js · RTL · مینیمال.

هم‌تراز با ربات: `RahYar-Academy-Management-System-V14`

## قابلیت‌ها

### عمومی
خانه · دوره‌ها (زنده/دمو) · کلاس آنلاین · درباره · تماس · ورود/ثبت‌نام

### پنل‌ها
- `/panel` هنرجو (دمو + آماده‌ی API)
- `/admin` ادمین (دمو هم‌راستا با گزارش ربات)

### اتصال backend
```env
RAHYAR_API_URL=https://YOUR-RAHYAR-HOST
```

API سمت ربات:
- `GET  /api/v1/products`
- `GET  /api/v1/classes`
- `POST /api/v1/orders`
- `POST /api/v1/class-inquiries`
- `GET  /api/v1/health`

پروکسی سایت: `/api/rahyar/*`

بدون `RAHYAR_API_URL` سایت با داده دمو کار می‌کند.

### دمو ورود
- student / student123
- admin / admin123

## اجرا
```bash
npm install
cp .env.example .env.local   # اختیاری
npm run dev
```

## قانون کسب‌وکار
سفارش وب مثل ربات **pending** می‌ماند تا ادمین در تلگرام تأیید کند.
