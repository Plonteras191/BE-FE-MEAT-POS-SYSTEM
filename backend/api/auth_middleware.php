<?php
// auth_middleware.php - Authentication middleware

/**
 * Verifies the authentication token in the request headers
 * In a real application, this would check against a database of valid tokens
 * 
 * @return bool True if authenticated, false otherwise
 */
function authenticate() {
    // Get the Authorization header
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    
    // Check if the header exists and has the Bearer prefix
    if (empty($authHeader) || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        return false;
    }
    
    // Extract the token
    $token = $matches[1];
    
    // In a real application, you would validate this token against your database
    // For this example, we're just checking if it's a valid token format (non-empty)
    return !empty($token);
}

/**
 * Use this function at the beginning of your API scripts
 * Returns appropriate error response if not authenticated
 * 
 * @param bool $required Whether authentication is required for this endpoint
 * @return void
 */
function requireAuth($required = true) {
    if ($required && !authenticate()) {
        header("HTTP/1.1 401 Unauthorized");
        echo json_encode([
            "success" => false,
            "message" => "Authentication required"
        ]);
        exit;
    }
}
?>