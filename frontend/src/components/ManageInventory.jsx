import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/ManageInventory.css";

const ManageInventory = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  // Removed suppliers state as supplier is now manually entered
  const [formData, setFormData] = useState({
    type: "",
    category_id: "",
    customCategory: "",
    supplier: "", // changed from supplier_id to supplier (manual input)
    weight: "",
    price: "",
    expiry_date: "",
    stock_alert: "10"
  });
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [showStockAlert, setShowStockAlert] = useState(false);
  const [lowStockItems, setLowStockItems] = useState([]);

  const API_URL = "http://localhost/MEAT_POS/backend/api";

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    // Removed fetchSuppliers() since supplier is now manually input.
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/products.php`);
      
      // Ensure we got an array
      const productsData = Array.isArray(response.data) ? response.data : [];
      setProducts(productsData);
      setError(null);
      checkLowStock(productsData);
    } catch (err) {
      setError("Failed to fetch products");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkLowStock = (productsData = []) => {
    if (!Array.isArray(productsData)) {
      console.error("Products data is not an array:", productsData);
      return;
    }
    
    const lowStock = productsData.filter(p => parseFloat(p.weight) <= parseFloat(p.stock_alert));
    setLowStockItems(lowStock);
    setShowStockAlert(lowStock.length > 0);
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/categories.php`);
      
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
    // Clear customCategory if a category is selected (not "custom")
    if (name === "category_id" && value !== "custom") {
      setFormData({ ...formData, [name]: value, customCategory: "" });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Optionally, if the category_id is "custom" include the custom category
      const payload = { ...formData };
      
      if (payload.category_id === "custom") {
        // You may decide to replace the category_id or add a new field.
        payload.category_id = null;  // or leave it as "custom"
      }
      
      if (editingId) {
        await axios.put(`${API_URL}/products.php`, {
          ...payload,
          product_id: editingId
        });
        setSuccessMessage("Product updated successfully!");
      } else {
        await axios.post(`${API_URL}/products.php`, payload);
        setSuccessMessage("Product added successfully!");
      }
      
      resetForm();
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred");
      console.error(err);
    } finally {
      setIsLoading(false);
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  const handleEdit = (product) => {
    setEditingId(product.product_id);
    setFormData({
      type: product.type,
      category_id: product.category_id || "",
      customCategory: product.customCategory || "",
      // Adjust for supplier manual input
      supplier: product.supplier || "",
      weight: product.weight,
      price: product.price,
      expiry_date: product.expiry_date || "",
      stock_alert: product.stock_alert || "10"
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        setIsLoading(true);
        await axios.delete(`${API_URL}/products.php?id=${id}`);
        fetchProducts();
        setSuccessMessage("Product deleted successfully!");
      } catch (err) {
        setError("Failed to delete product");
        console.error(err);
      } finally {
        setIsLoading(false);
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    }
  };

  const handleStockAdjustment = async (product, reason) => {
    const qtyStr = prompt(`Enter quantity (kg) to ${reason} for ${product.type}:`, "1");
    if (qtyStr === null) return; // User clicked cancel
    
    const qty = parseFloat(qtyStr);
    
    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid quantity");
      return;
    }
    
    const notes = prompt("Add notes (optional):", "");
    if (notes === null) return; // User clicked cancel
    
    try {
      setIsLoading(true);
      await axios.post(`${API_URL}/stock_adjustments.php`, {
        product_id: product.product_id,
        reason,
        quantity_change: reason === "add" ? qty : -qty,
        notes
      });
      
      fetchProducts();
      setSuccessMessage(`Stock ${reason === "add" ? "added" : "removed"} successfully!`);
    } catch (err) {
      setError(`Failed to ${reason} stock`);
      console.error(err);
    } finally {
      setIsLoading(false);
      setTimeout(() => setSuccessMessage(""), 3000);
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
      expiry_date: "",
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

  return (
    <div className="manage-inventory container">
      <h2>Manage Inventory</h2>
      
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
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      
      <form onSubmit={handleSubmit} className="inventory-form">
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
              placeholder="Weight (kg)"
              value={formData.weight}
              onChange={handleChange}
              required
            />
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
              placeholder="Price (PHP/kg)"
              value={formData.price}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="expiry_date">Expiry Date</label>
            <input
              type="date"
              id="expiry_date"
              name="expiry_date"
              value={formData.expiry_date}
              onChange={handleChange}
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
              placeholder="Stock Alert Level"
              value={formData.stock_alert}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Processing..." : (editingId ? "Update Product" : "Add Product")}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="cancel-btn">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="table-container">
        <h3>Product Inventory</h3>
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
              <th>Stock Alert</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data">No products found</td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.product_id} className={parseFloat(p.weight) <= parseFloat(p.stock_alert) ? "low-stock" : ""}>
                  <td>{p.type}</td>
                  <td>{p.category_name || (p.customCategory ? p.customCategory : 'N/A')}</td>
                  <td>{p.supplier || 'N/A'}</td>
                  <td>{p.weight}</td>
                  <td>{p.price}</td>
                  <td>{formatDate(p.expiry_date)}</td>
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
                        onClick={() => handleStockAdjustment(p, "add")}
                      >
                        + Stock
                      </button>
                      <button 
                        className="remove-stock-btn" 
                        onClick={() => handleStockAdjustment(p, "remove")}
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
    </div>
  );
};

export default ManageInventory;
