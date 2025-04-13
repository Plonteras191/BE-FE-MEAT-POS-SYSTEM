<?php
// products.php - API for managing products

require_once 'db_connection.php';

// Function to determine product status based on expiry date
function determineProductStatus($expiryDate) {
    if (empty($expiryDate)) {
        return 'fresh';
    }
    
    $today = date('Y-m-d');
    $warningDate = date('Y-m-d', strtotime('+7 days'));
    
    if ($expiryDate <= $today) {
        return 'expired';
    } else if ($expiryDate <= $warningDate) {
        return 'expiring';
    } else {
        return 'fresh';
    }
}

// Get all products or a specific product
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['id'])) {
        $productId = $conn->real_escape_string($_GET['id']);
        $sql = "SELECT p.*, c.category_name 
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.category_id 
                WHERE p.product_id = $productId";
    } else {
        $sql = "SELECT p.*, c.category_name 
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.category_id
                ORDER BY p.type";
    }
    
    $result = $conn->query($sql);
    
    if ($result) {
        $products = [];
        while ($row = $result->fetch_assoc()) {
            $products[] = $row;
        }
        echo json_encode($products);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to fetch products: " . $conn->error]);
    }
}

// Create a new product
else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid request data"]);
        exit;
    }
    
    // Handle custom category if provided
    if (isset($data['customCategory']) && !empty($data['customCategory']) && (!isset($data['category_id']) || $data['category_id'] === 'custom' || $data['category_id'] === null)) {
        // Check if category already exists
        $categoryName = $conn->real_escape_string($data['customCategory']);
        $checkSql = "SELECT category_id FROM categories WHERE category_name = '$categoryName'";
        $checkResult = $conn->query($checkSql);
        
        if ($checkResult && $checkResult->num_rows > 0) {
            $row = $checkResult->fetch_assoc();
            $data['category_id'] = $row['category_id'];
        } else {
            // Create new category
            $insertCatSql = "INSERT INTO categories (category_name) VALUES ('$categoryName')";
            if ($conn->query($insertCatSql)) {
                $data['category_id'] = $conn->insert_id;
            } else {
                http_response_code(500);
                echo json_encode(["error" => "Failed to create category: " . $conn->error]);
                exit;
            }
        }
    }
    
    // Prepare product data for insertion
    $type = $conn->real_escape_string($data['type']);
    $category_id = isset($data['category_id']) && $data['category_id'] !== 'custom' && $data['category_id'] !== '' ? 
                  $conn->real_escape_string($data['category_id']) : "NULL";
    $supplier = $conn->real_escape_string($data['supplier']);
    $weight = $conn->real_escape_string($data['weight']);
    $price = $conn->real_escape_string($data['price']);
    $expiry_date = !empty($data['expiry_date']) ? "'" . $conn->real_escape_string($data['expiry_date']) . "'" : "NULL";
    $stock_alert = !empty($data['stock_alert']) ? $conn->real_escape_string($data['stock_alert']) : "10.00";
    
    // Determine status based on expiry date
    $status = 'fresh';
    if (!empty($data['expiry_date'])) {
        $status = determineProductStatus($data['expiry_date']);
    }
    $status = $conn->real_escape_string($status);
    
    $sql = "INSERT INTO products (type, category_id, supplier, weight, price, expiry_date, stock_alert, status) 
            VALUES ('$type', $category_id, '$supplier', '$weight', '$price', $expiry_date, '$stock_alert', '$status')";
    
    if ($conn->query($sql)) {
        $product_id = $conn->insert_id;
        echo json_encode(["message" => "Product created successfully", "product_id" => $product_id]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to create product: " . $conn->error]);
    }
}

