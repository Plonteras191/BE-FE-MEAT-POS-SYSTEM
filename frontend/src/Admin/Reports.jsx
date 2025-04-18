import React, { useState, useEffect } from "react";
import { 
  Download, FileText, Filter, RefreshCw,
  Package, DollarSign, Search, FileSpreadsheet, FileTextIcon,
  XCircle, ChevronRight, CalendarIcon,
  ArrowUpDown
} from "lucide-react";
import "../styles/Reports.css";
import apiClient, { reportsApi } from "../services/api";
import * as XLSX from 'xlsx';
import { CSVLink } from "react-csv";

const Reports = () => {
  const [activeTab, setActiveTab] = useState("sales");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeDateFilter, setActiveDateFilter] = useState("today");
  const [showSaleDetail, setShowSaleDetail] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [filters, setFilters] = useState({
    categoryId: '',
    receiptNo: '',
    productId: '',
    reason: ''
  });
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    // Fetch categories for filters
    const fetchCategories = async () => {
      try {
        const response = await apiClient.get('/categories.php');
        setCategories(response.data);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };

    // Fetch products for stock adjustment filters
    const fetchProducts = async () => {
      try {
        const response = await apiClient.get('/products.php');
        setProducts(response.data);
      } catch (err) {
        console.error("Error fetching products:", err);
      }
    };

    fetchCategories();
    fetchProducts();
    fetchReport(activeTab);
  }, [activeTab]);

  // Function to calculate date range based on filter
  const getDateRange = (filter) => {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    let startDate;

    switch (filter) {
      case 'today':
        startDate = endDate;
        break;
      case 'week':
        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 7);
        startDate = lastWeek.toISOString().split('T')[0];
        break;
      case 'month':
        const lastMonth = new Date();
        lastMonth.setMonth(today.getMonth() - 1);
        startDate = lastMonth.toISOString().split('T')[0];
        break;
      case 'all':
        startDate = ''; // Leave empty for all dates
        break;
      default:
        startDate = endDate;
    }

    return { startDate, endDate };
  };

  const fetchReport = async (reportType, dateFilter = activeDateFilter) => {
    setLoading(true);
    setError(null);
  
    try {
      // Get date range based on selected filter
      const dateRange = getDateRange(dateFilter);
      
      // Build query parameters based on report type and date range
      const params = {};
      
      if (dateRange.startDate) {
        params.start_date = dateRange.startDate;
      }
      
      if (dateRange.endDate && dateFilter !== 'all') {
        params.end_date = dateRange.endDate;
      }
      
      // Add specific filters based on report type
      if (reportType === 'sales' && filters.categoryId) {
        params.category_id = filters.categoryId;
      }
      
      if (reportType === 'sales' && filters.receiptNo) {
        params.receipt_no = filters.receiptNo;
      }

      // Add stock adjustment specific filters
      if (reportType === 'stock_adjustments') {
        if (filters.productId) {
          params.product_id = filters.productId;
        }
        if (filters.reason) {
          params.reason = filters.reason;
        }
      }
      
      // Using reportsApi to fetch report data
      const response = await reportsApi.getReport(reportType, params);
      
      if (response && response.data) {
        setReportData(response.data);
      } else {
        setError(`No data available for ${reportType} report`);
        setReportData(null);
      }
    } catch (err) {
      console.error(`Error fetching ${reportType} report:`, err);
      setError(`Failed to load ${reportType} report. Please try again.`);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateFilterChange = (filter) => {
    setActiveDateFilter(filter);
    fetchReport(activeTab, filter);
  };

  const handleApplyFilters = () => {
    fetchReport(activeTab);
  };

  const handleResetFilters = () => {
    setFilters({ categoryId: '', receiptNo: '', productId: '', reason: '' });
    setActiveDateFilter('all');
    fetchReport(activeTab, 'all');
  };

  const downloadExcel = (data, filename) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  // Function to prepare CSV data based on report type
  const prepareCSVData = () => {
    if (!reportData) return [];
    
    switch (activeTab) {
      case 'sales':
        return Array.isArray(reportData.detailed_sales) ? reportData.detailed_sales : [];
      case 'inventory':
        return Array.isArray(reportData.products) ? reportData.products : [];
      case 'stock_adjustments':
        return Array.isArray(reportData.adjustments) ? reportData.adjustments : [];
      default:
        return [];
    }
  };

  const fetchSaleDetails = async (saleId) => {
    try {
      const response = await apiClient.get(`/sales.php?id=${saleId}`);
      setSelectedSale(response.data);
      setShowSaleDetail(true);
    } catch (err) {
      console.error("Error fetching sale details:", err);
      alert("Could not load sale details. Please try again.");
    }
  };

  // Helper function to get date label for reports
  const getDateLabel = () => {
    const dateRange = getDateRange(activeDateFilter);
    
    switch (activeDateFilter) {
      case 'today':
        return 'Today';
      case 'week':
        return 'Last 7 Days';
      case 'month':
        return 'Last 30 Days';
      case 'all':
        return 'All Time';
      default:
        return '';
    }
  };

  // Dynamic component rendering based on report type
  const renderReportContent = () => {
    if (loading) return <div className="loading-spinner">Loading...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!reportData) return <div className="no-data-message">No data available</div>;
  
    switch (activeTab) {
      case 'sales':
        return <SalesReport 
          data={reportData} 
          onSaleClick={fetchSaleDetails}
          dateLabel={getDateLabel()}
        />;
      case 'inventory':
        return <InventoryReport data={reportData} />;
      case 'stock_adjustments':
        return <StockAdjustmentsReport 
          data={reportData}
          dateLabel={getDateLabel()}
        />;
      default:
        return <div>Select a report type</div>;
    }
  };

  // Render dynamic filters based on active tab
  const renderFilters = () => {
    switch (activeTab) {
      case 'sales':
        return (
          <>
            <div className="filter-group">
              <label htmlFor="categoryId">Category:</label>
              <select
                id="categoryId"
                name="categoryId"
                value={filters.categoryId}
                onChange={handleFilterChange}
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.category_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="receiptNo">Receipt #:</label>
              <input
                type="text"
                id="receiptNo"
                name="receiptNo"
                value={filters.receiptNo}
                onChange={handleFilterChange}
                placeholder="Search receipt..."
              />
            </div>
          </>
        );
      
      case 'stock_adjustments':
        return (
          <>
            <div className="filter-group">
              <label htmlFor="productId">Product:</label>
              <select
                id="productId"
                name="productId"
                value={filters.productId}
                onChange={handleFilterChange}
              >
                <option value="">All Products</option>
                {products.map(product => (
                  <option key={product.product_id} value={product.product_id}>
                    {product.type}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="reason">Reason:</label>
              <input
                type="text"
                id="reason"
                name="reason"
                value={filters.reason}
                onChange={handleFilterChange}
                placeholder="Filter by reason..."
              />
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="reports-container">
      <h1 className="reports-title">Reports Dashboard</h1>
      
      <div className="reports-tabs">
        <button 
          className={`tab-button ${activeTab === 'sales' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('sales');
          }}
        >
          <DollarSign size={16} />
          Sales Reports
        </button>
        <button 
          className={`tab-button ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('inventory');
          }}
        >
          <Package size={16} />
          Inventory Status
        </button>
        <button 
          className={`tab-button ${activeTab === 'stock_adjustments' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('stock_adjustments');
          }}
        >
          <ArrowUpDown size={16} />
          Stock Adjustments
        </button>
      </div>
      
      {/* Replace date range inputs with filter buttons */}
      <div className="date-filter-container">
        <div className="date-filter-buttons">
          <button 
            className={`date-filter-button ${activeDateFilter === 'today' ? 'active' : ''}`}
            onClick={() => handleDateFilterChange('today')}
          >
            Today
          </button>
          <button 
            className={`date-filter-button ${activeDateFilter === 'week' ? 'active' : ''}`}
            onClick={() => handleDateFilterChange('week')}
          >
            Week
          </button>
          <button 
            className={`date-filter-button ${activeDateFilter === 'month' ? 'active' : ''}`}
            onClick={() => handleDateFilterChange('month')}
          >
            Month
          </button>
          <button 
            className={`date-filter-button ${activeDateFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleDateFilterChange('all')}
          >
            All
          </button>
        </div>
      </div>

      <div className="filter-container">
        {/* Dynamic filters based on active tab */}
        <div className="additional-filters">
          {renderFilters()}
        </div>
        
        <div className="filter-actions">
          <button className="filter-button" onClick={handleApplyFilters}>
            <Filter size={16} />
            Apply Filters
          </button>
          <button className="reset-button" onClick={handleResetFilters}>
            <RefreshCw size={16} />
            Reset
          </button>
        </div>
      </div>
      
      <div className="report-actions">
        <button 
          className="export-button"
          onClick={() => downloadExcel(prepareCSVData(), `${activeTab}_report_${new Date().toISOString().split('T')[0]}`)}
          disabled={!reportData}
        >
          <FileSpreadsheet size={16} />
          Export to Excel
        </button>
        
        <CSVLink
          data={prepareCSVData()}
          filename={`${activeTab}_report_${new Date().toISOString().split('T')[0]}.csv`}
          className="export-button"
          target="_blank"
          disabled={!reportData}
        >
          <FileTextIcon size={16} />
          Export to CSV
        </CSVLink>
        
        <button className="refresh-button" onClick={() => fetchReport(activeTab)}>
          <RefreshCw size={16} />
          Refresh Data
        </button>
      </div>
      
      <div className="report-content">
        {renderReportContent()}
      </div>

      {/* Sale Details Modal */}
      {showSaleDetail && selectedSale && (
        <div className="sale-detail-modal">
          <div className="sale-detail-content">
            <div className="sale-detail-header">
              <h2>Sale Detail - Receipt #{selectedSale.receipt_no}</h2>
              <button className="close-button" onClick={() => setShowSaleDetail(false)}>
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="sale-detail-info">
              <div className="sale-info-row">
                <span className="sale-info-label">Date:</span>
                <span className="sale-info-value">{new Date(selectedSale.sale_date).toLocaleString()}</span>
              </div>
              <div className="sale-info-row">
                <span className="sale-info-label">Total Amount:</span>
                <span className="sale-info-value">{formatCurrency(selectedSale.total_amount)}</span>
              </div>
              <div className="sale-info-row">
                <span className="sale-info-label">Change:</span>
                <span className="sale-info-value">{formatCurrency(selectedSale.amount_paid - selectedSale.total_amount)}</span>
              </div>
            </div>
            
            <div className="sale-detail-items">
              <h3>Products Sold</h3>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity (kg)</th>
                    <th>Price per kg</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSale.items && selectedSale.items.map((item, index) => (
                    <tr key={`item-${item.sale_item_id || index}`}>
                      <td>{item.type}</td>
                      <td>{parseFloat(item.quantity).toFixed(2)}</td>
                      <td>{formatCurrency(item.price_per_kg)}</td>
                      <td>{formatCurrency(item.quantity * item.price_per_kg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function for currency formatting
const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

// Sales Report Component
const SalesReport = ({ data, onSaleClick, dateLabel }) => {
  if (!data) return null;

  return (
    <div className="sales-report">
      <div className="summary-cards">
        <div className="summary-card">
          <h3>Total Sales ({dateLabel})</h3>
          <p className="card-value">{data.summary?.total_sales || 0}</p>
        </div>
        <div className="summary-card">
          <h3>Total Revenue ({dateLabel})</h3>
          <p className="card-value">{formatCurrency(data.summary?.total_revenue || 0)}</p>
        </div>
      </div>

      <div className="data-table">
        <h3>Top Selling Products ({dateLabel})</h3>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Quantity Sold</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
          {data.top_products && data.top_products.length > 0 ? (
            data.top_products.map((product, index) => (
              <tr key={`top-product-${product.product_id || product.type}-${index}`}>
                <td>{product.type}</td>
                <td>{product.category_name}</td>
                <td>{parseFloat(product.total_quantity).toFixed(2)} kg</td>
                <td>{formatCurrency(product.total_revenue)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="no-data">No top products data available</td>
            </tr>
          )}
          </tbody>
        </table>
      </div>

      <div className="data-table">
        <h3>Recent Sales</h3>
        <table className="clickable-table">
          <thead>
            <tr>
              <th>Receipt #</th>
              <th>Date</th>
              <th>Total Amount</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.detailed_sales && data.detailed_sales.length > 0 ? (
              data.detailed_sales.map((sale) => (
                <tr key={sale.sale_id} onClick={() => onSaleClick(sale.sale_id)}>
                  <td>{sale.receipt_no}</td>
                  <td>{new Date(sale.sale_date).toLocaleString()}</td>
                  <td>{formatCurrency(sale.total_amount)}</td>
                  <td>
                    <button className="view-details-button" onClick={(e) => {
                      e.stopPropagation(); // Prevent row click
                      onSaleClick(sale.sale_id);
                    }}>
                      <ChevronRight size={16} />
                      View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="no-data">No sales data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Inventory Report Component
const InventoryReport = ({ data }) => {
  if (!data) return null;

  return (
    <div className="inventory-report">
      <div className="summary-cards">
        <div className="summary-card">
          <h3>Total Items</h3>
          <p className="card-value">{data.summary?.total_items || 0}</p>
        </div>
        <div className="summary-card">
          <h3>Inventory Value</h3>
          <p className="card-value">{formatCurrency(data.summary?.total_value || 0)}</p>
        </div>
        <div className="summary-card">
          <h3>Low Stock Items</h3>
          <p className="card-value">{data.summary?.low_stock_count || 0}</p>
        </div>
      </div>

      <div className="data-table">
        <h3>Current Inventory</h3>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Supplier</th>
              <th>Current Stock (kg)</th>
              <th>Price per kg</th>
              <th>Expiry Date</th>
              <th>Alert Level</th>
              <th>Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.products && data.products.length > 0 ? (
              data.products.map((product) => (
                <tr 
                  key={product.product_id} 
                  className={parseFloat(product.current_stock) <= parseFloat(product.stock_alert) ? 'low-stock' : ''}
                >
                  <td>{product.type}</td>
                  <td>{product.category_name}</td>
                  <td>{product.supplier}</td>
                  <td>{parseFloat(product.current_stock).toFixed(2)}</td>
                  <td>{formatCurrency(product.price)}</td>
                  <td>{product.expiry_date}</td>
                  <td>{parseFloat(product.stock_alert).toFixed(2)}</td>
                  <td>{formatCurrency(product.inventory_value)}</td>
                  <td>
                    {parseFloat(product.current_stock) <= parseFloat(product.stock_alert) ? (
                      <span className="status-indicator low">Low Stock</span>
                    ) : (
                      <span className="status-indicator ok">OK</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="no-data">No inventory data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Stock Adjustments Report Component
const StockAdjustmentsReport = ({ data, dateLabel }) => {
  if (!data) return null;

  return (
    <div className="stock-adjustments-report">
      <div className="summary-cards">
        <div className="summary-card">
          <h3>Total Adjustments ({dateLabel})</h3>
          <p className="card-value">{data.summary?.total_adjustments || 0}</p>
        </div>
        <div className="summary-card">
          <h3>Total Additions</h3>
          <p className="card-value">{parseFloat(data.summary?.total_additions || 0).toFixed(2)} kg</p>
        </div>
        <div className="summary-card">
          <h3>Total Reductions</h3>
          <p className="card-value">{parseFloat(data.summary?.total_reductions || 0).toFixed(2)} kg</p>
        </div>
        <div className="summary-card">
          <h3>Affected Products</h3>
          <p className="card-value">{data.summary?.affected_products || 0}</p>
        </div>
      </div>

      <div className="data-table">
        <h3>Top Adjusted Products ({dateLabel})</h3>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Adjustment Count</th>
              <th>Net Change</th>
              <th>Additions</th>
              <th>Reductions</th>
            </tr>
          </thead>
          <tbody>
          {data.top_products && data.top_products.length > 0 ? (
            data.top_products.map((product, index) => (
              <tr key={`top-adjusted-${product.product_id}-${index}`}>
                <td>{product.type}</td>
                <td>{product.category_name}</td>
                <td>{product.adjustment_count}</td>
                <td className={parseFloat(product.net_change) >= 0 ? 'positive-change' : 'negative-change'}>
                  {parseFloat(product.net_change).toFixed(2)} kg
                </td>
                <td className="positive-change">{parseFloat(product.additions || 0).toFixed(2)} kg</td>
                <td className="negative-change">{parseFloat(product.reductions || 0).toFixed(2)} kg</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="no-data">No top adjusted products data available</td>
            </tr>
          )}
          </tbody>
        </table>
      </div>

      <div className="data-table">
        <h3>Recent Adjustments</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Product</th>
              <th>Category</th>
              <th>Quantity Change</th>
              <th>Date</th>
              <th>Reason</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {data.adjustments && data.adjustments.length > 0 ? (
              data.adjustments.map((adjustment) => (
                <tr key={adjustment.adjustment_id}>
                  <td>{adjustment.adjustment_id}</td>
                  <td>{adjustment.product_name}</td>
                  <td>{adjustment.category_name}</td>
                  <td className={parseFloat(adjustment.quantity_change) >= 0 ? 'positive-change' : 'negative-change'}>
                    {parseFloat(adjustment.quantity_change).toFixed(2)} kg
                  </td>
                  <td>{new Date(adjustment.adjustment_date).toLocaleString()}</td>
                  <td>{adjustment.reason}</td>
                  <td>{adjustment.notes}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-data">No adjustment data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;