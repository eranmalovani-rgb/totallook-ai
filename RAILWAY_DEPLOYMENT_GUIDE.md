# מדריך פריסה ב-Railway — TotalLook.ai

## סיכום השינויים שבוצעו

### מה הוסר / הוחלף

| רכיב | לפני (Manus) | אחרי (Railway) |
|---|---|---|
| **אימות משתמשים** | Manus OAuth Portal | אימייל + סיסמה (bcryptjs + JWT) |
| **אחסון קבצים** | Manus S3 Proxy | Cloudflare R2 / S3 ישיר |
| **AI (LLM)** | Manus Forge fallback | OpenAI בלבד |
| **יצירת תמונות** | Manus Forge fallback | OpenAI DALL-E 3 בלבד |
| **התראות** | Manus Notification Service | Console log + Email (אופציונלי) |
| **Vite Plugins** | vite-plugin-manus-runtime | הוסר |
| **Debug Collector** | __manus__ debug scripts | הוסר |
| **SDK** | Manus OAuth SDK (token exchange) | JWT sessions בלבד |

### קבצים שהשתנו

```
server/_core/oauth.ts        — מערכת אימות חדשה (email+password)
server/_core/sdk.ts          — JWT sessions בלבד (ללא Manus OAuth)
server/_core/context.ts      — ללא שינוי מהותי
server/_core/env.ts          — הוספת SITE_URL
server/_core/index.ts        — הסרת debug endpoints, הוספת health check
server/_core/llm.ts          — הסרת Manus Forge fallback
server/_core/imageGeneration.ts — OpenAI DALL-E 3 בלבד
server/_core/notification.ts — Console + Email (ללא Manus service)
server/storage.ts            — Cloudflare R2 / S3 ישיר
server/db.ts                 — הוספת getUserByEmail + passwordHash
drizzle/schema.ts            — הוספת עמודת passwordHash
client/src/const.ts          — הפניה ל-/login במקום Manus OAuth
client/src/main.tsx          — הפניה ל-/login
client/src/_core/hooks/useAuth.ts — הפניה ל-/login
client/src/pages/Login.tsx   — דף התחברות/הרשמה חדש
client/src/App.tsx           — הוספת route ל-/login
vite.config.ts               — הסרת Manus plugins
package.json                 — הוספת bcryptjs, הסרת vite-plugin-manus-runtime
```

---

## שלבי פריסה ב-Railway

### שלב 1: יצירת פרויקט ב-Railway

