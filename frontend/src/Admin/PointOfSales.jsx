import React, { useState, useEffect, useMemo, useCallback } from "react";
import "../styles/PointOfSales.css";
import Modal from "../components/Modal.jsx";
import { productsApi } from "../services/api.js";

const PointOfSales = () => {
  // State management
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState("0");
  const [discountError, setDiscountError] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [cartErrors, setCartErrors] = useState({});

  // Modal state
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    actionButtons: []
  });

  const [quantityModal, setQuantityModal] = useState({
    isOpen: false,
    product: null,
    quantity: "1",
    error: ""
  });

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // API calls
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const response = await productsApi.getAll();
      
      const transformedProducts = response.data.map(product => ({
        ...product,
        supplier_name: product.supplier_name || product.supplier
      }));
      
      setProducts(transformedProducts);
      setError(null);
    } catch (err) {
      showNotification("Error", "Failed to fetch products", "error");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Notification handler
  const showNotification = useCallback((title, message, type = "info", actionButtons = []) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type,
      actionButtons: [...actionButtons, {
        label: "Close",
        onClick: () => closeModal(),
        type: "secondary"
      }]
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Quantity modal handlers
  const openQuantityModal = useCallback((product) => {
    setQuantityModal({
      isOpen: true,
      product,
      quantity: "1",
      error: ""
    });
  }, []);

  const closeQuantityModal = useCallback(() => {
    setQuantityModal({
      isOpen: false,
      product: null,
      quantity: "1",
      error: ""
    });
  }, []);

  const handleQuantityModalChange = useCallback((e) => {
    const value = e.target.value;
    const qty = parseFloat(value);
    const product = quantityModal.product;
    let errorMsg = "";

    if (value === "" || isNaN(qty) || qty <= 0) {
      errorMsg = "Please enter a valid quantity greater than zero.";
    } else if (product && qty > parseFloat(product.weight)) {
      errorMsg = `Not enough stock. Available: ${product.weight} kg`;
    }

    setQuantityModal(prev => ({
      ...prev,
      quantity: value,
      error: errorMsg
    }));
  }, [quantityModal.product]);

  // Cart operations
  const confirmAddToCart = useCallback(() => {
    const product = quantityModal.product;
    const qty = parseFloat(quantityModal.quantity);

    if (quantityModal.error || !product) {
      return;
    }

    const existing = cart.find(item => item.product_id === product.product_id);
    if (existing) {
      if (parseFloat(existing.quantity) + qty > parseFloat(product.weight)) {
        setQuantityModal(prev => ({
          ...prev,
          error: `Not enough stock. Available: ${product.weight} kg (Cart: ${existing.quantity}kg, Adding: ${qty}kg)`
        }));
        return;
      }
      setCart(prevCart => prevCart.map(item =>
        item.product_id === product.product_id
          ? { ...item, quantity: (parseFloat(item.quantity) + qty).toFixed(2) }
          : item
      ));
    } else {
      const supplierName = product.supplier_name || product.supplier || 'N/A';
      
      setCart(prevCart => [...prevCart, {
        product_id: product.product_id,
        type: product.type,
        supplier_name: supplierName,
        quantity: qty.toFixed(2),
        price: product.price,
        maxStock: product.weight
      }]);
    }
    closeQuantityModal();
  }, [cart, quantityModal, closeQuantityModal]);

  const handleRemoveFromCart = useCallback((productId) => {
    setCart(prevCart => prevCart.filter(item => item.product_id !== productId));
    setCartErrors(prevErrors => {
      const newErrors = { ...prevErrors };
      delete newErrors[productId];
      return newErrors;
    });
  }, []);

  const handleQuantityChange = useCallback((productId, newValue) => {
    const cartItem = cart.find(item => item.product_id === productId);
    const productInProductsList = products.find(p => p.product_id === productId);
    const maxStock = productInProductsList 
      ? parseFloat(productInProductsList.weight) 
      : (cartItem ? parseFloat(cartItem.maxStock) : 0);

    const qty = parseFloat(newValue);
    let errorMsg = "";

    if (newValue === "" || isNaN(qty) || qty <= 0) {
      errorMsg = "Invalid quantity";
    } else if (qty > maxStock) {
      errorMsg = `Exceeds stock (${maxStock} kg)`;
    }

    setCart(prevCart => prevCart.map(item =>
      item.product_id === productId
        ? { ...item, quantity: newValue }
        : item
    ));
    setCartErrors(prev => ({ ...prev, [productId]: errorMsg }));
  }, [cart, products]);

  // Input handlers
  const handleDiscountChange = useCallback((e) => {
    const value = e.target.value;
    let newDiscountError = "";

    setDiscount(value);

    if (value === "") {
      setDiscountError("");
      return;
    }

    const numericValue = parseFloat(value);

    if (isNaN(numericValue) && value !== "-") {
      newDiscountError = "Please enter a valid number.";
    } else if (numericValue < 0) {
      newDiscountError = "Discount cannot be negative.";
    } else if (numericValue > 100) {
      newDiscountError = "Discount cannot exceed 100%.";
    }
    setDiscountError(newDiscountError);
  }, []);

  const handleAmountPaidChange = useCallback((e) => {
    const value = e.target.value;
    setAmountPaid(value);

    if (value !== "" && parseFloat(value) < 0) {
      showNotification("Invalid Input", "Amount paid cannot be negative.", "error");
    }
  }, [showNotification]);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleCategoryChange = useCallback((e) => {
    setSelectedCategory(e.target.value);
  }, []);

  const handleSupplierChange = useCallback((e) => {
    setSelectedSupplier(e.target.value);
  }, []);

  // Memoized calculations
  const subtotal = useMemo(() =>
    cart.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity);
      const price = parseFloat(item.price);
      return sum + (isNaN(quantity) || isNaN(price) ? 0 : quantity * price);
    }, 0), [cart]);

  const discountPercentageForCalculation = useMemo(() => {
    if (discountError || discount === "") {
      return 0;
    }
    const numericDiscount = parseFloat(discount);
    if (isNaN(numericDiscount) || numericDiscount < 0 || numericDiscount > 100) {
      return 0;
    }
    return numericDiscount;
  }, [discount, discountError]);

  const discountAmount = useMemo(() =>
    subtotal * (discountPercentageForCalculation / 100),
    [subtotal, discountPercentageForCalculation]);

  const totalAmount = useMemo(() =>
    subtotal - discountAmount,
    [subtotal, discountAmount]);

  const change = useMemo(() => {
    const paid = parseFloat(amountPaid);
    if (isNaN(paid) || paid < totalAmount) return 0;
    return paid - totalAmount;
  }, [amountPaid, totalAmount]);

  const insufficientPayment = useMemo(() => {
    const paid = parseFloat(amountPaid);
    return amountPaid !== "" && (isNaN(paid) || paid < 0 || paid < totalAmount);
  }, [amountPaid, totalAmount]);

  const categories = useMemo(() => {
    const uniqueCategories = new Set(products.map(p => p.category_name).filter(Boolean));
    return ["", ...Array.from(uniqueCategories)];
  }, [products]);

  const suppliers = useMemo(() => {
    const uniqueSuppliers = new Set(
      products
        .map(p => p.supplier_name || p.supplier)
        .filter(Boolean)
    );
    return ["", ...Array.from(uniqueSuppliers)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(product =>
      product.type.toLowerCase().includes(searchTerm.toLowerCase()) &&
      parseFloat(product.weight) > 0 &&
      (selectedCategory === "" || product.category_name === selectedCategory) &&
      (selectedSupplier === "" || 
       (product.supplier_name && product.supplier_name === selectedSupplier) || 
       (product.supplier && product.supplier === selectedSupplier))
    );
  }, [products, searchTerm, selectedCategory, selectedSupplier]);

  // Helper functions
  const canProductBeSold = useCallback((product) => {
    return parseFloat(product.weight) > 0 && product.status !== 'expired';
  }, []);

  const getStatusMessage = useCallback((product) => {
    if (parseFloat(product.weight) <= 0) return "Out of stock";
    if (product.status === 'expired') return "Expired";
    return "";
  }, []);

  const getSupplierName = useCallback((product) => {
    return product.supplier_name || product.supplier || 'N/A';
  }, []);

  // Complete sale functionality
  const completeSale = useCallback(async () => {
    // Validation checks
    if (discountError) {
      showNotification("Invalid Discount", `Please correct the discount value: ${discountError}`, "error");
      return;
    }
    if (Object.values(cartErrors).some(error => error)) {
      showNotification("Invalid Quantities", "Please fix the quantity errors before completing the sale.", "error");
      return;
    }
    if (cart.length === 0) {
      showNotification("Empty Cart", "No products in cart!", "warning");
      return;
    }
    if (totalAmount <= 0 && subtotal > 0) {
      showNotification("Invalid Total", "Total amount after discount must be reasonable (e.g. not negative).", "error");
      return;
    }

    const finalAmountPaid = parseFloat(amountPaid);
    if (isNaN(finalAmountPaid) || finalAmountPaid < totalAmount) {
      showNotification("Insufficient Payment", "Amount paid is less than total amount or invalid!", "warning");
      return;
    }

    try {
      setIsLoading(true);
      const receiptNo = `RCP-${Date.now()}`;
      const saleData = {
        receipt_no: receiptNo,
        total_amount: totalAmount.toFixed(2),
        amount_paid: finalAmountPaid.toFixed(2),
        discount: discountPercentageForCalculation.toFixed(2),
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: parseFloat(item.quantity).toFixed(2),
          price_per_kg: parseFloat(item.price).toFixed(2)
        }))
      };

      // API call to complete sale
      const saleResponse = await fetch("http://localhost/MEAT_POS/backend/api/sales.php", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(saleData)
      });

      if (!saleResponse.ok) {
        const errorData = await saleResponse.json().catch(() => ({ error: "Failed to process sale response." }));
        throw new Error(errorData.error || "Failed to complete sale due to server error.");
      }
      const saleResult = await saleResponse.json();

      const changeAmount = typeof saleResult.change_amount === 'number' ? 
        saleResult.change_amount.toFixed(2) : 
        change.toFixed(2);

      showNotification(
        "Sale Completed",
        `Sale completed successfully! Receipt No: ${receiptNo}\nChange: ₱${changeAmount}`,
        "success"
      );
      
      // Reset state
      setCart([]);
      setCartErrors({});
      setDiscount("0");
      setDiscountError("");
      setAmountPaid("");
      fetchProducts();
    } catch (err) {
      showNotification(
        "Sale Error",
        `Failed to complete sale: ${err.message || "Unknown error occurred."}`,
        "error"
      );
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [
    discountError, cartErrors, cart, totalAmount, subtotal, 
    amountPaid, discountPercentageForCalculation, change, 
    showNotification, fetchProducts
  ]);

  // UI Components
  const renderProductFilters = () => (
    <div className="product-filters">
      <div className="product-search">
        <input
          type="text"
          placeholder="Search products by type..."
          value={searchTerm}
          onChange={handleSearchChange}
          aria-label="Search products"
        />
      </div>
      
      <div className="product-category-filter">
        <select 
          value={selectedCategory} 
          onChange={handleCategoryChange}
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {categories.slice(1).map((category, index) => (
            <option key={index} value={category}>{category}</option>
          ))}
        </select>
      </div>
      
      <div className="product-supplier-filter">
        <select 
          value={selectedSupplier} 
          onChange={handleSupplierChange}
          aria-label="Filter by supplier"
        >
          <option value="">All Suppliers</option>
          {suppliers.slice(1).map((supplier, index) => (
            <option key={index} value={supplier}>{supplier}</option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderProductGrid = () => (
    <div className="product-grid">
      {filteredProducts.length === 0 ? (
        <p className="no-data">No products found</p>
      ) : (
        filteredProducts.map(product => (
          <div
            key={product.product_id}
            className={`product-box ${!canProductBeSold(product) ? 'disabled' : ''}`}
            onClick={() => canProductBeSold(product) && openQuantityModal(product)}
            role="button"
            tabIndex={canProductBeSold(product) ? 0 : -1}
            aria-disabled={!canProductBeSold(product)}
          >
            <h4>{product.type}</h4>
            <p>Category: {product.category_name || 'N/A'}</p>
            <p>Supplier: {getSupplierName(product)}</p>
            <p>Available: {product.weight} kg</p>
            <p>Price: ₱{product.price}/kg</p>
            <p>Status: {product.status}</p>
            {!canProductBeSold(product) && (
              <p className="status-message">{getStatusMessage(product)}</p>
            )}
          </div>
        ))
      )}
    </div>
  );

  const renderCartItems = () => (
    <div className="cart-items">
      {cart.length === 0 ? (
        <p className="no-data">No items in cart.</p>
      ) : (
        <table className="pos-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Supplier</th>
              <th>Quantity (kg)</th>
              <th>Price (₱/kg)</th>
              <th>Subtotal</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {cart.map(item => {
              const itemSubtotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
              return (
                <tr key={item.product_id}>
                  <td>{item.type}</td>
                  <td>{item.supplier_name || 'N/A'}</td>
                  <td>
                    <div className="quantity-field">
                      <input
                        type="number"
                        value={item.quantity}
                        min="0.01"
                        step="0.01"
                        onChange={(e) => handleQuantityChange(item.product_id, e.target.value)}
                        className={cartErrors[item.product_id] ? "quantity-input input-error" : "quantity-input"}
                        aria-label={`Quantity for ${item.type}`}
                      />
                      {cartErrors[item.product_id] && (
                        <div className="inline-error">{cartErrors[item.product_id]}</div>
                      )}
                    </div>
                  </td>
                  <td>{item.price}</td>
                  <td>{itemSubtotal.toFixed(2)}</td>
                  <td>
                    <button 
                      onClick={() => handleRemoveFromCart(item.product_id)}
                      aria-label={`Remove ${item.type} from cart`}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderTotalsSection = () => (
    <div className="totals-section">
      <div className="totals">
        <div className="total-row">
          <span>Subtotal:</span>
          <span>₱{subtotal.toFixed(2)}</span>
        </div>
        
        <div className="cart-discount">
          <div className="form-group">
            <label htmlFor="discount">Discount (%):</label>
            <input
              type="number"
              id="discount"
              value={discount}
              onChange={handleDiscountChange}
              placeholder="0-100"
              className={discountError ? "input-error" : ""}
              aria-describedby="discount-error"
            />
            {discountError && (
              <div id="discount-error" className="inline-error">{discountError}</div>
            )}
          </div>
        </div>
        
        <div className="total-row">
          <span>Discount ({discountPercentageForCalculation.toFixed(0)}%):</span>
          <span>- ₱{discountAmount.toFixed(2)}</span>
        </div>
        
        <div className="total-row total">
          <span>Total:</span>
          <span>₱{totalAmount.toFixed(2)}</span>
        </div>
        
        <div className="payment-row form-group">
          <label htmlFor="amount-paid">Amount Paid:</label>
          <input
            type="number"
            id="amount-paid"
            value={amountPaid}
            onChange={handleAmountPaidChange}
            min="0"
            step="0.01"
            className={insufficientPayment ? "input-error" : ""}
            placeholder="Enter amount"
            aria-describedby="payment-error"
          />
        </div>
        
        {insufficientPayment && amountPaid !== "" && parseFloat(amountPaid) >= 0 && (
          <div id="payment-error" className="payment-warning inline-error">
            Insufficient amount! Need ₱{(totalAmount - (parseFloat(amountPaid) || 0)).toFixed(2)} more.
          </div>
        )}
        
        {parseFloat(amountPaid) < 0 && (
          <div className="payment-warning inline-error">
            Amount paid cannot be negative.
          </div>
        )}
        
        {change > 0 && !insufficientPayment && (
          <div className="total-row change">
            <span>Change:</span>
            <span>₱{change.toFixed(2)}</span>
          </div>
        )}
      </div>

      <button
        className="complete-sale"
        onClick={completeSale}
        disabled={
          isLoading ||
          cart.length === 0 ||
          !!discountError ||
          Object.values(cartErrors).some(error => error) ||
          insufficientPayment ||
          amountPaid === "" ||
          parseFloat(amountPaid) < 0
        }
        aria-busy={isLoading}
      >
        {isLoading ? "Processing..." : "Complete Sale"}
      </button>
    </div>
  );

  return (
    <div className="pos-container container">
      <h2>Point of Sales</h2>

      {error && <div className="error-message" role="alert">{error}</div>}

      <Modal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        title={modalConfig.title}
        type={modalConfig.type}
        actionButtons={modalConfig.actionButtons}
      >
        <p style={{whiteSpace: 'pre-line'}}>{modalConfig.message}</p>
      </Modal>

      <Modal
        isOpen={quantityModal.isOpen}
        onClose={closeQuantityModal}
        title={`Enter Quantity for ${quantityModal.product?.type || ""}`}
        type="info"
        actionButtons={[
          { 
            label: "Add", 
            onClick: confirmAddToCart, 
            type: "primary", 
            disabled: !!quantityModal.error || !quantityModal.quantity || parseFloat(quantityModal.quantity) <= 0 
          },
          { label: "Cancel", onClick: closeQuantityModal, type: "secondary" }
        ]}
      >
        <div className="quantity-modal-content">
          <p>Available: {quantityModal.product?.weight || 0} kg</p>
          <p>Price: ₱{quantityModal.product?.price || 0}/kg</p>
          <p>Supplier: {quantityModal.product ? getSupplierName(quantityModal.product) : 'N/A'}</p>
          
          <div className="form-group">
            <label htmlFor="quantity-input">Quantity (kg):</label>
            <input
              type="number"
              id="quantity-input"
              value={quantityModal.quantity}
              onChange={handleQuantityModalChange}
              min="0.01"
              step="0.01"
              className={quantityModal.error ? "quantity-input input-error" : "quantity-input"}
              autoFocus
              aria-describedby="quantity-error"
            />
            {quantityModal.error && (
              <div id="quantity-error" className="inline-error">{quantityModal.error}</div>
            )}
          </div>
        </div>
      </Modal>

      <div className="pos-content">
        {/* Products Section */}
        <div className="pos-products">
          <h3>Products</h3>
          {renderProductFilters()}
          {isLoading && !products.length ? (
            <p className="loading-indicator">Loading products...</p>
          ) : (
            renderProductGrid()
          )}
        </div>

        {/* Cart Section */}
        <div className="sold-products">
          <h3>SELL</h3>
          {renderCartItems()}
          {renderTotalsSection()}
        </div>
      </div>
    </div>
  );
};

export default PointOfSales;