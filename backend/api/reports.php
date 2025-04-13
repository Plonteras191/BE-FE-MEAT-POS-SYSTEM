<?php
// reports.php - API for generating various reports

require_once 'db_connection.php';

// Handle GET requests for different report types
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $reportType = isset($_GET['type']) ? $_GET['type'] : '';
    
    switch ($reportType) {
        case 'sales':
            getSalesReport($conn);
            break;
        
        case 'inventory':
            getInventoryReport($conn);
            break;
            
        case 'low_stock':
            getLowStockReport($conn);
            break;
            
        case 'stock_movements':
            getStockMovementsReport($conn);
            break;
            
        default:
            http_response_code(400);
            echo json_encode(["error" => "Invalid report type"]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}

// Sales report with optional date range filtering
function getSalesReport($conn) {
    // Get date range filters
    $startDate = isset($_GET['start_date']) ? $conn->real_escape_string($_GET['start_date']) : null;
    $endDate = isset($_GET['end_date']) ? $conn->real_escape_string($_GET['end_date']) : null;
    
    $whereClause = "";
    if ($startDate && $endDate) {
        $whereClause = " WHERE DATE(s.sale_date) BETWEEN '$startDate' AND '$endDate'";
    } else if ($startDate) {
        $whereClause = " WHERE DATE(s.sale_date) >= '$startDate'";
    } else if ($endDate) {
        $whereClause = " WHERE DATE(s.sale_date) <= '$endDate'";
    }
    
    // Get sales summary
    $summarySql = "SELECT 
                    COUNT(*) AS total_sales, 
                    SUM(subtotal) AS total_subtotal, 
                    SUM(discount_amount) AS total_discounts, 
                    SUM(total_amount) AS total_revenue
                  FROM sales s
                  $whereClause";
    
    $summaryResult = $conn->query($summarySql);
    $summary = $summaryResult ? $summaryResult->fetch_assoc() : null;
    
    // Get daily sales totals
    $dailySql = "SELECT 
                    DATE(s.sale_date) AS sale_date,
                    COUNT(*) AS sales_count,
                    SUM(s.total_amount) AS total_revenue
                 FROM sales s
                 $whereClause
                 GROUP BY DATE(s.sale_date)
                 ORDER BY DATE(s.sale_date)";
    
    $dailyResult = $conn->query($dailySql);
    $dailySales = [];
    
    if ($dailyResult) {
        while ($row = $dailyResult->fetch_assoc()) {
            $dailySales[] = $row;
        }
    }
    
    // Get top selling products
    $productsSql = "SELECT 
                    p.type,
                    SUM(si.quantity) AS total_quantity,
                    SUM(si.quantity * si.price_per_kg) AS total_revenue
                 FROM sale_items si
                 JOIN products p ON si.product_id = p.product_id
                 JOIN sales s ON si.sale_id = s.sale_id
                 $whereClause
                 GROUP BY p.product_id
                 ORDER BY total_quantity DESC
                 LIMIT 10";
    
    $productsResult = $conn->query($productsSql);
    $topProducts = [];
    
    if ($productsResult) {
        while ($row = $productsResult->fetch_assoc()) {
            $topProducts[] = $row;
        }
    }
    
    // Combine all report data
    $reportData = [
        "summary" => $summary,
        "daily_sales" => $dailySales,
        "top_products" => $topProducts
    ];
    
    echo json_encode($reportData);
}

// Inventory status report
function getInventoryReport($conn) {
    $sql = "SELECT 
              p.product_id,
              p.type,
              c.category_name,
              p.supplier,
              p.weight AS current_stock,
              p.price,
              p.expiry_date,
              p.stock_alert,
              (p.weight * p.price) AS inventory_value
           FROM products p
           LEFT JOIN categories c ON p.category_id = c.category_id
           ORDER BY p.type";
    
    $result = $conn->query($sql);
    $products = [];
    
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $products[] = $row;
        }
    }
    
    // Calculate totals
    $totalValue = 0;
    $totalItems = count($products);
    $lowStockCount = 0;
    
    foreach ($products as $product) {
        $totalValue += floatval($product['inventory_value']);
        if (floatval($product['current_stock']) <= floatval($product['stock_alert'])) {
            $lowStockCount++;
        }
    }
    
    $reportData = [
        "products" => $products,
        "summary" => [
            "total_items" => $totalItems,
            "total_value" => $totalValue,
            "low_stock_count" => $lowStockCount
        ]
    ];
    
    echo json_encode($reportData);
}

// Low stock report
function getLowStockReport($conn) {
    $sql = "SELECT 
              p.product_id,
              p.type,
              c.category_name,
              p.supplier,
              p.weight AS current_stock,
              p.stock_alert,
              p.price,
              (p.stock_alert - p.weight) AS deficit
           FROM products p
           LEFT JOIN categories c ON p.category_id = c.category_id
           WHERE p.weight <= p.stock_alert
           ORDER BY (p.stock_alert - p.weight) DESC";
    
    $result = $conn->query($sql);
    $products = [];
    
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $products[] = $row;
        }
    }
    
    echo json_encode($products);
}

// Stock movements report
function getStockMovementsReport($conn) {
    // Get date range filters
    $startDate = isset($_GET['start_date']) ? $conn->real_escape_string($_GET['start_date']) : null;
    $endDate = isset($_GET['end_date']) ? $conn->real_escape_string($_GET['end_date']) : null;
    $productId = isset($_GET['product_id']) ? $conn->real_escape_string($_GET['product_id']) : null;
    
    $whereClause = [];
    
    if ($startDate) {
        $whereClause[] = "DATE(m.movement_date) >= '$startDate'";
    }
    
    if ($endDate) {
        $whereClause[] = "DATE(m.movement_date) <= '$endDate'";
    }
    
    if ($productId) {
        $whereClause[] = "m.product_id = $productId";
    }
    
    $whereString = !empty($whereClause) ? " WHERE " . implode(" AND ", $whereClause) : "";
    
    // First get all stock adjustments
    $adjustmentsSql = "SELECT 
                        sa.adjustment_id AS movement_id,
                        sa.product_id,
                        p.type AS product_name,
                        'adjustment' AS movement_type,
                        sa.reason,
                        sa.quantity_change,
                        sa.notes,
                        sa.adjustment_date AS movement_date
                     FROM stock_adjustments sa
                     JOIN products p ON sa.product_id = p.product_id";
    
    // Then get all sales items as negative stock movements
    $salesSql = "SELECT 
                  CONCAT('sale-', si.sale_item_id) AS movement_id,
                  si.product_id,
                  p.type AS product_name,
                  'sale' AS movement_type,
                  'remove' AS reason,
                  -si.quantity AS quantity_change,
                  CONCAT('Sale #', s.receipt_no) AS notes,
                  s.sale_date AS movement_date
                FROM sale_items si
                JOIN products p ON si.product_id = p.product_id
                JOIN sales s ON si.sale_id = s.sale_id";
    
    // Combine both queries with UNION
    $sql = "SELECT * FROM (
              ($adjustmentsSql) UNION ALL ($salesSql)
            ) AS m
            $whereString
            ORDER BY m.movement_date DESC";
    
    $result = $conn->query($sql);
    $movements = [];
    
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $movements[] = $row;
        }
    }
    
    echo json_encode($movements);
}

$conn->close();
?>