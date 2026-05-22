import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { VoiceProvider } from "@humeai/voice-react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import LoadingOverlay from "./components/LoadingOverlay";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import CheckIn from "./pages/CheckIn";
import CheckInInsight from "./pages/CheckInInsight";
import Chat from "./pages/Chat";
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
import Voice from "./pages/Voice";
import VoiceHistory from "./pages/VoiceHistory";
import { useRef, useEffect, useState } from "react";
import { usePageMetadata } from "@/lib/metadata";
import { injectStructuredData } from "@/lib/structuredData";
import { trpc } from "@/lib/trpc";

// Tab order — used to determine slide direction
const TAB_ORDER = ["/home", "/domains", "/chat", "/journal", "/calendar", "/dashboard"];

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

function AnimatedRouter() {
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

  return (
    // overflow-hidden on the outer wrapper prevents the sliding page from
    // being visible outside the viewport during the transition
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
            <Route path="/home" component={Home} />
            <Route path="/checkin" component={CheckIn} />
            <Route path="/check-in-insight" component={CheckInInsight} />
            <Route path="/chat" component={Chat} />
            <Route path="/journal" component={Journal} />
            <Route path="/journal/:id" component={JournalEntry} />
            <Route path="/domains" component={Domains} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/timeline" component={Timeline} />
            <Route path="/insights" component={Insights} />
            <Route path="/notifications" component={Notifications} />
            <Route path="/settings" component={Settings} />
            <Route path="/calendar" component={Calendar} />
            <Route path="/pricing" component={Pricing} />
            <Route path="/rewards" component={Rewards} />
            <Route path="/programs" component={Programs} />
            <Route path="/programs/:id" component={ProgramDetail} />
            <Route path="/programs/:id/insight/:day" component={ProgramInsight} />
            <Route path="/voice" component={Voice} />
            <Route path="/voice/history" component={VoiceHistory} />
            <Route path="/faq" component={FAQ} />
            <Route path="/privacy" component={Privacy} />
            <Route path="/terms" component={Terms} />
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function App() {
  // Inject structured data on mount
  useEffect(() => {
    injectStructuredData();
  }, []);

  // OAuth redirect detection and loading overlay state
  const [showOAuthOverlay, setShowOAuthOverlay] = useState(false);
  const authCompleteRef = useRef(false);
  
  // Query auth state to detect when OAuth flow completes
  const { data: user, isLoading: authLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Check for OAuth redirect parameters (?code= or ?state=) on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasOAuthParams = params.has("code") || params.has("state");
    
    if (hasOAuthParams) {
      setShowOAuthOverlay(true);
    }
  }, []);

  // Hide overlay once auth is complete and user data is loaded
  useEffect(() => {
    if (!authLoading && user && showOAuthOverlay && !authCompleteRef.current) {
      authCompleteRef.current = true;
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setShowOAuthOverlay(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [authLoading, user, showOAuthOverlay]);

  return (
    <ErrorBoundary>
      <LoadingOverlay visible={showOAuthOverlay} />
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
            <AnimatedRouter />
          </TooltipProvider>
        </ThemeProvider>
      </VoiceProvider>
    </ErrorBoundary>
  );
}

export default App;
