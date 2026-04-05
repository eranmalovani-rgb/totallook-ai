import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/i18n";

export default function NotFound() {
  const [, setLocation] = useLocation();
  const { lang, dir } = useLanguage();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background" dir={dir}>
      <Card className="w-full max-w-lg mx-4 shadow-lg border border-white/10 bg-card">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/10 rounded-full animate-pulse" />
              <AlertCircle className="relative h-16 w-16 text-red-500" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>

          <h2 className="text-xl font-semibold text-muted-foreground mb-4">
            {lang === "he" ? "הדף לא נמצא" : "Page Not Found"}
          </h2>

          <p className="text-muted-foreground mb-8 leading-relaxed">
            {lang === "he"
              ? "מצטערים, הדף שחיפשת לא קיים. ייתכן שהוא הוזז או נמחק."
              : "Sorry, the page you are looking for doesn't exist. It may have been moved or deleted."}
          </p>

          <div
            id="not-found-button-group"
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              onClick={handleGoHome}
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              {lang === "he" ? "חזרה לדף הבית" : "Go Home"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
