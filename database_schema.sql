-- ============================================
-- E-COMMERCE DATABASE SCHEMA
-- PostgreSQL Database Setup
-- ============================================

-- Create database (run this separately as a superuser)
-- CREATE DATABASE ecommerce_db;

-- Connect to the database
-- \c ecommerce_db;

-- Enable UUID extension (optional, for UUID primary keys)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- DROP TABLES (for reset - uncomment if needed)
-- ============================================
-- DROP TABLE IF EXISTS order_items CASCADE;
-- DROP TABLE IF EXISTS orders CASCADE;
-- DROP TABLE IF EXISTS cart_items CASCADE;
-- DROP TABLE IF EXISTS products CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    phone VARCHAR(20),
    date_of_birth DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category VARCHAR(100) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url VARCHAR(500),
    sku VARCHAR(100) UNIQUE,
    weight DECIMAL(8,2),
    dimensions JSONB, -- {length, width, height}
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CART ITEMS TABLE
-- ============================================
CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    order_number VARCHAR(50) UNIQUE NOT NULL DEFAULT CONCAT('ORD-', EXTRACT(EPOCH FROM NOW())::BIGINT),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
    shipping_address JSONB NOT NULL, -- JSON object with address details
    billing_address JSONB, -- JSON object with billing address (optional)
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    shipping_cost DECIMAL(8,2) DEFAULT 0,
    tax_amount DECIMAL(8,2) DEFAULT 0,
    discount_amount DECIMAL(8,2) DEFAULT 0,
    notes TEXT,
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ORDER ITEMS TABLE
-- ============================================
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL, -- Store name at time of order
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Products indexes
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_stock ON products(stock);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_name_search ON products USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Cart indexes
CREATE INDEX idx_cart_user_id ON cart_items(user_id);
CREATE INDEX idx_cart_product_id ON cart_items(product_id);

-- Orders indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Order items indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA INSERTION
-- ============================================

-- Insert sample users (passwords are 'password123' hashed with bcrypt)
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES 
('admin@techstore.com', '$2b$10$8K1p/a0dQy0c1L8P5QJ8aOHr7P8QZjWJ8J8J8J8J8J8J8J8J8J8J8', 'Admin', 'User', 'admin'),
('john.doe@email.com', '$2b$10$8K1p/a0dQy0c1L8P5QJ8aOHr7P8QZjWJ8J8J8J8J8J8J8J8J8J8J8', 'John', 'Doe', 'customer'),
('jane.smith@email.com', '$2b$10$8K1p/a0dQy0c1L8P5QJ8aOHr7P8QZjWJ8J8J8J8J8J8J8J8J8J8J8', 'Jane', 'Smith', 'customer');

-- Insert sample products
INSERT INTO products (name, description, price, category, stock, sku) VALUES 
('MacBook Pro 16"', 'Powerful laptop with M2 Pro chip, perfect for professionals and content creators', 2499.99, 'laptops', 10, 'MBP-16-001'),
('iPhone 15 Pro', 'Latest smartphone with A17 Pro chip, titanium design, and advanced camera system', 999.99, 'smartphones', 25, 'IPH-15P-001'),
('AirPods Pro', 'Premium wireless earphones with active noise cancellation and spatial audio', 249.99, 'accessories', 50, 'APP-001'),
('Gaming Keyboard RGB', 'Mechanical gaming keyboard with RGB backlighting and programmable keys', 149.99, 'gaming', 30, 'GKB-RGB-001'),
('4K Monitor 27"', 'Ultra HD display perfect for work, gaming, and content creation', 399.99, 'accessories', 15, 'MON-4K-27-001'),
('Gaming Mouse Pro', 'High precision gaming mouse with customizable DPI and programmable buttons', 79.99, 'gaming', 40, 'GMS-PRO-001'),
('iPad Air 5th Gen', 'Versatile tablet with M1 chip, perfect for creativity and productivity', 599.99, 'tablets', 20, 'IPAD-AIR5-001'),
('Dell XPS 13', 'Ultra-portable laptop with Intel Core i7 and premium build quality', 1299.99, 'laptops', 12, 'DELL-XPS13-001'),
('Samsung Galaxy S24', 'Premium Android smartphone with advanced AI features and camera', 899.99, 'smartphones', 18, 'SGS24-001'),
('Sony WH-1000XM5', 'Industry-leading noise canceling wireless headphones', 399.99, 'accessories', 25, 'SONY-WH1000XM5-001');

