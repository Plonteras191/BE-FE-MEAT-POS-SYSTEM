import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../styles/ManageInventory.css";
import Modal from "../components/Modal"; // Import the reusable modal component
import { productsApi, categoriesApi, stockAdjustmentsApi } from "../services/api"; // Import API services
import { addDays, format, parseISO } from "date-fns"; // Import date-fns

const ManageInventory = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("all"); // State for category filter
  const [showDeleted, setShowDeleted] = useState(false); // State to toggle showing deleted items
  const [formData, setFormData] = useState({
    type: "", category_id: "", customCategory: "", supplier: "", weight: "", price: "", expiry_date: "", stock_alert: "10"
  });
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Separate state for different alert types
  const [showLowStockAlert, setShowLowStockAlert] = useState(false);
  const [showNoStockAlert, setShowNoStockAlert] = useState(false);
  const [showExpiryAlert, setShowExpiryAlert] = useState(false);
  
  const [lowStockItems, setLowStockItems] = useState([]);
  const [noStockItems, setNoStockItems] = useState([]);
  const [expiryItems, setExpiryItems] = useState([]);
  
  // Add state for product form modal
  const [showProductForm, setShowProductForm] = useState(false);
  
  // Modal states
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    content: "",
    type: "info",
    actionButtons: []
  });
  
  // Stock adjustment modal states
  const [stockAdjustmentModal, setStockAdjustmentModal] = useState({
    isOpen: false,
    product: null,
    reason: "",
    quantity: "1",
    notes: ""
  });

  // Validation modal states
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  
  // Constants for expiry date warnings (in days)
  const EXPIRY_WARNING_DAYS = 7; // Products expiring within 7 days
  
  // Default expiration date (2 days from now)
  const getDefaultExpiryDate = () => {
    return addDays(new Date(), 2);
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    // Also update product statuses when component mounts
    updateProductStatuses();
  }, [showDeleted]); // Refetch when showDeleted toggle changes

  // Apply category filter effect
  useEffect(() => {
    if (products.length > 0) {
      filterProductsByCategory(categoryFilter);
    }
  }, [products, categoryFilter]);

  // Filter products by selected category
  const filterProductsByCategory = (categoryId) => {
    if (categoryId === "all") {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product => product.category_id === categoryId);
      setFilteredProducts(filtered);
    }
  };

  // Handle category filter change
  const handleCategoryFilterChange = (e) => {
    setCategoryFilter(e.target.value);
  };

  // Function to toggle showing deleted items
  const toggleShowDeleted = () => {
    setShowDeleted(!showDeleted);
  };

  // Function to update all product statuses based on expiry dates
  const updateProductStatuses = async () => {
    try {
      await productsApi.updateStatuses();
      // After updating statuses, fetch products again
      fetchProducts();
    } catch (err) {
      console.error("Failed to update product statuses:", err);
    }
  };

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      // Use the appropriate API call based on showDeleted state
      const response = showDeleted 
        ? await productsApi.getAllWithDeleted()
        : await productsApi.getAll();
      
      // Ensure we got an array
      const productsData = Array.isArray(response.data) ? response.data : [];
      setProducts(productsData);
      setFilteredProducts(productsData); // Initialize filtered products with all products
      setError(null);
      checkInventoryAlerts(productsData);
    } catch (err) {
      setError("Failed to fetch products");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Updated function to check all three types of alerts
  const checkInventoryAlerts = (productsData = []) => {
    if (!Array.isArray(productsData)) {
      console.error("Products data is not an array:", productsData);
      return;
    }
    
    // Only check active/non-deleted products
    const activeProducts = productsData.filter(p => p.is_deleted !== '1');
    
    // Check low stock (greater than 0 but below alert level)
    const lowStock = activeProducts.filter(p => 
      parseFloat(p.weight) > 0 && 
      parseFloat(p.weight) <= parseFloat(p.stock_alert)
    );
    setLowStockItems(lowStock);
    setShowLowStockAlert(lowStock.length > 0);
    
    // Check no stock (exactly 0)
    const noStock = activeProducts.filter(p => parseFloat(p.weight) === 0);
    setNoStockItems(noStock);
    setShowNoStockAlert(noStock.length > 0);
    
    // Check expiring products based on status (only for active/non-deleted products)
    const expiringItems = activeProducts.filter(p => p.status === 'expiring');
    setExpiryItems(expiringItems);
    setShowExpiryAlert(expiringItems.length > 0);
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesApi.getAll();
      
      // Ensure we got an array
      const categoriesData = Array.isArray(response.data) ? response.data : [];
      setCategories(categoriesData);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setCategories([]); // Set to empty array on error
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Input validation for numeric fields
    if ((name === "weight" || name === "price" || name === "stock_alert") && value !== "" && parseFloat(value) < 0) {
      showModal({
        title: "Validation Error",
        content: `${name.charAt(0).toUpperCase() + name.slice(1)} cannot be negative.`,
        type: "error"
      });
      return;
    }
    
    // Clear customCategory if a category is selected (not "custom")
    if (name === "category_id" && value !== "custom") {
      setFormData({ ...formData, [name]: value, customCategory: "" });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Date change handler
  const handleDateChange = (date) => {
    setFormData({ ...formData, expiry_date: date ? format(date, 'yyyy-MM-dd') : "" });
  };

  const validateForm = () => {
    const errors = [];
    
    // Check for negative or zero values
    if (!editingId && (!formData.weight || parseFloat(formData.weight) <= 0)) {
      errors.push("Weight must be greater than 0.");
    }
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      errors.push("Price must be greater than 0.");
    }
    
    if (formData.stock_alert && parseFloat(formData.stock_alert) <= 0) {
      errors.push("Stock alert must be greater than 0.");
    }
    
    // Check if expiry date is valid
    if (!formData.expiry_date) {
      errors.push("Expiry date is required.");
    }
    
    // Check if type is provided
    if (!formData.type.trim()) {
      errors.push("Product type is required.");
    }
    
    // Check if supplier is provided
    if (!formData.supplier || !formData.supplier.trim()) {
      errors.push("Supplier is required.");
    }
    
    // Check if custom category is provided when "custom" is selected
    if (formData.category_id === "custom" && (!formData.customCategory || !formData.customCategory.trim())) {
      errors.push("Custom category name is required.");
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowValidationModal(true);
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Prepare payload according to backend expectations
      const payload = { ...formData };
      
      if (editingId) {
        // When editing, include the current weight in the payload
        // Find the current product to get its weight
        const currentProduct = products.find(p => p.product_id === editingId);
        payload.weight = currentProduct ? currentProduct.weight : "0.00";
        
        await productsApi.update({
          ...payload,
          product_id: editingId
        });
        
        showModal({
          title: "Success",
          content: "Product updated successfully!",
          type: "success"
        });
      } else {
        await productsApi.create(payload);
        
        showModal({
          title: "Success",
          content: "Product added successfully!",
          type: "success"
        });
      }
      
      resetForm();
      closeProductForm();
      fetchProducts();
    } catch (err) {
      showModal({
        title: "Error",
        content: err.response?.data?.message || err.response?.data?.error || "An error occurred",
        type: "error"
      });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddProductForm = () => {
    resetForm();
    setEditingId(null);
    // Set default expiry date to 2 days from now
    setFormData(prev => ({
      ...prev,
      expiry_date: format(getDefaultExpiryDate(), 'yyyy-MM-dd')
    }));
    setShowProductForm(true);
  };

  const handleEdit = (product) => {
    setEditingId(product.product_id);
    setFormData({
      type: product.type,
      category_id: product.category_id || "",
      customCategory: "", // We don't get this back from the server
      supplier: product.supplier || "",
      weight: product.weight, // Store the weight for reference, even though it's disabled in form
      price: product.price,
      expiry_date: product.expiry_date || "",
      stock_alert: product.stock_alert || "10"
    });
    setShowProductForm(true);
  };

  const closeProductForm = () => {
    setShowProductForm(false);
  };

  const handleSoftDelete = async (id) => {
    showModal({
      title: "Confirm Removal",
      content: "Are you sure you want to remove this product from the inventory? The product will be marked as deleted but can be restored later.",
      type: "warning",
      actionButtons: [
        {
          label: "Cancel",
          onClick: () => closeModal()
        },
        {
          label: "Remove",
          type: "danger",
          onClick: async () => {
            try {
              setIsLoading(true);
              await productsApi.delete(id);
              fetchProducts();
              showModal({
                title: "Success",
                content: "Product removed successfully!",
                type: "success"
              });
            } catch (err) {
              showModal({
                title: "Error",
                content: err.response?.data?.error || "Failed to remove product",
                type: "error"
              });
              console.error(err);
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    });
  };

  const handleRestore = async (id) => {
    showModal({
      title: "Confirm Restoration",
      content: "Are you sure you want to restore this product to the active inventory?",
      type: "info",
      actionButtons: [
        {
          label: "Cancel",
          onClick: () => closeModal()
        },
        {
          label: "Restore",
          type: "primary",
          onClick: async () => {
            try {
              setIsLoading(true);
              await productsApi.restore(id);
              fetchProducts();
              showModal({
                title: "Success",
                content: "Product restored successfully!",
                type: "success"
              });
            } catch (err) {
              showModal({
                title: "Error",
                content: err.response?.data?.error || "Failed to restore product",
                type: "error"
              });
              console.error(err);
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    });
  };

  const openStockAdjustmentModal = (product, reason) => {
    setStockAdjustmentModal({
      isOpen: true,
      product,
      reason,
      quantity: "1",
      notes: ""
    });
  };

  const handleStockAdjustmentChange = (e) => {
    const { name, value } = e.target;
    
    // Validate quantity is not negative or zero
    if (name === "quantity" && value !== "" && parseFloat(value) <= 0) {
      showModal({
        title: "Validation Error",
        content: "Quantity must be greater than 0.",
        type: "error"
      });
      return;
    }
    
    setStockAdjustmentModal({
      ...stockAdjustmentModal,
      [name]: value
    });
  };

  const submitStockAdjustment = async () => {
    const { product, reason, quantity, notes } = stockAdjustmentModal;
    
    // For removal, check if there's enough stock
    if (reason === "remove" && parseFloat(quantity) > parseFloat(product.weight)) {
      showModal({
        title: "Stock Error",
        content: `Cannot remove ${quantity}kg as the current stock is only ${product.weight}kg.`,
        type: "error"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      await stockAdjustmentsApi.create({
        product_id: product.product_id,
        reason,
        quantity_change: reason === "add" ? quantity : -quantity,
        notes
      });
      
      fetchProducts();
      showModal({
        title: "Success",
        content: `Stock ${reason === "add" ? "added" : "removed"} successfully!`,
        type: "success"
      });
      setStockAdjustmentModal({ ...stockAdjustmentModal, isOpen: false });
    } catch (err) {
      showModal({
        title: "Error",
        content: err.response?.data?.error || `Failed to ${reason} stock`,
        type: "error"
      });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: "",
      category_id: "",
      customCategory: "",
      supplier: "",
      weight: "",
      price: "",
      expiry_date: format(getDefaultExpiryDate(), 'yyyy-MM-dd'),
      stock_alert: "10"
    });
    setEditingId(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      return format(parseISO(dateString), 'yyyy-MM-dd');
    } catch (e) {
      console.error("Error formatting date:", e);
      return dateString;
    }
  };

  // Close alert handlers
  const closeLowStockAlert = () => {
    setShowLowStockAlert(false);
  };

  const closeNoStockAlert = () => {
    setShowNoStockAlert(false);
  };

  const closeExpiryAlert = () => {
    setShowExpiryAlert(false);
  };

  // Function to show modal
  const showModal = (config) => {
    setModalConfig({
      isOpen: true,
      ...config
    });
  };

  // Function to close modal
  const closeModal = () => {
    setModalConfig({
      ...modalConfig,
      isOpen: false
    });
  };

  // Function to get days until expiry for a product
  const getDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return null;
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = parseISO(expiryDate);
      const diffTime = expiry - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    } catch (e) {
      console.error("Error calculating days until expiry:", e);
      return null;
    }
  };

  // Updated function to get row class based on product status and stock level
  const getRowClassName = (product) => {
    if (product.is_deleted === '1') return "deleted";
    if (product.status === 'expired') return "expired";
    if (product.status === 'expiring') return "near-expiry";
    if (parseFloat(product.weight) === 0) return "no-stock";
    if (parseFloat(product.weight) <= parseFloat(product.stock_alert)) return "low-stock";
    return "";
  };

  // Updated function to get status badge for the product
  const getStatusBadge = (product) => {
    if (product.is_deleted === '1') {
      return <span className="status-badge deleted-badge">REMOVED</span>;
    }
    
    if (parseFloat(product.weight) === 0) {
      return <span className="status-badge no-stock-badge">NO STOCK</span>;
    }
    
    switch (product.status) {
      case 'expired':
        return <span className="status-badge expired-badge">EXPIRED</span>;
      case 'expiring':
        const daysLeft = getDaysUntilExpiry(product.expiry_date);
        return daysLeft <= 0 
          ? <span className="status-badge expired-badge">EXPIRED</span>
          : <span className="status-badge expiring-badge">Expiring in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>;
      default:
        if (parseFloat(product.weight) <= parseFloat(product.stock_alert)) {
          return <span className="status-badge low-stock-badge">LOW STOCK</span>;
        }
        return null;
    }
  };

  // Function to check if a date should be disabled in the datepicker
  const isDateDisabled = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <div className="manage-inventory container">
      <h2>Manage Inventory</h2>
      
      {/* No Stock Alert Notification (RED) */}
      {showNoStockAlert && (
        <div className="stock-alert-container">
          <div className="stock-alert no-stock-alert">
            <div className="stock-alert-header">
              <h3>No Stock Alert!</h3>
              <button onClick={closeNoStockAlert} className="close-btn">×</button>
            </div>
            <div className="stock-alert-content">
              <p>The following products are out of stock:</p>
              <ul>
                {noStockItems.map(item => (
                  <li key={item.product_id}>
                    {item.type} - Current: {item.weight}kg
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Low Stock Alert Notification (YELLOW) */}
      {showLowStockAlert && (
        <div className="stock-alert-container">
          <div className="stock-alert low-stock-alert">
            <div className="stock-alert-header">
              <h3>Low Stock Alert!</h3>
              <button onClick={closeLowStockAlert} className="close-btn">×</button>
            </div>
            <div className="stock-alert-content">
              <p>The following products are below their stock alert level:</p>
              <ul>
                {lowStockItems.map(item => (
                  <li key={item.product_id}>
                    {item.type} - Current: {item.weight}kg (Alert level: {item.stock_alert}kg)
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Expiry Alert Notification (YELLOW) */}
      {showExpiryAlert && (
        <div className="expiry-alert-container">
          <div className="expiry-alert">
            <div className="expiry-alert-header">
              <h3>Products Expiring Soon!</h3>
              <button onClick={closeExpiryAlert} className="close-btn">×</button>
            </div>
            <div className="expiry-alert-content">
              <p>The following products will expire within {EXPIRY_WARNING_DAYS} days:</p>
              <ul>
                {expiryItems.map(item => {
                  const daysLeft = getDaysUntilExpiry(item.expiry_date);
                  return (
                    <li key={item.product_id}>
                      {item.type} - Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''} ({formatDate(item.expiry_date)})
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {error && <div className="error-message">{error}</div>}
      
      {/* Action buttons and filter controls */}
      <div className="action-controls">
        <div className="action-buttons">
          <button onClick={openAddProductForm} className="add-product-btn">
            Add New Product
          </button>
          
          {/* Toggle for showing deleted items */}
          <button 
            onClick={toggleShowDeleted} 
            className={`toggle-deleted-btn ${showDeleted ? 'active' : ''}`}
          >
            {showDeleted ? 'Hide Removed Products' : 'Show Removed Products'}
          </button>
        </div>
        
        {/* Category Filter */}
        <div className="filter-controls">
          <div className="filter-group">
            <label htmlFor="categoryFilter">Filter by Category:</label>
            <select
              id="categoryFilter"
              value={categoryFilter}
              onChange={handleCategoryFilterChange}
              className="category-filter"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.category_id} value={category.category_id}>
                  {category.category_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="table-container">
        <h3>Product Inventory {categoryFilter !== "all" && 
            `- ${categories.find(cat => cat.category_id === categoryFilter)?.category_name || 'Selected Category'}`}
        </h3>
        {isLoading && <p>Loading data...</p>}
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Category</th>
              <th>Supplier</th>
              <th>Weight (kg)</th>
              <th>Price (PHP/kg)</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th>Stock Alert</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="9" className="no-data">
                  {categoryFilter !== "all" 
                    ? "No products found in this category" 
                    : showDeleted
                      ? "No products found" 
                      : "No active products found"}
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => (
                <tr key={p.product_id} className={getRowClassName(p)}>
                  <td>{p.type}</td>
                  <td>{p.category_name || 'N/A'}</td>
                  <td>{p.supplier || 'N/A'}</td>
                  <td>{p.weight}</td>
                  <td>{p.price}</td>
                  <td>{formatDate(p.expiry_date)}</td>
                  <td>
                    {getStatusBadge(p)}
                  </td>
                  <td>{p.stock_alert}</td>
                  <td className="action-buttons">
                    {/* Show different actions based on whether the product is deleted or not */}
                    {p.is_deleted === '1' ? (
                      <button 
                        className="restore-btn" 
                        onClick={() => handleRestore(p.product_id)}
                      >
                        Restore
                      </button>
                    ) : (
                      <>
                        <button 
                          className="edit-btn" 
                          onClick={() => handleEdit(p)}
                        >
                          Edit
                        </button>
                        <button 
                          className="remove-btn" 
                          onClick={() => handleSoftDelete(p.product_id)}
                        >
                          Remove
                        </button>
                        <div className="stock-actions">
                          <button 
                            className="add-stock-btn" 
                            onClick={() => openStockAdjustmentModal(p, "add")}
                          >
                            + Stock
                          </button>
                          <button 
                            className="remove-stock-btn" 
                            onClick={() => openStockAdjustmentModal(p, "remove")}
                            disabled={parseFloat(p.weight) <= 0}
                          >
                            - Stock
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Product Form Modal */}
      <Modal
        isOpen={showProductForm}
        onClose={closeProductForm}
        title={editingId ? "Edit Product" : "Add New Product"}
        type="info"
        actionButtons={[
          {
            label: "Cancel",
            type: "secondary",
            onClick: closeProductForm
          },
          {
            label: isLoading ? "Processing..." : (editingId ? "Update Product" : "Add Product"),
            type: "primary",
            onClick: handleSubmit,
            disabled: isLoading
          }
        ]}
      >
        <form className="inventory-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="type">Product Type</label>
              <input
                type="text"
                id="type"
                name="type"
                placeholder="Product Type"
                value={formData.type}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="category_id">Category</label>
              <select
                id="category_id"
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
              >
                <option value="">Select Category</option>
                {Array.isArray(categories) && categories.map(cat => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.category_name}
                  </option>
                ))}
                <option value="custom">Other</option>
              </select>
              {/* Render manual input if "Other" is selected */}
              {formData.category_id === "custom" && (
                <input
                  type="text"
                  name="customCategory"
                  placeholder="Enter custom category"
                  value={formData.customCategory}
                  onChange={handleChange}
                  required
                />
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="supplier">Supplier</label>
              <input
                type="text"
                id="supplier"
                name="supplier"
                placeholder="Enter supplier name"
                value={formData.supplier}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="weight">Weight (kg)</label>
              <input
                type="number"
                id="weight"
                name="weight"
                step="0.01"
                min="0.01"
                placeholder="Weight (kg)"
                value={formData.weight}
                onChange={handleChange}
                required
                disabled={editingId !== null} // Disable weight field when editing
                className={editingId !== null ? "disabled-input" : ""}
              />
              {editingId !== null && (
                <small className="form-text text-muted">
                  Weight can only be modified using the + Stock and - Stock buttons.
                </small>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="price">Price (PHP/kg)</label>
              <input
                type="number"
                id="price"
                name="price"
                step="0.01"
                min="0.01"
                placeholder="Price (PHP/kg)"
                value={formData.price}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="expiry_date">Expiry Date</label>
              <DatePicker
                id="expiry_date"
                selected={formData.expiry_date ? parseISO(formData.expiry_date) : getDefaultExpiryDate()}
                onChange={handleDateChange}
                minDate={new Date()}
                filterDate={date => !isDateDisabled(date)}
                dateFormat="yyyy-MM-dd"
                className="form-control"
                placeholderText="Select expiry date"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="stock_alert">Stock Alert (kg)</label>
              <input
                type="number"
                id="stock_alert"
                name="stock_alert"
                step="0.01"
                min="0.01"
                placeholder="Stock Alert Level"
                value={formData.stock_alert}
                onChange={handleChange}
              />
            </div>
          </div>
        </form>
      </Modal>
      
      {/* Generic Modal */}
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        title={modalConfig.title}
        type={modalConfig.type}
        actionButtons={modalConfig.actionButtons}
      >
        <p>{modalConfig.content}</p>
      </Modal>
      
      {/* Validation Error Modal */}
      <Modal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        title="Validation Errors"
        type="error"
        actionButtons={[
          {
            label: "Close",
            onClick: () => setShowValidationModal(false)
          }
        ]}
      >
        <div>
          <p>Please correct the following errors:</p>
          <ul>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      </Modal>
      
      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={stockAdjustmentModal.isOpen}
        onClose={() => setStockAdjustmentModal({...stockAdjustmentModal, isOpen: false})}
        title={`${stockAdjustmentModal.reason === "add" ? "Add to" : "Remove from"} Stock`}
        type="info"
        actionButtons={[
          {
            label: "Cancel",
            type: "secondary",
            onClick: () => setStockAdjustmentModal({...stockAdjustmentModal, isOpen: false})
          },
          {
            label: "Submit",
            type: "primary",
            onClick: submitStockAdjustment
          }
        ]}
      >
        <div className="stock-adjustment-form">
          <p>Product: {stockAdjustmentModal.product?.type}</p>
          <p>Current Stock: {stockAdjustmentModal.product?.weight} kg</p>
          
          <div className="form-group">
            <label htmlFor="quantity">Quantity (kg):</label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              min="0.01"
              step="0.01"
              value={stockAdjustmentModal.quantity}
              onChange={handleStockAdjustmentChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="notes">Notes (optional):</label>
            <textarea
              id="notes"
              name="notes"
              value={stockAdjustmentModal.notes}
              onChange={handleStockAdjustmentChange}
              rows="3"
            ></textarea>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ManageInventory;