-- DB NAME: meat_pos_db

-- Categories Table - Stores different meat categories
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL
);

-- Products Table - Stores all meat products
CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(100) NOT NULL,             -- Name/type of the meat product
    category_id INT,                        -- Reference to categories table
    supplier VARCHAR(100),                  -- Supplier name
    weight DECIMAL(10,2) NOT NULL,          -- Current stock in kg
    price DECIMAL(10,2) NOT NULL,           -- Price per kg
    expiry_date DATE,                       -- Optional expiry date
    stock_alert DECIMAL(10,2) DEFAULT 10.00, -- Alert threshold
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- Sales Table - Stores sales transactions
CREATE TABLE sales (
    sale_id INT AUTO_INCREMENT PRIMARY KEY,
    receipt_no VARCHAR(50) NOT NULL,        -- Receipt number like RCP-timestamp
    subtotal DECIMAL(10,2) NOT NULL,        -- Before discount
    discount_percent DECIMAL(5,2),          -- Discount percentage
    discount_amount DECIMAL(10,2),          -- Calculated discount amount
    total_amount DECIMAL(10,2) NOT NULL,    -- Final amount after discount
    amount_paid DECIMAL(10,2) NOT NULL,     -- Amount customer paid
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- When sale occurred
);

-- Sale Items Table - Items within each sale
CREATE TABLE sale_items (
    sale_item_id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,                   -- Reference to sales table
    product_id INT NOT NULL,                -- Reference to products table
    quantity DECIMAL(10,2) NOT NULL,        -- Weight in kg
    price_per_kg DECIMAL(10,2) NOT NULL,    -- Price at time of sale
    FOREIGN KEY (sale_id) REFERENCES sales(sale_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Stock Adjustments Table - Tracks inventory changes (adding/removing stock)
CREATE TABLE stock_adjustments (
    adjustment_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    quantity_change DECIMAL(10,2) NOT NULL, -- Positive for adding, negative for removing
    reason VARCHAR(20) NOT NULL,            -- 'add' or 'remove'
    notes TEXT,                             -- Optional notes about adjustment
    adjustment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Sample starter data
INSERT INTO categories (category_name) VALUES
('Beef'),
('Pork'),
('Chicken'),
('Seafood'),
('Lamb');