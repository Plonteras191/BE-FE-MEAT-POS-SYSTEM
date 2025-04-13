import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import HeaderLogo from "./HeaderLogo";
import "../styles/Sidebar.css";

const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/login");
    window.location.reload();
  };

  return (
    <aside className="sidebar">
      <HeaderLogo />
      <nav className="sidebar-nav">
        <ul>
          <li>
            <NavLink 
              to="/dashboard" 
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/inventory" 
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Manage Inventory
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/pos" 
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              POS
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/sales" 
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Sales Logging
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/reports" 
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Reports
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/alerts" 
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Expiration Alerts
            </NavLink>
          </li>
          
         
        </ul>
      </nav>
      <button className="logout-button" onClick={handleLogout}>
        Logout
      </button>
    </aside>
  );
};

export default Sidebar;
