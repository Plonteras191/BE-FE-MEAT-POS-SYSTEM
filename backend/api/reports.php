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
            
        case 'stock_adjustments':
            getStockAdjustmentsReport($conn);
            break;
            
        default:
            http_response_code(400);
            echo json_encode(["error" => "Invalid report type"]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}

// Stock adjustments report with date range filtering
// Modified getStockAdjustmentsReport function that excludes sale-related adjustments
function getStockAdjustmentsReport($conn) {
    // Get date range filters
    $startDate = isset($_GET['start_date']) ? $conn->real_escape_string($_GET['start_date']) : null;
    $endDate = isset($_GET['end_date']) ? $conn->real_escape_string($_GET['end_date']) : $startDate;
    $productId = isset($_GET['product_id']) ? $conn->real_escape_string($_GET['product_id']) : null;
    $reason = isset($_GET['reason']) ? $conn->real_escape_string($_GET['reason']) : null;
    
    $whereConditions = [];
    
    // Add base condition to exclude sale-related adjustments
    $whereConditions[] = "sa.reason NOT LIKE '%sale%' AND sa.reason NOT LIKE '%sold%'";
    
    if ($startDate) {
        $whereConditions[] = "DATE(sa.adjustment_date) >= '$startDate'";
    }
    
    if ($endDate) {
        $whereConditions[] = "DATE(sa.adjustment_date) <= '$endDate'";
    }
    
    if ($productId) {
        $whereConditions[] = "sa.product_id = $productId";
    }
    
    if ($reason) {
        $whereConditions[] = "sa.reason LIKE '%$reason%'";
    }
    
    $whereClause = " WHERE " . implode(" AND ", $whereConditions);
    
    // Get adjustment summary
    $summarySql = "SELECT 
                    COUNT(sa.adjustment_id) AS total_adjustments,
                    SUM(CASE WHEN sa.quantity_change > 0 THEN sa.quantity_change ELSE 0 END) AS total_additions,
                    SUM(CASE WHEN sa.quantity_change < 0 THEN ABS(sa.quantity_change) ELSE 0 END) AS total_reductions,
                    COUNT(DISTINCT sa.product_id) AS affected_products
                  FROM stock_adjustments sa";
    
    $summarySql .= $whereClause;
    
    $summaryResult = $conn->query($summarySql);
    $summary = $summaryResult ? $summaryResult->fetch_assoc() : null;
    
    // Get detailed adjustments information
    $detailedSql = "SELECT 
                    sa.adjustment_id,
                    sa.product_id,
                    p.type AS product_name,
                    c.category_name,
                    sa.quantity_change,
                    sa.adjustment_date,
                    sa.reason,
                    sa.notes,
                    CASE 
                        WHEN sa.quantity_change > 0 THEN 'Addition'
                        ELSE 'Reduction'
                    END AS adjustment_type
                 FROM stock_adjustments sa
                 JOIN products p ON sa.product_id = p.product_id
                 LEFT JOIN categories c ON p.category_id = c.category_id
                 $whereClause
                 ORDER BY sa.adjustment_date DESC
                 LIMIT 100";  // Limiting to 100 records for performance
    
    $detailedResult = $conn->query($detailedSql);
    $adjustments = [];
    
    if ($detailedResult) {
        while ($row = $detailedResult->fetch_assoc()) {
            $adjustments[] = $row;
        }
    }
    
    // Get top adjusted products
    $productsSql = "SELECT 
                    p.product_id,
                    p.type,
                    c.category_name,
                    COUNT(sa.adjustment_id) AS adjustment_count,
                    SUM(sa.quantity_change) AS net_change,
                    SUM(CASE WHEN sa.quantity_change > 0 THEN sa.quantity_change ELSE 0 END) AS additions,
                    SUM(CASE WHEN sa.quantity_change < 0 THEN sa.quantity_change ELSE 0 END) AS reductions
                 FROM stock_adjustments sa
                 JOIN products p ON sa.product_id = p.product_id
                 LEFT JOIN categories c ON p.category_id = c.category_id
                 $whereClause
                 GROUP BY p.product_id 
                 ORDER BY adjustment_count DESC 
                 LIMIT 10";
    
    $productsResult = $conn->query($productsSql);
    $topProducts = [];
    
    if ($productsResult) {
        while ($row = $productsResult->fetch_assoc()) {
            $topProducts[] = $row;
        }
    }
    
    // Combine all report data
    $report = [
        'summary' => $summary,
        'adjustments' => $adjustments,
        'top_products' => $topProducts
    ];
    
    // Return JSON response
    header('Content-Type: application/json');
    echo json_encode($report);
}

