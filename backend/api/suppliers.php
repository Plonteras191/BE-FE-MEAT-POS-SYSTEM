<?php
require_once 'db_connection.php';

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Get all suppliers
        $sql = "SELECT * FROM suppliers ORDER BY supplier_name";
        $result = $conn->query($sql);
        
        if ($result) {
            $suppliers = [];
            while ($row = $result->fetch_assoc()) {
                $suppliers[] = $row;
            }
            echo json_encode($suppliers);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to fetch suppliers: " . $conn->error]);
        }
        break;
        
    case 'POST':
        // Add new supplier
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['supplier_name']) || empty($data['supplier_name'])) {
            http_response_code(400);
            echo json_encode(["error" => "Supplier name is required"]);
            break;
        }
        
        $sql = "INSERT INTO suppliers (supplier_name) VALUES (?)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $data['supplier_name']);
        
        if ($stmt->execute()) {
            $supplier_id = $conn->insert_id;
            echo json_encode([
                "message" => "Supplier added successfully", 
                "id" => $supplier_id,
                "supplier_name" => $data['supplier_name']
            ]);
        } else {
            // Check for duplicate entry
            if ($conn->errno == 1062) {
                http_response_code(409);
                echo json_encode(["error" => "Supplier name already exists"]);
            } else {
                http_response_code(500);
                echo json_encode(value: ["error" => "Failed to add supplier: " . $stmt->error]);
            }
        }
        
        $stmt->close();
        break;
        
    default:
        http_response_code(405);
        echo json_encode(value: ["error" => "Method not allowed"]);
}

$conn->close();
?>