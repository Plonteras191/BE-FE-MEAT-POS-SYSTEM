<?php
// auth.php - Authentication handler

// Include database connection
require_once 'db_connection.php';

// Set headers for CORS and JSON responses
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Only process POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

// Get JSON data from request body
$data = json_decode(file_get_contents('php://input'), true);

// Check if required fields are present
if (!isset($data['username']) || !isset($data['password'])) {
    http_response_code(400);
    echo json_encode(["error" => "Username and password are required"]);
    exit;
}

$username = $data['username'];
$password = $data['password'];

// Define our fixed accounts with hashed passwords
// Using password_hash would be better for production, but using direct comparison for simplicity
$accounts = [
    [
        'username' => 'MegaFarm@admin',
        'password' => 'adminmegafarm',
        'role' => 'admin'
    ],
    [
        'username' => 'MegaFarm@admin2',
        'password' => 'adminmegafarm2',
        'role' => 'admin'
    ]
];

// Authenticate user
$authenticated = false;
$userData = null;

foreach ($accounts as $account) {
    if ($account['username'] === $username && $account['password'] === $password) {
        $authenticated = true;
        $userData = [
            'username' => $account['username'],
            'role' => $account['role']
        ];
        break;
    }
}

if ($authenticated) {
    // Generate a simple token (for a real application, use JWT or a more secure method)
    $token = bin2hex(random_bytes(32));
    $expiry = time() + (60 * 60); // Token expires in 1 hour
    
    // In a real application, store this token in a database
    // Here, we're just returning it
    echo json_encode([
        "success" => true,
        "message" => "Authentication successful",
        "data" => [
            "user" => $userData,
            "token" => $token,
            "expiry" => $expiry
        ]
    ]);
} else {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "Invalid username or password"
    ]);
}
?>