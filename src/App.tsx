import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Code-split heavy/rarely-used routes so the customer-facing / bundle stays small.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Menu = lazy(() => import("./pages/Menu"));
const ManagerLogin = lazy(() => import("./pages/ManagerLogin"));
const ManagerDashboard = lazy(() => import("./pages/ManagerDashboard"));
const Install = lazy(() => import("./pages/Install"));
const StaffShift = lazy(() => import("./pages/StaffShift"));
const InstallStaff = lazy(() => import("./pages/InstallStaff"));
const POS = lazy(() => import("./pages/POS"));
const Inventory = lazy(() => import("./pages/Inventory"));
const RegjistrimiDitor = lazy(() => import("./pages/RegjistrimiDitor"));
const AppDocumentation = lazy(() => import("./pages/AppDocumentation"));
const PrintStation = lazy(() => import("./pages/PrintStation"));
const SupplierOrders = lazy(() => import("./pages/SupplierOrders"));
const Analytics = lazy(() => import("./pages/Analytics"));
const AdminTools = lazy(() => import("./pages/AdminTools"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
    Duke ngarkuar…
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/manager-login" element={<ManagerLogin />} />
          <Route path="/manager" element={<ManagerDashboard />} />
          {/* /dokumentacion removed — all docs sent via email only */}
          <Route path="/dokumentacion" element={<AppDocumentation />} />
          <Route path="/install" element={<Install />} />
          <Route path="/install-staff" element={<InstallStaff />} />
          <Route path="/staff" element={<StaffShift />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/regjistrimi-ditor" element={<RegjistrimiDitor />} />
          <Route path="/print-station" element={<PrintStation />} />
          <Route path="/porosi-furnitor" element={<SupplierOrders />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/admin-tools" element={<AdminTools />} />
          <Route path=".lovable/oauth/consent" element={<OAuthConsent />} />
          <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
