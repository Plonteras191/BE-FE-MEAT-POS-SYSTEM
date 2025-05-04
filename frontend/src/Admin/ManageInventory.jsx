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
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [showDeleted, setShowDeleted] = useState(false);
    const [formData, setFormData] = useState({
        type: "", category_id: "", customCategory: "", supplier: "", weight: "", price: "", expiry_date: "", stock_alert: "10"
    });
    const [editingId, setEditingId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showLowStockAlert, setShowLowStockAlert] = useState(false);
    const [showNoStockAlert, setShowNoStockAlert] = useState(false);
    const [showExpiryAlert, setShowExpiryAlert] = useState(false);
    const [lowStockItems, setLowStockItems] = useState([]);
    const [noStockItems, setNoStockItems] = useState([]);
    const [expiryItems, setExpiryItems] = useState([]);
    const [showProductForm, setShowProductForm] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: "",
        content: "",
        type: "info",
        actionButtons: []
    });
    const [stockAdjustmentModal, setStockAdjustmentModal] = useState({
        isOpen: false,
        product: null,
        reason: "",
        quantity: "1",
        notes: ""
    });
    const [validationErrors, setValidationErrors] = useState([]);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const EXPIRY_WARNING_DAYS = 7;
    const getDefaultExpiryDate = () => addDays(new Date(), 2);

    // Pagination state - changed from 10 to 5 per page
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(5);

    useEffect(() => {
        fetchProducts();
        fetchCategories();
        updateProductStatuses();
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [showDeleted]);

    useEffect(() => {
        if (products.length >= 0) {
            filterProductsByCategory(categoryFilter);
        }
    }, [products, categoryFilter, showDeleted]);

    // Adjust currentPage when filteredProducts changes
    useEffect(() => {
        const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        } else if (totalPages === 0) {
            setCurrentPage(1);
        }
    }, [filteredProducts, itemsPerPage]);

    const filterProductsByCategory = (categoryId) => {
        let tempFiltered = [];
        if (categoryId === "all") {
            tempFiltered = [...products];
        } else {
            tempFiltered = products.filter(product => product.category_id === categoryId);
        }
        tempFiltered = showDeleted
            ? tempFiltered.filter(product => product.is_deleted === '1')
            : tempFiltered.filter(product => product.is_deleted !== '1');
        setFilteredProducts(tempFiltered);
    };

    const handleCategoryFilterChange = (e) => setCategoryFilter(e.target.value);
    const toggleShowDeleted = () => {
        setShowDeleted(prev => !prev);
        setCurrentPage(1); // Reset to first page when toggling between active and removed
    };

    const updateProductStatuses = async () => {
        try {
            await productsApi.updateStatuses();
        } catch (err) {
            console.error("Failed to update product statuses:", err);
        }
    };

    const fetchProducts = async () => {
        try {
            setIsLoading(true);
            const response = showDeleted ? await productsApi.getAllWithDeleted() : await productsApi.getAll();
            const productsData = Array.isArray(response.data) ? response.data : [];
            setProducts(productsData);
            setError(null);
            checkInventoryAlerts(productsData);
        } catch (err) {
            setError("Failed to fetch products");
            console.error(err);
            setProducts([]);
            setFilteredProducts([]);
        } finally {
            setIsLoading(false);
        }
    };

    const checkInventoryAlerts = (productsData = []) => {
        if (!Array.isArray(productsData)) return;
        const activeProducts = productsData.filter(p => p.is_deleted !== '1');
        const lowStock = activeProducts.filter(p => parseFloat(p.weight) > 0 && parseFloat(p.weight) <= parseFloat(p.stock_alert));
        setLowStockItems(lowStock);
        setShowLowStockAlert(lowStock.length > 0);
        const noStock = activeProducts.filter(p => parseFloat(p.weight) === 0);
        setNoStockItems(noStock);
        setShowNoStockAlert(noStock.length > 0);
        const expiringItems = activeProducts.filter(p => p.status === 'expiring');
        setExpiryItems(expiringItems);
        setShowExpiryAlert(expiringItems.length > 0);
    };

    const fetchCategories = async () => {
        try {
            const response = await categoriesApi.getAll();
            setCategories(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error("Failed to fetch categories:", err);
            setCategories([]);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if ((name === "weight" || name === "price" || name === "stock_alert") && value !== "" && parseFloat(value) < 0) {
            showModal({
                title: "Validation Error",
                content: `${name.charAt(0).toUpperCase() + name.slice(1)} cannot be negative.`,
                type: "error"
            });
            return;
        }
        setFormData(prev => ({
            ...prev,
            [name]: value,
            ...(name === "category_id" && value !== "custom" ? { customCategory: "" } : {})
        }));
    };

    const handleDateChange = (date) => setFormData(prev => ({ ...prev, expiry_date: date ? format(date, 'yyyy-MM-dd') : "" }));

    const validateForm = () => {
        const errors = [];
        if (!editingId && (!formData.weight || parseFloat(formData.weight) <= 0)) errors.push("Weight must be greater than 0 when adding.");
        if (!formData.price || parseFloat(formData.price) <= 0) errors.push("Price must be greater than 0.");
        if (formData.stock_alert && parseFloat(formData.stock_alert) < 0) errors.push("Stock alert cannot be negative.");
        if (!formData.expiry_date) errors.push("Expiry date is required.");
        else {
            try {
                const selectedDate = parseISO(formData.expiry_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (selectedDate < today) errors.push("Expiry date cannot be in the past.");
            } catch (e) {
                errors.push("Invalid expiry date format.");
            }
        }
        if (!formData.type.trim()) errors.push("Product type is required.");
        if (!formData.supplier || !formData.supplier.trim()) errors.push("Supplier is required.");
        if (!formData.category_id) errors.push("Category must be selected.");
        else if (formData.category_id === "custom" && (!formData.customCategory || !formData.customCategory.trim())) errors.push("Custom category name is required when 'Other' is selected.");
        if (errors.length > 0) {
            setValidationErrors(errors);
            setShowValidationModal(true);
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!validateForm()) return;
        setIsLoading(true);
        try {
            const payload = { ...formData };
            if (editingId) {
                delete payload.weight;
                await productsApi.update({ ...payload, product_id: editingId });
                showModal({ title: "Success", content: "Product details updated successfully!", type: "success" });
            } else {
                await productsApi.create(payload);
                showModal({ title: "Success", content: "Product added successfully!", type: "success" });
            }
            resetForm();
            closeProductForm();
            fetchProducts();
        } catch (err) {
            showModal({ title: "Error", content: err.response?.data?.message || err.response?.data?.error || "An error occurred", type: "error" });
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const openAddProductForm = () => {
        resetForm();
        setEditingId(null);
        setFormData(prev => ({ ...prev, expiry_date: format(getDefaultExpiryDate(), 'yyyy-MM-dd'), stock_alert: "10" }));
        setShowProductForm(true);
    };

    const handleEdit = (product) => {
        setEditingId(product.product_id);
        setFormData({
            type: product.type,
            category_id: product.category_id || "",
            customCategory: "",
            supplier: product.supplier || "",
            weight: product.weight,
            price: product.price,
            expiry_date: product.expiry_date ? format(parseISO(product.expiry_date), 'yyyy-MM-dd') : "",
            stock_alert: product.stock_alert || "10"
        });
        setShowProductForm(true);
    };

    const closeProductForm = () => {
        setShowProductForm(false);
        resetForm();
    };

    const handleSoftDelete = async (id) => {
        showModal({
            title: "Confirm Removal",
            content: "Are you sure you want to remove this product from the inventory? The product will be marked as deleted but can be restored later.",
            type: "warning",
            actionButtons: [
                { label: "Cancel", onClick: () => closeModal() },
                {
                    label: "Remove",
                    type: "danger",
                    onClick: async () => {
                        closeModal();
                        try {
                            setIsLoading(true);
                            await productsApi.delete(id);
                            fetchProducts();
                            showModal({ title: "Success", content: "Product removed successfully!", type: "success" });
                        } catch (err) {
                            showModal({ title: "Error", content: err.response?.data?.error || "Failed to remove product", type: "error" });
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
                { label: "Cancel", onClick: () => closeModal() },
                {
                    label: "Restore",
                    type: "primary",
                    onClick: async () => {
                        closeModal();
                        try {
                            setIsLoading(true);
                            await productsApi.restore(id);
                            setShowDeleted(false);
                            showModal({ title: "Success", content: "Product restored successfully!", type: "success" });
                        } catch (err) {
                            showModal({ title: "Error", content: err.response?.data?.error || "Failed to restore product", type: "error" });
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
        setStockAdjustmentModal({ isOpen: true, product, reason, quantity: "1", notes: "" });
    };

    const handleStockAdjustmentChange = (e) => {
        const { name, value } = e.target;
        if (name === "quantity" && value.startsWith('-')) return;
        setStockAdjustmentModal(prev => ({ ...prev, [name]: value }));
    };

    const submitStockAdjustment = async () => {
        const { product, reason, quantity, notes } = stockAdjustmentModal;
        const quantityNum = parseFloat(quantity);
        if (isNaN(quantityNum) || quantityNum <= 0) {
            showModal({ title: "Validation Error", content: "Quantity must be a positive number greater than 0.", type: "error" });
            return;
        }
        if (reason === "remove" && quantityNum > parseFloat(product.weight)) {
            showModal({ title: "Stock Error", content: `Cannot remove ${quantity}kg as the current stock is only ${product.weight}kg.`, type: "error" });
            return;
        }
        setStockAdjustmentModal(prev => ({ ...prev, isOpen: false }));
        setIsLoading(true);
        try {
            await stockAdjustmentsApi.create({
                product_id: product.product_id,
                reason,
                quantity_change: reason === "add" ? quantityNum : -quantityNum,
                notes: notes || null
            });
            fetchProducts();
            showModal({ title: "Success", content: `Stock ${reason === "add" ? "added" : "removed"} successfully!`, type: "success" });
            setStockAdjustmentModal({ isOpen: false, product: null, reason: "", quantity: "1", notes: "" });
        } catch (err) {
            showModal({ title: "Error", content: err.response?.data?.error || `Failed to ${reason} stock`, type: "error" });
            console.error(err);
            setStockAdjustmentModal({ isOpen: false, product: null, reason: "", quantity: "1", notes: "" });
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
        setValidationErrors([]);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        try {
            if (dateString === '0000-00-00' || dateString.startsWith('0000')) return "Invalid Date";
            return format(parseISO(dateString), 'MM/dd/yyyy');
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return dateString;
        }
    };

    const closeLowStockAlert = () => setShowLowStockAlert(false);
    const closeNoStockAlert = () => setShowNoStockAlert(false);
    const closeExpiryAlert = () => setShowExpiryAlert(false);

    const showModal = (config) => setModalConfig({ isOpen: true, ...config });
    const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

    const getDaysUntilExpiry = (expiryDate) => {
        if (!expiryDate || expiryDate === '0000-00-00' || expiryDate.startsWith('0000')) return null;
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const expiry = parseISO(expiryDate);
            expiry.setHours(0, 0, 0, 0);
            return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        } catch (e) {
            console.error("Error calculating days until expiry:", expiryDate, e);
            return null;
        }
    };

    const getRowClassName = (product) => {
        if (product.is_deleted === '1') return "deleted";
        const weight = parseFloat(product.weight);
        const stockAlert = parseFloat(product.stock_alert);
        const daysLeft = getDaysUntilExpiry(product.expiry_date);
        if (daysLeft !== null && daysLeft <= 0) return "expired";
        if (daysLeft !== null && daysLeft <= EXPIRY_WARNING_DAYS) return "near-expiry";
        if (weight === 0) return "no-stock";
        if (weight > 0 && weight <= stockAlert) return "low-stock";
        return "";
    };

    const getStatusBadge = (product) => {
        if (product.is_deleted === '1') return <span className="status-badge removed-badge">REMOVED</span>;
        const weight = parseFloat(product.weight);
        const stockAlert = parseFloat(product.stock_alert);
        const daysLeft = getDaysUntilExpiry(product.expiry_date);
        if (daysLeft !== null && daysLeft <= 0) return <span className="status-badge expired-badge">EXPIRED</span>;
        if (weight === 0) return <span className="status-badge no-stock-badge">NO STOCK</span>;
        if (daysLeft !== null && daysLeft <= EXPIRY_WARNING_DAYS) return <span className="status-badge expiring-badge">Expiring in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>;
        if (weight > 0 && weight <= stockAlert) return <span className="status-badge low-stock-badge">LOW STOCK</span>;
        return <span className="status-badge good-status-badge">ACTIVE</span>;
    };

    const isDateDisabled = (date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    // Calculate paginated products
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;

    return (
        <div className="manage-inventory-container">
            <h1>Manage Inventory</h1>

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
                                    <li key={item.product_id}>{item.type} - Current: {item.weight}kg</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

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
                                    <li key={item.product_id}>{item.type} - Current: {item.weight}kg (Alert level: {item.stock_alert}kg)</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

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
                                    if (daysLeft !== null && daysLeft > 0) {
                                        return (
                                            <li key={item.product_id}>{item.type} - Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''} ({formatDate(item.expiry_date)})</li>
                                        );
                                    } else if (daysLeft !== null && daysLeft <= 0) {
                                        return (
                                            <li key={item.product_id} className="expired-item">{item.type} - Expired on {formatDate(item.expiry_date)}</li>
                                        );
                                    }
                                    return null;
                                })}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {error && <div className="error-message">{error}</div>}

            <div className="action-controls">
                <div className="action-buttons">
                    <button onClick={openAddProductForm} className="add-product-btn">Add New Product</button>
                    <button onClick={toggleShowDeleted} className={`toggle-deleted-btn ${showDeleted ? 'active' : ''}`}>
                        {showDeleted ? 'Hide Removed Products' : 'Show Removed Products'}
                    </button>
                </div>
                <div className="filter-controls">
                    <div className="filter-group">
                        <label htmlFor="categoryFilter">Filter by Category:</label>
                        <select id="categoryFilter" value={categoryFilter} onChange={handleCategoryFilterChange} className="category-filter" disabled={isLoading}>
                            <option value="all">All Categories</option>
                            {categories.map(category => (
                                <option key={category.category_id} value={category.category_id}>{category.category_name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="table-container">
                <h3>
                    {showDeleted ? 'Removed Product Inventory' : 'Active Product Inventory'}
                    {categoryFilter !== "all" && categories.find(cat => cat.category_id === categoryFilter) &&
                        ` - ${categories.find(cat => cat.category_id === categoryFilter)?.category_name}`}
                </h3>
                {isLoading && <div className="loading-indicator"><p>Loading data...</p></div>}
                {!isLoading && (
                    <>
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
                                    <th>Stock Alert(kg)</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="no-data">
                                            {showDeleted
                                                ? (categoryFilter !== "all" ? "No removed products found in this category" : "No removed products found")
                                                : (categoryFilter !== "all" ? "No active products found in this category" : "No active products found")}
                                        </td>
                                    </tr>
                                ) : (
                                    currentProducts.map((p) => (
                                        <tr key={p.product_id} className={getRowClassName(p)}>
                                            <td>{p.type}</td>
                                            <td>{p.category_name || 'N/A'}</td>
                                            <td>{p.supplier || 'N/A'}</td>
                                            <td>{p.weight}</td>
                                            <td>{p.price}</td>
                                            <td>{formatDate(p.expiry_date)}</td>
                                            <td>{getStatusBadge(p)}</td>
                                            <td>{p.stock_alert} kg</td>
                                            <td className="action-cell">
                                                {p.is_deleted === '1' ? (
                                                    <div className="action-buttons-inline">
                                                        <button className="restore-btn" onClick={() => handleRestore(p.product_id)} disabled={isLoading}>Restore</button>
                                                    </div>
                                                ) : (
                                                    <div className="action-buttons-stacked">
                                                        <div className="action-buttons-inline">
                                                            <button className="edit-btn" onClick={() => handleEdit(p)} disabled={isLoading}>Edit</button>
                                                            <button className="remove-btn" onClick={() => handleSoftDelete(p.product_id)} disabled={isLoading}>Remove</button>
                                                        </div>
                                                        <div className="stock-actions action-buttons-inline">
                                                            <button className="add-stock-btn" onClick={() => openStockAdjustmentModal(p, "add")} disabled={isLoading}>+ Stock</button>
                                                            <button className="remove-stock-btn" onClick={() => openStockAdjustmentModal(p, "remove")} disabled={parseFloat(p.weight) <= 0 || isLoading}>- Stock</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        {filteredProducts.length > 0 && (
                            <div className="pagination">
                                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1 || isLoading}>Previous</button>
                                <span>Page {currentPage} of {totalPages}</span>
                                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || isLoading}>Next</button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <Modal
                isOpen={showProductForm}
                onClose={closeProductForm}
                title={editingId ? "Edit Product Details" : "Add New Product"}
                type="form"
                actionButtons={[
                    { label: "Cancel", type: "secondary", onClick: closeProductForm, disabled: isLoading },
                    { label: isLoading ? "Processing..." : (editingId ? "Update Details" : "Add Product"), type: "primary", onClick: handleSubmit, isSubmit: true, disabled: isLoading }
                ]}
            >
                <form className="inventory-form" onSubmit={handleSubmit} noValidate>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="type">Product Type *</label>
                            <input type="text" id="type" name="type" placeholder="e.g., Chicken Breast" value={formData.type} onChange={handleChange} required disabled={isLoading} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="category_id">Category *</label>
                            <select id="category_id" name="category_id" value={formData.category_id} onChange={handleChange} required disabled={isLoading}>
                                <option value="" disabled>Select Category...</option>
                                {Array.isArray(categories) && categories.map(cat => (
                                    <option key={cat.category_id} value={cat.category_id}>{cat.category_name}</option>
                                ))}
                                <option value="custom">Other (Specify Below)</option>
                            </select>
                            {formData.category_id === "custom" && (
                                <input type="text" name="customCategory" placeholder="Enter custom category name *" value={formData.customCategory} onChange={handleChange} required={formData.category_id === "custom"} className="custom-category-input" disabled={isLoading} />
                            )}
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="supplier">Supplier *</label>
                            <input type="text" id="supplier" name="supplier" placeholder="Enter supplier name" value={formData.supplier} onChange={handleChange} required disabled={isLoading} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="weight">{editingId ? 'Current Weight (kg)' : 'Initial Weight (kg) *'}</label>
                            <input type="number" id="weight" name="weight" step="0.01" min={editingId ? undefined : "0.01"} placeholder={editingId ? "" : "e.g., 10.5"} value={formData.weight} onChange={handleChange} required={!editingId} disabled={editingId !== null || isLoading} className={editingId !== null ? "disabled-input" : ""} />
                            {editingId !== null && <small className="form-text text-muted">Adjust weight using '+ Stock' / '- Stock' buttons on the main table.</small>}
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="price">Price (PHP/kg) *</label>
                            <input type="number" id="price" name="price" step="0.01" min="0.01" placeholder="e.g., 180.50" value={formData.price} onChange={handleChange} required disabled={isLoading} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="expiry_date">Expiry Date *</label>
                            <DatePicker id="expiry_date" selected={formData.expiry_date ? parseISO(formData.expiry_date) : null} onChange={handleDateChange} minDate={new Date()} dateFormat="yyyy-MM-dd" className="form-control" placeholderText="Select expiry date" required disabled={isLoading} showMonthDropdown showYearDropdown dropdownMode="select" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="stock_alert">Stock Alert Level (kg)</label>
                            <input type="number" id="stock_alert" name="stock_alert" step="0.01" min="0" placeholder="e.g., 5" value={formData.stock_alert} onChange={handleChange} disabled={isLoading} />
                            <small className="form-text text-muted">Receive alerts when stock falls to or below this level. Set 0 to disable.</small>
                        </div>
                        <div className="form-group"></div>
                    </div>
                    <p><small>* Required fields</small></p>
                </form>
            </Modal>

            <Modal isOpen={modalConfig.isOpen} onClose={closeModal} title={modalConfig.title} type={modalConfig.type} actionButtons={modalConfig.actionButtons}>
                <div>{modalConfig.content}</div>
            </Modal>

            <Modal isOpen={showValidationModal} onClose={() => setShowValidationModal(false)} title="Validation Errors" type="error" actionButtons={[{ label: "Close", type: "primary", onClick: () => setShowValidationModal(false) }]}>
                <div>
                    <p>Please correct the following errors before submitting:</p>
                    <ul>{validationErrors.map((error, index) => <li key={index}>{error}</li>)}</ul>
                </div>
            </Modal>

            <Modal isOpen={stockAdjustmentModal.isOpen} onClose={() => setStockAdjustmentModal(prev => ({ ...prev, isOpen: false }))} title={`${stockAdjustmentModal.reason === "add" ? "Add to" : "Remove from"} Stock`} type="form" actionButtons={[
                { label: "Cancel", type: "secondary", onClick: () => setStockAdjustmentModal(prev => ({ ...prev, isOpen: false })), disabled: isLoading },
                { label: isLoading ? "Processing..." : "Submit Adjustment", type: "primary", onClick: submitStockAdjustment, disabled: isLoading || !stockAdjustmentModal.quantity || parseFloat(stockAdjustmentModal.quantity) <= 0 }
            ]}>
                <form className="stock-adjustment-form" onSubmit={(e) => { e.preventDefault(); submitStockAdjustment(); }}>
                    <p><strong>Product:</strong> {stockAdjustmentModal.product?.type}</p>
                    <p><strong>Current Stock:</strong> {stockAdjustmentModal.product?.weight} kg</p>
                    <div className="form-group">
                        <label htmlFor="quantity">Quantity to {stockAdjustmentModal.reason} (kg) *:</label>
                        <input type="number" id="quantity" name="quantity" min="0.01" step="0.01" placeholder="e.g., 2.5" value={stockAdjustmentModal.quantity} onChange={handleStockAdjustmentChange} required disabled={isLoading} autoFocus />
                    </div>
                    <div className="form-group">
                        <label htmlFor="notes">Notes (optional):</label>
                        <textarea id="notes" name="notes" placeholder="Reason for adjustment (e.g., Spoilage, New delivery, Correction)" value={stockAdjustmentModal.notes} onChange={handleStockAdjustmentChange} rows="3" disabled={isLoading}></textarea>
                    </div>
                    <p><small>* Required fields</small></p>
                </form>
            </Modal>
        </div>
    );
};

export default ManageInventory;