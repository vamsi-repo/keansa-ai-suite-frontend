import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import { ValidationProvider } from "./contexts/ValidationContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Validate from "./pages/Validate";
import NotFound from "./pages/NotFound";
import RuleConfigurations from "./pages/RuleConfigurations";
import DataValidations from "./pages/DataValidations";
import ViewRules from "./pages/ViewRules";
import AuthGuard from "./components/AuthGuard";
import AutoDataValidation from "./pages/AutoDataValidation";
import SFTPDashboard from './pages/SFTPDashboard';
import RulesManagement from './pages/RulesManagement';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ValidationProvider>
            <ErrorBoundary>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
               
                {/* Protected routes */}
                <Route
                  path="/dashboard"
                  element={
                    <AuthGuard>
                      <Dashboard />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/validate/:templateId"
                  element={
                    <AuthGuard>
                      <Validate />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/rule-configurations"
                  element={
                    <AuthGuard>
                      <RuleConfigurations />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/data-validations"
                  element={
                    <AuthGuard>
                      <DataValidations />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/view-rules/:templateId"
                  element={
                    <AuthGuard>
                      <ViewRules />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/auto-data-validation"
                  element={
                    <AuthGuard>
                      <AutoDataValidation />
                    </AuthGuard>
                  } 
                />
                <Route 
                  path="/sftp-dashboard" 
                  element={
                    <AuthGuard>
                      <SFTPDashboard />
                    </AuthGuard>
                  } 
                /> 
                <Route
                  path="/rules-management"
                  element={
                    <AuthGuard>
                      <RulesManagement />
                    </AuthGuard>
                  }
                />

                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </ValidationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;