import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../styles/ManageInventory.css";
import Modal from "../components/Modal"; // Import the reusable modal component
import { productsApi, categoriesApi, stockAdjustmentsApi } from "../services/api"; // Import API services

const ManageInventory = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("all"); // State for category filter
  const [formData, setFormData] = useState({
    type: "",
    category_id: "",
    customCategory: "",
    supplier: "",
    weight: "",
    price: "",
    expiry_date: "",
    stock_alert: "10"
  });
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showStockAlert, setShowStockAlert] = useState(false);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [showExpiryAlert, setShowExpiryAlert] = useState(false);
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
  
  // Default expiration date (30 days from now)
  const getDefaultExpiryDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date;
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    // Also update product statuses when component mounts
    updateProductStatuses();
  }, []);

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
      const response = await productsApi.getAll();
      
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

  // Combined function to check both stock and expiry alerts
  const checkInventoryAlerts = (productsData = []) => {
    if (!Array.isArray(productsData)) {
      console.error("Products data is not an array:", productsData);
      return;
    }
    
    // Check low stock
    const lowStock = productsData.filter(p => parseFloat(p.weight) <= parseFloat(p.stock_alert));
    setLowStockItems(lowStock);
    setShowStockAlert(lowStock.length > 0);
    
    // Check expiring products based on status
    const expiringItems = productsData.filter(p => p.status === 'expiring');
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
    setFormData({ ...formData, expiry_date: date ? date.toISOString().split('T')[0] : "" });
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
        // When editing, don't include weight in the payload
        // as it's managed separately via stock adjustments
        const { weight, ...editPayload } = payload;
        
        await productsApi.update({
          ...editPayload,
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
    // Set default expiry date
    setFormData(prev => ({
      ...prev,
      expiry_date: getDefaultExpiryDate().toISOString().split('T')[0]
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
      weight: product.weight, // Still store the weight in form data for reference
      price: product.price,
      expiry_date: product.expiry_date || "",
      stock_alert: product.stock_alert || "10"
    });
    setShowProductForm(true);
  };

  const closeProductForm = () => {
    setShowProductForm(false);
  };

  const handleDelete = async (id) => {
    showModal({
      title: "Confirm Deletion",
      content: "Are you sure you want to delete this product? This will also remove related sales and stock adjustment records.",
      type: "warning",
      actionButtons: [
        {
          label: "Cancel",
          onClick: () => closeModal()
        },
        {
          label: "Delete",
          type: "danger",
          onClick: async () => {
            try {
              setIsLoading(true);
              await productsApi.delete(id);
              fetchProducts();
              showModal({
                title: "Success",
                content: "Product deleted successfully!",
                type: "success"
              });
            } catch (err) {
              showModal({
                title: "Error",
                content: err.response?.data?.error || "Failed to delete product",
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
      expiry_date: getDefaultExpiryDate().toISOString().split('T')[0],
      stock_alert: "10"
    });
    setEditingId(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const closeStockAlert = () => {
    setShowStockAlert(false);
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
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Function to get row class based on product status and stock level
  const getRowClassName = (product) => {
    if (product.status === 'expired') return "expired";
    if (product.status === 'expiring') return "near-expiry";
    if (parseFloat(product.weight) <= parseFloat(product.stock_alert)) return "low-stock";
    return "";
  };

  // Function to get status badge for the product
  const getStatusBadge = (product) => {
    switch (product.status) {
      case 'expired':
        return <span className="status-badge expired-badge">EXPIRED</span>;
      case 'expiring':
        const daysLeft = getDaysUntilExpiry(product.expiry_date);
        return <span className="status-badge expiring-badge">Expiring in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>;
      default:
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
      
      {/* Stock Alert Notification */}
      {showStockAlert && (
        <div className="stock-alert-container">
          <div className="stock-alert">
            <div className="stock-alert-header">
              <h3>Low Stock Alert!</h3>
              <button onClick={closeStockAlert} className="close-btn">×</button>
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
      
      {/* Expiry Alert Notification */}
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
                    : "No products found"}
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
                    <button 
                      className="edit-btn" 
                      onClick={() => handleEdit(p)}
                    >
                      Edit
                    </button>
                    <button 
                      className="delete-btn" 
                      onClick={() => handleDelete(p.product_id)}
                    >
                      Delete
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
                      >
                        - Stock
                      </button>
                    </div>
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
                selected={formData.expiry_date ? new Date(formData.expiry_date) : getDefaultExpiryDate()}
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