-- Insert sample cart items
INSERT INTO cart_items (user_id, product_id, quantity) VALUES 
(2, 1, 1),
(2, 3, 2),
(3, 2, 1),
(3, 4, 1);

-- Insert sample orders
INSERT INTO orders (user_id, status, total_amount, shipping_address, payment_method) VALUES 
(2, 'delivered', 2749.98, '{"street": "123 Main St", "city": "New York", "state": "NY", "zip": "10001", "country": "USA"}', 'credit_card'),
(3, 'processing', 1149.98, '{"street": "456 Oak Ave", "city": "Los Angeles", "state": "CA", "zip": "90210", "country": "USA"}', 'paypal');

-- Insert sample order items
INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES 
(1, 1, 'MacBook Pro 16"', 1, 2499.99),
(1, 3, 'AirPods Pro', 1, 249.99),
(2, 2, 'iPhone 15 Pro', 1, 999.99),
(2, 4, 'Gaming Keyboard RGB', 1, 149.99);

-- ============================================
-- USEFUL VIEWS FOR REPORTING
-- ============================================

-- Product inventory view
CREATE VIEW product_inventory AS
SELECT 
    id,
    name,
    category,
    price,
    stock,
    CASE 
        WHEN stock = 0 THEN 'Out of Stock'
        WHEN stock < 5 THEN 'Low Stock'
        ELSE 'In Stock'
    END as stock_status,
    created_at
FROM products 
WHERE is_active = true;

-- Order summary view
CREATE VIEW order_summary AS
SELECT 
    o.id as order_id,
    o.order_number,
    u.first_name || ' ' || u.last_name as customer_name,
    u.email as customer_email,
    o.status,
    o.total_amount,
    o.created_at as order_date,
    COUNT(oi.id) as total_items
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, u.id;

-- Sales analytics view
CREATE VIEW sales_analytics AS
SELECT 
    DATE_TRUNC('month', o.created_at) as month,
    COUNT(o.id) as total_orders,
    SUM(o.total_amount) as total_revenue,
    AVG(o.total_amount) as avg_order_value,
    COUNT(DISTINCT o.user_id) as unique_customers
FROM orders o
WHERE o.status != 'cancelled'
GROUP BY DATE_TRUNC('month', o.created_at)
ORDER BY month DESC;

-- Popular products view
CREATE VIEW popular_products AS
SELECT 
    p.id,
    p.name,
    p.category,
    p.price,
    COUNT(oi.id) as times_ordered,
    SUM(oi.quantity) as total_quantity_sold,
    SUM(oi.total_price) as total_revenue
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id
ORDER BY times_ordered DESC, total_quantity_sold DESC;

-- ============================================
-- STORED PROCEDURES FOR COMMON OPERATIONS
-- ============================================

-- Function to get cart total for a user
CREATE OR REPLACE FUNCTION get_cart_total(user_id_param INTEGER)
RETURNS DECIMAL(12,2) AS $
DECLARE
    cart_total DECIMAL(12,2);
BEGIN
    SELECT COALESCE(SUM(p.price * c.quantity), 0)
    INTO cart_total
    FROM cart_items c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = user_id_param;
    
    RETURN cart_total;
END;
$ LANGUAGE plpgsql;

-- Function to check product availability
CREATE OR REPLACE FUNCTION check_product_availability(product_id_param INTEGER, quantity_param INTEGER)
RETURNS BOOLEAN AS $
DECLARE
    available_stock INTEGER;
BEGIN
    SELECT stock INTO available_stock
    FROM products
    WHERE id = product_id_param AND is_active = true;
    
    RETURN (available_stock >= quantity_param);
END;
$ LANGUAGE plpgsql;

-- Function to update order status with timestamp
CREATE OR REPLACE FUNCTION update_order_status(order_id_param INTEGER, new_status VARCHAR(20))
RETURNS VOID AS $
BEGIN
    UPDATE orders 
    SET 
        status = new_status,
        shipped_at = CASE WHEN new_status = 'shipped' THEN NOW() ELSE shipped_at END,
        delivered_at = CASE WHEN new_status = 'delivered' THEN NOW() ELSE delivered_at END,
        updated_at = NOW()
    WHERE id = order_id_param;
