import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import ProjectSelection from "./pages/ProjectSelection";
import Home from "./pages/Home";
import TestCases from "./pages/TestCases";
import TestRuns from "./pages/TestRuns";
import TestRunDetail from "./pages/TestRunDetail";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import TestCaseDetail from "./pages/TestCaseDetail";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import AdminPanel from "./pages/AdminPanel";

function Router() {
  return (
    <Switch>
      {/* Landing page without dashboard layout */}
      <Route path={"/"} component={ProjectSelection} />
      
      {/* Login page (no auth required) */}
      <Route path={"/login"} component={Login} />
      
      {/* Forced after signing in with a temporary password */}
      <Route path={"/change-password"} component={ChangePassword} />

      {/* Admin panel: users and roles (admins only) */}
      <Route path={"/admin"} component={AdminPanel} />
      
      {/* All other routes with dashboard layout */}
      <Route path={"/dashboard"}>
        <DashboardLayout>
          <Home />
        </DashboardLayout>
      </Route>
      <Route path={"/test-cases"} component={TestCases} />
      <Route path={"/test-cases/:id"} component={TestCaseDetail} />
      <Route path={"/test-runs"}>
        <DashboardLayout>
          <TestRuns />
        </DashboardLayout>
      </Route>
      <Route path={"/test-runs/:id"}>
        <DashboardLayout>
          <TestRunDetail />
        </DashboardLayout>
      </Route>
      <Route path={"analytics"}>
        <DashboardLayout>
          <Analytics />
        </DashboardLayout>
      </Route>
      <Route path={"/settings"}>
        <DashboardLayout>
          <Settings />
        </DashboardLayout>
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

