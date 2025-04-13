import React, { useContext, useState, useEffect } from "react";
import { InventoryContext } from "../context/InventoryContext";
import "../styles/SalesLogging.css";

const SalesLogging = () => {
  const { salesHistory } = useContext(InventoryContext);
  const [filteredSales, setFilteredSales] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [customDateRange, setCustomDateRange] = useState({
    startDate: "",
    endDate: ""
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    filterSales();
  }, [salesHistory, filterType, customDateRange, searchQuery, sortOrder]);

  const filterSales = () => {
    let filtered = [...salesHistory];
    const now = new Date();
    
    // Apply date filter
    if (filterType === "day") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter(sale => new Date(sale.date) >= today);
    } else if (filterType === "week") {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      filtered = filtered.filter(sale => new Date(sale.date) >= weekStart);
    } else if (filterType === "month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter(sale => new Date(sale.date) >= monthStart);
    } else if (filterType === "year") {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      filtered = filtered.filter(sale => new Date(sale.date) >= yearStart);
    } else if (filterType === "custom" && customDateRange.startDate && customDateRange.endDate) {
      const startDate = new Date(customDateRange.startDate);
      const endDate = new Date(customDateRange.endDate);
      endDate.setHours(23, 59, 59);
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= startDate && saleDate <= endDate;
      });
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sale => 
        new Date(sale.date).toLocaleString().toLowerCase().includes(query) ||
        sale.total.toString().includes(query)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });
    
    setFilteredSales(filtered);
  };

  const totalFilteredSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  
  const handleFilterChange = (e) => {
    setFilterType(e.target.value);
  };
  
  const exportToCSV = () => {
    if (filteredSales.length === 0) return;
    
    const headers = ["Date", "Sale Amount (PHP)"];
    const csvData = [
      headers.join(","),
      ...filteredSales.map(sale => `${new Date(sale.date).toLocaleString()},₱${sale.total.toFixed(2)}`)
    ].join("\n");
    
    const blob = new Blob([csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sales_report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };
  
  const getAverageSaleAmount = () => {
    if (filteredSales.length === 0) return 0;
    return totalFilteredSales / filteredSales.length;
  };

  return (
    <div className="sales-logging container">
      <header className="sales-header">
        <h2>Sales Dashboard</h2>
        <div className="actions-container">
          <button 
            className="export-btn"
            onClick={exportToCSV}
            disabled={filteredSales.length === 0}
          >
            Export to CSV
          </button>
        </div>
      </header>

      <div className="filter-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search sales..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-options">
          <select value={filterType} onChange={handleFilterChange} className="filter-select">
            <option value="all">All Time</option>
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
          
          <select 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value)}
            className="sort-select"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
        
        {filterType === "custom" && (
          <div className="date-range-container">
            <div className="date-input-group">
              <label>Start Date:</label>
              <input
                type="date"
                value={customDateRange.startDate}
                onChange={(e) => setCustomDateRange({...customDateRange, startDate: e.target.value})}
              />
            </div>
            <div className="date-input-group">
              <label>End Date:</label>
              <input
                type="date"
                value={customDateRange.endDate}
                onChange={(e) => setCustomDateRange({...customDateRange, endDate: e.target.value})}
              />
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-cards">
        <div className="sales-summary-card">
          <h3>Total Sales</h3>
          <p className="amount">₱{totalFilteredSales.toFixed(2)}</p>
          <p className="period">
            {filterType === "all" ? "All Time" : 
             filterType === "day" ? "Today" : 
             filterType === "week" ? "This Week" : 
             filterType === "month" ? "This Month" : 
             filterType === "year" ? "This Year" : "Custom Range"}
          </p>
        </div>
        
        <div className="sales-summary-card">
          <h3>Number of Sales</h3>
          <p className="amount">{filteredSales.length}</p>
          <p className="period">Transactions</p>
        </div>
        
        <div className="sales-summary-card">
          <h3>Average Sale</h3>
          <p className="amount">₱{getAverageSaleAmount().toFixed(2)}</p>
          <p className="period">Per Transaction</p>
        </div>
      </div>
      
      {filteredSales.length > 0 ? (
        <div className="sales-history">
          <h3>Sales History</h3>
          <div className="table-container">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Sale Amount (PHP)</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{new Date(sale.date).toLocaleString()}</td>
                    <td>₱{sale.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="no-data">
          <p>No sales data available for the selected filters.</p>
        </div>
      )}
    </div>
  );
};

export default SalesLogging;