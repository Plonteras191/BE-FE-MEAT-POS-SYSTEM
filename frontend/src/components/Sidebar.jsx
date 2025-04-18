import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import HeaderLogo from "./HeaderLogo";
import "../styles/Sidebar.css";

const Sidebar = ({ onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Call the logout function from props
    onLogout();
    // Then navigate to login
    navigate("/login");
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
              to="/reports" 
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Reports
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