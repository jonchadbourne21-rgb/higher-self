import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import CheckIn from "./pages/CheckIn";
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
import { useRef } from "react";

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
            <Route path="/home" component={Home} />
            <Route path="/checkin" component={CheckIn} />
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
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster
            theme="light"
            toastOptions={{
              style: {
                background: "oklch(1.00 0.00 0)",
                border: "1px solid oklch(0.88 0.02 80)",
                color: "oklch(0.18 0.02 270)",
              },
            }}
          />
          <AnimatedRouter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