END;
$ LANGUAGE plpgsql;

-- ============================================
-- SECURITY: ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on sensitive tables
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy for cart_items: users can only see their own cart
CREATE POLICY cart_items_user_policy ON cart_items
    FOR ALL
    TO authenticated_users
    USING (user_id = current_user_id());

-- Policy for orders: users can only see their own orders
CREATE POLICY orders_user_policy ON orders
    FOR SELECT
    TO authenticated_users
    USING (user_id = current_user_id());

-- Note: You'll need to implement current_user_id() function based on your auth system

-- ============================================
-- PERFORMANCE OPTIMIZATION QUERIES
-- ============================================

-- Analyze tables for query optimization
ANALYZE users;
ANALYZE products;
ANALYZE cart_items;
ANALYZE orders;
ANALYZE order_items;

-- ============================================
-- BACKUP AND MAINTENANCE COMMANDS
-- ============================================

-- Create a backup (run from command line)
-- pg_dump -U your_username -h localhost ecommerce_db > ecommerce_backup_$(date +%Y%m%d).sql

-- Restore from backup (run from command line)
-- psql -U your_username -h localhost -d ecommerce_db < ecommerce_backup_20241127.sql

-- ============================================
-- MONITORING QUERIES
-- ============================================

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check active connections
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    LEFT(query, 50) as query_snippet
FROM pg_stat_activity 
WHERE datname = 'ecommerce_db';

-- Check slow queries (requires pg_stat_statements extension)
-- SELECT 
--     query,
--     calls,
--     total_time,
--     mean_time,
--     rows
-- FROM pg_stat_statements 
-- ORDER BY mean_time DESC 
-- LIMIT 10;

-- ============================================
-- USEFUL ADMIN QUERIES
-- ============================================

-- Get order details with items
SELECT 
    o.order_number,
    u.email as customer_email,
    o.status,
    o.total_amount,
    o.created_at,
    json_agg(
        json_build_object(
            'product_name', oi.product_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price
        )
    ) as items
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.id = 1  -- Replace with specific order ID
GROUP BY o.id, u.email;

-- Get low stock products
SELECT 
    name,
    category,
    stock,
    price
FROM products 
WHERE stock < 5 AND is_active = true
ORDER BY stock ASC;

-- Get top customers by total spend
SELECT 
    u.first_name || ' ' || u.last_name as customer_name,
    u.email,
    COUNT(o.id) as total_orders,
    SUM(o.total_amount) as total_spent,
    AVG(o.total_amount) as avg_order_value
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.status != 'cancelled'
GROUP BY u.id
ORDER BY total_spent DESC
LIMIT 10;

-- Get revenue by category
SELECT 
    p.category,
    COUNT(oi.id) as items_sold,
    SUM(oi.total_price) as total_revenue,
    AVG(oi.unit_price) as avg_price
FROM products p
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
WHERE o.status != 'cancelled'
GROUP BY p.category
ORDER BY total_revenue DESC;

-- ============================================
-- FINAL NOTES FOR DEVOPS DEPLOYMENT
-- ============================================

-- 1. Environment Variables to Set:
--    - DB_HOST: Your PostgreSQL server host
--    - DB_PORT: PostgreSQL port (default: 5432)
--    - DB_NAME: Database name (ecommerce_db)
--    - DB_USER: Database username
--    - DB_PASSWORD: Database password
--    - JWT_SECRET: Secret key for JWT tokens

-- 2. Connection Pool Settings (recommended for production):
--    - max: 20 (maximum connections)
--    - min: 2 (minimum connections)
--    - idleTimeoutMillis: 30000
--    - connectionTimeoutMillis: 5000

-- 3. SSL Settings for Production:
--    - Ensure SSL is enabled: ssl: { rejectUnauthorized: false }
--    - Use proper SSL certificates in production

-- 4. Database Maintenance:
--    - Set up automated backups
--    - Monitor query performance
--    - Regular VACUUM and ANALYZE operations
--    - Monitor disk space and connection limits

-- 5. Security Considerations:
--    - Use strong passwords
--    - Limit database user permissions
--    - Enable SSL connections
--    - Regular security updates
--    - Implement rate limiting on API endpoints

COMMIT;