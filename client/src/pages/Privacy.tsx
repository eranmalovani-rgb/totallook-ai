import Navbar from "@/components/Navbar";
import { useLanguage } from "@/i18n";
import { Link } from "wouter";
import { Shield, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  const { lang, dir } = useLanguage();
  const ArrowIcon = lang === "he" ? ArrowLeft : ArrowRight;

  const lastUpdated = "03.04.2026";

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      <Navbar />

      <div className="pt-24 pb-16 container max-w-3xl mx-auto px-4">
        {/* Back link */}
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 mb-6 text-muted-foreground hover:text-foreground">
            <ArrowIcon className="w-4 h-4 rotate-180" />
            {lang === "he" ? "חזרה לדף הבית" : "Back to Home"}
          </Button>
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {lang === "he" ? "מדיניות פרטיות" : "Privacy Policy"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {lang === "he" ? `עדכון אחרון: ${lastUpdated}` : `Last updated: ${lastUpdated}`}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8 text-foreground/90 leading-relaxed">
          {lang === "he" ? <HebrewPrivacy /> : <EnglishPrivacy />}
        </div>

        {/* Footer links */}
        <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground transition-colors underline underline-offset-4">
            {lang === "he" ? "תנאי שימוש" : "Terms of Service"}
          </Link>
          <span className="text-border">|</span>
          <Link href="/about" className="hover:text-foreground transition-colors underline underline-offset-4">
            {lang === "he" ? "מי אנחנו" : "About"}
          </Link>
          <span className="text-border">|</span>
          <Link href="/" className="hover:text-foreground transition-colors underline underline-offset-4">
            {lang === "he" ? "דף הבית" : "Home"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold text-foreground mt-2">{children}</h2>;
}

function SubSectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold text-foreground/95 mt-4">{children}</h3>;
}

function HebrewPrivacy() {
  return (
    <>
      <section>
        <SectionTitle>1. מבוא</SectionTitle>
        <p className="mt-3">
          TotalLook.ai (להלן: "האתר", "השירות" או "הפלטפורמה") מופעל על ידי TotalLook AI (להלן: "החברה", "אנחנו"). אנו מחויבים להגנה על פרטיות המשתמשים שלנו ולעמידה בכל דיני הגנת הפרטיות החלים, לרבות חוק הגנת הפרטיות, התשמ"א-1981 (ישראל), תקנות הגנת הפרטיות (אבטחת מידע), התשע"ז-2017, ה-General Data Protection Regulation (GDPR) של האיחוד האירופי, ו-California Consumer Privacy Act (CCPA).
        </p>
        <p className="mt-2">
          מדיניות פרטיות זו מתארת אילו נתונים אנו אוספים, כיצד אנו משתמשים בהם, כיצד אנו מגנים עליהם, ומהן הזכויות שלך ביחס למידע האישי שלך. השימוש בשירות מהווה הסכמה מדעת למדיניות זו.
        </p>
      </section>

      <section>
        <SectionTitle>2. עקרונות יסוד</SectionTitle>
        <p className="mt-3">
          אנו פועלים לפי העקרונות הבאים:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li><strong>מינימום מידע:</strong> אנו אוספים רק את המידע ההכרחי לתפקוד השירות</li>
          <li><strong>שקיפות:</strong> אנו מסבירים בבירור מה נאסף ולמה</li>
          <li><strong>שליטה:</strong> למשתמש שליטה מלאה על המידע שלו — כולל צפייה, עדכון, ייצוא ומחיקה</li>
          <li><strong>אבטחה:</strong> אנו מיישמים אמצעי אבטחה מתקדמים להגנה על המידע</li>
          <li><strong>ללא מכירה:</strong> איננו מוכרים, משכירים או סוחרים במידע אישי — לעולם</li>
        </ul>
      </section>

      <section>
        <SectionTitle>3. מידע שאנו אוספים</SectionTitle>

        <SubSectionTitle>3.1 מידע שהמשתמש מספק באופן ישיר</SubSectionTitle>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li><strong>פרטי הרשמה:</strong> שם, כתובת דוא"ל ותמונת פרופיל (באמצעות מערכת ההתחברות OAuth)</li>
          <li><strong>פרופיל סגנון:</strong> מגדר, טווח גיל, עיסוק, רמת תקציב, העדפות סגנון, מותגים ומשפיענים מועדפים, חנויות מועדפות</li>
          <li><strong>מספר טלפון:</strong> מספר WhatsApp (אופציונלי) לצורך קבלת ניתוחים ועדכונים</li>
          <li><strong>תמונות:</strong> תמונות לוקים שהמשתמש מעלה לניתוח AI</li>
          <li><strong>תוכן קהילתי:</strong> פוסטים, תגובות ולייקים בפיד הקהילתי</li>
        </ul>

        <SubSectionTitle>3.2 מידע שנאסף אוטומטית</SubSectionTitle>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li><strong>נתוני שימוש:</strong> כתובת IP, סוג דפדפן, מערכת הפעלה, זמני גישה, דפים שנצפו</li>
          <li><strong>עוגיות:</strong> עוגיות הפעלה (Session) ועוגיות העדפות (שפה)</li>
          <li><strong>מדינה:</strong> זיהוי מדינה אוטומטי על בסיס כתובת IP לצורך התאמת תוכן</li>
          <li><strong>טביעת אצבע דפדפן:</strong> Hash מוצפן לצורך מניעת שימוש לרעה (הגבלת ניתוחים לאורחים)</li>
        </ul>

        <SubSectionTitle>3.3 מידע שנוצר על ידי AI</SubSectionTitle>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li><strong>תוצאות ניתוח:</strong> ציונים, המלצות, זיהוי פריטים, הצעות שיפור</li>
          <li><strong>ארון וירטואלי:</strong> פריטי לבוש שזוהו אוטומטית מתמונות</li>
          <li><strong>תמונות AI:</strong> תמונות מוצרים שנוצרו על ידי AI להמחשה</li>
          <li><strong>פרופיל טעם:</strong> ניתוח העדפות סגנון על בסיס היסטוריית הניתוחים</li>
        </ul>
      </section>

      <section>
        <SectionTitle>4. מטרות עיבוד המידע</SectionTitle>
        <p className="mt-3">
          אנו משתמשים במידע שנאסף אך ורק למטרות הבאות:
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm border border-border">
            <thead>
              <tr className="bg-muted/30">
                <th className="border border-border p-2 text-right font-semibold">מטרה</th>
                <th className="border border-border p-2 text-right font-semibold">בסיס משפטי</th>
                <th className="border border-border p-2 text-right font-semibold">סוג מידע</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border p-2">ביצוע ניתוח אופנתי AI</td>
                <td className="border border-border p-2">ביצוע חוזה</td>
                <td className="border border-border p-2">תמונות, פרופיל סגנון</td>
              </tr>
              <tr>
                <td className="border border-border p-2">התאמה אישית של המלצות</td>
                <td className="border border-border p-2">ביצוע חוזה</td>
                <td className="border border-border p-2">פרופיל סגנון, היסטוריה</td>
              </tr>
              <tr>
                <td className="border border-border p-2">ניהול חשבון משתמש</td>
                <td className="border border-border p-2">ביצוע חוזה</td>
                <td className="border border-border p-2">פרטי הרשמה</td>
              </tr>
              <tr>
                <td className="border border-border p-2">שליחת עדכונים ב-WhatsApp</td>
                <td className="border border-border p-2">הסכמה</td>
                <td className="border border-border p-2">מספר טלפון</td>
              </tr>
              <tr>
                <td className="border border-border p-2">הפעלת פיד קהילתי</td>
                <td className="border border-border p-2">ביצוע חוזה</td>
                <td className="border border-border p-2">תוכן קהילתי</td>
              </tr>
              <tr>
                <td className="border border-border p-2">שיפור השירות ותיקון באגים</td>
                <td className="border border-border p-2">אינטרס לגיטימי</td>
                <td className="border border-border p-2">נתוני שימוש</td>
              </tr>
              <tr>
                <td className="border border-border p-2">מניעת שימוש לרעה</td>
                <td className="border border-border p-2">אינטרס לגיטימי</td>
                <td className="border border-border p-2">טביעת אצבע, IP</td>
              </tr>
              <tr>
                <td className="border border-border p-2">עמידה בדרישות חוק</td>
                <td className="border border-border p-2">חובה חוקית</td>
                <td className="border border-border p-2">כל המידע הנדרש</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionTitle>5. עיבוד תמונות ונתוני AI</SectionTitle>
        <p className="mt-3">
          <strong>חשוב:</strong> תמונות שמועלות לשירות מעובדות על ידי מודלים של בינה מלאכותית לצורך ניתוח אופנתי בלבד. אנו מתחייבים:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li>תמונות <strong>אינן</strong> משמשות לאימון מודלים של AI</li>
          <li>תמונות <strong>אינן</strong> משותפות עם צדדים שלישיים למטרות שיווקיות</li>
          <li>תמונות מאוחסנות בשירותי ענן מאובטחים (AWS S3) עם הצפנה</li>
          <li>ניתוח AI מתבצע בזמן אמת ותוצאות נשמרות בפורמט טקסטואלי</li>
          <li>המשתמש יכול למחוק כל תמונה וניתוח בכל עת</li>
          <li>לא מתבצע זיהוי פנים (Facial Recognition) — הניתוח מתמקד בלבוש בלבד</li>
        </ul>
      </section>

      <section>
        <SectionTitle>6. אינטגרציית אינסטגרם</SectionTitle>
        <p className="mt-3">
          השירות מאפשר חיבור חשבון אינסטגרם לצורך ניתוח אוטומטי של לוקים מסטוריז. כאשר המשתמש מתייג את @totallook.ai בסטורי:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li><strong>תמונות סטורי:</strong> נשמרות ומנותחות על ידי AI לצורך מתן ציון והמלצות</li>
          <li><strong>מזהה אינסטגרם:</strong> נשמר לצורך זיהוי המשתמש ושליחת תוצאות ב-DM</li>
          <li><strong>פריטים מזוהים:</strong> מתווספים אוטומטית לארון הווירטואלי</li>
          <li><strong>ניתוק:</strong> המשתמש יכול לנתק את חשבון האינסטגרם בכל עת דרך דף יומן הסגנון</li>
        </ul>
        <p className="mt-2">
          אנו ניגשים <strong>רק</strong> לסטוריז שבהם המשתמש תייג אותנו במפורש. איננו ניגשים לפוסטים, עוקבים, הודעות פרטיות, או כל מידע אחר מחשבון האינסטגרם.
        </p>
      </section>

      <section>
        <SectionTitle>7. אינטגרציית WhatsApp</SectionTitle>
        <p className="mt-3">
          המשתמש יכול לספק מספר WhatsApp לצורך:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li>שליחת תמונות לניתוח ישירות דרך WhatsApp</li>
          <li>קבלת תוצאות ניתוח והמלצות</li>
          <li>הודעות מעקב מותאמות אישית</li>
        </ul>
        <p className="mt-2">
          מספר הטלפון מאוחסן בפורמט מוצפן. ניתן להסיר את המספר בכל עת דרך דף הפרופיל. הודעות WhatsApp נשלחות דרך WhatsApp Business API של Meta בהתאם למדיניות הפרטיות של Meta.
        </p>
      </section>

      <section>
        <SectionTitle>8. שיתוף מידע עם צדדים שלישיים</SectionTitle>
        <p className="mt-3">
          <strong>איננו מוכרים, משכירים או סוחרים במידע האישי של המשתמשים.</strong> אנו עשויים לשתף מידע רק במקרים הבאים:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li><strong>ספקי שירות:</strong> צדדים שלישיים המסייעים בהפעלת השירות (אחסון ענן AWS, עיבוד AI, Meta WhatsApp Business API). ספקים אלה מחויבים בהסכמי עיבוד נתונים (DPA) ואינם רשאים להשתמש במידע למטרות אחרות</li>
          <li><strong>דרישות חוקיות:</strong> כאשר נדרש על פי חוק, צו בית משפט, או הליך משפטי</li>
          <li><strong>הגנה על זכויות:</strong> כאשר נדרש להגן על זכויותינו, בטיחות המשתמשים או הציבור</li>
          <li><strong>העברת עסק:</strong> במקרה של מיזוג, רכישה או מכירת נכסים — עם הודעה מוקדמת למשתמשים</li>
        </ul>

        <SubSectionTitle>8.1 ספקי שירות נוכחיים</SubSectionTitle>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm border border-border">
            <thead>
              <tr className="bg-muted/30">
                <th className="border border-border p-2 text-right font-semibold">ספק</th>
                <th className="border border-border p-2 text-right font-semibold">מטרה</th>
                <th className="border border-border p-2 text-right font-semibold">מיקום</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border p-2">Amazon Web Services (AWS)</td>
                <td className="border border-border p-2">אחסון תמונות וקבצים</td>
                <td className="border border-border p-2">ארה"ב / אירופה</td>
              </tr>
              <tr>
                <td className="border border-border p-2">Manus AI</td>
                <td className="border border-border p-2">תשתית אפליקציה, אימות, AI</td>
                <td className="border border-border p-2">ארה"ב</td>
              </tr>
              <tr>
                <td className="border border-border p-2">Meta (WhatsApp Business)</td>
                <td className="border border-border p-2">שליחת הודעות WhatsApp</td>
                <td className="border border-border p-2">ארה"ב / אירופה</td>
              </tr>
              <tr>
                <td className="border border-border p-2">Meta (Instagram Graph API)</td>
                <td className="border border-border p-2">אינטגרציית סטוריז</td>
                <td className="border border-border p-2">ארה"ב / אירופה</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionTitle>9. אחסון ואבטחת מידע</SectionTitle>
        <p className="mt-3">
          אנו מיישמים אמצעי אבטחה מתקדמים להגנה על המידע:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li><strong>הצפנה בתנועה:</strong> כל התקשורת מוצפנת באמצעות TLS 1.3</li>
          <li><strong>הצפנה במנוחה:</strong> תמונות וקבצים מוצפנים ב-AWS S3 (AES-256)</li>
          <li><strong>אימות מאובטח:</strong> מערכת OAuth 2.0 עם JWT חתום</li>
          <li><strong>הגבלת גישה:</strong> גישה למידע מוגבלת לצוות מורשה בלבד</li>
          <li><strong>ניטור:</strong> מערכות ניטור פעילות לזיהוי גישה לא מורשית</li>
          <li><strong>גיבוי:</strong> גיבויים מוצפנים לשחזור מאסון</li>
        </ul>
        <p className="mt-2">
          עם זאת, אין שיטת אבטחה מושלמת. במקרה של פרצת אבטחה, נודיע למשתמשים המושפעים ולרשויות הרלוונטיות בהתאם לדרישות החוק (תוך 72 שעות בהתאם ל-GDPR).
        </p>
      </section>

      <section>
        <SectionTitle>10. שמירת מידע ומחיקה</SectionTitle>
        <p className="mt-3">
          אנו שומרים מידע אישי רק כל עוד הוא נדרש למטרות שלשמן נאסף:
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm border border-border">
            <thead>
              <tr className="bg-muted/30">
                <th className="border border-border p-2 text-right font-semibold">סוג מידע</th>
                <th className="border border-border p-2 text-right font-semibold">תקופת שמירה</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border p-2">פרטי חשבון</td>
                <td className="border border-border p-2">עד מחיקת החשבון</td>
              </tr>
              <tr>
                <td className="border border-border p-2">תמונות וניתוחים</td>
                <td className="border border-border p-2">עד מחיקת החשבון או מחיקה ידנית</td>
              </tr>
              <tr>
                <td className="border border-border p-2">ארון וירטואלי</td>
                <td className="border border-border p-2">עד מחיקת החשבון</td>
              </tr>
              <tr>
                <td className="border border-border p-2">נתוני אורחים</td>
                <td className="border border-border p-2">90 יום מהפעילות האחרונה</td>
              </tr>
              <tr>
                <td className="border border-border p-2">לוגים טכניים</td>
                <td className="border border-border p-2">30 יום</td>
              </tr>
              <tr>
                <td className="border border-border p-2">גיבויים</td>
                <td className="border border-border p-2">30 יום לאחר מחיקת המקור</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3">
          בעת מחיקת חשבון, כל המידע האישי נמחק לצמיתות, כולל: פרופיל, תמונות, ניתוחים, ארון וירטואלי, פוסטים, תגובות, לייקים, חיבורי אינסטגרם, ויומן סגנון.
        </p>
      </section>

      <section>
        <SectionTitle>11. עוגיות (Cookies)</SectionTitle>
        <p className="mt-3">
          האתר משתמש בעוגיות מינימליות:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li><strong>עוגיות הכרחיות:</strong> עוגיית הפעלה (Session) לניהול התחברות — הכרחית לתפקוד האתר</li>
          <li><strong>עוגיות העדפות:</strong> שמירת שפה מועדפת (עברית/אנגלית)</li>
        </ul>
        <p className="mt-2">
          <strong>איננו משתמשים</strong> בעוגיות מעקב, עוגיות פרסום, או עוגיות צד שלישי למטרות שיווקיות. ניתן לנהל עוגיות דרך הגדרות הדפדפן, אך חסימת עוגיות הכרחיות עלולה לפגוע בתפקוד האתר.
        </p>
      </section>

      <section>
        <SectionTitle>12. זכויות המשתמש</SectionTitle>
        <p className="mt-3">
          בהתאם לחוקי הגנת הפרטיות החלים (GDPR, CCPA, חוק הגנת הפרטיות הישראלי), למשתמש עומדות הזכויות הבאות:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li><strong>זכות גישה:</strong> לבקש עותק של כל המידע האישי שנאסף עליך</li>
          <li><strong>זכות תיקון:</strong> לעדכן או לתקן מידע אישי שגוי (דרך דף הפרופיל)</li>
          <li><strong>זכות מחיקה ("הזכות להישכח"):</strong> לבקש מחיקת החשבון וכל המידע הנלווה</li>
          <li><strong>זכות ניידות:</strong> לקבל את המידע שלך בפורמט מובנה וקריא (JSON)</li>
          <li><strong>זכות הגבלת עיבוד:</strong> לבקש הגבלת עיבוד המידע שלך</li>
          <li><strong>זכות התנגדות:</strong> להתנגד לעיבוד מידע המבוסס על אינטרס לגיטימי</li>
          <li><strong>זכות ביטול הסכמה:</strong> לבטל הסכמה שניתנה בכל עת (למשל, הסרת מספר WhatsApp)</li>
        </ul>

        <SubSectionTitle>12.1 כיצד לממש את הזכויות</SubSectionTitle>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li><strong>מחיקת חשבון:</strong> דרך דף הפרופיל → "מחיקת חשבון" (מיידית)</li>
          <li><strong>ייצוא מידע:</strong> דרך דף הפרופיל → "ייצוא נתונים" (JSON)</li>
          <li><strong>בקשות נוספות:</strong> פנייה בדוא"ל ל-<a href="mailto:privacy@totallook.ai" className="text-primary hover:underline">privacy@totallook.ai</a> — נענה תוך 30 יום</li>
        </ul>
      </section>

      <section>
        <SectionTitle>13. זכויות נוספות לתושבי קליפורניה (CCPA)</SectionTitle>
        <p className="mt-3">
          בנוסף לזכויות המפורטות לעיל, תושבי קליפורניה זכאים ל:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li><strong>הזכות לדעת:</strong> אילו קטגוריות של מידע אישי נאספו ב-12 החודשים האחרונים</li>
          <li><strong>הזכות למחיקה:</strong> מחיקת מידע אישי שנאסף</li>
          <li><strong>הזכות לאי-אפליה:</strong> לא נפלה לרעה כנגד משתמשים שמממשים את זכויותיהם</li>
          <li><strong>אי-מכירת מידע:</strong> איננו מוכרים מידע אישי. "Do Not Sell My Personal Information" — אנו עומדים בדרישה זו כברירת מחדל</li>
        </ul>
      </section>

      <section>
        <SectionTitle>14. העברת מידע בינלאומית</SectionTitle>
        <p className="mt-3">
          המידע שלך עשוי להיות מעובד ומאוחסן בשרתים מחוץ למדינת מגוריך, כולל ארצות הברית. אנו מבטיחים שכל העברה בינלאומית של מידע מתבצעת בהתאם למנגנוני הגנה מתאימים, לרבות Standard Contractual Clauses (SCCs) בהתאם ל-GDPR.
        </p>
      </section>

      <section>
        <SectionTitle>15. פרטיות קטינים</SectionTitle>
        <p className="mt-3">
          השירות <strong>אינו מיועד</strong> לילדים מתחת לגיל 16 (או 13 באזורים בהם החוק מאפשר). איננו אוספים ביודעין מידע אישי מקטינים. אם נודע לנו שנאסף מידע ממשתמש מתחת לגיל המינימום, נמחק אותו מיידית ונחסום את החשבון.
        </p>
      </section>

      <section>
        <SectionTitle>16. שינויים במדיניות הפרטיות</SectionTitle>
        <p className="mt-3">
          אנו שומרים את הזכות לעדכן מדיניות זו מעת לעת. שינויים מהותיים יפורסמו באתר עם תאריך העדכון, ובמקרים מסוימים נשלח הודעה ישירה למשתמשים. המשך השימוש בשירות לאחר פרסום השינויים מהווה הסכמה למדיניות המעודכנת. גרסאות קודמות של מדיניות זו זמינות לעיון על פי בקשה.
        </p>
      </section>

      <section>
        <SectionTitle>17. יצירת קשר</SectionTitle>
        <p className="mt-3">
          לשאלות, בקשות או תלונות בנושא פרטיות:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li><strong>דוא"ל פרטיות:</strong> <a href="mailto:privacy@totallook.ai" className="text-primary hover:underline">privacy@totallook.ai</a></li>
          <li><strong>דוא"ל כללי:</strong> <a href="mailto:eranmalovani@gmail.com" className="text-primary hover:underline">eranmalovani@gmail.com</a></li>
        </ul>
        <p className="mt-2">
          אם אינך שבע רצון מהטיפול בפנייתך, יש לך זכות להגיש תלונה לרשות להגנת הפרטיות בישראל, או לרשות הפיקוח הרלוונטית במדינת מגוריך.
        </p>
      </section>
    </>
  );
}

function EnglishPrivacy() {
  return (
    <>
      <section>
        <SectionTitle>1. Introduction</SectionTitle>
        <p className="mt-3">
          TotalLook.ai (hereinafter: "the Website", "the Service" or "the Platform") is operated by TotalLook AI (hereinafter: "the Company", "we", "us"). We are committed to protecting our users' privacy and complying with all applicable data protection laws, including the Israeli Privacy Protection Law, 5741-1981, the Privacy Protection Regulations (Data Security), 5777-2017, the EU General Data Protection Regulation (GDPR), and the California Consumer Privacy Act (CCPA).
        </p>
        <p className="mt-2">
          This Privacy Policy describes what data we collect, how we use it, how we protect it, and what rights you have regarding your personal information. By using the Service, you provide informed consent to this policy.
        </p>
      </section>

      <section>
        <SectionTitle>2. Core Principles</SectionTitle>
        <p className="mt-3">
          We operate according to the following principles:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li><strong>Data Minimization:</strong> We collect only the data necessary for the Service to function</li>
          <li><strong>Transparency:</strong> We clearly explain what is collected and why</li>
          <li><strong>Control:</strong> Users have full control over their data — including viewing, updating, exporting, and deleting</li>
          <li><strong>Security:</strong> We implement advanced security measures to protect data</li>
          <li><strong>No Sale:</strong> We never sell, rent, or trade personal information — ever</li>
        </ul>
      </section>

      <section>
        <SectionTitle>3. Information We Collect</SectionTitle>

        <SubSectionTitle>3.1 Information You Provide Directly</SubSectionTitle>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li><strong>Registration details:</strong> Name, email address, and profile picture (via OAuth authentication)</li>
          <li><strong>Style profile:</strong> Gender, age range, occupation, budget level, style preferences, favorite brands and influencers, preferred stores</li>
          <li><strong>Phone number:</strong> WhatsApp number (optional) for receiving analyses and updates</li>
          <li><strong>Photos:</strong> Outfit photos uploaded for AI analysis</li>
          <li><strong>Community content:</strong> Posts, comments, and likes in the community feed</li>
        </ul>

        <SubSectionTitle>3.2 Information Collected Automatically</SubSectionTitle>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li><strong>Usage data:</strong> IP address, browser type, operating system, access times, pages viewed</li>
          <li><strong>Cookies:</strong> Session cookies and preference cookies (language)</li>
          <li><strong>Country:</strong> Automatic country detection based on IP address for content localization</li>
          <li><strong>Browser fingerprint:</strong> Encrypted hash for abuse prevention (guest analysis limits)</li>
        </ul>

        <SubSectionTitle>3.3 AI-Generated Information</SubSectionTitle>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li><strong>Analysis results:</strong> Scores, recommendations, item identification, improvement suggestions</li>
          <li><strong>Virtual wardrobe:</strong> Clothing items automatically detected from photos</li>
          <li><strong>AI images:</strong> Product images generated by AI for illustration</li>
          <li><strong>Taste profile:</strong> Style preference analysis based on analysis history</li>
        </ul>
      </section>

      <section>
        <SectionTitle>4. Purposes of Data Processing</SectionTitle>
        <p className="mt-3">
          We use collected information solely for the following purposes:
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm border border-border">
            <thead>
              <tr className="bg-muted/30">
                <th className="border border-border p-2 text-left font-semibold">Purpose</th>
                <th className="border border-border p-2 text-left font-semibold">Legal Basis</th>
                <th className="border border-border p-2 text-left font-semibold">Data Type</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border p-2">AI fashion analysis</td>
                <td className="border border-border p-2">Contract performance</td>
                <td className="border border-border p-2">Photos, style profile</td>
              </tr>
              <tr>
                <td className="border border-border p-2">Personalized recommendations</td>
                <td className="border border-border p-2">Contract performance</td>
                <td className="border border-border p-2">Style profile, history</td>
              </tr>
              <tr>
                <td className="border border-border p-2">Account management</td>
                <td className="border border-border p-2">Contract performance</td>
                <td className="border border-border p-2">Registration details</td>
              </tr>
              <tr>
                <td className="border border-border p-2">WhatsApp notifications</td>
                <td className="border border-border p-2">Consent</td>
                <td className="border border-border p-2">Phone number</td>
              </tr>
              <tr>
                <td className="border border-border p-2">Community feed</td>
                <td className="border border-border p-2">Contract performance</td>
                <td className="border border-border p-2">Community content</td>
              </tr>
              <tr>
                <td className="border border-border p-2">Service improvement</td>
                <td className="border border-border p-2">Legitimate interest</td>
                <td className="border border-border p-2">Usage data</td>
              </tr>
              <tr>
                <td className="border border-border p-2">Abuse prevention</td>
                <td className="border border-border p-2">Legitimate interest</td>
                <td className="border border-border p-2">Fingerprint, IP</td>
              </tr>
              <tr>
                <td className="border border-border p-2">Legal compliance</td>
                <td className="border border-border p-2">Legal obligation</td>
                <td className="border border-border p-2">All required data</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionTitle>5. Photo Processing and AI Data</SectionTitle>
        <p className="mt-3">
          <strong>Important:</strong> Photos uploaded to the Service are processed by AI models for fashion analysis purposes only. We commit to the following:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li>Photos are <strong>not</strong> used to train AI models</li>
          <li>Photos are <strong>not</strong> shared with third parties for marketing purposes</li>
          <li>Photos are stored on encrypted cloud services (AWS S3) with AES-256 encryption</li>
          <li>AI analysis is performed in real-time and results are saved in text format</li>
          <li>Users can delete any photo and analysis at any time</li>
          <li>No facial recognition is performed — analysis focuses solely on clothing</li>
        </ul>
      </section>

      <section>
        <SectionTitle>6. Instagram Integration</SectionTitle>
        <p className="mt-3">
          The Service allows connecting an Instagram account for automatic outfit analysis from Stories. When a user tags @totallook.ai in a Story:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li><strong>Story images:</strong> Are saved and analyzed by AI to provide scores and recommendations</li>
          <li><strong>Instagram ID:</strong> Is stored for user identification and sending results via DM</li>
          <li><strong>Detected items:</strong> Are automatically added to the virtual wardrobe</li>
          <li><strong>Disconnection:</strong> Users can disconnect their Instagram account at any time via the Style Diary page</li>
        </ul>
        <p className="mt-2">
          We <strong>only</strong> access Stories in which the user has explicitly tagged us. We do not access posts, followers, private messages, or any other information from the Instagram account.
        </p>
      </section>

      <section>
        <SectionTitle>7. WhatsApp Integration</SectionTitle>
        <p className="mt-3">
          Users may provide their WhatsApp number for:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li>Sending photos for analysis directly via WhatsApp</li>
          <li>Receiving analysis results and recommendations</li>
          <li>Personalized follow-up messages</li>
        </ul>
        <p className="mt-2">
          Phone numbers are stored in encrypted format. Users can remove their number at any time via the Profile page. WhatsApp messages are sent through Meta's WhatsApp Business API in accordance with Meta's Privacy Policy.
        </p>
      </section>

      <section>
        <SectionTitle>8. Sharing Information with Third Parties</SectionTitle>
        <p className="mt-3">
          <strong>We do not sell, rent, or trade users' personal information.</strong> We may share information only in the following cases:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li><strong>Service providers:</strong> Third parties that assist in operating the Service (AWS cloud storage, AI processing, Meta WhatsApp Business API). These providers are bound by Data Processing Agreements (DPAs) and may not use the data for other purposes</li>
          <li><strong>Legal requirements:</strong> When required by law, court order, or legal proceedings</li>
          <li><strong>Rights protection:</strong> When necessary to protect our rights, user safety, or public safety</li>
          <li><strong>Business transfer:</strong> In the event of a merger, acquisition, or asset sale — with prior notice to users</li>
        </ul>

        <SubSectionTitle>8.1 Current Service Providers</SubSectionTitle>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm border border-border">
            <thead>
              <tr className="bg-muted/30">
                <th className="border border-border p-2 text-left font-semibold">Provider</th>
                <th className="border border-border p-2 text-left font-semibold">Purpose</th>
                <th className="border border-border p-2 text-left font-semibold">Location</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border p-2">Amazon Web Services (AWS)</td>
                <td className="border border-border p-2">Image and file storage</td>
                <td className="border border-border p-2">US / Europe</td>
              </tr>
              <tr>
                <td className="border border-border p-2">Manus AI</td>
                <td className="border border-border p-2">Application infrastructure, auth, AI</td>
                <td className="border border-border p-2">US</td>
              </tr>
              <tr>
                <td className="border border-border p-2">Meta (WhatsApp Business)</td>
                <td className="border border-border p-2">WhatsApp messaging</td>
                <td className="border border-border p-2">US / Europe</td>
              </tr>
              <tr>
                <td className="border border-border p-2">Meta (Instagram Graph API)</td>
                <td className="border border-border p-2">Stories integration</td>
                <td className="border border-border p-2">US / Europe</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionTitle>9. Data Storage and Security</SectionTitle>
        <p className="mt-3">
          We implement advanced security measures to protect data:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li><strong>Encryption in transit:</strong> All communication encrypted via TLS 1.3</li>
          <li><strong>Encryption at rest:</strong> Images and files encrypted on AWS S3 (AES-256)</li>
          <li><strong>Secure authentication:</strong> OAuth 2.0 with signed JWT tokens</li>
          <li><strong>Access control:</strong> Data access restricted to authorized personnel only</li>
          <li><strong>Monitoring:</strong> Active monitoring systems for detecting unauthorized access</li>
          <li><strong>Backups:</strong> Encrypted backups for disaster recovery</li>
        </ul>
        <p className="mt-2">
          However, no security method is perfect. In the event of a data breach, we will notify affected users and relevant authorities as required by law (within 72 hours per GDPR).
        </p>
      </section>

      <section>
        <SectionTitle>10. Data Retention and Deletion</SectionTitle>
        <p className="mt-3">
          We retain personal data only as long as necessary for the purposes for which it was collected:
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm border border-border">
            <thead>
              <tr className="bg-muted/30">
                <th className="border border-border p-2 text-left font-semibold">Data Type</th>
                <th className="border border-border p-2 text-left font-semibold">Retention Period</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border p-2">Account details</td>
                <td className="border border-border p-2">Until account deletion</td>
              </tr>
              <tr>
                <td className="border border-border p-2">Photos and analyses</td>
                <td className="border border-border p-2">Until account deletion or manual deletion</td>
              </tr>
              <tr>
                <td className="border border-border p-2">Virtual wardrobe</td>
                <td className="border border-border p-2">Until account deletion</td>
              </tr>
              <tr>
                <td className="border border-border p-2">Guest data</td>
                <td className="border border-border p-2">90 days from last activity</td>
              </tr>
              <tr>
                <td className="border border-border p-2">Technical logs</td>
                <td className="border border-border p-2">30 days</td>
              </tr>
              <tr>
                <td className="border border-border p-2">Backups</td>
                <td className="border border-border p-2">30 days after source deletion</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3">
          Upon account deletion, all personal data is permanently deleted, including: profile, photos, analyses, virtual wardrobe, posts, comments, likes, Instagram connections, and style diary.
        </p>
      </section>

      <section>
        <SectionTitle>11. Cookies</SectionTitle>
        <p className="mt-3">
          The Website uses minimal cookies:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li><strong>Essential cookies:</strong> Session cookie for login management — required for the Website to function</li>
          <li><strong>Preference cookies:</strong> Language preference storage (Hebrew/English)</li>
        </ul>
        <p className="mt-2">
          <strong>We do not use</strong> tracking cookies, advertising cookies, or third-party cookies for marketing purposes. You can manage cookies through your browser settings, but blocking essential cookies may impair Website functionality.
        </p>
      </section>

      <section>
        <SectionTitle>12. User Rights</SectionTitle>
        <p className="mt-3">
          Under applicable data protection laws (GDPR, CCPA, Israeli Privacy Protection Law), you have the following rights:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li><strong>Right of access:</strong> Request a copy of all personal data collected about you</li>
          <li><strong>Right to rectification:</strong> Update or correct inaccurate personal data (via Profile page)</li>
          <li><strong>Right to erasure ("Right to be forgotten"):</strong> Request deletion of your account and all associated data</li>
          <li><strong>Right to data portability:</strong> Receive your data in a structured, readable format (JSON)</li>
          <li><strong>Right to restrict processing:</strong> Request restriction of your data processing</li>
          <li><strong>Right to object:</strong> Object to processing based on legitimate interest</li>
          <li><strong>Right to withdraw consent:</strong> Withdraw consent at any time (e.g., removing WhatsApp number)</li>
        </ul>

        <SubSectionTitle>12.1 How to Exercise Your Rights</SubSectionTitle>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li><strong>Account deletion:</strong> Via Profile page → "Delete Account" (immediate)</li>
          <li><strong>Data export:</strong> Via Profile page → "Export Data" (JSON format)</li>
          <li><strong>Additional requests:</strong> Email <a href="mailto:privacy@totallook.ai" className="text-primary hover:underline">privacy@totallook.ai</a> — we will respond within 30 days</li>
        </ul>
      </section>

      <section>
        <SectionTitle>13. Additional Rights for California Residents (CCPA)</SectionTitle>
        <p className="mt-3">
          In addition to the rights listed above, California residents are entitled to:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li><strong>Right to know:</strong> What categories of personal information were collected in the past 12 months</li>
          <li><strong>Right to delete:</strong> Deletion of collected personal information</li>
          <li><strong>Right to non-discrimination:</strong> We will not discriminate against users who exercise their rights</li>
          <li><strong>No sale of information:</strong> We do not sell personal information. "Do Not Sell My Personal Information" — we comply with this requirement by default</li>
        </ul>
      </section>

      <section>
        <SectionTitle>14. International Data Transfers</SectionTitle>
        <p className="mt-3">
          Your data may be processed and stored on servers outside your country of residence, including the United States. We ensure that all international data transfers are conducted in accordance with appropriate safeguards, including Standard Contractual Clauses (SCCs) as required by GDPR.
        </p>
      </section>

      <section>
        <SectionTitle>15. Children's Privacy</SectionTitle>
        <p className="mt-3">
          The Service is <strong>not intended</strong> for children under the age of 16 (or 13 in jurisdictions where the law permits). We do not knowingly collect personal information from minors. If we become aware that data has been collected from a user under the minimum age, we will immediately delete it and block the account.
        </p>
      </section>

      <section>
        <SectionTitle>16. Changes to Privacy Policy</SectionTitle>
        <p className="mt-3">
          We reserve the right to update this policy from time to time. Material changes will be published on the Website with the update date, and in some cases we will send direct notification to users. Continued use of the Service after publication of changes constitutes agreement to the updated policy. Previous versions of this policy are available upon request.
        </p>
      </section>

      <section>
        <SectionTitle>17. Contact</SectionTitle>
        <p className="mt-3">
          For questions, requests, or complaints regarding privacy:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-2 text-foreground/80">
          <li><strong>Privacy email:</strong> <a href="mailto:privacy@totallook.ai" className="text-primary hover:underline">privacy@totallook.ai</a></li>
          <li><strong>General email:</strong> <a href="mailto:eranmalovani@gmail.com" className="text-primary hover:underline">eranmalovani@gmail.com</a></li>
        </ul>
        <p className="mt-2">
          If you are not satisfied with our handling of your inquiry, you have the right to file a complaint with the Israeli Privacy Protection Authority, or the relevant supervisory authority in your country of residence.
        </p>
      </section>
    </>
  );
}
