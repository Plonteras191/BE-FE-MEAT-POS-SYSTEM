import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import "../styles/Dashboard.css";
import apiClient from "../services/api.js";

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    total_products: 0,
    low_stock_count: 0,
    today_sales_count: 0,
    today_sales_amount: 0,
    inventory_value: 0,
    last_7_days_sales: [],
    top_products: [],
    low_stock_items: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    
    // Refresh data every 5 minutes
    const interval = setInterval(fetchDashboardData, 300000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get("/dashboard.php");
      setDashboardData(response.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError("Failed to load dashboard data. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Prepare chart data
  const prepareSalesChartData = () => {
    const last7Days = [];
    const today = new Date();
    
    // Create an array of the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const salesData = dashboardData.last_7_days_sales.find(
        item => item.date === dateStr
      );
      
      last7Days.push({
        date: dateStr,
        sales: salesData ? parseFloat(salesData.sales_amount) : 0,
        count: salesData ? parseInt(salesData.sales_count) : 0,
        formattedDate: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      });
    }
    
    return last7Days;
  };

  const preparePieChartData = () => {
    if (!dashboardData.top_products || dashboardData.top_products.length === 0) {
      return [];
    }
    
    return dashboardData.top_products.map(product => ({
      name: product.type,
      value: parseInt(product.total_quantity)
    }));
  };

  // Colors for the pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="dashboard">
      <h2 className="dashboard-title">Dashboard</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      ) : (
        <>
          <div className="dashboard-stats">
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-archive"></i>
              </div>
              <div className="stat-content">
                <h3>Total Products</h3>
                <p className="stat-value">{dashboardData.total_products}</p>
              </div>
            </div>
            
            <div className="stat-card alert">
              <div className="stat-icon">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <div className="stat-content">
                <h3>Low Stock Items</h3>
                <p className="stat-value">{dashboardData.low_stock_count}</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-shopping-cart"></i>
              </div>
              <div className="stat-content">
                <h3>Today's Sales</h3>
                <p className="stat-value">{dashboardData.today_sales_count} orders</p>
                <p className="stat-subvalue">{formatCurrency(dashboardData.today_sales_amount)}</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-warehouse"></i>
              </div>
              <div className="stat-content">
                <h3>Inventory Value</h3>
                <p className="stat-value">{formatCurrency(dashboardData.inventory_value)}</p>
              </div>
            </div>
          </div>
          
          <div className="dashboard-charts">
            <div className="chart-container sales-chart">
              <h3>Last 7 Days Sales</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={prepareSalesChartData()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="formattedDate" 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value), "Sales"]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="sales" name="Sales Amount" fill="#4285F4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="chart-container product-chart">
              <h3>Top 5 Products (Last 30 Days)</h3>
              {dashboardData.top_products && dashboardData.top_products.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={preparePieChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {preparePieChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} units`, "Quantity Sold"]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data-message">
                  <p>No sales data available for the last 30 days</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="dashboard-tables">
            <div className="table-container low-stock-table">
              <h3>Low Stock Items</h3>
              {dashboardData.low_stock_items && dashboardData.low_stock_items.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Current Stock (kg)</th>
                      <th>Alert Level (kg)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.low_stock_items.map((item) => (
                      <tr key={item.product_id}>
                        <td>{item.type}</td>
                        <td>{parseFloat(item.weight).toFixed(2)}</td>
                        <td>{parseFloat(item.stock_alert).toFixed(2)}</td>
                        <td>
                          <span className={`status-badge ${
                            parseFloat(item.weight) < parseFloat(item.stock_alert) * 0.5 
                              ? 'critical' 
                              : 'warning'
                          }`}>
                            {parseFloat(item.weight) < parseFloat(item.stock_alert) * 0.5 
                              ? 'Critical' 
                              : 'Low'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="no-data-message">
                  <p>No low stock items to display</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;