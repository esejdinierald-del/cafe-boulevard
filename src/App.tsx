import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Menu from "./pages/Menu";
import ManagerLogin from "./pages/ManagerLogin";
import ManagerDashboard from "./pages/ManagerDashboard";

import Install from "./pages/Install";
import StaffShift from "./pages/StaffShift";
import InstallStaff from "./pages/InstallStaff";
import POS from "./pages/POS";
import AppDocumentation from "./pages/AppDocumentation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
