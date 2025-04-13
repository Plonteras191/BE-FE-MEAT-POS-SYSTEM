<?php
// sales.php - API for managing sales

require_once 'db_connection.php';

// Get all sales or a specific sale
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['id'])) {
        $saleId = $conn->real_escape_string($_GET['id']);
        $sql = "SELECT * FROM sales WHERE sale_id = $saleId";
        
        $result = $conn->query($sql);
        
        if ($result && $result->num_rows > 0) {
            $sale = $result->fetch_assoc();
            
            // Get sale items
            $itemsSql = "SELECT si.*, p.type 
                        FROM sale_items si 
                        JOIN products p ON si.product_id = p.product_id 
                        WHERE si.sale_id = $saleId";
            $itemsResult = $conn->query($itemsSql);
            
            $items = [];
            while ($item = $itemsResult->fetch_assoc()) {
                $items[] = $item;
            }
            
            $sale['items'] = $items;
            echo json_encode($sale);
        } else {
            http_response_code(404);
            echo json_encode(["error" => "Sale not found"]);
        }
    } else {
        // Get optional date range filters
        $startDate = isset($_GET['start_date']) ? $conn->real_escape_string($_GET['start_date']) : null;
        $endDate = isset($_GET['end_date']) ? $conn->real_escape_string($_GET['end_date']) : null;
        
        $whereClause = "";
        if ($startDate && $endDate) {
            $whereClause = " WHERE DATE(sale_date) BETWEEN '$startDate' AND '$endDate'";
        } else if ($startDate) {
            $whereClause = " WHERE DATE(sale_date) >= '$startDate'";
        } else if ($endDate) {
            $whereClause = " WHERE DATE(sale_date) <= '$endDate'";
        }
        
        $sql = "SELECT * FROM sales $whereClause ORDER BY sale_date DESC";
        $result = $conn->query($sql);
        
        if ($result) {
            $sales = [];
            while ($row = $result->fetch_assoc()) {
                $sales[] = $row;
            }
            echo json_encode($sales);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to fetch sales: " . $conn->error]);
        }
    }
}

// Create a new sale
else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || !isset($data['receipt_no']) || !isset($data['total_amount'])) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid request data or missing required fields"]);
        exit;
    }
    
    // Start transaction
    $conn->begin_transaction();
    
    try {
        $receipt_no = $conn->real_escape_string($data['receipt_no']);
        $subtotal = $conn->real_escape_string($data['subtotal']);
        $discount_percent = isset($data['discount_percent']) ? $conn->real_escape_string($data['discount_percent']) : "0.00";
        $discount_amount = isset($data['discount_amount']) ? $conn->real_escape_string($data['discount_amount']) : "0.00";
        $total_amount = $conn->real_escape_string($data['total_amount']);
        $amount_paid = $conn->real_escape_string($data['amount_paid']);
        
        $sql = "INSERT INTO sales (receipt_no, subtotal, discount_percent, discount_amount, total_amount, amount_paid) 
                VALUES ('$receipt_no', '$subtotal', '$discount_percent', '$discount_amount', '$total_amount', '$amount_paid')";
        
        if (!$conn->query($sql)) {
            throw new Exception("Failed to create sale: " . $conn->error);
        }
        
        $sale_id = $conn->insert_id;
        $conn->commit();
        
        echo json_encode([
            "message" => "Sale created successfully",
            "sale_id" => $sale_id
        ]);
    } catch (Exception $e) {
        $conn->rollback();
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}

else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}

$conn->close();
?>