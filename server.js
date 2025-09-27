const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============ DATABASE CONFIGURATION ============
const pool = new Pool({
    user: process.env.DB_USER || 'your_db_username',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'ecommerce_db',
    password: process.env.DB_PASSWORD || 'your_password',
    port: process.env.DB_PORT || 5432,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('Database connection error:', err);
});

// ============ API ROUTES ============

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ status: 'healthy', timestamp: result.rows[0].now });
    } catch (error) {
        res.status(500).json({ status: 'unhealthy', error: error.message });
    }
});

// ============ USER AUTHENTICATION ROUTES ============

// Register new user (no token issued)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        
        const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const result = await pool.query(
            'INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name',
            [email, hashedPassword, firstName, lastName]
        );
        
        const user = result.rows[0];
        
        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login user (no token issued)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const result = await pool.query(
            'SELECT id, email, password_hash, first_name, last_name FROM users WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============ PRODUCTS ROUTES ============

// Get all products (no authentication required)
app.get('/api/products', async (req, res) => {
    try {
        const { category, search } = req.query;
        let query = 'SELECT * FROM products WHERE 1=1';
        const params = [];
        
        if (category) {
            query += ` AND category = $${params.length + 1}`;
            params.push(category);
        }
        
        if (search) {
            query += ` AND (name ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`;
            params.push(`%${search}%`);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single product (no authentication required)
app.get('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create product (no authentication, remove admin only restriction)
app.post('/api/products', async (req, res) => {
    try {
        const { name, description, price, category, stock, image_url } = req.body;
        
        const result = await pool.query(
            'INSERT INTO products (name, description, price, category, stock, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, description, price, category, stock, image_url]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update product (no authentication)
app.put('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, category, stock, image_url } = req.body;
        
        const result = await pool.query(
            'UPDATE products SET name = $1, description = $2, price = $3, category = $4, stock = $5, image_url = $6, updated_at = NOW() WHERE id = $7 RETURNING *',
            [name, description, price, category, stock, image_url, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete product (no authentication)
app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============ CART ROUTES ============

// Get user's cart - no auth, accepts userId as query param
app.get('/api/cart', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'userId query parameter is required' });
        }
        const result = await pool.query(`
            SELECT c.id, c.quantity, p.id as product_id, p.name, p.price, p.image_url
            FROM cart_items c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = $1
        `, [userId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add item to cart - no auth, accepts userId in body
app.post('/api/cart', async (req, res) => {
    try {
        const { userId, productId, quantity = 1 } = req.body;
        if (!userId || !productId) {
            return res.status(400).json({ error: 'userId and productId are required' });
        }
        
        const productResult = await pool.query('SELECT stock FROM products WHERE id = $1', [productId]);
        if (productResult.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        const availableStock = productResult.rows[0].stock;
        const existingItem = await pool.query(
            'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
            [userId, productId]
        );
        
        if (existingItem.rows.length > 0) {
            const newQuantity = existingItem.rows[0].quantity + quantity;
            if (newQuantity > availableStock) {
                return res.status(400).json({ error: 'Not enough stock available' });
            }
            const result = await pool.query(
                'UPDATE cart_items SET quantity = $1 WHERE id = $2 RETURNING *',
                [newQuantity, existingItem.rows[0].id]
            );
            res.json(result.rows[0]);
        } else {
            if (quantity > availableStock) {
                return res.status(400).json({ error: 'Not enough stock available' });
            }
            const result = await pool.query(
                'INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING *',
                [userId, productId, quantity]
            );
            res.status(201).json(result.rows[0]);
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update cart item quantity - no auth, accepts userId in body
app.put('/api/cart/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, quantity } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        if (quantity <= 0) {
            const result = await pool.query(
                'DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING *',
                [id, userId]
            );
            return res.json({ message: 'Item removed from cart' });
        }
        
        const result = await pool.query(
            'UPDATE cart_items SET quantity = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
            [quantity, id, userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cart item not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Remove item from cart - no auth, accepts userId in query
app.delete('/api/cart/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'userId query parameter is required' });
        }
        const result = await pool.query(
            'DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cart item not found' });
        }
        
        res.json({ message: 'Item removed from cart' });
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============ ORDERS ROUTES ============

// Create order - no auth, accepts userId in body
app.post('/api/orders', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { userId, shippingAddress, paymentMethod } = req.body;
        if (!userId) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'userId is required' });
        }

        const cartResult = await client.query(`
            SELECT c.quantity, p.id, p.name, p.price, p.stock
            FROM cart_items c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = $1
        `, [userId]);

        if (cartResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Cart is empty' });
        }

        let total = 0;
        for (const item of cartResult.rows) {
            if (item.quantity > item.stock) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: `Not enough stock for ${item.name}. Available: ${item.stock}` });
            }
            total += item.price * item.quantity;
        }

        const orderResult = await client.query(
            'INSERT INTO orders (user_id, total_amount, status, shipping_address, payment_method) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [userId, total, 'pending', JSON.stringify(shippingAddress), paymentMethod]
        );

        const orderId = orderResult.rows[0].id;

        for (const item of cartResult.rows) {
            await client.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
                [orderId, item.id, item.quantity, item.price]
            );

            await client.query(
                'UPDATE products SET stock = stock - $1 WHERE id = $2',
                [item.quantity, item.id]
            );
        }

        await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

        await client.query('COMMIT');

        res.status(201).json(orderResult.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// Get user's orders - no auth, accepts userId in query
app.get('/api/orders', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'userId query parameter is required' });
        }
        const result = await pool.query(`
            SELECT o.*, 
                   json_agg(
                       json_build_object(
                           'product_id', oi.product_id,
                           'name', p.name,
                           'quantity', oi.quantity,
                           'price', oi.price
                       )
                   ) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = $1
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `, [userId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single order - no auth, accepts userId in query
app.get('/api/orders/:id', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'userId query parameter is required' });
        }
        const { id } = req.params;
        const result = await pool.query(`
            SELECT o.*, 
                   json_agg(
                       json_build_object(
                           'product_id', oi.product_id,
                           'name', p.name,
                           'quantity', oi.quantity,
                           'price', oi.price
                       )
                   ) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.id = $1 AND o.user_id = $2
            GROUP BY o.id
        `, [id, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============ ADMIN ROUTES ============

// Get all orders (no auth)
app.get('/api/admin/orders', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT o.*, u.email, u.first_name, u.last_name,
                   json_agg(
                       json_build_object(
                           'product_id', oi.product_id,
                           'name', p.name,
                           'quantity', oi.quantity,
                           'price', oi.price
                       )
                   ) as items
            FROM orders o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            GROUP BY o.id, u.id
            ORDER BY o.created_at DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching admin orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update order status (no auth)
app.put('/api/admin/orders/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const result = await pool.query(
            'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('API endpoints available:');
    console.log('- POST /api/auth/register - Register user');
    console.log('- POST /api/auth/login - Login user');
    console.log('- GET /api/products - Get all products');
    console.log('- GET /api/cart?userId= - Get user cart');
    console.log('- POST /api/cart - Add to cart');
    console.log('- POST /api/orders - Create order');
    console.log('- GET /api/orders?userId= - Get user orders');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    pool.end(() => {
        console.log('Database pool closed');
        process.exit(0);
    });
});
