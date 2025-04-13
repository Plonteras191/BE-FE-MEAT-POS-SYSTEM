<?php
// categories.php - API for managing categories

require_once 'db_connection.php';

// Get all categories or a specific category
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['id'])) {
        $categoryId = $conn->real_escape_string($_GET['id']);
        $sql = "SELECT * FROM categories WHERE category_id = $categoryId";
    } else {
        $sql = "SELECT * FROM categories ORDER BY category_name";
    }
    
    $result = $conn->query($sql);
    
    if ($result) {
        $categories = [];
        while ($row = $result->fetch_assoc()) {
            $categories[] = $row;
        }
        echo json_encode($categories);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to fetch categories: " . $conn->error]);
    }
}

// Create a new category
else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || !isset($data['category_name']) || empty($data['category_name'])) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid request data or missing category name"]);
        exit;
    }
    
    $category_name = $conn->real_escape_string($data['category_name']);
    
    // Check if category already exists
    $checkSql = "SELECT COUNT(*) as count FROM categories WHERE category_name = '$category_name'";
    $checkResult = $conn->query($checkSql);
    $row = $checkResult->fetch_assoc();
    
    if ($row['count'] > 0) {
        http_response_code(400);
        echo json_encode(["error" => "Category with this name already exists"]);
        exit;
    }
    
    $sql = "INSERT INTO categories (category_name) VALUES ('$category_name')";
    
    if ($conn->query($sql)) {
        $category_id = $conn->insert_id;
        echo json_encode([
            "message" => "Category created successfully",
            "category_id" => $category_id
        ]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to create category: " . $conn->error]);
    }
}

// Update a category
else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || !isset($data['category_id']) || !isset($data['category_name']) || empty($data['category_name'])) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid request data or missing required fields"]);
        exit;
    }
    
    $category_id = $conn->real_escape_string($data['category_id']);
    $category_name = $conn->real_escape_string($data['category_name']);
    
    // Check if category name already exists for another category
    $checkSql = "SELECT COUNT(*) as count FROM categories WHERE category_name = '$category_name' AND category_id != $category_id";
    $checkResult = $conn->query($checkSql);
    $row = $checkResult->fetch_assoc();
    
    if ($row['count'] > 0) {
        http_response_code(400);
        echo json_encode(["error" => "Category with this name already exists"]);
        exit;
    }
    
    $sql = "UPDATE categories SET category_name = '$category_name' WHERE category_id = $category_id";
    
    if ($conn->query($sql)) {
        echo json_encode(["message" => "Category updated successfully"]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to update category: " . $conn->error]);
    }
}

// Delete a category
else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    if (!isset($_GET['id'])) {
        http_response_code(400);
        echo json_encode(["error" => "Missing category ID"]);
        exit;
    }
    
    $category_id = $conn->real_escape_string($_GET['id']);
    
    // Check if category is used in products
    $checkSql = "SELECT COUNT(*) as count FROM products WHERE category_id = $category_id";
    $checkResult = $conn->query($checkSql);
    $row = $checkResult->fetch_assoc();
    
    if ($row['count'] > 0) {
        http_response_code(400);
        echo json_encode(["error" => "Cannot delete category because it is used by products"]);
        exit;
    }
    
    $sql = "DELETE FROM categories WHERE category_id = $category_id";
    
    if ($conn->query($sql)) {
        echo json_encode(["message" => "Category deleted successfully"]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to delete category: " . $conn->error]);
    }
}

else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}

$conn->close();
?>