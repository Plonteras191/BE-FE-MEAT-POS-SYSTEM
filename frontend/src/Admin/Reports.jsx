import React, { useState, useEffect } from "react";
import { 
  Printer, RefreshCw, Package, DollarSign, ArrowUpDown, ChevronRight as ChevronRightIcon,
  CalendarIcon, Calendar, ChevronLeft, XCircle, Download
} from "lucide-react";
import "../styles/Reports.css";
import apiClient, { reportsApi } from "../services/api";
import { format, parseISO } from "date-fns";

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
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
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
  const [isLoading, setIsLoading] = useState(false);
  const [dateFilterType, setDateFilterType] = useState('calendar'); // 'calendar' or 'month'
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState({
    sales: 1,
    inventory: 1,
    stock_adjustments: 1
  });
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiClient.get('/categories.php');
        setCategories(response.data);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };

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

  useEffect(() => {
    fetchReport(activeTab);
  }, [activeTab, filters, selectedDate, selectedMonth, dateFilterType]);

  useEffect(() => {
    setCurrentPage(prev => ({
      ...prev,
      [activeTab]: 1
    }));
  }, [activeTab]);

  const getDateForReport = () => {
    if (dateFilterType === 'calendar') {
      return { 
        start_date: selectedDate, 
        end_date: selectedDate 
      };
    } else if (dateFilterType === 'month') {
      const [year, month] = selectedMonth.split('-');
      const lastDay = new Date(year, month, 0).getDate();
      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-${lastDay.toString().padStart(2, '0')}`;
      return {
        start_date: startDate,
        end_date: endDate
      };
    }
  };

  const fetchReport = async (reportType) => {
    setError(null);
    setIsLoading(true);
    setReportData(null);
  
    try {
      const dateParams = getDateForReport();
      const params = { ...dateParams };
      
      if (reportType === 'sales' && filters.categoryId) {
        params.category_id = filters.categoryId;
      }
      
      if (reportType === 'sales' && filters.receiptNo) {
        params.receipt_no = filters.receiptNo;
      }
  
      if (reportType === 'stock_adjustments') {
        if (filters.productId) {
          params.product_id = filters.productId;
        }
        if (filters.reason) {
          params.reason = filters.reason;
        }
      }
      
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
    setSelectedDate(e.target.value);
  };

  const handleResetFilters = () => {
    setFilters({ categoryId: '', receiptNo: '', productId: '', reason: '' });
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    setSelectedMonth(format(new Date(), 'yyyy-MM'));
    setDateFilterType('calendar');
    setTimeout(() => fetchReport(activeTab), 0);
  };

  const getCSVConfig = (tab) => {
    switch (tab) {
      case 'sales':
        return {
          headers: ['Receipt #', 'Date', 'Total Amount'],
          data: reportData?.detailed_sales?.map(sale => [
            sale.receipt_no,
            format(parseISO(sale.sale_date), 'MMM dd, yyyy h:mm a'),
            formatCurrency(sale.total_amount)
          ]) || []
        };
      case 'inventory':
        return {
          headers: ['Product', 'Category', 'Supplier', 'Current Stock (kg)', 'Price per kg', 'Expiry Date', 'Alert Level', 'Value', 'Status'],
          data: reportData?.products?.map(product => [
            product.type,
            product.category_name,
            product.supplier,
            parseFloat(product.current_stock).toFixed(2),
            formatCurrency(product.price),
            product.expiry_date ? format(parseISO(product.expiry_date), 'MMM dd, yyyy') : 'N/A',
            parseFloat(product.stock_alert).toFixed(2),
            formatCurrency(product.inventory_value),
            parseFloat(product.current_stock) <= parseFloat(product.stock_alert) ? 'Low Stock' : 'OK'
          ]) || []
        };
      case 'stock_adjustments':
        return {
          headers: ['ID', 'Product', 'Category', 'Adjustment Type', 'Quantity Change', 'Date', 'Reason', 'Notes'],
          data: reportData?.adjustments?.map(adjustment => [
            adjustment.adjustment_id,
            adjustment.product_name,
            adjustment.category_name,
            parseFloat(adjustment.quantity_change) >= 0 ? 'Addition' : 'Reduction',
            parseFloat(Math.abs(adjustment.quantity_change)).toFixed(2),
            format(parseISO(adjustment.adjustment_date), 'MMM dd, yyyy h:mm a'),
            adjustment.reason,
            adjustment.notes
          ]) || []
        };
      default:
        return { headers: [], data: [] };
    }
  };

  const generateCSVData = () => {
    const { headers, data } = getCSVConfig(activeTab);
    if (data.length === 0) return '';

    const csvRows = [
      headers.join(','),
      ...data.map(row => row.map(cell => `"${cell}"`).join(','))
    ];

    return csvRows.join('\n');
  };

  const handleExportCSV = () => {
    const csvData = generateCSVData();
    if (!csvData) {
      alert('No data to export');
      return;
    }
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${activeTab}_report.csv`;
    link.click();
  };

  const printReceipt = () => {
    if (!selectedSale) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>Receipt</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('@media print {');
    printWindow.document.write('  .no-print { display: none; }');
    printWindow.document.write('  body { font-family: Arial, sans-serif; margin: 20px; }');
    printWindow.document.write('  table { width: 100%; border-collapse: collapse; }');
    printWindow.document.write('  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }');
    printWindow.document.write('  th { background-color: #f2f2f2; }');
    printWindow.document.write('}');
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(document.querySelector('.sale-detail-content').innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

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
      
      // In the renderFilters function for stock_adjustments
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
        <select
          id="reason"
          name="reason"
          value={filters.reason}
          onChange={handleFilterChange}
        >
          <option value="">All Reasons</option>
          <option value="add">Addition</option>
          <option value="remove">Removal</option>
        </select>
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
            className={`date-filter-button ${dateFilterType === 'month' ? 'active' : ''}`}
            onClick={() => setDateFilterType('month')}
          >
            <CalendarIcon size={16} />
            Month
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
        {dateFilterType === 'month' && (
          <div className="month-picker">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="month-picker-input"
            />
          </div>
        )}
      </div>

      <div className="filter-container">
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
        <button className="export-button" onClick={handleExportCSV}>
          <Download size={16} />
          Export CSV
        </button>
        <button className="refresh-button" onClick={() => fetchReport(activeTab)}>
          <RefreshCw size={16} />
          Refresh Data
        </button>
      </div>
      
      <div className="report-content">
        {renderReportContent()}
      </div>

      {showSaleDetail && selectedSale && (
        <div className="sale-detail-modal">
          <div className="sale-detail-content">
            <div className="sale-detail-header">
              <h2>Sale Detail - Receipt #{selectedSale.receipt_no}</h2>
              <div className="header-actions no-print">
                <button className="print-button" onClick={printReceipt}>
                  <Printer size={20} />
                </button>
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

  function getDateLabel() {
    if (dateFilterType === 'calendar') {
      return `Selected: ${format(parseISO(selectedDate), 'MMM dd, yyyy')}`;
    } else if (dateFilterType === 'month') {
      const [year, month] = selectedMonth.split('-');
      const date = new Date(year, month - 1, 1);
      return `Month: ${format(date, 'MMMM yyyy')}`;
    }
  }

  function calculateSubtotal(sale) {
    const discountPercentage = parseFloat(sale.discount || 0);
    const totalAmount = parseFloat(sale.total_amount);
    return discountPercentage > 0 
      ? totalAmount / (1 - (discountPercentage / 100))
      : totalAmount;
  }

  function calculateDiscountAmount(sale) {
    const subtotal = calculateSubtotal(sale);
    const totalAmount = parseFloat(sale.total_amount);
    return subtotal - totalAmount;
  }

  function calculateChange(sale) {
    return sale.change_amount || 
      parseFloat(sale.amount_paid) - parseFloat(sale.total_amount);
  }

  function fetchSaleDetails(saleId) {
    apiClient.get(`/sales.php?id=${saleId}`)
      .then(response => {
        setSelectedSale(response.data);
        setShowSaleDetail(true);
      })
      .catch(err => {
        console.error("Error fetching sale details:", err);
        alert("Could not load sale details. Please try again.");
      });
  }

  function handlePageChange(tab, newPage) {
    setCurrentPage(prev => ({
      ...prev,
      [tab]: newPage
    }));
  }
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
};

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
                      e.stopPropagation();
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

const getPaginatedData = (data, currentPage, itemsPerPage) => {
  if (!data || !Array.isArray(data)) return [];
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return data.slice(startIndex, endIndex);
};

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