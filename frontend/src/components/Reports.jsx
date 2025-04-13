import React, { useContext } from "react";
import { InventoryContext } from "../context/InventoryContext";
import "../styles/Reports.css";

const Reports = () => {
  const { products, salesHistory } = useContext(InventoryContext);

  // Calculate total inventory value (price * weight)
  const totalInventoryValue = products.reduce(
    (sum, product) => sum + Number(product.weight) * Number(product.price),
    0
  );

  // Calculate total sales amount from salesHistory
  const totalSales = salesHistory.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <div className="reports-container">
      <header className="reports-header">
        <h2>Reports</h2>
      </header>
      
      <div className="report-summary">
        <div className="report-card">
          <h3>Total Inventory Value</h3>
          <p>₱{totalInventoryValue.toFixed(2)}</p>
        </div>
        <div className="report-card">
          <h3>Total Sales</h3>
          <p>₱{totalSales.toFixed(2)}</p>
        </div>
      </div>

      {salesHistory.length > 0 && (
        <div className="sales-history">
          <h3>Sales History</h3>
          <table className="reports-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Sale Amount (PHP)</th>
                <th>Customer</th>
              </tr>
            </thead>
            <tbody>
              {salesHistory.map((sale) => (
                <tr key={sale.receiptNo}>
                  <td>{new Date(sale.date).toLocaleString()}</td>
                  <td>₱{sale.total.toFixed(2)}</td>
                  <td>{sale.customer ? sale.customer.name : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Reports;