// Update a product
else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || !isset($data['product_id'])) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid request data or missing product ID"]);
        exit;
    }
    
    $product_id = $conn->real_escape_string($data['product_id']);
    
    // Handle custom category if provided
    if (isset($data['customCategory']) && !empty($data['customCategory']) && (!isset($data['category_id']) || $data['category_id'] === 'custom' || $data['category_id'] === null)) {
        // Check if category already exists
        $categoryName = $conn->real_escape_string($data['customCategory']);
        $checkSql = "SELECT category_id FROM categories WHERE category_name = '$categoryName'";
        $checkResult = $conn->query($checkSql);
        
        if ($checkResult && $checkResult->num_rows > 0) {
            $row = $checkResult->fetch_assoc();
            $data['category_id'] = $row['category_id'];
        } else {
            // Create new category
            $insertCatSql = "INSERT INTO categories (category_name) VALUES ('$categoryName')";
            if ($conn->query($insertCatSql)) {
                $data['category_id'] = $conn->insert_id;
            } else {
                http_response_code(500);
                echo json_encode(["error" => "Failed to create category: " . $conn->error]);
                exit;
            }
        }
    }
    
    // Prepare product data for update
    $type = $conn->real_escape_string($data['type']);
    $category_id = isset($data['category_id']) && $data['category_id'] !== 'custom' && $data['category_id'] !== '' ? 
                  $conn->real_escape_string($data['category_id']) : "NULL";
    $supplier = $conn->real_escape_string($data['supplier']);
    $weight = $conn->real_escape_string($data['weight']);
    $price = $conn->real_escape_string($data['price']);
    $expiry_date = !empty($data['expiry_date']) ? "'" . $conn->real_escape_string($data['expiry_date']) . "'" : "NULL";
    $stock_alert = !empty($data['stock_alert']) ? $conn->real_escape_string($data['stock_alert']) : "10.00";
    
    // Determine status based on expiry date
    $status = 'fresh';
    if (!empty($data['expiry_date'])) {
        $status = determineProductStatus($data['expiry_date']);
    }
    $status = $conn->real_escape_string($status);
    
    $sql = "UPDATE products 
            SET type = '$type', 
                category_id = $category_id, 
                supplier = '$supplier', 
                weight = '$weight', 
                price = '$price', 
                expiry_date = $expiry_date, 
                stock_alert = '$stock_alert',
                status = '$status'
            WHERE product_id = $product_id";
    
    if ($conn->query($sql)) {
        echo json_encode(["message" => "Product updated successfully"]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to update product: " . $conn->error]);
    }
}

// Delete a product
else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    if (!isset($_GET['id'])) {
        http_response_code(400);
        echo json_encode(["error" => "Missing product ID"]);
        exit;
    }
    
    $product_id = $conn->real_escape_string($_GET['id']);
    
    // Start a transaction for safely handling multiple operations
    $conn->begin_transaction();
    
    try {
        // First delete from related tables
        $conn->query("DELETE FROM sale_items WHERE product_id = $product_id");
        $conn->query("DELETE FROM stock_adjustments WHERE product_id = $product_id");
        
        // Then delete the product
        $sql = "DELETE FROM products WHERE product_id = $product_id";
        $result = $conn->query($sql);
        
        if (!$result) {
            throw new Exception("Failed to delete product: " . $conn->error);
        }
        
        // Commit the transaction
        $conn->commit();
        echo json_encode(["message" => "Product deleted successfully"]);
        
    } catch (Exception $e) {
        // Roll back the transaction on error
        $conn->rollback();
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}

// Update all products' status based on expiry dates
else if ($_SERVER['REQUEST_METHOD'] === 'PATCH' && isset($_GET['action']) && $_GET['action'] === 'update_status') {
    $conn->begin_transaction();
    
    try {
        // Get all products with expiry dates
        $sql = "SELECT product_id, expiry_date FROM products WHERE expiry_date IS NOT NULL";
        $result = $conn->query($sql);
        
        if (!$result) {
            throw new Exception("Failed to fetch products: " . $conn->error);
        }
        
        $today = date('Y-m-d');
        $warningDate = date('Y-m-d', strtotime('+7 days'));
        
        // Update expired products
        $expiredSql = "UPDATE products 
                      SET status = 'expired' 
                      WHERE expiry_date IS NOT NULL AND expiry_date <= '$today'";
        $conn->query($expiredSql);
        
        // Update expiring products
        $expiringSql = "UPDATE products 
                       SET status = 'expiring' 
                       WHERE expiry_date IS NOT NULL 
                       AND expiry_date > '$today' 
                       AND expiry_date <= '$warningDate'";
        $conn->query($expiringSql);
        
        // Update fresh products
        $freshSql = "UPDATE products 
                    SET status = 'fresh' 
                    WHERE expiry_date IS NULL 
                    OR (expiry_date > '$warningDate')";
        $conn->query($freshSql);
        
        $conn->commit();
        echo json_encode(["message" => "Product statuses updated successfully"]);
        
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