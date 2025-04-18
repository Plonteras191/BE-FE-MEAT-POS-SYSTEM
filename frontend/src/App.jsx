import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./components/AdminLogin";
import Dashboard from "./Admin/Dashboard";
import PointOfSales from "./Admin/PointOfSales";
import ManageInventory from "./Admin/ManageInventory";
import Reports from "./Admin/Reports";
import Sidebar from "./components/Sidebar";
import { InventoryProvider } from "./context/InventoryContext";
import "./App.css";

const App = () => {
  // Check localStorage for authentication status on initial load
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("isAuthenticated") === "true";
  });

  // Update localStorage whenever authentication state changes
  useEffect(() => {
    localStorage.setItem("isAuthenticated", isAuthenticated);
  }, [isAuthenticated]);
  
  const handleLogin = (username, password) => {
    if (username === "admin" && password === "admin") {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  return (
    <InventoryProvider>
      <Router>
        {isAuthenticated ? (
          <div className="app-layout">
            <Sidebar onLogout={handleLogout} />
            <div className="main-content">
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/inventory" element={<ManageInventory />} />
                <Route path="/reports" element={<Reports />} />
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