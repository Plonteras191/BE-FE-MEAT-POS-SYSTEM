import React, { createContext, useState } from "react";

export const InventoryContext = createContext();

export const InventoryProvider = ({ children }) => {
  const [products, setProducts] = useState([
    { id: 1, type: "Beef", weight: 10, price: 15, expiry: "2025-04-15" },
    { id: 2, type: "Chicken", weight: 20, price: 10, expiry: "2025-03-20" },
  ]);

  const [salesHistory, setSalesHistory] = useState([]);

  const addProduct = (product) => {
    product.id = Date.now();
    setProducts([...products, product]);
  };

  const updateProduct = (id, updatedProduct) => {
    setProducts(products.map(p => (p.id === id ? { id, ...updatedProduct } : p)));
  };

  const deleteProduct = (id) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const addSale = (sale) => {
    sale.id = Date.now();
    setSalesHistory([...salesHistory, sale]);
  };

  return (
    <InventoryContext.Provider
      value={{ products, addProduct, updateProduct, deleteProduct, salesHistory, addSale }}
    >
      {children}
    </InventoryContext.Provider>
  );
};
