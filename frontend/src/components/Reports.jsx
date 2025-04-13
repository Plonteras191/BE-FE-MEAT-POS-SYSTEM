import React, { useState, useEffect } from "react";
import axios from "axios";
import { BarChart, LineChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download, Calendar, FileText, Filter, RefreshCw, AlertTriangle, Package, DollarSign, TrendingUp } from "lucide-react";
import "../styles/Reports.css";

const Reports = () => {
  const [activeTab, setActiveTab] = useState("sales");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [productId, setProductId] = useState("");
  const [reportData, setReportData] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // API URL based on your XAMPP configuration
  const API_URL = "http://localhost/MEAT_POS/backend/api";

  useEffect(() => {
    // Get the current date and subtract 30 days for default date range
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
    
    // Fetch products for dropdown filter in stock movements
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [activeTab, startDate, endDate, productId]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/products.php`);
      setProducts(response.data);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  };

  const fetchReportData = async () => {
    if (!startDate || !endDate) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let url = `${API_URL}/reports.php?type=${activeTab}`;
      
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      if (productId && activeTab === "stock_movements") url += `&product_id=${productId}`;
      
      const response = await axios.get(url);
      setReportData(response.data);
    } catch (err) {
      setError("Failed to fetch report data: " + (err.response?.data?.error || err.message));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setReportData(null);
  };

  const handleReset = () => {
    // Get the current date and subtract 30 days for default date range
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
    setProductId("");
  };

  const handleRefresh = () => {
    fetchReportData();
  };

  const downloadCSV = () => {
    if (!reportData) return;
    
    let csvContent = "";
    let fileName = "";
    
    if (activeTab === "sales") {
      // Format header row
      csvContent = "Date,Sales Count,Total Revenue\n";
      
      // Format data rows
      reportData.daily_sales.forEach(item => {
        csvContent += `${item.sale_date},${item.sales_count},${item.total_revenue}\n`;
      });
      
      fileName = `sales_report_${startDate}_to_${endDate}.csv`;
    } 
    else if (activeTab === "inventory") {
      // Format header row
      csvContent = "Product,Category,Supplier,Current Stock,Price,Expiry Date,Alert Level,Value\n";
      
      // Format data rows
      reportData.products.forEach(item => {
        csvContent += `"${item.type}","${item.category_name || 'N/A'}","${item.supplier || 'N/A'}",${item.current_stock},${item.price},"${item.expiry_date}",${item.stock_alert},${item.inventory_value}\n`;
      });
      
      fileName = `inventory_report_${new Date().toISOString().split('T')[0]}.csv`;
    }
    else if (activeTab === "low_stock") {
      // Format header row
      csvContent = "Product,Category,Supplier,Current Stock,Alert Level,Deficit\n";
      
      // Format data rows
      reportData.forEach(item => {
        csvContent += `"${item.type}","${item.category_name || 'N/A'}","${item.supplier || 'N/A'}",${item.current_stock},${item.stock_alert},${item.deficit}\n`;
      });
      
      fileName = `low_stock_report_${new Date().toISOString().split('T')[0]}.csv`;
    }
    else if (activeTab === "stock_movements") {
      // Format header row
      csvContent = "Date,Product,Type,Reason,Quantity Change,Notes\n";
      
      // Format data rows
      reportData.forEach(item => {
        csvContent += `"${item.movement_date}","${item.product_name}","${item.movement_type}","${item.reason || 'N/A'}",${item.quantity_change},"${item.notes || 'N/A'}"\n`;
      });
      
      fileName = `stock_movements_${startDate}_to_${endDate}.csv`;
    }
    
    // Create a download link and trigger a click
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (value) => {
    return "₱" + parseFloat(value).toFixed(2);
  };

  const renderSalesReport = () => {
    if (!reportData) return null;
    
    const { summary, daily_sales, top_products } = reportData;
    
    // Prepare data for charts
    const dailyChartData = daily_sales.map(day => ({
      date: day.sale_date,
      revenue: parseFloat(day.total_revenue),
      count: parseInt(day.sales_count)
    }));
    
    const topProductsChartData = top_products.map(product => ({
      name: product.type,
      quantity: parseFloat(product.total_quantity),
      revenue: parseFloat(product.total_revenue)
    }));
    
    return (
      <div className="report-content">
        <div className="report-summary">
          <div className="summary-card">
            <h3>Total Sales</h3>
            <p className="summary-value">{summary.total_sales || 0}</p>
          </div>
          <div className="summary-card">
            <h3>Total Revenue</h3>
            <p className="summary-value">{formatCurrency(summary.total_revenue || 0)}</p>
          </div>
          <div className="summary-card">
            <h3>Total Discounts</h3>
            <p className="summary-value">{formatCurrency(summary.total_discounts || 0)}</p>
          </div>
          <div className="summary-card">
            <h3>Average Sale Value</h3>
            <p className="summary-value">
              {formatCurrency(summary.total_revenue > 0 ? summary.total_revenue / summary.total_sales : 0)}
            </p>
          </div>
        </div>
        
        <div className="charts-container">
          <div className="chart-wrapper">
            <h3>Daily Sales Revenue</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={dailyChartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#3498db" name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="chart-wrapper">
            <h3>Top Selling Products</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={topProductsChartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantity" fill="#2ecc71" name="Quantity (kg)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Daily Sales Table */}
        <div className="table-section">
          <div className="section-header">
            <h3>Daily Sales</h3>
          </div>
          <table className="reports-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Sales Count</th>
                <th>Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {daily_sales.length > 0 ? (
                daily_sales.map((day, index) => (
                  <tr key={index}>
                    <td>{day.sale_date}</td>
                    <td>{day.sales_count}</td>
                    <td>{formatCurrency(day.total_revenue)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="no-data">No sales data found for this period</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Top Products Table */}
        <div className="table-section">
          <div className="section-header">
            <h3>Top Selling Products</h3>
          </div>
          <table className="reports-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity Sold (kg)</th>
                <th>Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {top_products.length > 0 ? (
                top_products.map((product, index) => (
                  <tr key={index}>
                    <td>{product.type}</td>
                    <td>{parseFloat(product.total_quantity).toFixed(2)}</td>
                    <td>{formatCurrency(product.total_revenue)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="no-data">No product sales data found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderInventoryReport = () => {
    if (!reportData) return null;
    
    const { products, summary } = reportData;
    
    return (
      <div className="report-content">
        <div className="report-summary">
          <div className="summary-card">
            <h3>Total Products</h3>
            <p className="summary-value">{summary.total_items || 0}</p>
          </div>
          <div className="summary-card">
            <h3>Inventory Value</h3>
            <p className="summary-value">{formatCurrency(summary.total_value || 0)}</p>
          </div>
          <div className="summary-card">
            <h3>Low Stock Items</h3>
            <p className="summary-value">{summary.low_stock_count || 0}</p>
          </div>
        </div>
        
        {summary.low_stock_count > 0 && (
          <div className="alert-box">
            <h3><AlertTriangle size={18} /> Low Stock Warning</h3>
            <p>{summary.low_stock_count} products are below their stock alert level. Please check the Low Stock report for details.</p>
          </div>
        )}
        
        <div className="table-section">
          <div className="section-header">
            <h3>Current Inventory</h3>
          </div>
          <table className="reports-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Supplier</th>
                <th>Current Stock (kg)</th>
                <th>Price (₱/kg)</th>
                <th>Expiry Date</th>
                <th>Alert Level</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {products.length > 0 ? (
                products.map((product, index) => (
                  <tr 
                    key={index} 
                    className={parseFloat(product.current_stock) <= parseFloat(product.stock_alert) ? "low-stock" : ""}
                  >
                    <td>{product.type}</td>
                    <td>{product.category_name || 'N/A'}</td>
                    <td>{product.supplier || 'N/A'}</td>
                    <td>{parseFloat(product.current_stock).toFixed(2)}</td>
                    <td>{formatCurrency(product.price)}</td>
                    <td>{product.expiry_date}</td>
                    <td>{parseFloat(product.stock_alert).toFixed(2)}</td>
                    <td>{formatCurrency(product.inventory_value)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="no-data">No inventory data found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderLowStockReport = () => {
    if (!reportData) return null;
    
    return (
      <div className="report-content">
        <div className="alert-box">
          <h3><AlertTriangle size={18} /> Low Stock Alert</h3>
          <p>The following {reportData.length} products are below their stock alert levels and need to be replenished.</p>
        </div>
        
        <div className="table-section">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Supplier</th>
                <th>Current Stock (kg)</th>
                <th>Alert Level</th>
                <th>Deficit</th>
                <th>Price (₱/kg)</th>
                <th>Restock Cost</th>
              </tr>
            </thead>
            <tbody>
              {reportData.length > 0 ? (
                reportData.map((product, index) => (
                  <tr key={index} className="low-stock">
                    <td>{product.type}</td>
                    <td>{product.category_name || 'N/A'}</td>
                    <td>{product.supplier || 'N/A'}</td>
                    <td>{parseFloat(product.current_stock).toFixed(2)}</td>
                    <td>{parseFloat(product.stock_alert).toFixed(2)}</td>
                    <td>{parseFloat(product.deficit).toFixed(2)}</td>
                    <td>{formatCurrency(product.price)}</td>
                    <td>{formatCurrency(parseFloat(product.deficit) * parseFloat(product.price))}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="no-data">No low stock items found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderStockMovementsReport = () => {
    if (!reportData) return null;
    
    return (
      <div className="report-content">
        <div className="filters">
          <div className="filter-group">
            <label htmlFor="product-filter">Product:</label>
            <select 
              id="product-filter" 
              value={productId} 
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">All Products</option>
              {products.map(product => (
                <option key={product.product_id} value={product.product_id}>
                  {product.type}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="table-section">
          <div className="section-header">
            <h3>Stock Movement History</h3>
          </div>
          <table className="reports-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Type</th>
                <th>Reason</th>
                <th>Quantity Change (kg)</th>
                <th>Note & Receipt No</th>
              </tr>
            </thead>
            <tbody>
              {reportData.length > 0 ? (
                reportData.map((movement, index) => {
                  const quantityChange = parseFloat(movement.quantity_change);
                  const className = quantityChange > 0 ? "positive-change" : 
                                   quantityChange < 0 ? "negative-change" : "";
                  
                  return (
                    <tr key={index} className={className}>
                      <td>{movement.movement_date}</td>
                      <td>{movement.product_name}</td>
                      <td style={{ textTransform: 'capitalize' }}>{movement.movement_type}</td>
                      <td>{movement.reason || 'N/A'}</td>
                      <td>{quantityChange.toFixed(2)}</td>
                      <td>{movement.notes || 'N/A'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="no-data">No stock movements found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderActiveReport = () => {
    if (isLoading) return <div className="loading">Loading report data...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!reportData) return <div className="no-data">No report data available. Please select a date range and refresh.</div>;
    
    switch (activeTab) {
      case "sales":
        return renderSalesReport();
      case "inventory":
        return renderInventoryReport();
      case "low_stock":
        return renderLowStockReport();
      case "stock_movements":
        return renderStockMovementsReport();
      default:
        return null;
    }
  };

  return (
    <div className="reports-container">
      <h2 className="reports-title">Meat Shop Reports</h2>
      
      <div className="reports-tabs">
        <button 
          className={`tab-button ${activeTab === "sales" ? "active" : ""}`}
          onClick={() => handleTabChange("sales")}
        >
          <DollarSign size={16} /> Sales Report
        </button>
        <button 
          className={`tab-button ${activeTab === "inventory" ? "active" : ""}`}
          onClick={() => handleTabChange("inventory")}
        >
          <Package size={16} /> Inventory Status
        </button>
        <button 
          className={`tab-button ${activeTab === "low_stock" ? "active" : ""}`}
          onClick={() => handleTabChange("low_stock")}
        >
          <AlertTriangle size={16} /> Low Stock Alert
        </button>
        <button 
          className={`tab-button ${activeTab === "stock_movements" ? "active" : ""}`}
          onClick={() => handleTabChange("stock_movements")}
        >
          <TrendingUp size={16} /> Stock Movements
        </button>
      </div>
      
      <div className="report-controls">
        <div className="date-filters">
          <div className="filter-group">
            <label htmlFor="start-date"><Calendar size={16} /> From:</label>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label htmlFor="end-date"><Calendar size={16} /> To:</label>
            <input
              type="date"
              id="end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button className="control-button" onClick={handleReset}>
            <Filter size={16} /> Reset Filters
          </button>
          <button className="control-button" onClick={handleRefresh}>
            <RefreshCw size={16} /> Refresh Data
          </button>
          <button 
            className="control-button download-button" 
            onClick={downloadCSV}
            disabled={!reportData}
          >
            <Download size={16} /> Export to CSV
          </button>
        </div>
      </div>
      
      {renderActiveReport()}
    </div>
  );
};

export default Reports;