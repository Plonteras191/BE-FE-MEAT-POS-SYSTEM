import React, { useState, useEffect, useMemo } from "react";
import "../styles/PointOfSales.css"; // Make sure this path is correct
import Modal from "../components/Modal.jsx"; // Make sure this path is correct
import { productsApi } from "../services/api.js"; // Make sure this path is correct

const PointOfSales = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState("0"); // Initialize as string "0" or ""
  const [discountError, setDiscountError] = useState(""); // State for discount inline error
  const [amountPaid, setAmountPaid] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null); // General error for fetching products
  const [successMessage, setSuccessMessage] = useState(""); // General success message
  const [searchTerm, setSearchTerm] = useState("");

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

  const [cartErrors, setCartErrors] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("");

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

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  const openQuantityModal = (product) => {
    setQuantityModal({
      isOpen: true,
      product,
      quantity: "1",
      error: ""
    });
  };

  const closeQuantityModal = () => {
    setQuantityModal({
      isOpen: false,
      product: null,
      quantity: "1",
      error: ""
    });
  };

  const handleQuantityModalChange = (e) => {
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
  };

  const confirmAddToCart = () => {
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
        price: product.price,
        maxStock: product.weight // Store max stock for cart validation
      }]);
    }
    closeQuantityModal();
  };

  const handleRemoveFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
    setCartErrors(prevErrors => {
      const newErrors = { ...prevErrors };
      delete newErrors[productId];
      return newErrors;
    });
  };

  const handleQuantityChange = (productId, newValue) => {
    const cartItem = cart.find(item => item.product_id === productId);
    // Find the original product details for max stock, as cartItem.maxStock is what we set
    const productInProductsList = products.find(p => p.product_id === productId);
    const maxStock = productInProductsList ? parseFloat(productInProductsList.weight) : (cartItem ? parseFloat(cartItem.maxStock) : 0);

    const qty = parseFloat(newValue);
    let errorMsg = "";

    if (newValue === "" || isNaN(qty) || qty <= 0) {
      errorMsg = "Invalid quantity";
    } else if (qty > maxStock) {
      errorMsg = `Exceeds stock (${maxStock} kg)`;
    }

    setCart(cart.map(item =>
      item.product_id === productId
        ? { ...item, quantity: newValue }
        : item
    ));
    setCartErrors(prev => ({ ...prev, [productId]: errorMsg }));
  };

  const handleDiscountChange = (e) => {
    const value = e.target.value;
    let newDiscountError = "";

    setDiscount(value); // Update state to reflect user's input immediately

    if (value === "") { // If input is empty, it's not an error for calculation (treat as 0 discount)
      setDiscountError("");
      return;
    }

    const numericValue = parseFloat(value);

    if (isNaN(numericValue) && value !== "-") { // Allow typing "-", but not other non-numeric
      newDiscountError = "Please enter a valid number.";
    } else if (numericValue < 0) {
      newDiscountError = "Discount cannot be negative.";
    } else if (numericValue > 100) {
      newDiscountError = "Discount cannot exceed 100%.";
    }
    setDiscountError(newDiscountError);
  };

  const handleAmountPaidChange = (e) => {
    const value = e.target.value;
    setAmountPaid(value); // Update state to reflect user's input immediately

    // Basic validation for negative (can be expanded)
    if (value !== "" && parseFloat(value) < 0) {
      // Optionally, set an inline error for amountPaid too
      showNotification("Invalid Input", "Amount paid cannot be negative.", "error");
    }
  };

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
      return 0; // If error somehow missed or value is invalid, calculate with 0 discount
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


  const completeSale = async () => {
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
    if (totalAmount <= 0 && subtotal > 0) { // Allow 0 total if subtotal is 0 (e.g. 100% discount on 0 items)
                                       // but not if total is negative or zero due to excessive discount.
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
        discount: discountPercentageForCalculation.toFixed(2), // Use the validated percentage
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: parseFloat(item.quantity).toFixed(2), // Ensure quantity is valid number
          price_per_kg: parseFloat(item.price).toFixed(2)
        }))
      };

      // Simulate API call
      console.log("Sale Data:", saleData);
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

      // Fix for TypeError: Ensure we have a number before calling toFixed
      const changeAmount = typeof saleResult.change_amount === 'number' ? 
        saleResult.change_amount.toFixed(2) : 
        change.toFixed(2);

      showNotification(
        "Sale Completed",
        `Sale completed successfully! Receipt No: ${receiptNo}\nChange: ₱${changeAmount}`,
        "success"
      );
      setCart([]);
      setCartErrors({});
      setDiscount("0");
      setDiscountError("");
      setAmountPaid("");
      fetchProducts(); // Refresh product list for stock updates
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
  };

  const categories = useMemo(() => {
    const uniqueCategories = new Set(products.map(p => p.category_name).filter(Boolean));
    return ["", ...Array.from(uniqueCategories)];
  }, [products]);

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(product =>
      product.type.toLowerCase().includes(searchTerm.toLowerCase()) &&
      parseFloat(product.weight) > 0 && // Only show products with stock
      (selectedCategory === "" || product.category_name === selectedCategory)
    );
  }, [products, searchTerm, selectedCategory]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const canProductBeSold = (product) => {
    return parseFloat(product.weight) > 0 && product.status !== 'expired';
  };

  const getStatusMessage = (product) => {
    if (parseFloat(product.weight) <= 0) return "Out of stock";
    if (product.status === 'expired') return "Expired";
    return "";
  };

  return (
    <div className="pos-container container">
      <h2>Point of Sales</h2>

      {error && <div className="error-message">{error}</div>}
      {/* successMessage is handled by the modal now */}

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
          { label: "Add", onClick: confirmAddToCart, type: "primary", disabled: !!quantityModal.error || !quantityModal.quantity || parseFloat(quantityModal.quantity) <= 0 },
          { label: "Cancel", onClick: closeQuantityModal, type: "secondary" }
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
              className={quantityModal.error ? "quantity-input input-error" : "quantity-input"}
              autoFocus
            />
            {quantityModal.error && (
              <div className="inline-error">{quantityModal.error}</div>
            )}
          </div>
        </div>
      </Modal>

      <div className="pos-content">
        <div className="pos-products">
          <h3>Products</h3>
          <div className="product-filters">
            <div className="product-search">
              <input
                type="text"
                placeholder="Search products by type..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
            <div className="product-category-filter">
              <select value={selectedCategory} onChange={handleCategoryChange}>
                <option value="">All Categories</option>
                {categories.map((category, index) => (
                  category && <option key={index} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>

          {isLoading && !products.length ? ( // Show loading only if products are not yet loaded
            <p>Loading products...</p>
          ) : (
            <>
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
            </>
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
                value={discount}
                onChange={handleDiscountChange}
                placeholder="0-100"
                className={discountError ? "input-error" : ""}
              />
              {discountError && (
                <div className="inline-error">{discountError}</div>
              )}
            </div>
          </div>

          {cart.length === 0 ? (
            <p>No items in cart.</p>
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
                {cart.map(item => {
                  const itemSubtotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
                  return (
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
                            className={cartErrors[item.product_id] ? "quantity-input input-error" : "quantity-input"}
                          />
                          {cartErrors[item.product_id] && (
                            <div className="inline-error">{cartErrors[item.product_id]}</div>
                          )}
                        </div>
                      </td>
                      <td>{item.price}</td>
                      <td>{itemSubtotal.toFixed(2)}</td>
                      <td>
                        <button onClick={() => handleRemoveFromCart(item.product_id)}>Remove</button>
                      </td>
                    </tr>
                  );
                })}
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
                />
              </div>
              {insufficientPayment && amountPaid !== "" && parseFloat(amountPaid) >= 0 && (
                <div className="payment-warning inline-error">
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
                !!discountError || // Disable if there's a discount input error
                Object.values(cartErrors).some(error => error) || // Disable if any cart item has quantity error
                insufficientPayment || // Disable if payment is insufficient
                amountPaid === "" || // Disable if amount paid is empty
                parseFloat(amountPaid) < 0 // Disable if amount paid is negative
              }
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