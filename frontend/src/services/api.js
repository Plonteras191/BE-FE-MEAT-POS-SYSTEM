import axios from "axios";

// src/services/api.js

const API_BASE_URL = "http://localhost/MEAT_POS/backend/api";

// Create axios instance with base URL
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

// Products API
export const productsApi = {
  getAll: () => apiClient.get("/products.php"),
  getAllWithDeleted: () => apiClient.get("/products.php?include_deleted=1"),
  getById: (id) => apiClient.get(`/products.php?id=${id}`),
  create: (data) => apiClient.post("/products.php", data),
  update: (data) => apiClient.put("/products.php", data),
  delete: (id) => apiClient.delete(`/products.php?id=${id}`),
  restore: (id) => apiClient.patch(`/products.php?action=restore&id=${id}`),
  updateStatuses: () => apiClient.patch("/products.php?action=update_status")
};

// Categories API
export const categoriesApi = {
  getAll: () => apiClient.get("/categories.php"),
  create: (data) => apiClient.post("/categories.php", data)
};

// Stock Adjustments API
export const stockAdjustmentsApi = {
  create: (data) => apiClient.post("/stock_adjustments.php", data),
  getAll: () => apiClient.get("/stock_adjustments.php"),
  getByProductId: (productId) => apiClient.get(`/stock_adjustments.php?product_id=${productId}`)
};

// Add a debug version for troubleshooting
export const debugStockAdjustmentsApi = {
  getAll: () => debugApiCall(() => stockAdjustmentsApi.getAll(), 'stockAdjustments/getAll')
};

// Sales API
export const salesApi = {
  create: (data) => apiClient.post("/sales.php", data),
  getAll: () => apiClient.get("/sales.php"),
  getById: (id) => apiClient.get(`/sales.php?id=${id}`)
};

// Sale Items API
export const saleItemsApi = {
  create: (data) => apiClient.post("/sale_items.php", data),
  getBySaleId: (saleId) => apiClient.get(`/sale_items.php?sale_id=${saleId}`)
};

// Reports API
export const reportsApi = {
  getReport: (type, params = {}) => {
    // Build the URL with required parameters
    let url = `/reports.php?type=${type}`;
    
    // Add any additional params to the URL
    Object.keys(params).forEach(key => {
      if (params[key]) {
        url += `&${key}=${encodeURIComponent(params[key])}`;
      }
    });
    
    return apiClient.get(url)
      .then(response => {
        // Handle case where response might be empty or malformed
        if (!response.data) {
          console.warn(`Empty response for report type: ${type}`);
          return { data: type === 'sales' || type === 'inventory' ? {} : [] };
        }
        return response;
      })
      .catch(error => {
        console.error(`Error fetching ${type} report:`, error);
        // Return appropriate default value based on report type
        if (type === 'low_stock' || type === 'stock_movements') {
          return { data: [] };
        } else {
          return { data: {} };
        }
      });
  }
};

// Debugging wrapper - can be removed in production
const debugApiCall = async (apiCall, name) => {
  console.log(`Calling ${name}...`);
  try {
    const result = await apiCall();
    console.log(`${name} result:`, result);
    return result;
  } catch (error) {
    console.error(`${name} error:`, error);
    throw error;
  }
};

// Debug version of reportsApi - for troubleshooting only
export const debugReportsApi = {
  getReport: (type, params) => debugApiCall(() => reportsApi.getReport(type, params), `report/${type}`)
};

export default apiClient;