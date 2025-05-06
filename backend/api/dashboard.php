<?php
// dashboard.php - API for dashboard summary information

require_once 'db_connection.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $response = [];
        
        // Get today's date
        $today = date('Y-m-d');
        
        // Get total products count - only active products
        $productsSql = "SELECT COUNT(*) as total FROM products WHERE is_deleted = 0";
        $productsResult = $conn->query($productsSql);
        $response['total_products'] = $productsResult->fetch_assoc()['total'];
        
        // Get low stock products count - only active products
        $lowStockSql = "SELECT COUNT(*) as total FROM products WHERE weight <= stock_alert AND is_deleted = 0";
        $lowStockResult = $conn->query($lowStockSql);
        $response['low_stock_count'] = $lowStockResult->fetch_assoc()['total'];
        
        // Get today's sales count - Make sure to use current date with proper timezone
        $todaySalesSql = "SELECT COUNT(*) as total, IFNULL(SUM(total_amount), 0) as amount FROM sales WHERE DATE(sale_date) = CURRENT_DATE()";
        $todaySalesResult = $conn->query($todaySalesSql);
        $todaySales = $todaySalesResult->fetch_assoc();
        $response['today_sales_count'] = $todaySales['total'] ?: 0;
        $response['today_sales_amount'] = $todaySales['amount'] ?: 0;
        
        // Get total inventory value - only active products
        $inventoryValueSql = "SELECT SUM(weight * price) as total FROM products WHERE is_deleted = 0";
        $inventoryValueResult = $conn->query($inventoryValueSql);
        $response['inventory_value'] = $inventoryValueResult->fetch_assoc()['total'] ?: 0;
        
        // Get last 7 days sales
        $last7DaysSql = "SELECT 
                            DATE(sale_date) as date, 
                            COUNT(*) as sales_count, 
                            SUM(total_amount) as sales_amount 
                        FROM sales 
                        WHERE sale_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 DAY) 
                        GROUP BY DATE(sale_date) 
                        ORDER BY date";
        $last7DaysResult = $conn->query($last7DaysSql);
        $last7Days = [];
        while ($row = $last7DaysResult->fetch_assoc()) {
            $last7Days[] = $row;
        }
        $response['last_7_days_sales'] = $last7Days;
        
        // Get top 5 selling products (last 30 days) - only products from active inventory
        $topProductsSql = "SELECT 
                            p.type, 
                            SUM(si.quantity) as total_quantity 
                        FROM sale_items si 
                        JOIN products p ON si.product_id = p.product_id 
                        JOIN sales s ON si.sale_id = s.sale_id 
                        WHERE s.sale_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
                        AND p.is_deleted = 0
                        GROUP BY p.product_id 
                        ORDER BY total_quantity DESC 
                        LIMIT 5";
        $topProductsResult = $conn->query($topProductsSql);
        $topProducts = [];
        while ($row = $topProductsResult->fetch_assoc()) {
            $topProducts[] = $row;
        }
        $response['top_products'] = $topProducts;
        
        // Get low stock products (details for notifications) - FIXED to exclude deleted products
        $lowStockDetailsSql = "SELECT 
                                product_id, 
                                type, 
                                weight, 
                                stock_alert 
                            FROM products 
                            WHERE weight <= stock_alert 
                            AND is_deleted = 0
                            ORDER BY (stock_alert - weight) DESC 
                            LIMIT 10";
        $lowStockDetailsResult = $conn->query($lowStockDetailsSql);
        $lowStockDetails = [];
        while ($row = $lowStockDetailsResult->fetch_assoc()) {
            $lowStockDetails[] = $row;
        }
        $response['low_stock_items'] = $lowStockDetails;
        
        echo json_encode($response);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to fetch dashboard data: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}

$conn->close();
?>