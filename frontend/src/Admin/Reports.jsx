import React, { useState, useEffect } from "react";
import { 
  Download, FileText, Filter, RefreshCw,
  Package, DollarSign, Search, FileSpreadsheet, FileTextIcon,
  XCircle, ChevronRight, CalendarIcon, Calendar,
  ArrowUpDown, ChevronLeft, ChevronRight as ChevronRightIcon
} from "lucide-react";
import "../styles/Reports.css";
import apiClient, { reportsApi } from "../services/api";
import * as XLSX from 'xlsx';
import { CSVLink } from "react-csv";
import { format, parseISO, subDays } from "date-fns";

// Pagination component
const Pagination = ({ totalItems, itemsPerPage, currentPage, onPageChange }) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  if (totalPages <= 1) return null;
  
  return (
    <div className="pagination">
      <button 
        className="pagination-button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
      >
        <ChevronLeft size={16} />
      </button>
      
      <span className="pagination-info">
        Page {currentPage} of {totalPages}
      </span>
      
      <button 
        className="pagination-button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
      >
        <ChevronRightIcon size={16} />
      </button>
    </div>
  );
};

const Reports = () => {
  const [activeTab, setActiveTab] = useState("sales");
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showSaleDetail, setShowSaleDetail] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleReceiptCSVData, setSaleReceiptCSVData] = useState([]);
  const [filters, setFilters] = useState({
    categoryId: '',
    receiptNo: '',
    productId: '',
    reason: ''
  });
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dateFilterType, setDateFilterType] = useState('calendar'); // 'calendar' or 'all'
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState({
    sales: 1,
    inventory: 1,
    stock_adjustments: 1
  });
  const ITEMS_PER_PAGE = 5;

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
  }, []);

  // Effect to automatically apply filters when they change or when tab changes
  useEffect(() => {
    console.log("Date or tab changed, fetching new report. Date:", selectedDate);
    fetchReport(activeTab);
  }, [activeTab, filters, selectedDate, dateFilterType]);

  // Reset current page when changing tabs
  useEffect(() => {
    setCurrentPage(prev => ({
      ...prev,
      [activeTab]: 1
    }));
  }, [activeTab]);

  // Function to get date based on filter or calendar selection
  const getDateForReport = () => {
    if (dateFilterType === 'all') {
      return {}; // No date filter for "All Data"
    }
    return { 
      start_date: selectedDate, 
      end_date: selectedDate 
    };
  };

  const fetchReport = async (reportType) => {
    setError(null);
    setIsLoading(true);
    setReportData(null); // Clear previous data to ensure re-render
  
    try {
      // Get date parameters based on selected date and filter type
      const dateParams = getDateForReport();
      
      // Build query parameters based on report type and date range
      const params = { ...dateParams };
      
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
      
      console.log(`Fetching ${reportType} report with params:`, params);
      
      // Using reportsApi to fetch report data
      const response = await reportsApi.getReport(reportType, params);
      
      if (response && response.data) {
        console.log(`${reportType} report data:`, response.data);
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
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateSelect = (e) => {
    const newDate = e.target.value;
    console.log("Date changed to:", newDate);
    setSelectedDate(newDate);
  };

  const handleResetFilters = () => {
    setFilters({ categoryId: '', receiptNo: '', productId: '', reason: '' });
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    setDateFilterType('calendar');
    // Fetch fresh data after resetting filters
    setTimeout(() => fetchReport(activeTab), 0);
  };

  const downloadExcel = (data, filename) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  // Function to prepare CSV data for a specific sale receipt
  const prepareSaleReceiptCSVData = (sale) => {
    if (!sale) return [];
    
    const csvData = [];
    
    // Add receipt header info
    csvData.push(['Receipt Number', sale.receipt_no]);
    csvData.push(['Date', format(parseISO(sale.sale_date), 'MMM dd, yyyy h:mm a')]);
    csvData.push(['']);  // Empty row for spacing
    
    // Add summary data
    const subtotal = calculateSubtotal(sale);
    const discountAmount = calculateDiscountAmount(sale);
    const discountPercentage = parseFloat(sale.discount || 0);
    
    csvData.push(['Subtotal', formatCurrency(subtotal)]);
    csvData.push([`Discount (${discountPercentage}%)`, formatCurrency(discountAmount)]);
    csvData.push(['Total Amount', formatCurrency(sale.total_amount)]);
    csvData.push(['Amount Paid', formatCurrency(sale.amount_paid)]);
    csvData.push(['Change', formatCurrency(calculateChange(sale))]);
    csvData.push(['']);  // Empty row for spacing
    
    // Add item header
    csvData.push(['Product', 'Quantity (kg)', 'Price per kg', 'Total']);
    
    // Add items data
    if (sale.items && sale.items.length > 0) {
      sale.items.forEach(item => {
        csvData.push([
          item.type,
          parseFloat(item.quantity).toFixed(2),
          formatCurrency(item.price_per_kg),
          formatCurrency(item.quantity * item.price_per_kg)
        ]);
      });
    }
    
    return csvData;
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
      const saleData = response.data;
      setSelectedSale(saleData);
      
      // Prepare CSV data for this sale
      const csvData = prepareSaleReceiptCSVData(saleData);
      setSaleReceiptCSVData(csvData);
      
      setShowSaleDetail(true);
    } catch (err) {
      console.error("Error fetching sale details:", err);
      alert("Could not load sale details. Please try again.");
    }
  };

  // Helper function to get date label for reports
  const getDateLabel = () => {
    if (dateFilterType === 'all') {
      return 'All Data';
    }
    return `Selected: ${format(parseISO(selectedDate), 'MMM dd, yyyy')}`;
  };

  // Calculate subtotal from sale data
  const calculateSubtotal = (sale) => {
    const discountPercentage = parseFloat(sale.discount || 0);
    const totalAmount = parseFloat(sale.total_amount);
    return discountPercentage > 0 
      ? totalAmount / (1 - (discountPercentage / 100))
      : totalAmount;
  };

  // Calculate discount amount
  const calculateDiscountAmount = (sale) => {
    const subtotal = calculateSubtotal(sale);
    const totalAmount = parseFloat(sale.total_amount);
    return subtotal - totalAmount;
  };

  // Calculate change amount
  const calculateChange = (sale) => {
    return sale.change_amount || 
      parseFloat(sale.amount_paid) - parseFloat(sale.total_amount);
  };

  // Pagination handler
  const handlePageChange = (tab, newPage) => {
    setCurrentPage(prev => ({
      ...prev,
      [tab]: newPage
    }));
  };

  // Get paginated data
  const getPaginatedData = (data, tab) => {
    if (!data || !Array.isArray(data)) return [];
    
    const startIndex = (currentPage[tab] - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    
    return data.slice(startIndex, endIndex);
  };

  

  // Dynamic component rendering based on report type
  const renderReportContent = () => {
    if (isLoading) return <div className="loading-indicator">Loading report data...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!reportData) return <div className="no-data-message">No data available</div>;
  
    switch (activeTab) {
      case 'sales':
        return <SalesReport 
          data={reportData} 
          onSaleClick={fetchSaleDetails}
          dateLabel={getDateLabel()}
          currentPage={currentPage.sales}
          onPageChange={(newPage) => handlePageChange('sales', newPage)}
          itemsPerPage={ITEMS_PER_PAGE}
        />;
      case 'inventory':
        return <InventoryReport 
          data={reportData}
          currentPage={currentPage.inventory}
          onPageChange={(newPage) => handlePageChange('inventory', newPage)}
          itemsPerPage={ITEMS_PER_PAGE}
        />;
      case 'stock_adjustments':
        return <StockAdjustmentsReport 
          data={reportData}
          dateLabel={getDateLabel()}
          currentPage={currentPage.stock_adjustments}
          onPageChange={(newPage) => handlePageChange('stock_adjustments', newPage)}
          itemsPerPage={ITEMS_PER_PAGE}
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
          onClick={() => setActiveTab('sales')}
        >
          <DollarSign size={16} />
          Sales Reports
        </button>
        <button 
          className={`tab-button ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <Package size={16} />
          Inventory Status
        </button>
        <button 
          className={`tab-button ${activeTab === 'stock_adjustments' ? 'active' : ''}`}
          onClick={() => setActiveTab('stock_adjustments')}
        >
          <ArrowUpDown size={16} />
          Stock Adjustments
        </button>
      </div>
      
      <div className="date-filter-container">
        <div className="date-filter-buttons">
          <button 
            className={`date-filter-button ${dateFilterType === 'calendar' ? 'active' : ''}`}
            onClick={() => setDateFilterType('calendar')}
          >
            <CalendarIcon size={16} />
            Calendar
          </button>
          <button 
            className={`date-filter-button ${dateFilterType === 'all' ? 'active' : ''}`}
            onClick={() => setDateFilterType('all')}
          >
            <FileText size={16} />
            All Data
          </button>
        </div>
        
        {dateFilterType === 'calendar' && (
          <div className="calendar-picker">
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateSelect}
              className="date-picker"
            />
          </div>
        )}
      </div>

      <div className="filter-container">
        {/* Dynamic filters based on active tab */}
        <div className="additional-filters">
          {renderFilters()}
        </div>
        
        <div className="filter-actions">
          <button className="reset-button" onClick={handleResetFilters}>
            <RefreshCw size={16} />
            Reset Filters
          </button>
        </div>
      </div>
      
      <div className="report-actions">
        <button 
          className="export-button"
          onClick={() => downloadExcel(prepareCSVData(), `${activeTab}_report_${dateFilterType === 'calendar' ? selectedDate : 'all_data'}`)}
          disabled={!reportData}
        >
          <FileSpreadsheet size={16} />
          Export to Excel
        </button>
        
        <CSVLink
          data={prepareCSVData()}
          filename={`${activeTab}_report_${dateFilterType === 'calendar' ? format(parseISO(selectedDate), 'yyyy-MM-dd') : 'all_data'}.csv`}
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
              <div className="header-actions">
                <CSVLink
                  data={saleReceiptCSVData}
                  filename={`Receipt_${selectedSale.receipt_no}_${format(parseISO(selectedSale.sale_date), 'yyyy-MM-dd')}.csv`}
                  className="download-button"
                  title="Download receipt as CSV"
                >
                  <Download size={20} />
                </CSVLink>
                <button 
                  className="close-button" 
                  onClick={() => setShowSaleDetail(false)}
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>
            
            <div className="sale-detail-info">
              <div className="sale-info-row">
                <span className="sale-info-label">Date:</span>
                <span className="sale-info-value">
                  {format(parseISO(selectedSale.sale_date), 'MMM dd, yyyy h:mm a')}
                </span>
              </div>
              
              {/* Calculate subtotal by adding discount amount to total */}
              {(() => {
                const subtotal = calculateSubtotal(selectedSale);
                const discountAmount = calculateDiscountAmount(selectedSale);
                const discountPercentage = parseFloat(selectedSale.discount || 0);
                
                return (
                  <>
                    <div className="sale-info-row">
                      <span className="sale-info-label">Subtotal:</span>
                      <span className="sale-info-value">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="sale-info-row">
                      <span className="sale-info-label">Discount ({discountPercentage}%):</span>
                      <span className="sale-info-value">{formatCurrency(discountAmount)}</span>
                    </div>
                  </>
                );
              })()}
              
              <div className="sale-info-row">
                <span className="sale-info-label">Total Amount:</span>
                <span className="sale-info-value">{formatCurrency(selectedSale.total_amount)}</span>
              </div>
              <div className="sale-info-row">
                <span className="sale-info-label">Amount Paid:</span>
                <span className="sale-info-value">{formatCurrency(selectedSale.amount_paid)}</span>
              </div>
              <div className="sale-info-row">
                <span className="sale-info-label">Change:</span>
                <span className="sale-info-value">
                  {formatCurrency(calculateChange(selectedSale))}
                </span>
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

// Helper function for currency formatting - using Philippine Peso
const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
};

// Sales Report Component with date filtering and pagination
const SalesReport = ({ data, onSaleClick, dateLabel, currentPage, onPageChange, itemsPerPage }) => {
  if (!data) return null;

  const paginatedSales = getPaginatedData(data.detailed_sales || [], currentPage, itemsPerPage);

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
        <h3>Recent Sales ({dateLabel})</h3>
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
            {paginatedSales && paginatedSales.length > 0 ? (
              paginatedSales.map((sale) => (
                <tr key={sale.sale_id} onClick={() => onSaleClick(sale.sale_id)}>
                  <td>{sale.receipt_no}</td>
                  <td>{format(parseISO(sale.sale_date), 'MMM dd, yyyy h:mm a')}</td>
                  <td>{formatCurrency(sale.total_amount)}</td>
                  <td>
                    <button className="view-details-button" onClick={(e) => {
                      e.stopPropagation(); // Prevent row click
                      onSaleClick(sale.sale_id);
                    }}>
                      <ChevronRightIcon size={16} />
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
        
        {/* Pagination for Sales */}
        {data.detailed_sales && data.detailed_sales.length > 0 && (
          <div className="pagination-container">
            <Pagination 
              totalItems={data.detailed_sales.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={onPageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to get paginated data
const getPaginatedData = (data, currentPage, itemsPerPage) => {
  if (!data || !Array.isArray(data)) return [];
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  return data.slice(startIndex, endIndex);
};

// Inventory Report Component with pagination
const InventoryReport = ({ data, currentPage, onPageChange, itemsPerPage }) => {
  if (!data) return null;

  const paginatedProducts = getPaginatedData(data.products || [], currentPage, itemsPerPage);

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
            {paginatedProducts && paginatedProducts.length > 0 ? (
              paginatedProducts.map((product) => (
                <tr 
                  key={product.product_id} 
                  className={parseFloat(product.current_stock) <= parseFloat(product.stock_alert) ? 'low-stock' : ''}
                >
                  <td>{product.type}</td>
                  <td>{product.category_name}</td>
                  <td>{product.supplier}</td>
                  <td>{parseFloat(product.current_stock).toFixed(2)}</td>
                  <td>{formatCurrency(product.price)}</td>
                  <td>{product.expiry_date ? format(parseISO(product.expiry_date), 'MMM dd, yyyy') : 'N/A'}</td>
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
        
        {/* Pagination for Inventory */}
        {data.products && data.products.length > 0 && (
          <div className="pagination-container">
            <Pagination 
              totalItems={data.products.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={onPageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Stock Adjustments Report Component with pagination
const StockAdjustmentsReport = ({ data, dateLabel, currentPage, onPageChange, itemsPerPage }) => {
  if (!data) return null;
  
  const paginatedAdjustments = getPaginatedData(data.adjustments || [], currentPage, itemsPerPage);

  return (
    <div className="stock-adjustments-report">
      <div className="summary-cards">
        <div className="summary-card">
          <h3>Total Manual Adjustments ({dateLabel})</h3>
          <p className="card-value">{data.summary?.total_adjustments || 0}</p>
        </div>
        <div className="summary-card">
          <h3>Stock Additions</h3>
          <p className="card-value">{parseFloat(data.summary?.total_additions || 0).toFixed(2)} kg</p>
        </div>
        <div className="summary-card">
          <h3>Stock Reductions</h3>
          <p className="card-value">{parseFloat(data.summary?.total_reductions || 0).toFixed(2)} kg</p>
        </div>
        <div className="summary-card">
          <h3>Affected Products</h3>
          <p className="card-value">{data.summary?.affected_products || 0}</p>
        </div>
      </div>

      <div className="data-table">
        <h3>Top Manually Adjusted Products ({dateLabel})</h3>
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
                <td className="negative-change">{parseFloat(Math.abs(product.reductions) || 0).toFixed(2)} kg</td>
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
        <h3>Recent Manual Stock Adjustments ({dateLabel})</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Product</th>
              <th>Category</th>
              <th>Adjustment Type</th>
              <th>Quantity Change</th>
              <th>Date</th>
              <th>Reason</th>
              <th>Notes</th>
              </tr>
          </thead>
          <tbody>
          {paginatedAdjustments && paginatedAdjustments.length > 0 ? (
              paginatedAdjustments.map((adjustment) => (
                <tr key={adjustment.adjustment_id}>
                  <td>{adjustment.adjustment_id}</td>
                  <td>{adjustment.product_name}</td>
                  <td>{adjustment.category_name}</td>
                  <td>{parseFloat(adjustment.quantity_change) >= 0 ? 'Addition' : 'Reduction'}</td>
                  <td className={parseFloat(adjustment.quantity_change) >= 0 ? 'positive-change' : 'negative-change'}>
                    {parseFloat(Math.abs(adjustment.quantity_change)).toFixed(2)} kg
                  </td>
                  <td>{format(parseISO(adjustment.adjustment_date), 'MMM dd, yyyy h:mm a')}</td>
                  <td>{adjustment.reason}</td>
                  <td>{adjustment.notes}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="no-data">No adjustment data available</td>
              </tr>
            )}
          </tbody>
        </table>
        
        {/* Pagination for Stock Adjustments */}
        {data.adjustments && data.adjustments.length > 0 && (
          <div className="pagination-container">
            <Pagination 
              totalItems={data.adjustments.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={onPageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;