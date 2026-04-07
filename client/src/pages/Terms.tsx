import Navbar from "@/components/Navbar";
import { useLanguage } from "@/i18n";
import { Link } from "wouter";
import { FileText, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Terms() {
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
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {lang === "he" ? "תנאי שימוש" : "Terms of Service"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {lang === "he" ? `עדכון אחרון: ${lastUpdated}` : `Last updated: ${lastUpdated}`}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8 text-foreground/90 leading-relaxed">
          {lang === "he" ? <HebrewTerms /> : <EnglishTerms />}
        </div>

        {/* Footer links */}
        <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground transition-colors underline underline-offset-4">
            {lang === "he" ? "מדיניות פרטיות" : "Privacy Policy"}
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

function HebrewTerms() {
  return (
    <>
      <section>
        <SectionTitle>1. כללי</SectionTitle>
        <p className="mt-3">
          ברוכים הבאים ל-TotalLook.ai (להלן: "האתר" או "השירות"). השירות מופעל ומנוהל על ידי TotalLook AI (להלן: "החברה", "אנחנו"). השימוש באתר ובשירותים המוצעים בו כפוף לתנאי שימוש אלה. עצם השימוש באתר מהווה הסכמה לתנאים אלה במלואם. אם אינך מסכים לתנאים — אנא הימנע משימוש באתר.
        </p>
        <p className="mt-2">
          תנאי שימוש אלה מהווים הסכם מחייב בינך לבין החברה. יש לקרוא אותם בעיון יחד עם <Link href="/privacy" className="text-primary hover:underline">מדיניות הפרטיות</Link> שלנו, המהווה חלק בלתי נפרד מתנאים אלה.
        </p>
      </section>

      <section>
        <SectionTitle>2. תיאור השירות</SectionTitle>
        <p className="mt-3">
          TotalLook.ai הוא שירות מבוסס בינה מלאכותית לניתוח אופנתי. השירות מאפשר למשתמשים להעלות תמונות של לוקים (Outfits) ולקבל ניתוח מפורט הכולל:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-foreground/80">
          <li>ציון כולל והערכת סגנון</li>
          <li>המלצות לשיפור הלוק</li>
          <li>הצעות קנייה מותאמות אישית</li>
          <li>ארון וירטואלי עם זיהוי פריטים אוטומטי</li>
          <li>פיד קהילתי לשיתוף לוקים</li>
          <li>אינטגרציה עם WhatsApp ואינסטגרם</li>
          <li>יומן סגנון ומעקב התפתחות</li>
          <li>התאמה אישית למשפיענים וסגנונות</li>
        </ul>
      </section>

      <section>
        <SectionTitle>3. כשירות משתמש</SectionTitle>
        <p className="mt-3">
          השירות מיועד למשתמשים בני 16 ומעלה (או 13 ומעלה באזורים בהם החוק מאפשר). בהרשמה לשירות, המשתמש מצהיר ומאשר כי הוא עומד בדרישת הגיל המינימלי. אם נודע לנו שמשתמש מתחת לגיל המינימום, נמחק את חשבונו ואת כל המידע הנלווה.
        </p>
      </section>

      <section>
        <SectionTitle>4. הרשמה וחשבון משתמש</SectionTitle>
        <p className="mt-3">
          חלק מהשירותים זמינים ללא הרשמה (מצב אורח), אך עם מגבלות. לשימוש מלא יש להירשם באמצעות מערכת ההתחברות שלנו (OAuth). המשתמש אחראי:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-foreground/80">
          <li>לשמור על אבטחת חשבונו ופרטי ההתחברות</li>
          <li>לדווח מיידית על כל שימוש לא מורשה בחשבון</li>
          <li>לספק מידע מדויק ועדכני בפרופיל</li>
          <li>לא לשתף את חשבונו עם אחרים</li>
        </ul>
        <p className="mt-2">
          אנו שומרים את הזכות להשעות או למחוק חשבונות שמפרים את תנאי השימוש, ללא הודעה מוקדמת במקרים חמורים.
        </p>
      </section>

      <section>
        <SectionTitle>5. שימוש מותר ואסור</SectionTitle>
        <p className="mt-3">
          המשתמש מתחייב להשתמש בשירות למטרות חוקיות בלבד ובהתאם לתנאים אלה. בפרט, המשתמש מתחייב שלא:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-foreground/80">
          <li>להעלות תוכן פוגעני, מאיים, מטריד, גזעני, מיני, אלים או בלתי חוקי</li>
          <li>להעלות תמונות של אנשים אחרים ללא הסכמתם המפורשת</li>
          <li>להעלות תמונות של קטינים</li>
          <li>להעלות תוכן עירום או תוכן מיני</li>
          <li>לנסות לפרוץ, לשבש, לבצע הנדסה הפוכה או להעמיס על מערכות האתר</li>
          <li>להשתמש בשירות לצרכים מסחריים ללא אישור מראש בכתב</li>
          <li>להפיץ ספאם, תוכן שיווקי או פרסומות דרך הפיד הקהילתי</li>
          <li>ליצור חשבונות מרובים או חשבונות מזויפים</li>
          <li>לאסוף מידע על משתמשים אחרים ללא הסכמתם</li>
          <li>להשתמש בבוטים, סקריפטים או כלים אוטומטיים ללא אישור</li>
          <li>להתחזות לאדם אחר או לגורם אחר</li>
        </ul>
        <p className="mt-2">
          הפרת סעיפים אלה עלולה לגרום להשעיה מיידית של החשבון, מחיקת תוכן, ובמקרים חמורים — דיווח לרשויות החוק.
        </p>
      </section>

      <section>
        <SectionTitle>6. תוכן משתמש</SectionTitle>
        <SubSectionTitle>6.1 בעלות</SubSectionTitle>
        <p className="mt-2">
          התמונות והתוכן שהמשתמש מעלה נשארים בבעלותו המלאה. העלאת תוכן לאתר מהווה מתן רישיון לא-בלעדי, ללא תמלוגים, לצורך:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-foreground/80">
          <li>עיבוד וניתוח על ידי מערכת ה-AI</li>
          <li>הצגת תוצאות הניתוח למשתמש</li>
          <li>הצגת תוכן שהמשתמש בחר לפרסם בפיד הקהילתי</li>
        </ul>
        <p className="mt-2">
          רישיון זה מסתיים עם מחיקת התוכן או מחיקת החשבון.
        </p>

        <SubSectionTitle>6.2 תוכן קהילתי</SubSectionTitle>
        <p className="mt-2">
          פוסטים שהמשתמש מפרסם בפיד הקהילתי גלויים למשתמשים אחרים. המשתמש אחראי באופן בלעדי לתוכן שהוא מפרסם. אנו שומרים את הזכות להסיר תוכן שמפר את תנאי השימוש ללא הודעה מוקדמת.
        </p>

        <SubSectionTitle>6.3 מחיקת תוכן</SubSectionTitle>
        <p className="mt-2">
          המשתמש יכול למחוק כל תוכן שהעלה בכל עת. מחיקת חשבון מוחקת את כל התוכן הנלווה לצמיתות. לפרטים נוספים ראו <Link href="/privacy" className="text-primary hover:underline">מדיניות הפרטיות</Link>.
        </p>
      </section>

      <section>
        <SectionTitle>7. קניין רוחני</SectionTitle>
        <p className="mt-3">
          כל הזכויות באתר, לרבות עיצוב, קוד מקור, לוגו, סימני מסחר, טקסטים, אלגוריתמים, מודלי AI ותוכן שנוצר על ידי המערכת — שייכים לחברה או למעניקי הרישיון שלה. בפרט:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-foreground/80">
          <li>אין להעתיק, לשכפל, להפיץ או לעשות שימוש מסחרי בכל חלק מהאתר ללא אישור מפורש בכתב</li>
          <li>השם "TotalLook", הלוגו וסימני המסחר הנלווים הם רכוש החברה</li>
          <li>תוצאות ניתוח AI מיועדות לשימוש אישי בלבד</li>
          <li>אין להשתמש בתוצאות הניתוח למטרות מסחריות ללא אישור</li>
        </ul>
      </section>

      <section>
        <SectionTitle>8. תוכן שנוצר על ידי AI</SectionTitle>
        <p className="mt-3">
          הניתוחים, הציונים, ההמלצות, הצעות הקנייה והתוכן שנוצר באתר מבוססים על בינה מלאכותית. חשוב להבין:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-foreground/80">
          <li>התוצאות הן בגדר <strong>המלצה בלבד</strong> ואינן מהוות ייעוץ מקצועי</li>
          <li>ציוני הסגנון הם סובייקטיביים ומבוססים על מודלים סטטיסטיים</li>
          <li>הצעות קנייה כוללות קישורים לחנויות חיצוניות — אנו לא אחראים למוצרים, מחירים או זמינות</li>
          <li>תמונות AI שנוצרות להמחשה הן אילוסטרציות ועשויות לא לייצג במדויק את המוצר בפועל</li>
          <li>החברה אינה אחראית להחלטות קנייה או החלטות אחרות שנעשות על בסיס תוצאות הניתוח</li>
        </ul>
      </section>

      <section>
        <SectionTitle>9. אינטגרציות צד שלישי</SectionTitle>
        <SubSectionTitle>9.1 WhatsApp</SubSectionTitle>
        <p className="mt-2">
          השירות מאפשר אינטגרציה עם WhatsApp לשליחת תמונות וקבלת ניתוחים. שימוש בתכונה זו כפוף ל<a href="https://www.whatsapp.com/legal/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">תנאי השימוש של WhatsApp</a>. מספר הטלפון שמסופק ישמש אך ורק לצורך שירות זה.
        </p>

        <SubSectionTitle>9.2 אינסטגרם</SubSectionTitle>
        <p className="mt-2">
          חיבור חשבון אינסטגרם מאפשר ניתוח אוטומטי של סטוריז. אנו ניגשים רק לסטוריז שבהם המשתמש תייג אותנו. שימוש בתכונה זו כפוף ל<a href="https://help.instagram.com/581066165581870" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">תנאי השימוש של אינסטגרם</a>.
        </p>

        <SubSectionTitle>9.3 קישורים לחנויות חיצוניות</SubSectionTitle>
        <p className="mt-2">
          האתר עשוי לכלול קישורים לחנויות מקוונות ואתרים חיצוניים. קישורים אלה מסופקים לנוחות המשתמש בלבד. החברה אינה אחראית לתוכן, למוצרים, למחירים, לאיכות או לשירותים של אתרים חיצוניים. כל עסקה עם אתר חיצוני היא באחריות המשתמש בלבד.
        </p>
      </section>

      <section>
        <SectionTitle>10. פרטיות והגנת מידע</SectionTitle>
        <p className="mt-3">
          הגנת הפרטיות שלך חשובה לנו מאוד. איסוף, עיבוד ושמירת מידע אישי מתבצעים בהתאם ל<Link href="/privacy" className="text-primary hover:underline">מדיניות הפרטיות</Link> שלנו, המהווה חלק בלתי נפרד מתנאי שימוש אלה. בפרט:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-foreground/80">
          <li>איננו מוכרים מידע אישי לצדדים שלישיים — לעולם</li>
          <li>תמונות אינן משמשות לאימון מודלים של AI</li>
          <li>לא מתבצע זיהוי פנים — הניתוח מתמקד בלבוש בלבד</li>
          <li>למשתמש זכות מלאה לגישה, תיקון, ייצוא ומחיקה של המידע שלו</li>
          <li>אנו עומדים בדרישות GDPR, CCPA וחוק הגנת הפרטיות הישראלי</li>
        </ul>
      </section>

      <section>
        <SectionTitle>11. הגבלת אחריות</SectionTitle>
        <p className="mt-3">
          השירות מסופק "כמות שהוא" (AS IS) ו"כפי שהוא זמין" (AS AVAILABLE) ללא כל אחריות, מפורשת או משתמעת, לרבות אחריות לסחירות, התאמה למטרה מסוימת, או אי-הפרה.
        </p>
        <p className="mt-2">
          <strong>החברה אינה אחראית ל:</strong>
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-foreground/80">
          <li>הפסקות שירות, תקלות טכניות או שגיאות</li>
          <li>אובדן מידע או תוכן (למרות שאנו עושים מאמצים סבירים לגיבוי)</li>
          <li>דיוק תוצאות ניתוח AI או הצעות קנייה</li>
          <li>מוצרים או שירותים של צדדים שלישיים</li>
          <li>נזקים ישירים, עקיפים, מיוחדים, עונשיים או תוצאתיים הנובעים מהשימוש בשירות</li>
          <li>פעולות של משתמשים אחרים בפיד הקהילתי</li>
        </ul>
        <p className="mt-2">
          בכל מקרה, האחריות הכוללת של החברה לא תעלה על הסכום ששולם על ידי המשתמש לשירות ב-12 החודשים האחרונים (אם בכלל).
        </p>
      </section>

      <section>
        <SectionTitle>12. שיפוי</SectionTitle>
        <p className="mt-3">
          המשתמש מסכים לשפות ולהגן על החברה, מנהליה, עובדיה ושותפיה מפני כל תביעה, נזק, הוצאה או אחריות הנובעים מ:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-foreground/80">
          <li>הפרת תנאי שימוש אלה על ידי המשתמש</li>
          <li>תוכן שהמשתמש העלה לאתר</li>
          <li>הפרת זכויות צד שלישי על ידי המשתמש</li>
          <li>שימוש לא חוקי בשירות</li>
        </ul>
      </section>

      <section>
        <SectionTitle>13. סיום שימוש</SectionTitle>
        <p className="mt-3">
          המשתמש רשאי להפסיק את השימוש בשירות ולמחוק את חשבונו בכל עת. החברה רשאית להשעות או לסיים את הגישה לשירות:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-foreground/80">
          <li>בשל הפרת תנאי שימוש אלה</li>
          <li>בשל פעילות חשודה או שימוש לרעה</li>
          <li>בשל דרישה חוקית או צו בית משפט</li>
          <li>מכל סיבה אחרת, עם הודעה מוקדמת סבירה</li>
        </ul>
        <p className="mt-2">
          בעת סיום, כל הרישיונות שניתנו למשתמש מסתיימים. סעיפים שמטבעם אמורים לשרוד את סיום ההסכם ימשיכו לחול.
        </p>
      </section>

      <section>
        <SectionTitle>14. דין חל וסמכות שיפוט</SectionTitle>
        <p className="mt-3">
          תנאי שימוש אלה כפופים לדיני מדינת ישראל. כל סכסוך הנובע מתנאים אלה או הקשור אליהם יידון בבתי המשפט המוסמכים בתל אביב-יפו, ישראל.
        </p>
      </section>

      <section>
        <SectionTitle>15. כוח עליון</SectionTitle>
        <p className="mt-3">
          החברה לא תהיה אחראית לכל כשל או עיכוב בביצוע התחייבויותיה הנובע מנסיבות שאינן בשליטתה, לרבות: אסונות טבע, מלחמה, טרור, מגפה, כשל תשתיות אינטרנט, כשל ספקי ענן, או צווי ממשלה.
        </p>
      </section>

      <section>
        <SectionTitle>16. שינויים בתנאי השימוש</SectionTitle>
        <p className="mt-3">
          החברה שומרת לעצמה את הזכות לעדכן ולשנות את תנאי השימוש מעת לעת. שינויים מהותיים יפורסמו באתר עם תאריך העדכון. המשך השימוש בשירות לאחר פרסום השינויים מהווה הסכמה לתנאים המעודכנים.
        </p>
      </section>

      <section>
        <SectionTitle>17. הוראות כלליות</SectionTitle>
        <ul className="list-disc list-inside mt-3 space-y-2 text-foreground/80">
          <li><strong>הסכם שלם:</strong> תנאים אלה, יחד עם מדיניות הפרטיות, מהווים את ההסכם המלא בין המשתמש לחברה</li>
          <li><strong>הפרדה:</strong> אם סעיף כלשהו ייקבע כבלתי תקף, שאר הסעיפים ימשיכו לחול במלואם</li>
          <li><strong>ויתור:</strong> אי-אכיפה של סעיף כלשהו לא תהווה ויתור על הזכות לאכוף אותו בעתיד</li>
          <li><strong>המחאה:</strong> המשתמש אינו רשאי להמחות את זכויותיו או חובותיו לפי תנאים אלה ללא הסכמת החברה בכתב</li>
        </ul>
      </section>

      <section>
        <SectionTitle>18. יצירת קשר</SectionTitle>
        <p className="mt-3">
          לשאלות, בירורים או תלונות בנוגע לתנאי השימוש:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-foreground/80">
          <li><strong>דוא"ל:</strong> <a href="mailto:eranmalovani@gmail.com" className="text-primary hover:underline">eranmalovani@gmail.com</a></li>
          <li><strong>דוא"ל פרטיות:</strong> <a href="mailto:privacy@totallook.ai" className="text-primary hover:underline">privacy@totallook.ai</a></li>
        </ul>
      </section>
    </>
  );
}

function EnglishTerms() {
  return (
    <>
      <section>
        <SectionTitle>1. General</SectionTitle>
        <p className="mt-3">
          Welcome to TotalLook.ai (hereinafter: "the Website" or "the Service"). The Service is operated and managed by TotalLook AI (hereinafter: "the Company", "we", "us"). Use of the Website and the services offered therein is subject to these Terms of Service. By using the Website, you agree to these terms in their entirety. If you do not agree to these terms, please refrain from using the Website.
        </p>
        <p className="mt-2">
          These Terms of Service constitute a binding agreement between you and the Company. Please read them carefully along with our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, which forms an integral part of these terms.
        </p>
      </section>

      <section>
        <SectionTitle>2. Description of Service</SectionTitle>
        <p className="mt-3">
          TotalLook.ai is an AI-powered fashion analysis service. The Service allows users to upload photos of their outfits and receive detailed analysis including:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-foreground/80">
          <li>Overall score and style evaluation</li>
          <li>Improvement recommendations</li>
          <li>Personalized shopping suggestions</li>
          <li>Virtual wardrobe with automatic item detection</li>
          <li>Community feed for sharing outfits</li>
          <li>WhatsApp and Instagram integration</li>
          <li>Style diary and evolution tracking</li>
          <li>Personalized influencer and style matching</li>
        </ul>
      </section>

      <section>
        <SectionTitle>3. User Eligibility</SectionTitle>
        <p className="mt-3">
          The Service is intended for users aged 16 and above (or 13 and above in jurisdictions where the law permits). By registering for the Service, the user represents and confirms that they meet the minimum age requirement. If we become aware that a user is below the minimum age, we will delete their account and all associated data.
        </p>
      </section>

      <section>
        <SectionTitle>4. Registration and User Account</SectionTitle>
        <p className="mt-3">
          Some services are available without registration (guest mode), but with limitations. For full access, users must register through our authentication system (OAuth). The user is responsible for:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-foreground/80">
          <li>Maintaining the security of their account and login credentials</li>
          <li>Immediately reporting any unauthorized use of their account</li>
          <li>Providing accurate and up-to-date profile information</li>
          <li>Not sharing their account with others</li>
        </ul>
        <p className="mt-2">
          We reserve the right to suspend or delete accounts that violate these Terms of Service, without prior notice in severe cases.
        </p>
      </section>

      <section>
        <SectionTitle>5. Acceptable and Prohibited Use</SectionTitle>
        <p className="mt-3">
          The user agrees to use the Service only for lawful purposes and in accordance with these terms. In particular, the user agrees not to:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-foreground/80">
          <li>Upload offensive, threatening, harassing, racist, sexual, violent, or illegal content</li>
          <li>Upload photos of other people without their explicit consent</li>
          <li>Upload photos of minors</li>
          <li>Upload nudity or sexual content</li>
          <li>Attempt to hack, disrupt, reverse engineer, or overload the Website's systems</li>
          <li>Use the Service for commercial purposes without prior written authorization</li>
          <li>Distribute spam, promotional content, or advertisements through the community feed</li>
          <li>Create multiple or fake accounts</li>
          <li>Collect information about other users without their consent</li>
          <li>Use bots, scripts, or automated tools without authorization</li>
          <li>Impersonate another person or entity</li>
        </ul>
        <p className="mt-2">
          Violation of these provisions may result in immediate account suspension, content removal, and in severe cases — reporting to law enforcement.
        </p>
      </section>

      <section>
        <SectionTitle>6. User Content</SectionTitle>
        <SubSectionTitle>6.1 Ownership</SubSectionTitle>
        <p className="mt-2">
          Photos and content uploaded by the user remain their full property. Uploading content to the Website constitutes granting a non-exclusive, royalty-free license for:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-foreground/80">
          <li>Processing and analysis by the AI system</li>
          <li>Displaying analysis results to the user</li>
          <li>Displaying content the user chose to publish in the community feed</li>
        </ul>
        <p className="mt-2">
          This license terminates upon content deletion or account deletion.
        </p>

        <SubSectionTitle>6.2 Community Content</SubSectionTitle>
        <p className="mt-2">
          Posts published by the user in the community feed are visible to other users. The user is solely responsible for the content they publish. We reserve the right to remove content that violates these Terms of Service without prior notice.
        </p>

        <SubSectionTitle>6.3 Content Deletion</SubSectionTitle>
        <p className="mt-2">
          The user can delete any content they uploaded at any time. Account deletion permanently removes all associated content. For more details, see our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>
      </section>

      <section>
        <SectionTitle>7. Intellectual Property</SectionTitle>
        <p className="mt-3">
          All rights in the Website, including design, source code, logo, trademarks, text, algorithms, AI models, and system-generated content, belong to the Company or its licensors. In particular:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-foreground/80">
          <li>No part of the Website may be copied, reproduced, distributed, or commercially used without express written permission</li>
          <li>The name "TotalLook", logo, and associated trademarks are the Company's property</li>
          <li>AI analysis results are intended for personal use only</li>
          <li>Analysis results may not be used for commercial purposes without authorization</li>
        </ul>
      </section>

      <section>
        <SectionTitle>8. AI-Generated Content</SectionTitle>
        <p className="mt-3">
          The analyses, scores, recommendations, shopping suggestions, and content generated on the Website are based on artificial intelligence. It is important to understand:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-foreground/80">
          <li>Results are <strong>recommendations only</strong> and do not constitute professional advice</li>
          <li>Style scores are subjective and based on statistical models</li>
          <li>Shopping suggestions include links to external stores — we are not responsible for products, prices, or availability</li>
          <li>AI-generated images are illustrations and may not accurately represent the actual product</li>
          <li>The Company is not responsible for purchasing decisions or other decisions made based on analysis results</li>
        </ul>
      </section>

      <section>
        <SectionTitle>9. Third-Party Integrations</SectionTitle>
        <SubSectionTitle>9.1 WhatsApp</SubSectionTitle>
        <p className="mt-2">
          The Service allows WhatsApp integration for sending photos and receiving analyses. Use of this feature is subject to <a href="https://www.whatsapp.com/legal/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">WhatsApp's Terms of Service</a>. The phone number provided will be used solely for this service.
        </p>

        <SubSectionTitle>9.2 Instagram</SubSectionTitle>
        <p className="mt-2">
          Connecting an Instagram account enables automatic Story analysis. We only access Stories in which the user has tagged us. Use of this feature is subject to <a href="https://help.instagram.com/581066165581870" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Instagram's Terms of Use</a>.
        </p>

        <SubSectionTitle>9.3 External Store Links</SubSectionTitle>
        <p className="mt-2">
          The Website may contain links to online stores and external websites. These links are provided for user convenience only. The Company is not responsible for the content, products, prices, quality, or services of external websites. Any transaction with an external website is the user's sole responsibility.
        </p>
      </section>

      <section>
        <SectionTitle>10. Privacy and Data Protection</SectionTitle>
        <p className="mt-3">
          Your privacy is very important to us. Collection, processing, and storage of personal data are conducted in accordance with our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, which forms an integral part of these Terms of Service. In particular:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-foreground/80">
          <li>We never sell personal information to third parties</li>
          <li>Photos are not used to train AI models</li>
          <li>No facial recognition is performed — analysis focuses solely on clothing</li>
          <li>Users have full rights to access, correct, export, and delete their data</li>
          <li>We comply with GDPR, CCPA, and Israeli Privacy Protection Law requirements</li>
        </ul>
      </section>

      <section>
        <SectionTitle>11. Limitation of Liability</SectionTitle>
        <p className="mt-3">
          The Service is provided "AS IS" and "AS AVAILABLE" without any warranty, express or implied, including warranties of merchantability, fitness for a particular purpose, or non-infringement.
        </p>
        <p className="mt-2">
          <strong>The Company is not liable for:</strong>
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-foreground/80">
          <li>Service interruptions, technical failures, or errors</li>
          <li>Loss of data or content (although we make reasonable backup efforts)</li>
          <li>Accuracy of AI analysis results or shopping suggestions</li>
          <li>Products or services of third parties</li>
          <li>Direct, indirect, special, punitive, or consequential damages arising from use of the Service</li>
          <li>Actions of other users in the community feed</li>
        </ul>
        <p className="mt-2">
          In any case, the Company's total liability shall not exceed the amount paid by the user for the Service in the preceding 12 months (if any).
        </p>
      </section>

      <section>
        <SectionTitle>12. Indemnification</SectionTitle>
        <p className="mt-3">
          The user agrees to indemnify and hold harmless the Company, its directors, employees, and partners from any claim, damage, expense, or liability arising from:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-foreground/80">
          <li>The user's violation of these Terms of Service</li>
          <li>Content uploaded by the user to the Website</li>
          <li>The user's violation of third-party rights</li>
          <li>Unlawful use of the Service</li>
        </ul>
      </section>

      <section>
        <SectionTitle>13. Termination</SectionTitle>
        <p className="mt-3">
          The user may discontinue use of the Service and delete their account at any time. The Company may suspend or terminate access to the Service:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-foreground/80">
          <li>Due to violation of these Terms of Service</li>
          <li>Due to suspicious activity or abuse</li>
          <li>Due to legal requirements or court orders</li>
          <li>For any other reason, with reasonable prior notice</li>
        </ul>
        <p className="mt-2">
          Upon termination, all licenses granted to the user terminate. Provisions that by their nature should survive termination shall continue to apply.
        </p>
      </section>

      <section>
        <SectionTitle>14. Governing Law and Jurisdiction</SectionTitle>
        <p className="mt-3">
          These Terms of Service are governed by the laws of the State of Israel. Any dispute arising from or related to these terms shall be adjudicated in the competent courts of Tel Aviv-Jaffa, Israel.
        </p>
      </section>

      <section>
        <SectionTitle>15. Force Majeure</SectionTitle>
        <p className="mt-3">
          The Company shall not be liable for any failure or delay in performing its obligations resulting from circumstances beyond its control, including but not limited to: natural disasters, war, terrorism, pandemic, internet infrastructure failure, cloud provider failure, or government orders.
        </p>
      </section>

      <section>
        <SectionTitle>16. Changes to Terms of Service</SectionTitle>
        <p className="mt-3">
          The Company reserves the right to update and modify these Terms of Service from time to time. Material changes will be published on the Website with the update date. Continued use of the Service after publication of changes constitutes agreement to the updated terms.
        </p>
      </section>

      <section>
        <SectionTitle>17. General Provisions</SectionTitle>
        <ul className="list-disc list-inside mt-3 space-y-2 text-foreground/80">
          <li><strong>Entire Agreement:</strong> These terms, together with the Privacy Policy, constitute the entire agreement between the user and the Company</li>
          <li><strong>Severability:</strong> If any provision is found to be invalid, the remaining provisions shall continue in full force and effect</li>
          <li><strong>Waiver:</strong> Failure to enforce any provision shall not constitute a waiver of the right to enforce it in the future</li>
          <li><strong>Assignment:</strong> The user may not assign their rights or obligations under these terms without the Company's written consent</li>
        </ul>
      </section>

      <section>
        <SectionTitle>18. Contact</SectionTitle>
        <p className="mt-3">
          For questions, inquiries, or complaints regarding these Terms of Service:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-foreground/80">
          <li><strong>Email:</strong> <a href="mailto:eranmalovani@gmail.com" className="text-primary hover:underline">eranmalovani@gmail.com</a></li>
          <li><strong>Privacy email:</strong> <a href="mailto:privacy@totallook.ai" className="text-primary hover:underline">privacy@totallook.ai</a></li>
        </ul>
      </section>
    </>
  );
}
