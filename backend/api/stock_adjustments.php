<?php
// stock_adjustments.php - API for managing stock adjustments

require_once 'db_connection.php';

// Get stock adjustments for a specific product or all adjustments
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['product_id'])) {
        $productId = $conn->real_escape_string($_GET['product_id']);
        $sql = "SELECT sa.*, p.type 
                FROM stock_adjustments sa 
                JOIN products p ON sa.product_id = p.product_id 
                WHERE sa.product_id = $productId 
                ORDER BY sa.adjustment_date DESC";
    } else {
        $sql = "SELECT sa.*, p.type 
                FROM stock_adjustments sa 
                JOIN products p ON sa.product_id = p.product_id 
                ORDER BY sa.adjustment_date DESC";
    }
    
    $result = $conn->query($sql);
    
    if ($result) {
        $adjustments = [];
        while ($row = $result->fetch_assoc()) {
            $adjustments[] = $row;
        }
        echo json_encode($adjustments);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to fetch stock adjustments: " . $conn->error]);
    }
}

// Create a new stock adjustment
else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || !isset($data['product_id']) || !isset($data['quantity_change']) || !isset($data['reason'])) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid request data or missing required fields"]);
        exit;
    }
    
    // Start transaction
    $conn->begin_transaction();
    
    try {
        $product_id = $conn->real_escape_string($data['product_id']);
        $quantity_change = $conn->real_escape_string($data['quantity_change']);
        $reason = $conn->real_escape_string($data['reason']);
        $notes = isset($data['notes']) ? $conn->real_escape_string($data['notes']) : "";
        
        // Check if product exists
        $checkSql = "SELECT weight FROM products WHERE product_id = $product_id";
        $checkResult = $conn->query($checkSql);
        
        if (!$checkResult || $checkResult->num_rows === 0) {
            throw new Exception("Product not found");
        }
        
        $product = $checkResult->fetch_assoc();
        $currentWeight = floatval($product['weight']);
        
        // If removing stock, make sure there's enough
        if ($quantity_change < 0 && abs($quantity_change) > $currentWeight) {
            throw new Exception("Not enough stock to remove. Current stock: $currentWeight kg");
        }
        
        // Insert stock adjustment record
        $sql = "INSERT INTO stock_adjustments (product_id, quantity_change, reason, notes) 
                VALUES ($product_id, $quantity_change, '$reason', '$notes')";
        
        if (!$conn->query($sql)) {
            throw new Exception("Failed to create stock adjustment: " . $conn->error);
        }
        
        // Update product stock
        $newWeight = $currentWeight + floatval($quantity_change);
        $updateSql = "UPDATE products SET weight = $newWeight WHERE product_id = $product_id";
        
        if (!$conn->query($updateSql)) {
            throw new Exception("Failed to update product stock: " . $conn->error);
        }
        
        $conn->commit();
        
        echo json_encode([
            "message" => "Stock adjustment created successfully",
            "adjustment_id" => $conn->insert_id,
            "new_weight" => $newWeight
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