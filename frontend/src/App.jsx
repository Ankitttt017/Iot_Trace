import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { I18nProvider } from "./context/I18nContext";
import { SidebarProvider } from "./context/SidebarContext";

// ─── Rico IoT Pages ────────────────────────────────────────────────
import LoginPage from "./pages/LoginPage";
import PartMasterPage from "./pages/PartMasterPage";
import PartProfilePage from "./pages/PartProfilePage";
import OperationsMasterPage from "./pages/OperationsMasterPage";
import MachineDashboard from "./modules/machine/MachineDashboard";
import MachineProfilePage from "./modules/machine/MachineProfilePage";

// ─── Traceability Pages ────────────────────────────────────────────
import Dashboard from "./modules/traceability/pages/Dashboard";
import ProductionCharts from "./modules/traceability/pages/ProductionCharts";
import Traceability from "./modules/traceability/pages/Traceability";
import Machine from "./modules/traceability/pages/Machine";
import UsersPage from "./modules/traceability/pages/Users";
import ComponentJourney from "./modules/traceability/pages/ComponentJourney";
import OperatorView from "./modules/traceability/pages/OperatorView";
import QrFormatRules from "./modules/traceability/pages/QrFormatRules";
import Scanners from "./modules/traceability/pages/Scanners";
import ScannerMonitor from "./modules/traceability/pages/ScannerMonitor";
import Packing from "./modules/traceability/pages/Packing";
import PackingManagement from "./modules/traceability/pages/PackingManagement";
import Shifts from "./modules/traceability/pages/Shifts";
import MasterSettingsDashboard from "./modules/traceability/pages/MasterSettingsDashboard";
import StationControls from "./modules/traceability/pages/StationControls";
import PlcConfiguration from "./modules/traceability/pages/PlcConfiguration";
import IoMonitor from "./modules/traceability/pages/IoMonitor";
import ReportConfiguration from "./modules/traceability/pages/ReportConfiguration";
import OrganizationStub from "./modules/traceability/pages/OrganizationStub";

// ─── Traceability Layout ───────────────────────────────────────────
import TraceabilityLayout from "./modules/traceability/TraceabilityLayout";

// ─── Auth Helpers ──────────────────────────────────────────────────
function getSavedUser() {
  try {
    const saved = sessionStorage.getItem("rico_user");
    return saved ? JSON.parse(saved) : null;
  } catch {
    sessionStorage.removeItem("rico_user");
    return null;
  }
}

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => sessionStorage.getItem("rico_auth") === "true"
  );
  const [currentUser, setCurrentUser] = useState(() => getSavedUser());

  const handleLogin = (username) => {
    const user = {
      name: username?.trim() || "Admin",
      role:
        username?.trim()?.toLowerCase() === "operator"
          ? "Operator"
          : "Administrator",
    };
    sessionStorage.setItem("rico_auth", "true");
    sessionStorage.setItem("rico_user", JSON.stringify(user));
    setCurrentUser(user);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("rico_auth");
    sessionStorage.removeItem("rico_user");
    localStorage.removeItem("trace_token");
    setCurrentUser(null);
    setIsLoggedIn(false);
  };

  return (
    <I18nProvider>
      <SidebarProvider>
        <Toaster position="top-right" />
        {!isLoggedIn ? (
          <LoginPage onLogin={handleLogin} />
        ) : (
          <Routes>
            {/* ── Default redirect ── */}
            <Route path="/" element={<Navigate to="/parts" />} />

            {/* ══════════════════════════════════════
                RICO IOT ROUTES
            ══════════════════════════════════════ */}
            <Route
              path="/parts"
              element={
                <PartMasterPage
                  onLogout={handleLogout}
                  currentUser={currentUser}
                />
              }
            />
            <Route
              path="/part/:id"
              element={
                <PartProfilePage
                  onLogout={handleLogout}
                  currentUser={currentUser}
                />
              }
            />
            <Route
              path="/operations"
              element={
                <OperationsMasterPage
                  onLogout={handleLogout}
                  currentUser={currentUser}
                />
              }
            />
            <Route
              path="/machines"
              element={
                <MachineDashboard
                  onLogout={handleLogout}
                  currentUser={currentUser}
                />
              }
            />
            <Route
              path="/machine/:id"
              element={
                <MachineProfilePage
                  onLogout={handleLogout}
                  currentUser={currentUser}
                />
              }
            />

            {/* Legacy redirects */}
            <Route path="/organisation-master/machines" element={<Navigate to="/machines" />} />
            <Route path="/part-operations/part-master" element={<Navigate to="/parts" />} />

            {/* ══════════════════════════════════════
                TRACEABILITY ROUTES
                All wrapped in TraceabilityLayout
                (uses Traceability's own auth/context)
            ══════════════════════════════════════ */}
            <Route
              path="/traceability/*"
              element={
                <TraceabilityLayout
                  onLogout={handleLogout}
                  currentUser={currentUser}
                />
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="production" element={<ProductionCharts />} />
              <Route path="traceability" element={<Traceability />} />
              <Route path="machines" element={<Machine />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="component-journey" element={<ComponentJourney />} />
              <Route path="operator-view" element={<OperatorView />} />
              <Route path="qr-format-rules" element={<QrFormatRules />} />
              <Route path="scanners" element={<Scanners />} />
              <Route path="scanner-monitor" element={<ScannerMonitor />} />
              <Route path="packing" element={<Packing />} />
              <Route path="packing-management" element={<PackingManagement />} />
              <Route path="shifts" element={<Shifts />} />
              <Route path="master-settings" element={<MasterSettingsDashboard />} />
              <Route path="station-controls" element={<StationControls />} />
              <Route path="plc-configuration" element={<PlcConfiguration />} />
              <Route path="io-monitor" element={<IoMonitor />} />
              <Route path="master-reports" element={<ReportConfiguration />} />
              <Route path="organization/parts" element={<OrganizationStub title="Part Master" />} />
              <Route path="organization/machines" element={<OrganizationStub title="Machine Master" />} />
              <Route path="organization/operations" element={<OrganizationStub title="Operation Master" />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        )}
      </SidebarProvider>
    </I18nProvider>
  );
};

export default App;
