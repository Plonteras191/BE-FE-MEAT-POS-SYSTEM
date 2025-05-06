import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { format, subDays } from "date-fns";
import '../styles/index.css';
import apiClient from "../services/api.js";

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    total_products: 0,
    low_stock_count: 0,
    today_sales_count: 0,
    today_sales_amount: 0,
    inventory_value: 0,
    last_7_days_sales: [],
    top_products: [],
    low_stock_items: []
  });
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const dataInterval = setInterval(fetchDashboardData, 300000); // every 5 min
    const dateInterval = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(dateInterval);
    };
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // summary data
      const dashboardRes = await apiClient.get("/dashboard.php");
      // active products
      const productsRes  = await apiClient.get("/products.php");
      // today's actual sales
      const todayStr     = format(new Date(), "yyyy-MM-dd");
      const salesRes     = await apiClient.get(
        `/sales.php?start_date=${todayStr}&end_date=${todayStr}`
      );

      // Calculate today's sales total amount
      const todaySalesAmount = salesRes.data.reduce((total, sale) => {
        return total + parseFloat(sale.total_amount || 0);
      }, 0);

      setDashboardData({
        ...dashboardRes.data,
        total_products: productsRes.data.length,
        today_sales_count: salesRes.data.length,
        today_sales_amount: todaySalesAmount // Override with calculated amount from actual sales data
      });
      setError(null);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError("Failed to load dashboard data. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(value);

  const prepareSalesChartData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const key = format(day, "yyyy-MM-dd");
      const rec = dashboardData.last_7_days_sales.find(r => r.date === key);
      data.push({
        date: key,
        sales: rec ? parseFloat(rec.sales_amount) : 0,
        formattedDate: format(day, "EEE, MMM d")
      });
    }
    return data;
  };

  const preparePieChartData = () => {
    return (dashboardData.top_products || []).map(p => ({
      name: p.type,
      value: parseInt(p.total_quantity, 10)
    }));
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const formattedDate = format(currentDate, "EEEE, MMMM d, yyyy");
  const formattedTime = format(currentDate, "h:mm:ss a");

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="mt-3 md:mt-0 flex flex-col items-end">
            <p className="text-lg font-medium text-gray-900">{formattedDate}</p>
            <p className="text-md text-gray-600">{formattedTime}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1..." clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Products */}
          <div className="bg-sky-50 rounded-xl shadow-sm p-6 border border-sky-100">
            <div className="flex items-center">
              <div className="rounded-full bg-sky-100 p-3 mr-4">
                <svg className="h-6 w-6 text-sky-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-sky-600">Total Products</p>
                <p className="text-2xl font-semibold text-gray-900">{dashboardData.total_products}</p>
              </div>
            </div>
          </div>
          
          {/* Low Stock */}
          <div className="bg-amber-50 rounded-xl shadow-sm p-6 border border-amber-100">
            <div className="flex items-center">
              <div className="rounded-full bg-amber-100 p-3 mr-4">
                <svg className="h-6 w-6 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-amber-600">Low Stock Items</p>
                <p className="text-2xl font-semibold text-gray-900">{dashboardData.low_stock_count}</p>
                <p className="text-sm font-medium text-gray-500">Need attention</p>
              </div>
            </div>
          </div>
          
          {/* Today's Sales */}
          <div className="bg-green-50 rounded-xl shadow-sm p-6 border border-green-100">
            <div className="flex items-center">
              <div className="rounded-full bg-green-100 p-3 mr-4">
                <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-green-600">Today's Sales</p>
                <p className="text-2xl font-semibold text-gray-900">{dashboardData.today_sales_count} SOLD</p>
                <p className="text-sm font-medium text-gray-500">{formatCurrency(dashboardData.today_sales_amount)}</p>
              </div>
            </div>
          </div>
          
          {/* Inventory Value */}
          <div className="bg-purple-50 rounded-xl shadow-sm p-6 border border-purple-100">
            <div className="flex items-center">
              <div className="rounded-full bg-purple-100 p-3 mr-4">
                <svg className="h-6 w-6 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-purple-600">Inventory Value</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(dashboardData.inventory_value)}</p>
                <p className="text-sm font-medium text-gray-500">Total stock value</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Last 7 Days Sales</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prepareSalesChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="formattedDate" angle={-45} textAnchor="end" height={60} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Sales']} labelFormatter={(label) => `Date: ${label}`} contentStyle={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="sales" name="Sales Amount" fill="#10B981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Top 5 Products (Last 30 Days)</h2>
            <div className="h-80">
              {dashboardData.top_products.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={preparePieChartData()} cx="50%" cy="50%" labelLine={true} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {preparePieChartData().map((entry, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} units`, 'Quantity Sold']} contentStyle={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                    <Legend layout="vertical" verticalAlign="middle" align="right" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No sales data available for the last 30 days</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Low Stock Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Low Stock Items</h2>
          </div>
          {dashboardData.low_stock_items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock (kg)</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alert Level (kg)</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dashboardData.low_stock_items.map(item => (
                    <tr key={item.product_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{parseFloat(item.weight).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{parseFloat(item.stock_alert).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {parseFloat(item.weight) < parseFloat(item.stock_alert)*0.5 ? (
                          <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-medium">Critical</span>
                        ) : (
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-medium">Low</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-gray-500">No low stock items to display</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;