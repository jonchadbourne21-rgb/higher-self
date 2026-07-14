import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { VoiceProvider } from "@humeai/voice-react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
// AppShell is used by individual pages, not at the router level
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import CheckIn from "./pages/CheckIn";
import CheckInInsight from "./pages/CheckInInsight";
import Mirror from "./pages/Mirror";
import Journal from "./pages/Journal";
import JournalEntry from "./pages/JournalEntry";
import Domains from "./pages/Domains";
import Dashboard from "./pages/Dashboard";
import Timeline from "./pages/Timeline";
import Insights from "./pages/Insights";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Calendar from "./pages/Calendar";
import QuickOnboarding from "./pages/QuickOnboarding";
import FullOnboarding from "./pages/FullOnboarding";
import FAQ from "./pages/FAQ";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Pricing from "./pages/Pricing";
import Rewards from "./pages/Rewards";
import Programs from "./pages/Programs";
import ProgramDetail from "./pages/ProgramDetail";
import ProgramInsight from "./pages/ProgramInsight";
import VoiceHistory from "./pages/VoiceHistory";
import TimeCapsule from "./pages/TimeCapsule";
import Demo from "./pages/Demo";
import { useRef, useEffect } from "react";
import { usePageMetadata } from "@/lib/metadata";
import { injectStructuredData } from "@/lib/structuredData";

// Tab order — used to determine slide direction
const TAB_ORDER = ["/home", "/domains", "/mirror", "/journal", "/programs", "/dashboard"];

function getTabIndex(path: string) {
  return TAB_ORDER.findIndex(
    (t) => path === t || path.startsWith(t + "/")
  );
}

// Variants factory — direction: 1 = slide left (forward), -1 = slide right (back), 0 = fade only
function makeVariants(direction: number) {
  const x = direction !== 0 ? direction * 40 : 0;
  return {
    initial: { opacity: 0, x },
    animate: { opacity: 1, x: 0 },
    exit:    { opacity: 0, x: -x },
  };
}

function AuthenticatedRouter() {
  const [location] = useLocation();
  
  // Update meta tags on route change
  useEffect(() => {
    usePageMetadata(location);
  }, [location]);
  const prevLocation = useRef(location);
  const directionRef = useRef(0);

  // Compute direction before updating prevLocation
  const prevIdx = getTabIndex(prevLocation.current);
  const currIdx = getTabIndex(location);

  if (location !== prevLocation.current) {
    if (prevIdx !== -1 && currIdx !== -1) {
      directionRef.current = currIdx > prevIdx ? 1 : -1;
    } else {
      directionRef.current = 0; // non-tab nav → fade
    }
    prevLocation.current = location;
  }

  const variants = makeVariants(directionRef.current);

  // Check if we're on an authenticated route that needs AppShell
  const isAuthenticatedRoute = !["/", "/onboarding", "/quick-onboarding", "/full-onboarding", "/faq", "/privacy", "/terms", "/pricing", "/demo"].includes(location);

  return (
    <>
      {isAuthenticatedRoute ? (
        <div className="overflow-hidden w-full">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={location}
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: "spring", stiffness: 340, damping: 34, mass: 0.9 }}
              style={{ willChange: "transform, opacity" }}
            >
              <Switch location={location}>
                <Route path="/home" component={Home} />
                <Route path="/checkin" component={CheckIn} />
                <Route path="/check-in-insight" component={CheckInInsight} />
                <Route path="/mirror" component={Mirror} />
                <Route path="/journal" component={Journal} />
                <Route path="/journal/:id" component={JournalEntry} />
                <Route path="/domains" component={Domains} />
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/timeline" component={Timeline} />
                <Route path="/insights" component={Insights} />
                <Route path="/notifications" component={Notifications} />
                <Route path="/settings" component={Settings} />
                <Route path="/calendar" component={Calendar} />
                <Route path="/rewards" component={Rewards} />
                <Route path="/programs" component={Programs} />
                <Route path="/programs/:id" component={ProgramDetail} />
                <Route path="/programs/:id/insight/:day" component={ProgramInsight} />
                <Route path="/voice/history" component={VoiceHistory} />
                <Route path="/time-capsule" component={TimeCapsule} />
                <Route path="/404" component={NotFound} />
                <Route component={NotFound} />
              </Switch>
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        /* Non-authenticated routes without AppShell */
        <div className="overflow-hidden w-full">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={location}
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: "spring", stiffness: 340, damping: 34, mass: 0.9 }}
              style={{ willChange: "transform, opacity" }}
            >
              <Switch location={location}>
                <Route path="/" component={Landing} />
                <Route path="/onboarding" component={Onboarding} />
                <Route path="/quick-onboarding" component={QuickOnboarding} />
                <Route path="/full-onboarding" component={FullOnboarding} />
                <Route path="/faq" component={FAQ} />
                <Route path="/privacy" component={Privacy} />
                <Route path="/terms" component={Terms} />
                <Route path="/pricing" component={Pricing} />
                <Route path="/demo" component={Demo} />
                <Route path="/404" component={NotFound} />
                <Route component={NotFound} />
              </Switch>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </>
  );
}

function App() {
  // Inject structured data on mount
  useEffect(() => {
    injectStructuredData();
  }, []);

  return (
    <ErrorBoundary>
      <VoiceProvider>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <Toaster
              theme="dark"
              toastOptions={{
                style: {
                  background: "oklch(0.17 0.04 280)",
                  border: "1px solid oklch(0.28 0.05 280)",
                  color: "oklch(0.93 0.01 270)",
                },
              }}
            />
            <AuthenticatedRouter />
          </TooltipProvider>
        </ThemeProvider>
      </VoiceProvider>
    </ErrorBoundary>
  );
}

export default App;
