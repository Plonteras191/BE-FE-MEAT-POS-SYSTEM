import React, { useContext } from "react";
import { InventoryContext } from "../context/InventoryContext";
import "../styles/ExpirationAlerts.css";

const ExpirationAlerts = () => {
  const { products } = useContext(InventoryContext);
  const today = new Date();

  // Filter for products with an expiration date within 7 days
  const alerts = products.filter((product) => {
    if (!product.expiry) return false;
    const expiryDate = new Date(product.expiry);
    const diffTime = expiryDate - today;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  });

  return (
    <div className="expiration-alerts-container">
      <header className="expiration-alerts-header">
        <h2>Expiration Alerts</h2>
      </header>

      <div className="alerts-summary-card">
        <h3>Products Nearing Expiration</h3>
        <p>{alerts.length} Items</p>
      </div>

      {alerts.length > 0 ? (
        <div className="alerts-table-container">
          <table className="alerts-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Expiry Date</th>
                <th>Days Left</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((product) => {
                const expiryDate = new Date(product.expiry);
                const diffTime = expiryDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return (
                  <tr key={product.id}>
                    <td>{product.type}</td>
                    <td>{expiryDate.toLocaleDateString()}</td>
                    <td>{diffDays}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="no-alerts">No products nearing expiration.</p>
      )}
    </div>
  );
};

export default ExpirationAlerts;