1. היכנס ל-[railway.app](https://railway.app) והתחבר
2. לחץ **New Project** → **Deploy from GitHub repo** (או העלה ישירות)
3. חבר את ה-repo שלך (או העלה את תיקיית הקוד)

### שלב 2: הגדרת מסד נתונים

מסד הנתונים כבר הועבר ל-Railway MySQL. ודא שהמשתנה `DATABASE_URL` מוגדר:

```
DATABASE_URL=mysql://root:oSxRuLmcJeCWBwwBkXdeaoCcVdtlukEg@junction.proxy.rlwy.net:42961/railway
```

**חשוב:** הרץ את הפקודה הבאה להוספת עמודת הסיסמה:

```sql
ALTER TABLE users ADD COLUMN passwordHash VARCHAR(255) DEFAULT NULL;
```

### שלב 3: הגדרת משתני סביבה ב-Railway

בלוח הבקרה של Railway, הוסף את המשתנים הבאים:

#### משתנים חובה

| משתנה | ערך | הסבר |
|---|---|---|
| `DATABASE_URL` | `mysql://root:...` | כבר מוגדר מהמיגרציה |
| `JWT_SECRET` | מחרוזת אקראית 64 תווים | לחתימת session cookies |
| `OPENAI_API_KEY` | `sk-proj-...` | מפתח OpenAI לניתוח AI |
| `NODE_ENV` | `production` | מצב ייצור |

#### משתני אחסון (Cloudflare R2 מומלץ)

| משתנה | ערך | הסבר |
|---|---|---|
| `R2_ACCOUNT_ID` | מזהה חשבון Cloudflare | |
| `R2_ACCESS_KEY_ID` | מפתח גישה R2 | |
| `R2_SECRET_ACCESS_KEY` | מפתח סודי R2 | |
| `R2_BUCKET_NAME` | `totallook` | שם ה-bucket |
| `R2_PUBLIC_URL` | `https://pub-xxx.r2.dev` | URL ציבורי |

#### משתנים אופציונליים

| משתנה | ערך | הסבר |
|---|---|---|
| `SITE_URL` | `https://totallook.ai` | כתובת האתר |
| `VITE_APP_URL` | `https://totallook.ai` | כתובת האתר (frontend) |
| `WHATSAPP_TOKEN` | Meta WhatsApp token | אינטגרציית WhatsApp |
| `WHATSAPP_PHONE_ID` | Meta Phone ID | |
| `WHATSAPP_VERIFY_TOKEN` | Verify token | |
| `OWNER_EMAIL` | `your@email.com` | לקבלת התראות |
| `GMAIL_APP_PASSWORD` | App password | לשליחת התראות |

### שלב 4: הגדרת Build & Deploy

Railway יזהה אוטומטית את `nixpacks.toml` או `railway.json`.

**Build Command:**
```bash
pnpm install && pnpm build
```

**Start Command:**
```bash
NODE_ENV=production node dist/index.js
```

**Health Check Path:**
```
/api/health
```

### שלב 5: הגדרת דומיין

1. ב-Railway → Settings → Domains
2. הוסף Custom Domain: `totallook.ai`
3. עדכן את רשומות ה-DNS:
   - `A` record: הכתובת שRailway נותן
   - או `CNAME` record: `your-project.up.railway.app`

### שלב 6: הגדרת Cloudflare R2

1. היכנס ל-[Cloudflare Dashboard](https://dash.cloudflare.com)
2. R2 → Create Bucket → שם: `totallook`
3. R2 → Manage R2 API Tokens → Create API Token
4. העתק את `Account ID`, `Access Key ID`, `Secret Access Key`
5. הגדר Public Access ל-bucket (Settings → Public Access → Allow)
6. העתק את ה-Public URL

**חשוב:** כל התמונות הקיימות שהועלו דרך Manus S3 ימשיכו לעבוד כל עוד ה-URLs שלהן נשמרו בבסיס הנתונים. תמונות חדשות יישמרו ב-R2.

---

## הערות חשובות

### משתמשים קיימים

משתמשים שנרשמו דרך Manus OAuth **לא יוכלו להתחבר** עם הסיסמה הישנה (כי לא הייתה סיסמה). הם יצטרכו:
1. להירשם מחדש עם אימייל + סיסמה
2. או — ניתן לבנות מנגנון "שכחתי סיסמה" שישלח קישור לאימייל

### תמונות קיימות

כל ה-URLs של תמונות שהועלו דרך Manus S3 Proxy נשמרו בבסיס הנתונים. הם ימשיכו לעבוד **כל עוד Manus לא מוחק אותם**. מומלץ:
1. להוריד את כל התמונות הקיימות
2. להעלות אותן ל-R2
3. לעדכן את ה-URLs בבסיס הנתונים

### WhatsApp Webhook

אם אתה משתמש באינטגרציית WhatsApp, עדכן את ה-Webhook URL ב-Meta Developer Console:
```
https://totallook.ai/api/whatsapp/webhook
```

### Instagram Webhook

אם אתה משתמש באינטגרציית Instagram, עדכן את ה-Webhook URL:
```
https://totallook.ai/api/instagram/webhook
```

---

## פקודות שימושיות

```bash
# התקנת dependencies
pnpm install

# פיתוח מקומי
pnpm dev

# בנייה לייצור
pnpm build

# הפעלה בייצור
NODE_ENV=production node dist/index.js

# עדכון סכמת DB
pnpm db:push

# הרצת טסטים
pnpm test
```

---

## ארכיטקטורה

```
┌─────────────────────────────────────────────┐
│                  Railway                      │
│  ┌──────────────┐    ┌──────────────────┐   │
│  │   Node.js    │    │   Railway MySQL   │   │
│  │   Express    │◄──►│   (existing DB)   │   │
│  │   + Vite     │    └──────────────────┘   │
│  └──────┬───────┘                            │
│         │                                     │
└─────────┼─────────────────────────────────────┘
          │
          ▼
┌─────────────────────┐  ┌──────────────────┐
│   Cloudflare R2     │  │   OpenAI API     │
│   (File Storage)    │  │   (GPT-4o +      │
│                     │  │    DALL-E 3)     │
└─────────────────────┘  └──────────────────┘
```
