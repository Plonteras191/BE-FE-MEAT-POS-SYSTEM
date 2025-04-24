-- DB NAME: meat_pos_db

-- Categories Table - Stores different meat categories
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL
);

-- Products Table - Stores all meat products
CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(100) NOT NULL,                 -- Name/type of the meat product
    category_id INT,                            -- Reference to categories table
    supplier VARCHAR(100),                      -- Supplier name (kept as is since only name is needed)
    weight DECIMAL(10,2) NOT NULL,              -- Current stock in kg
    price DECIMAL(10,2) NOT NULL,               -- Price per kg
    expiry_date DATE,                           -- Optional expiry date
    stock_alert DECIMAL(10,2) DEFAULT 10.00,    -- Alert threshold
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,   -- Soft delete flag: 0 = active, 1 = deleted
    -- Status field removed as it can be derived from expiry_date
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- Sales Table - Stores sales transactions
CREATE TABLE sales (
    sale_id INT AUTO_INCREMENT PRIMARY KEY,
    receipt_no VARCHAR(50) NOT NULL,        -- Receipt number like RCP-timestamp
    discount DECIMAL(10,2) DEFAULT 0.00,    -- Added discount field
    total_amount DECIMAL(10,2) NOT NULL,    -- Final amount after discount
    amount_paid DECIMAL(10,2) NOT NULL,     -- Amount customer paid
    change_amount DECIMAL(10,2) GENERATED ALWAYS AS (amount_paid - total_amount) STORED, -- Calculated change
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- When sale occurred
);
      
-- Sale Items Table - Items within each sale
CREATE TABLE sale_items (
    sale_item_id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,                   -- Reference to sales table
    product_id INT NOT NULL,                -- Reference to products table
    quantity DECIMAL(10,2) NOT NULL,        -- Weight in kg
    price_per_kg DECIMAL(10,2) NOT NULL,    -- Price at time of sale (kept for historical accuracy)
    item_total DECIMAL(10,2) GENERATED ALWAYS AS (quantity * price_per_kg) STORED, -- Added calculated line total
    FOREIGN KEY (sale_id) REFERENCES sales(sale_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Stock Adjustments Table - Tracks inventory changes (adding/removing stock)
CREATE TABLE stock_adjustments (
    adjustment_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    quantity_change DECIMAL(10,2) NOT NULL, -- Positive for adding, negative for removing
    reason VARCHAR(20) NOT NULL,
    notes TEXT,
    adjustment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Create a view for product status to replace the status field
CREATE VIEW product_status AS
SELECT 
    product_id,
    type,
    category_id,
    supplier,
    weight,
    price,
    expiry_date,
    stock_alert,
    is_deleted,
    CASE 
        WHEN expiry_date IS NULL THEN 'fresh'
        WHEN expiry_date < CURDATE() THEN 'expired'
        WHEN expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY) THEN 'expiring'
        ELSE 'fresh' 
    END AS status
FROM products;

-- Sample starter data
INSERT INTO categories (category_name) VALUES
('Beef'),
('Pork'),
('Chicken'),
('Seafood'),
('Lamb');
