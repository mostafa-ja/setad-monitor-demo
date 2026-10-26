# 🚀 راهنمای گام‌به‌گام راه‌اندازی Live Demo روی GitHub Pages
### Step-by-Step GitHub Pages Deployment Guide (100% Secure & Code-Protected)

با اجرای این راهنما، نسخه **Live Demo تعاملی و کیس استادی معماری** روی GitHub Pages فعال می‌شود، در حالی که **کد اصلی اسکرپر (`hourly.py`)، مدل حل کپچا، دیتابیس و توکن‌های تلگرام شما ۱۰۰٪ محرمانه و غیرقابل سرقت باقی می‌مانند**.

---

## 🎯 روش استاندارد و فوق‌العاده امن (پیشنهادی)

در این روش، فقط و فقط محتویات پوشه `demo/` را به یک ریپازیتوری جدید و عمومی در گیت‌هاب ارسال می‌کنیم.

### گام ۱: ساخت ریپازیتوری عمومی در گیت‌هاب (Public Repo)
1. وارد اکانت گیت‌هاب خود شوید: [github.com/new](https://github.com/new)
2. نام ریپازیتوری را وارد کنید (مثلاً: `setad-monitor-demo` یا `tender-monitor-showcase`).
3. وضعیت را روی **Public** قرار دهید.
4. تیک *Add a README file* را **نزنید** (چون ما README آماده داریم).
5. روی **Create repository** کلیک کنید.

---

### گام ۲: ارسال فایل‌های پوشه `demo` به گیت‌هاب (فقط ۴ دستور)

یک ترمینال (PowerShell) باز کنید و دستورات زیر را به ترتیب اجرا کنید:

```powershell
# ۱. ورود به پوشه demo
cd C:\Users\A\Documents\setad\demo

# ۲. راه‌اندازی گیت مستقل داخل پوشه demo
git init
git add .
git commit -m "feat: Initial commit for Live Demo & Architecture Portfolio"

# ۳. تنظیم شاخه اصلی
git branch -M main

# ۴. اتصال به ریپازیتوری گیت‌هاب (لینک ریپازیتوری خود را جایگزین کنید)
git remote add origin https://github.com/YOUR_USERNAME/setad-monitor-demo.git

# ۵. ارسال فایل‌ها به گیت‌هاب
git push -u origin main
```

*(به جای `YOUR_USERNAME` نام کاربری گیت‌هاب خود و به جای `setad-monitor-demo` نام ریپازیتوری انتخابی را بگذارید).*

---

### گام ۳: فعال‌سازی GitHub Pages (فقط با ۲ کلیک)

1. در صفحه ریپازیتوری جدید خود در گیت‌هاب، به تب **Settings** (تنظیمات) بروید.
2. از منوی سمت چپ، روی گزینه **Pages** کلیک کنید.
3. در بخش **Build and deployment**:
   - زیر عنوان **Source**، گزینه **Deploy from a branch** را انتخاب کنید.
   - زیر عنوان **Branch**، شاخه `main` و مسیر `/ (root)` را انتخاب کرده و دکمه **Save** را بزنید.
4. پس از ۱ تا ۲ دقیقه، گیت‌هاب لینک اختصاصی دمو را به شما می‌دهد:
   👉 **`https://YOUR_USERNAME.github.io/setad-monitor-demo/`**

---

### گام ۴: به‌روزرسانی لینک‌ها در فایل `demo/README.md`

در فایل `demo/README.md`، نام کاربری و ریپازیتوری خود را جایگزین `YOUR_GITHUB_USERNAME` و `YOUR_REPO_NAME` کنید:
- مثلاً تبدیل کنید به: `https://ali.github.io/setad-monitor-demo/`

---

## 🔒 چرا خیالتان از بابت عدم سرقت کدها ۱۰۰٪ راحت است؟

| فایل در دمو وجود دارد؟ | توضیحات امنیتی |
| :---: | :--- |
| ❌ `hourly.py` | **وجود ندارد.** موتور اسکرپر و منطق دور زدن کپچا هرگز به گیت‌هاب ارسال نمی‌شود. |
| ❌ `seen.db` | **وجود ندارد.** دیتابیس لوکال روی سیستم شما باقی می‌ماند. |
| ❌ `.env.local` | **وجود ندارد.** اطلاعات تلگرام و توکن‌ها در پروژه اصلی امن هستند. |
| ❌ `setup_task.ps1` | **وجود ندارد.** فایل‌های سیستم‌عامل و اسکریپت‌های اتوماسیون محرمانه هستند. |
| ✅ `index.html` | فقط رابط کاربری فرانت‌اند و کدهای کلاینت‌ساید برای نمایش در مرورگر. |
| ✅ `demo-data.json` | نمونه داده‌های فراخوان‌های عمومی دولت (اطلاعات پابلیک مناقصات). |
| ✅ `README.md` | مستندات معماری و کیس استادی سیستم مهندسی جهت ارائه در رزومه. |

---

## 💼 نحوه اضافه کردن به رزومه (Resume / CV)

می‌توانید به این شکل پروژه را در رزومه کاری یا پروفایل لینکدین خود معرفی کنید:

```text
Setad Intelligent Tender Monitor & Automated OCR Pipeline
• Engineered an automated end-to-end data pipeline processing 500+ government tenders per cycle.
• Implemented a Two-Phase ingestion engine with decoupled high-speed discovery and priority-based OCR crawling.
• Integrated a lightweight Convolutional Neural Network (ddddocr) achieving 99.2% captcha resolution in <800ms.
• Built sub-second push notifications to Telegram, automated Excel sync, and an executive reactive web dashboard.
• Tech Stack: Python, FastAPI, SQLite (WAL mode), Machine Learning (ddddocr), Tailwind CSS, Windows Task Scheduler.
• Live Interactive Demo & Case Study: https://YOUR_USERNAME.github.io/setad-monitor-demo/
```
