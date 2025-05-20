import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import HeaderLogo from "./HeaderLogo";
import "../styles/Sidebar.css";
import { Home, Package, PieChart, LogOut } from "lucide-react";
// Import the Philippine Peso icon from react-icons
import { FaPesoSign } from "react-icons/fa6";

const Sidebar = ({ onLogout }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleLogout = (e) => {
    e.preventDefault();
    
    // Call the logout function from props
    if (typeof onLogout === 'function') {
      onLogout();
    } else {
      // Fallback logout functionality if onLogout prop is not provided
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("tokenExpiry");
      
      // Redirect to login page
      window.location.href = "/login";
    }
  };

  // Handle mouse enter/leave for the sidebar
  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  return (
    <aside 
      className={`sidebar ${isHovered ? "expanded" : "collapsed"}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="sidebar-header">
        {isHovered && <HeaderLogo />}
      </div>
      
      <nav className="sidebar-nav">
        <ul>
          <li>
            <NavLink 
              to="/dashboard" 
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Home size={20} />
              {isHovered && <span>Dashboard</span>}
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/inventory" 
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Package size={20} />
              {isHovered && <span>Manage Inventory</span>}
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/pos" 
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <FaPesoSign size={20} />
              {isHovered && <span>POS</span>}
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/reports" 
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <PieChart size={20} />
              {isHovered && <span>Reports</span>}
            </NavLink>
          </li>
          <li>
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={20} />
              {isHovered && <span>Logout</span>}
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;