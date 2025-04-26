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
    }, []); // Initial fetch on mount

    // Refetch products when showDeleted state changes
    useEffect(() => {
        fetchProducts();
    }, [showDeleted]);

    // Apply category and deletion status filter effect whenever products, categoryFilter, or showDeleted changes
    useEffect(() => {
        if (products.length >= 0) { // Check >= 0 to handle empty products array
            filterProductsByCategory(categoryFilter);
        }
    }, [products, categoryFilter, showDeleted]); // Add showDeleted as a dependency


    // *** MODIFIED FUNCTION ***
    // Filter products by selected category AND deletion status
    const filterProductsByCategory = (categoryId) => {
        let tempFiltered = [];

        // 1. Initial Category Filter
        if (categoryId === "all") {
            tempFiltered = [...products]; // Start with all products currently in the 'products' state
        } else {
            tempFiltered = products.filter(product => product.category_id === categoryId);
        }

        // 2. Apply Deletion Status Filter based on showDeleted state
        if (showDeleted) {
            // If showDeleted is true, ONLY show deleted items
            tempFiltered = tempFiltered.filter(product => product.is_deleted === '1');
        } else {
            // If showDeleted is false, ONLY show active (not deleted) items
            tempFiltered = tempFiltered.filter(product => product.is_deleted !== '1');
        }

        setFilteredProducts(tempFiltered);
    };

    // Handle category filter change
    const handleCategoryFilterChange = (e) => {
        setCategoryFilter(e.target.value);
    };

    // Function to toggle showing deleted items
    const toggleShowDeleted = () => {
        setShowDeleted(!showDeleted);
        // No need to call fetchProducts here, the useEffect dependency will handle it.
    };

    // Function to update all product statuses based on expiry dates
    const updateProductStatuses = async () => {
        try {
            await productsApi.updateStatuses();
            // After updating statuses, fetch products again
            // fetchProducts(); // fetchProducts is called by useEffect when products state changes
        } catch (err) {
            console.error("Failed to update product statuses:", err);
        }
    };

    const fetchProducts = async () => {
        try {
            setIsLoading(true);
            // Fetch ALL products (including deleted) if we intend to show deleted ones,
            // otherwise fetch only active ones. This is necessary because the filter logic
            // now separates them *after* fetching.
            const response = showDeleted
                ? await productsApi.getAllWithDeleted() // Fetch active + deleted
                : await productsApi.getAll(); // Fetch only active

            // Ensure we got an array
            const productsData = Array.isArray(response.data) ? response.data : [];
            setProducts(productsData);
            // IMPORTANT: filterProductsByCategory is now called by the useEffect hook,
            // so we don't need to setFilteredProducts directly here.
            setError(null);
            checkInventoryAlerts(productsData);
        } catch (err) {
            setError("Failed to fetch products");
            console.error(err);
            setProducts([]); // Set to empty array on error
            setFilteredProducts([]);
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

        // Only check active/non-deleted products for alerts
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

        // Check for negative or zero values only when ADDING (editing weight is disabled)
        if (!editingId && (!formData.weight || parseFloat(formData.weight) <= 0)) {
            errors.push("Weight must be greater than 0 when adding.");
        }

        if (!formData.price || parseFloat(formData.price) <= 0) {
            errors.push("Price must be greater than 0.");
        }

        if (formData.stock_alert && parseFloat(formData.stock_alert) < 0) { // Allow 0 for stock alert, but not negative
             errors.push("Stock alert cannot be negative.");
        }


        // Check if expiry date is valid
        if (!formData.expiry_date) {
            errors.push("Expiry date is required.");
        } else {
             try {
                 const selectedDate = parseISO(formData.expiry_date);
                 const today = new Date();
                 today.setHours(0, 0, 0, 0);
                 if (selectedDate < today) {
                     errors.push("Expiry date cannot be in the past.");
                 }
             } catch (e) {
                 errors.push("Invalid expiry date format.");
             }
         }

        // Check if type is provided
        if (!formData.type.trim()) {
            errors.push("Product type is required.");
        }

        // Check if supplier is provided
        if (!formData.supplier || !formData.supplier.trim()) {
            errors.push("Supplier is required.");
        }

        // Check if category is selected or custom category is provided
        if (!formData.category_id) {
             errors.push("Category must be selected.");
        } else if (formData.category_id === "custom" && (!formData.customCategory || !formData.customCategory.trim())) {
            errors.push("Custom category name is required when 'Other' is selected.");
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
                 // When editing, DO NOT send the weight field as it's managed via stock adjustments
                 delete payload.weight; // Remove weight from the update payload

                 await productsApi.update({
                     ...payload,
                     product_id: editingId
                 });

                 showModal({
                     title: "Success",
                     content: "Product details updated successfully!",
                     type: "success"
                 });
             } else {
                 // When adding a new product
                 await productsApi.create(payload);

                 showModal({
                     title: "Success",
                     content: "Product added successfully!",
                     type: "success"
                 });
             }

            resetForm();
            closeProductForm();
            fetchProducts(); // Refetch products to show the new/updated item
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
            expiry_date: format(getDefaultExpiryDate(), 'yyyy-MM-dd'),
            stock_alert: "10" // Ensure default stock alert is set
        }));
        setShowProductForm(true);
    };

    const handleEdit = (product) => {
        setEditingId(product.product_id);
        setFormData({
            type: product.type,
            category_id: product.category_id || "",
            customCategory: "", // Reset custom category field
            supplier: product.supplier || "",
            weight: product.weight, // Keep weight for display/reference but it's disabled
            price: product.price,
            // Ensure expiry date is formatted correctly for the DatePicker state
            expiry_date: product.expiry_date ? format(parseISO(product.expiry_date), 'yyyy-MM-dd') : "",
            stock_alert: product.stock_alert || "10"
        });
        setShowProductForm(true);
    };

    const closeProductForm = () => {
        setShowProductForm(false);
        resetForm(); // Also reset form when closing
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
                        closeModal(); // Close confirmation modal immediately
                        try {
                            setIsLoading(true);
                            await productsApi.delete(id);
                            fetchProducts(); // Refetch to update the list
                            showModal({ // Show success in a new modal
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
                        closeModal(); // Close confirmation modal immediately
                        try {
                            setIsLoading(true);
                            await productsApi.restore(id);
                            // Important: Switch back to viewing active products after restoring
                            setShowDeleted(false);
                            // fetchProducts will be called by the useEffect watching showDeleted
                            showModal({ // Show success in a new modal
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
            quantity: "1", // Reset quantity to default '1'
            notes: ""       // Reset notes
        });
    };

    const handleStockAdjustmentChange = (e) => {
        const { name, value } = e.target;

        // Validate quantity is not negative or zero
        if (name === "quantity") {
            if (value !== "" && parseFloat(value) <= 0) {
                 // Don't show modal here, just prevent setting invalid state? Or show inline validation?
                 // For now, just prevent update for invalid value, or rely on submit validation.
                 // Let's allow typing, but validate on submit.
                 // console.warn("Quantity must be positive.");
             } else if (value.startsWith('-')) {
                 // Prevent typing negative sign
                 return;
             }
         }


        setStockAdjustmentModal({
            ...stockAdjustmentModal,
            [name]: value
        });
    };

    const submitStockAdjustment = async () => {
        const { product, reason, quantity, notes } = stockAdjustmentModal;

        // Basic validation
         const quantityNum = parseFloat(quantity);
         if (isNaN(quantityNum) || quantityNum <= 0) {
             showModal({
                 title: "Validation Error",
                 content: "Quantity must be a positive number greater than 0.",
                 type: "error"
             });
             return;
         }


        // For removal, check if there's enough stock
        if (reason === "remove" && quantityNum > parseFloat(product.weight)) {
            showModal({
                title: "Stock Error",
                content: `Cannot remove ${quantity}kg as the current stock is only ${product.weight}kg.`,
                type: "error"
            });
            return;
        }

        // Close the adjustment modal before showing loading/success/error
        setStockAdjustmentModal({ ...stockAdjustmentModal, isOpen: false });
        setIsLoading(true);

        try {
            await stockAdjustmentsApi.create({
                product_id: product.product_id,
                reason,
                quantity_change: reason === "add" ? quantityNum : -quantityNum,
                notes: notes || null // Send null if notes are empty
            });

            fetchProducts(); // Refetch products to update weight and potentially status
            showModal({
                title: "Success",
                content: `Stock ${reason === "add" ? "added" : "removed"} successfully!`,
                type: "success"
            });
            // Reset modal state completely after successful submission
             setStockAdjustmentModal({ isOpen: false, product: null, reason: "", quantity: "1", notes: "" });

        } catch (err) {
            showModal({
                title: "Error",
                content: err.response?.data?.error || `Failed to ${reason} stock`,
                type: "error"
            });
            console.error(err);
             // Re-open modal if failed? Maybe not, user can retry.
             // Keep modal state as it was before submit for potential retry?
             // Let's reset it for now.
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
            weight: "", // Reset weight field
            price: "",
            expiry_date: format(getDefaultExpiryDate(), 'yyyy-MM-dd'),
            stock_alert: "10"
        });
        setEditingId(null);
        setValidationErrors([]); // Clear validation errors
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        try {
            // Handle potential '0000-00-00' or invalid dates coming from DB
             if (dateString === '0000-00-00' || dateString.startsWith('0000')) {
                 return "Invalid Date";
             }
            return format(parseISO(dateString), 'MM/dd/yyyy'); // Changed format for better readability
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return dateString; // Return original string if parsing fails
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
         // If another modal is already open, queue this one? Or replace? Let's replace for simplicity.
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
        if (!expiryDate || expiryDate === '0000-00-00' || expiryDate.startsWith('0000')) return null;

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const expiry = parseISO(expiryDate);
            expiry.setHours(0, 0, 0, 0); // Compare dates only, ignore time
            const diffTime = expiry - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return diffDays;
        } catch (e) {
            console.error("Error calculating days until expiry:", expiryDate, e);
            return null;
        }
    };

    // Updated function to get row class based on product status and stock level
    const getRowClassName = (product) => {
        if (product.is_deleted === '1') return "deleted"; // Highest priority

        const weight = parseFloat(product.weight);
        const stockAlert = parseFloat(product.stock_alert);

        // Check expiry status first
        const daysLeft = getDaysUntilExpiry(product.expiry_date);
        if (daysLeft !== null && daysLeft <= 0) return "expired"; // Expired (includes today)
        if (daysLeft !== null && daysLeft <= EXPIRY_WARNING_DAYS) return "near-expiry"; // Expiring soon

        // Then check stock status
        if (weight === 0) return "no-stock";
        if (weight > 0 && weight <= stockAlert) return "low-stock";

        return ""; // Default - normal stock, not expiring soon
    };

    // Updated function to get status badge for the product
    const getStatusBadge = (product) => {
        if (product.is_deleted === '1') {
            return <span className="status-badge removed-badge">REMOVED</span>;
        }

        const weight = parseFloat(product.weight);
        const stockAlert = parseFloat(product.stock_alert);
        const daysLeft = getDaysUntilExpiry(product.expiry_date);

         // Priority: Expired > No Stock > Expiring Soon > Low Stock
         if (daysLeft !== null && daysLeft <= 0) {
             return <span className="status-badge expired-badge">EXPIRED</span>;
         }
         if (weight === 0) {
             return <span className="status-badge no-stock-badge">NO STOCK</span>;
         }
         if (daysLeft !== null && daysLeft <= EXPIRY_WARNING_DAYS) {
             return <span className="status-badge expiring-badge">Expiring in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>;
         }
         if (weight > 0 && weight <= stockAlert) {
             return <span className="status-badge low-stock-badge">LOW STOCK</span>;
         }

        return <span className="status-badge good-status-badge">ACTIVE</span>; // Default if none of the above
    };


    // Function to check if a date should be disabled in the datepicker (dates before today)
     const isDateDisabled = (date) => {
         const today = new Date();
         today.setHours(0, 0, 0, 0); // Set time to start of day for comparison
         return date < today;
     };

    return (
        <div className="manage-inventory-container">
            <h1>Manage Inventory</h1>

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
                                    // Only show items that actually have days left calculated
                                    if (daysLeft !== null && daysLeft > 0) {
                                        return (
                                            <li key={item.product_id}>
                                                {item.type} - Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''} ({formatDate(item.expiry_date)})
                                            </li>
                                        );
                                    } else if (daysLeft !== null && daysLeft <= 0) {
                                         return (
                                            <li key={item.product_id} className="expired-item">
                                                {item.type} - Expired on {formatDate(item.expiry_date)}
                                            </li>
                                        );
                                    }
                                    return null; // Don't render if daysLeft is null
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
                            disabled={isLoading} // Disable while loading
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
                 <h3>
                     {showDeleted ? 'Removed Product Inventory' : 'Active Product Inventory'}
                     {categoryFilter !== "all" && categories.find(cat => cat.category_id === categoryFilter) &&
                         ` - ${categories.find(cat => cat.category_id === categoryFilter)?.category_name}`
                     }
                 </h3>
                {isLoading && <div className="loading-indicator"><p>Loading data...</p></div>}
                {!isLoading && ( // Render table only when not loading
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
                            {filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="no-data">
                                        {isLoading ? "Loading..." : // Avoid showing "No products" during load
                                            showDeleted
                                            ? (categoryFilter !== "all" ? "No removed products found in this category" : "No removed products found")
                                            : (categoryFilter !== "all" ? "No active products found in this category" : "No active products found")}
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
                                        <td>{p.stock_alert} kg</td>
                                        <td className="action-cell"> {/* Use action-cell for better layout control */}
                                            {/* Show different actions based on whether the product is deleted or not */}
                                            {p.is_deleted === '1' ? (
                                                 <div className="action-buttons-inline">
                                                     <button
                                                         className="restore-btn"
                                                         onClick={() => handleRestore(p.product_id)}
                                                         disabled={isLoading} // Disable during loading
                                                     >
                                                         Restore
                                                     </button>
                                                 </div>
                                            ) : (
                                                <div className="action-buttons-stacked"> {/* Stack buttons vertically */}
                                                    <div className="action-buttons-inline"> {/* Edit/Remove on one line */}
                                                        <button
                                                            className="edit-btn"
                                                            onClick={() => handleEdit(p)}
                                                            disabled={isLoading}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="remove-btn"
                                                            onClick={() => handleSoftDelete(p.product_id)}
                                                            disabled={isLoading}
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                    <div className="stock-actions action-buttons-inline"> {/* Stock on next line */}
                                                        <button
                                                            className="add-stock-btn"
                                                            onClick={() => openStockAdjustmentModal(p, "add")}
                                                            disabled={isLoading}
                                                        >
                                                             Stock
                                                        </button>
                                                        <button
                                                            className="remove-stock-btn"
                                                            onClick={() => openStockAdjustmentModal(p, "remove")}
                                                            disabled={parseFloat(p.weight) <= 0 || isLoading} // Also disable if loading
                                                        >
                                                             Stock
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )} {/* End of !isLoading condition */}
            </div>

            {/* Product Form Modal */}
            <Modal
                isOpen={showProductForm}
                onClose={closeProductForm}
                title={editingId ? "Edit Product Details" : "Add New Product"}
                type="form" // Use a form type for styling if needed
                actionButtons={[
                    {
                        label: "Cancel",
                        type: "secondary",
                        onClick: closeProductForm,
                        disabled: isLoading
                    },
                    {
                        label: isLoading ? "Processing..." : (editingId ? "Update Details" : "Add Product"),
                        type: "primary",
                        onClick: handleSubmit, // Submit triggered by button click
                        isSubmit: true, // Optional: can be used to target form submission
                        disabled: isLoading
                    }
                ]}
            >
                {/* Wrap form content in a form tag if not already done by Modal */}
                <form className="inventory-form" onSubmit={handleSubmit} noValidate> {/* Add noValidate to prevent default browser validation */}
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="type">Product Type *</label>
                            <input
                                type="text"
                                id="type"
                                name="type"
                                placeholder="e.g., Chicken Breast"
                                value={formData.type}
                                onChange={handleChange}
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="category_id">Category *</label>
                            <select
                                id="category_id"
                                name="category_id"
                                value={formData.category_id}
                                onChange={handleChange}
                                required
                                disabled={isLoading}
                            >
                                <option value="" disabled>Select Category...</option>
                                {Array.isArray(categories) && categories.map(cat => (
                                    <option key={cat.category_id} value={cat.category_id}>
                                        {cat.category_name}
                                    </option>
                                ))}
                                <option value="custom">Other (Specify Below)</option>
                            </select>
                            {/* Render manual input if "Other" is selected */}
                            {formData.category_id === "custom" && (
                                <input
                                    type="text"
                                    name="customCategory"
                                    placeholder="Enter custom category name *"
                                    value={formData.customCategory}
                                    onChange={handleChange}
                                    required={formData.category_id === "custom"} // Required only if 'Other' is selected
                                    className="custom-category-input"
                                    disabled={isLoading}
                                />
                            )}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="supplier">Supplier *</label>
                            <input
                                type="text"
                                id="supplier"
                                name="supplier"
                                placeholder="Enter supplier name"
                                value={formData.supplier}
                                onChange={handleChange}
                                required
                                disabled={isLoading}
                            />
                        </div>

                         <div className="form-group">
                             <label htmlFor="weight">
                                 {editingId ? 'Current Weight (kg)' : 'Initial Weight (kg) *'}
                             </label>
                             <input
                                 type="number"
                                 id="weight"
                                 name="weight"
                                 step="0.01"
                                 min={editingId ? undefined : "0.01"} // Min only applies when adding
                                 placeholder={editingId ? "" : "e.g., 10.5"}
                                 value={formData.weight}
                                 onChange={handleChange}
                                 required={!editingId} // Required only when adding
                                 disabled={editingId !== null || isLoading} // Disable weight field when editing or loading
                                 className={editingId !== null ? "disabled-input" : ""}
                             />
                             {editingId !== null && (
                                 <small className="form-text text-muted">
                                     Adjust weight using '+ Stock' / '- Stock' buttons on the main table.
                                 </small>
                             )}
                         </div>

                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="price">Price (PHP/kg) *</label>
                            <input
                                type="number"
                                id="price"
                                name="price"
                                step="0.01"
                                min="0.01"
                                placeholder="e.g., 180.50"
                                value={formData.price}
                                onChange={handleChange}
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="expiry_date">Expiry Date *</label>
                            <DatePicker
                                id="expiry_date"
                                selected={formData.expiry_date ? parseISO(formData.expiry_date) : null} // Use null if no date initially
                                onChange={handleDateChange}
                                minDate={new Date()} // Prevent selecting past dates
                                // filterDate={date => !isDateDisabled(date)} // Alternative way to disable past dates
                                dateFormat="yyyy-MM-dd"
                                className="form-control" // Use form-control for bootstrap-like styling if applicable
                                placeholderText="Select expiry date"
                                required
                                disabled={isLoading}
                                showMonthDropdown
                                showYearDropdown
                                dropdownMode="select"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="stock_alert">Stock Alert Level (kg)</label>
                            <input
                                type="number"
                                id="stock_alert"
                                name="stock_alert"
                                step="0.01"
                                min="0" // Allow 0, but not negative
                                placeholder="e.g., 5"
                                value={formData.stock_alert}
                                onChange={handleChange}
                                disabled={isLoading}
                            />
                             <small className="form-text text-muted">
                                 Receive alerts when stock falls to or below this level. Set 0 to disable.
                             </small>
                        </div>
                         {/* Add an empty div to balance the row if needed */}
                         <div className="form-group"></div>
                    </div>
                     <p><small>* Required fields</small></p>
                </form>
            </Modal>

            {/* Generic Info/Error/Confirm Modal */}
            <Modal
                isOpen={modalConfig.isOpen}
                onClose={closeModal}
                title={modalConfig.title}
                type={modalConfig.type}
                actionButtons={modalConfig.actionButtons}
            >
                {/* Ensure content is wrapped appropriately */}
                 <div>{modalConfig.content}</div>
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
                        type: "primary", // Or secondary
                        onClick: () => setShowValidationModal(false)
                    }
                ]}
            >
                <div>
                    <p>Please correct the following errors before submitting:</p>
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
                onClose={() => setStockAdjustmentModal({ ...stockAdjustmentModal, isOpen: false })}
                title={`${stockAdjustmentModal.reason === "add" ? "Add to" : "Remove from"} Stock`}
                type="form" // Use form type for styling
                actionButtons={[
                    {
                        label: "Cancel",
                        type: "secondary",
                        onClick: () => setStockAdjustmentModal({ ...stockAdjustmentModal, isOpen: false }),
                        disabled: isLoading
                    },
                    {
                        label: isLoading ? "Processing..." : "Submit Adjustment",
                        type: "primary",
                        onClick: submitStockAdjustment, // Submit via button click
                        disabled: isLoading || !stockAdjustmentModal.quantity || parseFloat(stockAdjustmentModal.quantity) <= 0 // Basic client-side disable
                    }
                ]}
            >
                 {/* Wrap form content in a form tag if not already done by Modal */}
                <form className="stock-adjustment-form" onSubmit={(e) => { e.preventDefault(); submitStockAdjustment(); }}>
                    <p><strong>Product:</strong> {stockAdjustmentModal.product?.type}</p>
                    <p><strong>Current Stock:</strong> {stockAdjustmentModal.product?.weight} kg</p>

                    <div className="form-group">
                        <label htmlFor="quantity">Quantity to {stockAdjustmentModal.reason} (kg) *:</label>
                        <input
                            type="number"
                            id="quantity"
                            name="quantity"
                            min="0.01"
                            step="0.01"
                            placeholder="e.g., 2.5"
                            value={stockAdjustmentModal.quantity}
                            onChange={handleStockAdjustmentChange}
                            required
                            disabled={isLoading}
                            autoFocus // Focus this field when modal opens
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="notes">Notes (optional):</label>
                        <textarea
                            id="notes"
                            name="notes"
                            placeholder="Reason for adjustment (e.g., Spoilage, New delivery, Correction)"
                            value={stockAdjustmentModal.notes}
                            onChange={handleStockAdjustmentChange}
                            rows="3"
                            disabled={isLoading}
                        ></textarea>
                    </div>
                     <p><small>* Required fields</small></p>
                </form>
            </Modal>
        </div>
    );
};

export default ManageInventory;