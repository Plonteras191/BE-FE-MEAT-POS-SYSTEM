import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./components/AdminLogin";
import Dashboard from "./components/Dashboard";
import ExpirationAlerts from "./components/ExpirationAlerts";
import SalesLogging from "./components/SalesLogging";
import PointOfSales from "./components/PointOfSales";
import ManageInventory from "./components/ManageInventory";
import Reports from "./components/Reports";
import Sidebar from "./components/Sidebar";
import { InventoryProvider } from "./context/InventoryContext";
import "./App.css";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  
  const handleLogin = (username, password) => {
    if (username === "admin" && password === "admin") {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  return (
    <InventoryProvider>
      <Router>
        {isAuthenticated ? (
          <div className="app-layout">
            <Sidebar />
            <div className="main-content">
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/inventory" element={<ManageInventory />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/alerts" element={<ExpirationAlerts />} />
                <Route path="/sales" element={<SalesLogging />} />
                <Route path="/pos" element={<PointOfSales />} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="*" element={<h1 className="container">404 - Not Found</h1>} />
              </Routes>
            </div>
          </div>
        ) : (
          <Routes>
            <Route path="/login" element={<AdminLogin onLogin={handleLogin} />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        )}
      </Router>
    </InventoryProvider>
  );
};

export default App;