// Sales report with date range filtering
function getSalesReport($conn) {
    // Get date range filters
    $startDate = isset($_GET['start_date']) ? $conn->real_escape_string($_GET['start_date']) : null;
    $endDate = isset($_GET['end_date']) ? $conn->real_escape_string($_GET['end_date']) : $startDate;
    $categoryId = isset($_GET['category_id']) ? $conn->real_escape_string($_GET['category_id']) : null;
    $receiptNo = isset($_GET['receipt_no']) ? $conn->real_escape_string($_GET['receipt_no']) : null;
    
    $whereConditions = [];
    
    if ($startDate) {
        $whereConditions[] = "DATE(s.sale_date) >= '$startDate'";
    }
    
    if ($endDate) {
        $whereConditions[] = "DATE(s.sale_date) <= '$endDate'";
    }
    
    if ($receiptNo) {
        $whereConditions[] = "s.receipt_no LIKE '%$receiptNo%'";
    }
    
    $whereClause = "";
    if (!empty($whereConditions)) {
        $whereClause = " WHERE " . implode(" AND ", $whereConditions);
    }
    
    // Additional category JOIN and WHERE for detailed queries (not summary)
    $categoryJoin = "";
    $categoryWhere = "";
    if ($categoryId) {
        $categoryJoin = " JOIN products p ON si.product_id = p.product_id";
        $categoryWhere = !empty($whereConditions) 
            ? " AND p.category_id = $categoryId" 
            : " WHERE p.category_id = $categoryId";
    }
    
    // Get sales summary
    $summarySql = "SELECT 
                    COUNT(DISTINCT s.sale_id) AS total_sales,
                    SUM(s.total_amount) AS total_revenue,
                    SUM(s.amount_paid) AS total_amount_paid
                  FROM sales s";
                  
    if ($categoryId) {
        $summarySql = "SELECT 
                        COUNT(DISTINCT s.sale_id) AS total_sales,
                        SUM(s.total_amount) AS total_revenue,
                        SUM(s.amount_paid) AS total_amount_paid
                      FROM sales s
                      JOIN sale_items si ON s.sale_id = si.sale_id
                      JOIN products p ON si.product_id = p.product_id
                      WHERE p.category_id = $categoryId";
                      
        if (!empty($whereConditions)) {
            $summarySql .= " AND " . implode(" AND ", $whereConditions);
        }
    } else {
        $summarySql .= $whereClause;
    }
    
    $summaryResult = $conn->query($summarySql);
    $summary = $summaryResult ? $summaryResult->fetch_assoc() : null;
    
    // Get detailed sales information
    $detailedSql = "SELECT 
                    s.sale_id,
                    s.receipt_no,
                    s.sale_date,
                    s.total_amount,
                    s.amount_paid
                 FROM sales s
                 $whereClause
                 ORDER BY s.sale_date DESC
                 LIMIT 100";  // Limiting to 100 records for performance
    
    $detailedResult = $conn->query($detailedSql);
    $detailedSales = [];
    
    if ($detailedResult) {
        while ($row = $detailedResult->fetch_assoc()) {
            $detailedSales[] = $row;
        }
    }
    
    // Get top selling products
    $productsSql = "SELECT 
                    p.product_id,
                    p.type,
                    c.category_name,
                    SUM(si.quantity) AS total_quantity,
                    SUM(si.quantity * si.price_per_kg) AS total_revenue
                 FROM sale_items si
                 JOIN products p ON si.product_id = p.product_id
                 LEFT JOIN categories c ON p.category_id = c.category_id
                 JOIN sales s ON si.sale_id = s.sale_id";
                 
    if (!empty($whereConditions) || $categoryId) {
        $productsSql .= " WHERE ";
        $conditions = [];
        
        if (!empty($whereConditions)) {
            $conditions[] = implode(" AND ", $whereConditions);
        }
        
        if ($categoryId) {
            $conditions[] = "p.category_id = $categoryId";
        }
        
        $productsSql .= implode(" AND ", $conditions);
    }
    
    $productsSql .= " GROUP BY p.product_id ORDER BY total_revenue DESC LIMIT 10";
    
    $productsResult = $conn->query($productsSql);
    $topProducts = [];
    
    if ($productsResult) {
        while ($row = $productsResult->fetch_assoc()) {
            $topProducts[] = $row;
        }
    }
    
    // Combine all report data
    $report = [
        'summary' => $summary,
        'detailed_sales' => $detailedSales,
        'top_products' => $topProducts
    ];
    
    // Return JSON response
    header('Content-Type: application/json');
    echo json_encode($report);
}

// Updated Inventory report function
function getInventoryReport($conn) {
    // Get inventory summary
    $summarySql = "SELECT 
                    COUNT(p.product_id) AS total_items,
                    SUM(p.weight * p.price) AS total_value,
                    SUM(CASE WHEN p.weight <= p.stock_alert THEN 1 ELSE 0 END) AS low_stock_count
                  FROM products p";
    
    $summaryResult = $conn->query($summarySql);
    $summary = $summaryResult ? $summaryResult->fetch_assoc() : null;
    
    // Get detailed inventory information with proper field names
    $productsSql = "SELECT 
                    p.product_id,
                    p.type,
                    c.category_name,
                    p.supplier,
                    p.weight AS current_stock,
                    p.price,
                    p.expiry_date,
                    p.stock_alert,
                    (p.weight * p.price) AS inventory_value,
                    CASE 
                        WHEN p.expiry_date IS NOT NULL AND p.expiry_date < CURDATE() THEN 'Expired'
                        WHEN p.weight <= p.stock_alert THEN 'Low Stock'
                        ELSE 'In Stock' 
                    END AS status
                 FROM products p
                 LEFT JOIN categories c ON p.category_id = c.category_id
                 ORDER BY p.type ASC";
    
    $productsResult = $conn->query($productsSql);
    $products = [];
    
    if ($productsResult) {
        while ($row = $productsResult->fetch_assoc()) {
            $products[] = $row;
        }
    } else {
        // Log error for debugging
        error_log("Error in inventory query: " . $conn->error);
    }
    
    // Combine all report data
    $report = [
        'summary' => $summary,
        'products' => $products
    ];
    
    // Return JSON response
    header('Content-Type: application/json');
    echo json_encode($report);
}