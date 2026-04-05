import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./i18n";
import Home from "./pages/Home";
import Upload from "./pages/Upload";
import ReviewPage from "./pages/ReviewPage";
import History from "./pages/History";
import Onboarding from "./pages/Onboarding";
import Wardrobe from "./pages/Wardrobe";
import Profile from "./pages/Profile";
import Feed from "./pages/Feed";
import Admin from "./pages/Admin";
import SharedWardrobe from "./pages/SharedWardrobe";
import GuestUpload from "./pages/GuestUpload";
import GuestReview from "./pages/GuestReview";
import GuestWardrobe from "./pages/GuestWardrobe";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import LandingEN from "./pages/LandingEN";
import Demo from "./pages/Demo";
import TasteProfile from "./pages/TasteProfile";
import BrandDemo from "./pages/BrandDemo";
import StyleDiary from "./pages/StyleDiary";
import BackgroundWatermark from "./components/BackgroundWatermark";
import CookieConsent from "./components/CookieConsent";
import GlobalWhatsAppPopup from "./components/GlobalWhatsAppPopup";
import VersionBadge from "./components/VersionBadge";
import WhatsAppReview from "./pages/WhatsAppReview";
import About from "./pages/About";
import Login from "./pages/Login";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/login" component={Login} />
      <Route path={"/upload"} component={Upload} />
      <Route path={"/review/:id"} component={ReviewPage} />
      <Route path={"/history"} component={History} />
      <Route path={"/onboarding"} component={Onboarding} />
      <Route path={"/wardrobe"} component={Wardrobe} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/feed"} component={Feed} />
      <Route path={"/admin"} component={Admin} />
      <Route path="/try" component={GuestUpload} />
      <Route path="/guest/review/:id" component={GuestReview} />
      <Route path="/guest/wardrobe" component={GuestWardrobe} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/en" component={LandingEN} />
      <Route path="/demo" component={Demo} />
      <Route path="/taste" component={TasteProfile} />
      <Route path="/brand-demo" component={BrandDemo} />
      <Route path="/style-diary" component={StyleDiary} />
      <Route path="/about" component={About} />
      <Route path="/r/:token" component={WhatsAppReview} />
      <Route path="/wardrobe/shared/:token">
        {(params) => <SharedWardrobe token={params.token} />}
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <Toaster />
            <BackgroundWatermark />
            <Router />
            <GlobalWhatsAppPopup />
            <CookieConsent />
            <VersionBadge />
          </TooltipProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
