<?php
require_once 'db_connection.php';

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Get all customers
        $sql = "SELECT * FROM customers ORDER BY name";
        $result = $conn->query($sql);
        
        if ($result) {
            $customers = [];
            while ($row = $result->fetch_assoc()) {
                $customers[] = $row;
            }
            echo json_encode($customers);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to fetch customers: " . $conn->error]);
        }
        break;
        
    case 'POST':
        // Add new customer
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['name']) || empty($data['name'])) {
            http_response_code(400);
            echo json_encode(["error" => "Customer name is required"]);
            break;
        }
        
        // Prepare SQL statement
        $sql = "INSERT INTO customers (name, contact_number, address, is_regular) 
                VALUES (?, ?, ?, ?)";
                
        $stmt = $conn->prepare($sql);
        
        $contact = isset($data['contact_number']) ? $data['contact_number'] : null;
        $address = isset($data['address']) ? $data['address'] : null;
        $is_regular = isset($data['is_regular']) ? $data['is_regular'] : 0;
        
        $stmt->bind_param("sssi", 
            $data['name'], 
            $contact, 
            $address, 
            $is_regular
        );
        
        if ($stmt->execute()) {
            $customer_id = $conn->insert_id;
            echo json_encode([
                "message" => "Customer added successfully", 
                "id" => $customer_id,
                "name" => $data['name']
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to add customer: " . $stmt->error]);
        }
        
        $stmt->close();
        break;
        
    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
}

$conn->close();
?>