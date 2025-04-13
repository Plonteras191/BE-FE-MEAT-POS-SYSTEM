<?php
// sale_items.php - API for managing sale items

require_once 'db_connection.php';

// Get items for a specific sale
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_GET['sale_id'])) {
        http_response_code(400);
        echo json_encode(["error" => "Missing sale ID"]);
        exit;
    }
    
    $saleId = $conn->real_escape_string($_GET['sale_id']);
    $sql = "SELECT si.*, p.type 
            FROM sale_items si 
            JOIN products p ON si.product_id = p.product_id 
            WHERE si.sale_id = $saleId";
    
    $result = $conn->query($sql);
    
    if ($result) {
        $items = [];
        while ($row = $result->fetch_assoc()) {
            $items[] = $row;
        }
        echo json_encode($items);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to fetch sale items: " . $conn->error]);
    }
}

// Create a new sale item
else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || !isset($data['sale_id']) || !isset($data['product_id']) || !isset($data['quantity']) || !isset($data['price_per_kg'])) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid request data or missing required fields"]);
        exit;
    }
    
    // Start transaction
    $conn->begin_transaction();
    
    try {
        $sale_id = $conn->real_escape_string($data['sale_id']);
        $product_id = $conn->real_escape_string($data['product_id']);
        $quantity = $conn->real_escape_string($data['quantity']);
        $price_per_kg = $conn->real_escape_string($data['price_per_kg']);
        
        // Check if product exists and has enough stock
        $checkSql = "SELECT weight FROM products WHERE product_id = $product_id";
        $checkResult = $conn->query($checkSql);
        
        if (!$checkResult || $checkResult->num_rows === 0) {
            throw new Exception("Product not found");
        }
        
        $product = $checkResult->fetch_assoc();
        $currentWeight = floatval($product['weight']);
        
        if ($currentWeight < floatval($quantity)) {
            throw new Exception("Not enough stock available. Current stock: $currentWeight kg");
        }
        
        // Insert sale item
        $sql = "INSERT INTO sale_items (sale_id, product_id, quantity, price_per_kg) 
                VALUES ($sale_id, $product_id, $quantity, $price_per_kg)";
        
        if (!$conn->query($sql)) {
            throw new Exception("Failed to create sale item: " . $conn->error);
        }
        
        // Update product stock
        $newWeight = $currentWeight - floatval($quantity);
        $updateSql = "UPDATE products SET weight = $newWeight WHERE product_id = $product_id";
        
        if (!$conn->query($updateSql)) {
            throw new Exception("Failed to update product stock: " . $conn->error);
        }
        
        $conn->commit();
        
        echo json_encode([
            "message" => "Sale item created successfully",
            "sale_item_id" => $conn->insert_id
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