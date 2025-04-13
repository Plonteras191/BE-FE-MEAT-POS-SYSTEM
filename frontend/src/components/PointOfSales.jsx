import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/PointOfSales.css";

const PointOfSales = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Adjust the API_URL based on your XAMPP configuration
  const API_URL = "http://localhost/MEAT_POS/backend/api";

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/products.php`);
      setProducts(response.data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch products");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = (product) => {
    const qtyStr = prompt(`Enter quantity (kg) to sell for ${product.type}:`, "1");
    const qty = parseFloat(qtyStr);
    
    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid quantity");
      return;
    }
    
    if (qty > parseFloat(product.weight)) {
      alert(`Not enough stock for ${product.type}. Available: ${product.weight} kg`);
      return;
    }
    
    const existing = cart.find(item => item.product_id === product.product_id);
    if (existing) {
      if (parseFloat(existing.quantity) + qty > parseFloat(product.weight)) {
        alert(`Not enough stock for ${product.type}. Available: ${product.weight} kg`);
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
  };

  const handleRemoveFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const handleQuantityChange = (productId, newQuantity) => {
    const product = products.find(p => p.product_id === productId);
    const qty = parseFloat(newQuantity);
    
    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid quantity");
      return;
    }
    
    if (qty > parseFloat(product.weight)) {
      alert(`Not enough stock for ${product.type}. Available: ${product.weight} kg`);
      return;
    }
    
    setCart(cart.map(item =>
      item.product_id === productId 
        ? { ...item, quantity: qty.toFixed(2) } 
        : item
    ));
  };

  const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.quantity) * parseFloat(item.price), 0);
  const discountAmount = (subtotal * discount) / 100;
  const totalAmount = subtotal - discountAmount;
  const change = parseFloat(amountPaid) - totalAmount > 0 ? parseFloat(amountPaid) - totalAmount : 0;

  const completeSale = async () => {
    if (cart.length === 0) {
      alert("No products in cart!");
      return;
    }
    
    if (totalAmount <= 0) {
      alert("Total amount must be greater than zero!");
      return;
    }
    
    if (parseFloat(amountPaid) < totalAmount) {
      alert("Amount paid is less than total amount!");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Generate receipt number (timestamp-based)
      const receiptNo = `RCP-${Date.now()}`;
      
      // Create sale record without customer information
      const saleResponse = await axios.post(`${API_URL}/sales.php`, {
        receipt_no: receiptNo,
        customer_id: null, // Customer field removed
        subtotal: subtotal.toFixed(2),
        discount_percent: parseFloat(discount).toFixed(2),
        discount_amount: discountAmount.toFixed(2),
        total_amount: totalAmount.toFixed(2),
        amount_paid: parseFloat(amountPaid).toFixed(2)
      });
      
      const saleId = saleResponse.data.sale_id;
      
      // Create sale items and update inventory
      for (const item of cart) {
        await axios.post(`${API_URL}/sale_items.php`, {
          sale_id: saleId,
          product_id: item.product_id,
          quantity: item.quantity,
          price_per_kg: item.price
        });
      }
      
      setSuccessMessage(`Sale completed! Receipt No: ${receiptNo}`);
      setCart([]);
      setDiscount(0);
      setAmountPaid("");
      fetchProducts(); // Refresh products to get updated stock levels
    } catch (err) {
      setError("Failed to complete sale: " + (err.response?.data?.error || err.message));
      console.error(err);
    } finally {
      setIsLoading(false);
      setTimeout(() => setSuccessMessage(""), 5000);
    }
  };

  const filteredProducts = products.filter(product => 
    product.type.toLowerCase().includes(searchTerm.toLowerCase()) && 
    parseFloat(product.weight) > 0
  );

  return (
    <div className="pos-container container">
      <h2>Point of Sales</h2>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      
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
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="no-data">No products found</td>
                  </tr>
                ) : (
                  filteredProducts.map(product => (
                    <tr key={product.product_id}>
                      <td>{product.type}</td>
                      <td>{product.category_name || 'N/A'}</td>
                      <td>{product.weight}</td>
                      <td>{product.price}</td>
                      <td>
                        <button 
                          onClick={() => handleAddToCart(product)}
                          disabled={parseFloat(product.weight) <= 0}
                        >
                          Sold
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
          <h3>Shopping Cart</h3>
          <div className="cart-options">
            {/* Customer selection removed */}
            <div className="form-group">
              <label htmlFor="discount">Discount (%)</label>
              <input
                type="number"
                id="discount"
                min="0"
                max="100"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
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
                {cart.map(item => (
                  <tr key={item.product_id}>
                    <td>{item.type}</td>
                    <td>
                      <input
                        type="number"
                        value={item.quantity}
                        min="0.01"
                        step="0.01"
                        onChange={(e) => handleQuantityChange(item.product_id, e.target.value)}
                        className="quantity-input"
                      />
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
                <span>Discount ({discount}%):</span>
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
                  onChange={(e) => setAmountPaid(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              {parseFloat(amountPaid) >= totalAmount && cart.length > 0 && (
                <div className="total-row change">
                  <span>Change:</span>
                  <span>₱{change.toFixed(2)}</span>
                </div>
              )}
            </div>
            
            <button 
              className="complete-sale" 
              onClick={completeSale}
              disabled={isLoading || cart.length === 0 || parseFloat(amountPaid) < totalAmount}
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
