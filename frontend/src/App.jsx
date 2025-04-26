import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
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
    const authenticated = localStorage.getItem("isAuthenticated") === "true";
    const tokenExpiry = localStorage.getItem("tokenExpiry");
    
    // Check if token has expired
    if (authenticated && tokenExpiry) {
      const isExpired = parseInt(tokenExpiry) < Math.floor(Date.now() / 1000);
      if (isExpired) {
        // Token expired, clear auth data
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("tokenExpiry");
        return false;
      }
      
      // Set authorization header for all future requests
      const token = localStorage.getItem("token");
      if (token) {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }
    }
    
    return authenticated;
  });

  // Update localStorage whenever authentication state changes
  useEffect(() => {
    localStorage.setItem("isAuthenticated", isAuthenticated);
  }, [isAuthenticated]);
  
  const handleLogout = () => {
    // Clear auth data
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("tokenExpiry");
    
    // Remove authorization header
    delete axios.defaults.headers.common["Authorization"];
    
    // Update state
    setIsAuthenticated(false);
    
    // Redirect to login page
    window.location.href = "/login";
  };

  console.log("Auth state:", isAuthenticated);

  return (
    <InventoryProvider>
      <Router basename="/">
        {isAuthenticated ? (
          <div className="app-layout">
            <Sidebar onLogout={handleLogout} />
            <div className="main-content">
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/inventory" element={<ManageInventory />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/pos" element={<PointOfSales />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={
                  <div className="container">
                    <h1>404 - Not Found</h1>
                    <p>The page you're looking for doesn't exist.</p>
                    <button onClick={() => window.location.href = "/dashboard"}>
                      Go to Dashboard
                    </button>
                  </div>
                } />
              </Routes>
            </div>
          </div>
        ) : (
          <Routes>
            <Route path="/login" element={<AdminLogin />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}
      </Router>
    </InventoryProvider>
  );
};

export default App;