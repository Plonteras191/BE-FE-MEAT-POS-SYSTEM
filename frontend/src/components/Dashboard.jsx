import React, { useContext } from "react";
import { InventoryContext } from "../context/InventoryContext";
import "../styles/Dashboard.css";

const Dashboard = () => {
  const { products, salesHistory } = useContext(InventoryContext);

  // Calculate summary values
  const totalStock = products.reduce((acc, product) => acc + Number(product.weight), 0);
  const lowStockAlerts = products.filter(product => product.weight < 5).length;
  const today = new Date();
  const expirationWarnings = products.filter(product => {
    const expiryDate = new Date(product.expiry);
    const diffTime = expiryDate - today;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  }).length;
  
  const totalSales = salesHistory.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h2>Dashboard</h2>
      </header>
      <div className="cards-container">
        <div className="card">
          <h3>Total Stock (kg)</h3>
          <p>{totalStock}</p>
        </div>
        <div className="card">
          <h3>Low Stock Alerts</h3>
          <p>{lowStockAlerts} items</p>
        </div>
        <div className="card">
          <h3>Expiration Warnings</h3>
          <p>{expirationWarnings} items</p>
        </div>
        <div className="card">
          <h3>Total Sales (PHP)</h3>
          <p>₱{totalSales.toFixed(2)}</p>
        </div>
      </div>
      <div className="product-list-section">
        <h2>Product List</h2>
        <div className="product-list">
          {products.map(product => (
            <div key={product.id} className="product-card">
              <h4>{product.type}</h4>
              <p>Weight: {product.weight} kg</p>
              <p>Price: ₱{product.price}</p>
              <p>Expiry: {product.expiry}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;