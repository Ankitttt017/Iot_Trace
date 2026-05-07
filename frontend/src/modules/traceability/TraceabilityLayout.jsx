import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../../components/common/Navbar";
import Sidebar from "../../components/common/Sidebar";
import { useSidebar } from "../../context/SidebarContext";
import { NotificationProvider } from "./context/NotificationContext";

/**
 * TraceabilityLayout
 * Wraps all /traceability/* routes with Rico IoT's Navbar + Sidebar
 * but provides Traceability's own context (NotificationProvider, etc.)
 */
const TraceabilityLayout = ({ onLogout, currentUser }) => {
  const { collapsed } = useSidebar();

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-[#f7f7fa]">
        <Navbar onLogout={onLogout} currentUser={currentUser} />
        <Sidebar />

        <main
          className="pt-[78px] transition-all duration-300 ease-in-out"
          style={{ paddingLeft: collapsed ? "72px" : "288px" }}
        >
          <div className="w-full p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </NotificationProvider>
  );
};

export default TraceabilityLayout;
