import React, { useState, useEffect } from "react";
import "../styles/PointOfSales.css";
import Modal from "../components/Modal.jsx"; 
import { productsApi } from "../services/api.js";

const PointOfSales = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal state
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    actionButtons: []
  });
  
  // Quantity input modal state
  const [quantityModal, setQuantityModal] = useState({
    isOpen: false,
    product: null,
    quantity: "1",
    error: "" // Add error state for quantity modal
  });

  // Cart item errors
  const [cartErrors, setCartErrors] = useState({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const response = await productsApi.getAll();
      setProducts(response.data);
      setError(null);
    } catch (err) {
      showNotification("Error", "Failed to fetch products", "error");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Show notification modal
  const showNotification = (title, message, type = "info", actionButtons = []) => {
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
  };

  // Close the modal
  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  // Open quantity input modal
  const openQuantityModal = (product) => {
    setQuantityModal({
      isOpen: true,
      product,
      quantity: "1",
      error: ""
    });
  };

  // Close quantity modal
  const closeQuantityModal = () => {
    setQuantityModal({
      isOpen: false,
      product: null,
      quantity: "1",
      error: ""
    });
  };

  // Handle quantity change in modal with inline validation
  const handleQuantityModalChange = (e) => {
    const value = e.target.value;
    const qty = parseFloat(value);
    const product = quantityModal.product;
    let error = "";
    
    if (isNaN(qty) || qty <= 0) {
      error = "Please enter a valid quantity greater than zero.";
    } else if (qty > parseFloat(product.weight)) {
      error = `Not enough stock. Available: ${product.weight} kg`;
    }
    
    setQuantityModal(prev => ({
      ...prev,
      quantity: value,
      error
    }));
  };

  // Handle add to cart from quantity modal
  const confirmAddToCart = () => {
    const product = quantityModal.product;
    const qty = parseFloat(quantityModal.quantity);
    
    if (quantityModal.error) {
      return; // Don't proceed if there's an error
    }
    
    const existing = cart.find(item => item.product_id === product.product_id);
    if (existing) {
      if (parseFloat(existing.quantity) + qty > parseFloat(product.weight)) {
        setQuantityModal(prev => ({
          ...prev,
          error: `Not enough stock. Available: ${product.weight} kg`
        }));
        return;
      }
      
      setCart(cart.map(item =>
        item.product_id === product.product_id 
          ? { ...item, quantity: (parseFloat(item.quantity) + qty).toFixed(2) } 
          : item
      ));
    } else {
      setCart([...cart, { 
        product_id: product.product_id, 
        type: product.type, 
        quantity: qty.toFixed(2), 
        price: product.price 
      }]);
    }
    
    closeQuantityModal();
  };

  const handleRemoveFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
    
    // Clear any errors for this item
    setCartErrors(prevErrors => {
      const newErrors = {...prevErrors};
      delete newErrors[productId];
      return newErrors;
    });
  };

  const handleQuantityChange = (productId, newValue) => {
    const product = products.find(p => p.product_id === productId);
    const qty = parseFloat(newValue);
    let error = "";
    
    if (isNaN(qty) || qty <= 0) {
      error = "Invalid quantity";
    } else if (qty > parseFloat(product.weight)) {
      error = `Exceeds stock (${product.weight} kg)`;
    }
    
    // Update cart item with new quantity
    setCart(cart.map(item =>
      item.product_id === productId 
        ? { ...item, quantity: newValue } 
        : item
    ));
    
    // Set or clear error
    setCartErrors(prev => ({
      ...prev,
      [productId]: error
    }));
  };

  // Improved discount handler with better UX
  const handleDiscountChange = (e) => {
    const value = e.target.value === '' ? '' : parseFloat(e.target.value);
    
    // Allow empty input for better UX
    if (value === '') {
      setDiscount('');
      return;
    }
    
    // Validate the input
    if (isNaN(value)) {
      return;
    }
    
    if (value < 0) {
      showNotification("Invalid Input", "Discount cannot be negative", "error");
      return;
    }
    
    if (value > 100) {
      showNotification("Invalid Input", "Discount cannot exceed 100%", "error");
      return;
    }
    
    setDiscount(value);
  };

  // Handle amount paid change with better UX
  const handleAmountPaidChange = (e) => {
    const value = e.target.value === '' ? '' : parseFloat(e.target.value);
    
    // Allow empty input for better UX
    if (value === '' || e.target.value === '') {
      setAmountPaid('');
      return;
    }
    
    // Validate the input
    if (isNaN(value)) {
      return;
    }
    
    if (value < 0) {
      showNotification("Invalid Input", "Amount paid cannot be negative", "error");
      return;
    }
    
    setAmountPaid(e.target.value);
  };

  const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.quantity) * parseFloat(item.price), 0);
  const discountAmount = subtotal * (parseFloat(discount || 0) / 100);
  const totalAmount = subtotal - discountAmount;
  const change = parseFloat(amountPaid || 0) - totalAmount > 0 ? parseFloat(amountPaid || 0) - totalAmount : 0;
  const insufficientPayment = parseFloat(amountPaid || 0) < totalAmount && amountPaid !== "";

  const completeSale = async () => {
    // Check for any quantity errors in cart
    if (Object.values(cartErrors).some(error => error)) {
      showNotification("Invalid Quantities", "Please fix the quantity errors before completing the sale", "error");
      return;
    }
    
    if (cart.length === 0) {
      showNotification("Empty Cart", "No products in cart!", "warning");
      return;
    }
    
    if (totalAmount <= 0) {
      showNotification("Invalid Total", "Total amount must be greater than zero!", "error");
      return;
    }
    
    if (parseFloat(amountPaid || 0) < totalAmount) {
      showNotification("Insufficient Payment", "Amount paid is less than total amount!", "warning");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Generate receipt number (timestamp-based)
      const receiptNo = `RCP-${Date.now()}`;
      
      // Prepare sale data including items for the API
      const saleData = {
        receipt_no: receiptNo,
        total_amount: totalAmount.toFixed(2),
        amount_paid: parseFloat(amountPaid).toFixed(2),
        discount: parseFloat(discount || 0).toFixed(2), // Include discount percentage
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: parseFloat(item.quantity).toFixed(2),
          price_per_kg: parseFloat(item.price).toFixed(2)
        }))
      };
      
      // Send the complete sale data in one request
      const saleResponse = await fetch("http://localhost/MEAT_POS/backend/api/sales.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(saleData)
      });
      
      if (!saleResponse.ok) {
        const errorData = await saleResponse.json();
        throw new Error(errorData.error || "Failed to complete sale");
      }
      
      const saleResult = await saleResponse.json();
      
      showNotification(
        "Sale Completed", 
        `Sale completed successfully! Receipt No: ${receiptNo}\nChange: ₱${saleResult.change_amount || change.toFixed(2)}`, 
        "success"
      );
      
      // Reset form
      setCart([]);
      setCartErrors({});
      setDiscount(0);
      setAmountPaid("");
      fetchProducts(); // Refresh products to get updated stock levels
    } catch (err) {
      showNotification(
        "Sale Error", 
        "Failed to complete sale: " + (err.message || "Unknown error"),
        "error"
      );
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(product => 
    product.type.toLowerCase().includes(searchTerm.toLowerCase()) && 
    parseFloat(product.weight) > 0
  );

  // Updated: Helper function to check if product can be sold
  // Now only expired products are disabled
  const canProductBeSold = (product) => {
    return parseFloat(product.weight) > 0 && product.status !== 'expired';
  };

  // Helper function to get status message
  const getStatusMessage = (product) => {
    if (parseFloat(product.weight) <= 0) return "Out of stock";
    if (product.status === 'expired') return "Expired";
    return "";
  };

  return (
    <div className="pos-container container">
      <h2>Point of Sales</h2>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      
      {/* Modal for notifications - kept intact for sale completion */}
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        title={modalConfig.title}
        type={modalConfig.type}
        actionButtons={modalConfig.actionButtons}
      >
        <p>{modalConfig.message}</p>
      </Modal>
      
      {/* Modal for quantity input with inline error message */}
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
            disabled: !!quantityModal.error
          },
          {
            label: "Cancel",
            onClick: closeQuantityModal,
            type: "secondary"
          }
        ]}
      >
        <div className="quantity-modal-content">
          <p>Available: {quantityModal.product?.weight || 0} kg</p>
          <p>Price: ₱{quantityModal.product?.price || 0}/kg</p>
          <div className="form-group">
            <label htmlFor="quantity-input">Quantity (kg):</label>
            <input
              type="number"
              id="quantity-input"
              value={quantityModal.quantity}
              onChange={handleQuantityModalChange}
              min="0.01"
              step="0.01"
              className={quantityModal.error ? "quantity-input error" : "quantity-input"}
            />
            {quantityModal.error && (
              <div className="error-message">{quantityModal.error}</div>
            )}
          </div>
        </div>
      </Modal>
      
      <div className="pos-content">
        <div className="pos-products">
          <h3>Products</h3>
          <div className="product-search">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isLoading ? (
            <p>Loading products...</p>
          ) : (
            <table className="pos-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Available (kg)</th>
                  <th>Price (₱/kg)</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="no-data">No products found</td>
                  </tr>
                ) : (
                  filteredProducts.map(product => (
                    <tr key={product.product_id} className={product.status !== 'fresh' ? product.status : ''}>
                      <td>{product.type}</td>
                      <td>{product.category_name || 'N/A'}</td>
                      <td>{product.weight}</td>
                      <td>{product.price}</td>
                      <td>{product.status}</td>
                      <td>
                        <button 
                          onClick={() => openQuantityModal(product)}
                          disabled={!canProductBeSold(product)}
                          title={getStatusMessage(product)}
                          className={!canProductBeSold(product) ? "disabled-button" : ""}
                        >
                         Sell
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        
        <div className="sold-products">
          <h3>SELL</h3>
          <div className="cart-options">
            <div className="form-group">
              <label htmlFor="discount">Discount (%)</label>
              <input
                type="number"
                id="discount"
                min="0"
                max="100"
                value={discount}
                onChange={handleDiscountChange}
              />
            </div>
          </div>
          
          {cart.length === 0 ? (
            <p>No items.</p>
          ) : (
            <table className="pos-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Quantity (kg)</th>
                  <th>Price (₱/kg)</th>
                  <th>Subtotal</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cart.map(item => (
                  <tr key={item.product_id}>
                    <td>{item.type}</td>
                    <td>
                      <div className="quantity-field">
                        <input
                          type="number"
                          value={item.quantity}
                          min="0.01"
                          step="0.01"
                          onChange={(e) => handleQuantityChange(item.product_id, e.target.value)}
                          className={cartErrors[item.product_id] ? "quantity-input error" : "quantity-input"}
                        />
                        {cartErrors[item.product_id] && (
                          <div className="inline-error">{cartErrors[item.product_id]}</div>
                        )}
                      </div>
                    </td>
                    <td>{item.price}</td>
                    <td>{(parseFloat(item.quantity) * parseFloat(item.price)).toFixed(2)}</td>
                    <td>
                      <button onClick={() => handleRemoveFromCart(item.product_id)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          <div className="totals-section">
            <div className="totals">
              <div className="total-row">
                <span>Subtotal:</span>
                <span>₱{subtotal.toFixed(2)}</span>
              </div>
              <div className="total-row">
                <span>Discount ({discount || 0}%):</span>
                <span>₱{discountAmount.toFixed(2)}</span>
              </div>
              <div className="total-row total">
                <span>Total:</span>
                <span>₱{totalAmount.toFixed(2)}</span>
              </div>
              <div className="payment-row">
                <label htmlFor="amount-paid">Amount Paid:</label>
                <input
                  type="number"
                  id="amount-paid"
                  value={amountPaid}
                  onChange={handleAmountPaidChange}
                  min="0"
                  step="0.01"
                  className={insufficientPayment ? "input-error" : ""}
                />
              </div>
              {insufficientPayment && (
                <div className="payment-warning">
                  Insufficient amount! Need ₱{(totalAmount - parseFloat(amountPaid)).toFixed(2)} more.
                </div>
              )}
              {parseFloat(amountPaid || 0) >= totalAmount && cart.length > 0 && (
                <div className="total-row change">
                  <span>Change:</span>
                  <span>₱{change.toFixed(2)}</span>
                </div>
              )}
            </div>
            
            <button 
              className="complete-sale" 
              onClick={completeSale}
              disabled={isLoading || cart.length === 0 || parseFloat(amountPaid || 0) < totalAmount || Object.values(cartErrors).some(error => error)}
            >
              {isLoading ? "Processing..." : "Complete Sale"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PointOfSales;