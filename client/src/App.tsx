import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
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

function Router() {
  return (
    <Switch>
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
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: "oklch(0.14 0.025 260)",
                border: "1px solid oklch(0.22 0.025 260)",
                color: "oklch(0.95 0.01 80)",
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
