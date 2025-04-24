<?php
// products.php - API for managing products

require_once 'db_connection.php';

// Get all products or a specific product
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['id'])) {
        $productId = $conn->real_escape_string($_GET['id']);
        $sql = "SELECT p.*, c.category_name, ps.status 
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.category_id 
                LEFT JOIN product_status ps ON p.product_id = ps.product_id
                WHERE p.product_id = $productId AND p.is_deleted = 0";
    } else {
        // Only show non-deleted products by default
        $sql = "SELECT p.*, c.category_name, ps.status 
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.category_id
                LEFT JOIN product_status ps ON p.product_id = ps.product_id
                WHERE p.is_deleted = 0
                ORDER BY p.type";
    }
    
    // Add option to include deleted products if requested
    if (isset($_GET['include_deleted']) && $_GET['include_deleted'] == 1) {
        $sql = str_replace("WHERE p.is_deleted = 0", "", $sql);
        $sql = str_replace("AND p.is_deleted = 0", "", $sql);
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
    
    $sql = "INSERT INTO products (type, category_id, supplier, weight, price, expiry_date, stock_alert, is_deleted) 
            VALUES ('$type', $category_id, '$supplier', '$weight', '$price', $expiry_date, '$stock_alert', 0)";
    
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
    
    $sql = "UPDATE products 
            SET type = '$type', 
                category_id = $category_id, 
                supplier = '$supplier', 
                weight = '$weight', 
                price = '$price', 
                expiry_date = $expiry_date, 
                stock_alert = '$stock_alert'
            WHERE product_id = $product_id";
    
    if ($conn->query($sql)) {
        echo json_encode(["message" => "Product updated successfully"]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to update product: " . $conn->error]);
    }
}

// Soft Delete a product
else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    if (!isset($_GET['id'])) {
        http_response_code(400);
        echo json_encode(["error" => "Missing product ID"]);
        exit;
    }
    
    $product_id = $conn->real_escape_string($_GET['id']);
    
    // Perform soft delete by setting is_deleted flag to 1
    $sql = "UPDATE products SET is_deleted = 1 WHERE product_id = $product_id";
    
    if ($conn->query($sql)) {
        echo json_encode(["message" => "Product soft deleted successfully"]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to soft delete product: " . $conn->error]);
    }
}

// Restore a soft-deleted product
else if ($_SERVER['REQUEST_METHOD'] === 'PATCH' && isset($_GET['action']) && $_GET['action'] === 'restore') {
    if (!isset($_GET['id'])) {
        http_response_code(400);
        echo json_encode(["error" => "Missing product ID"]);
        exit;
    }
    
    $product_id = $conn->real_escape_string($_GET['id']);
    
    // Restore by setting is_deleted flag back to 0
    $sql = "UPDATE products SET is_deleted = 0 WHERE product_id = $product_id";
    
    if ($conn->query($sql)) {
        echo json_encode(["message" => "Product restored successfully"]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to restore product: " . $conn->error]);
    }
}

// Update product statuses
else if ($_SERVER['REQUEST_METHOD'] === 'PATCH' && isset($_GET['action']) && $_GET['action'] === 'update_status') {
    // Since product_status is a VIEW and not a physical table, we don't need to update it manually
    // The view will automatically reflect the current status based on expiry dates
    
    // Return success message
    echo json_encode(["message" => "Product statuses are automatically calculated by the view"]);
}

// Get product statuses
else if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'statuses') {
    $sql = "SELECT p.product_id, p.type, ps.status 
            FROM products p 
            JOIN product_status ps ON p.product_id = ps.product_id
            WHERE p.is_deleted = 0";
    
    $result = $conn->query($sql);
    
    if ($result) {
        $statuses = [];
        while ($row = $result->fetch_assoc()) {
            $statuses[] = $row;
        }
        echo json_encode($statuses);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to fetch product statuses: " . $conn->error]);
    }
}

else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}

$conn->close();
?>