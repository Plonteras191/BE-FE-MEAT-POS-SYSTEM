import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/AdminLogin.css";

const AdminLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await axios.post("http://localhost/MEAT_POS/backend/api/auth.php", {
        username,
        password
      });

      if (response.data.success) {
        // Store authentication data in local storage
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("user", JSON.stringify(response.data.data.user));
        localStorage.setItem("token", response.data.data.token);
        localStorage.setItem("tokenExpiry", response.data.data.expiry);
        
        // Update Axios default headers for authenticated requests
        axios.defaults.headers.common["Authorization"] = `Bearer ${response.data.data.token}`;
        
        console.log("Authentication successful, redirecting to dashboard...");
        
        // Force reload to ensure the app recognizes the authentication state
        window.location.href = "/dashboard";
      } else {
        setError(response.data.message || "Authentication failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(error.response?.data?.message || "Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>MegaFarm POS System</h2>
        <h3>Admin Login</h3>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <button type="submit" className="login-button" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
};

export default AdminLogin;