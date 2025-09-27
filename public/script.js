
        // Application State
        let products = [];
        let cart = [];
        let orders = [];
        let currentOrderId = 1;

        // Initialize sample products
        const sampleProducts = [
            {
                id: 1,
                name: "MacBook Pro 16\"",
                description: "Powerful laptop for professionals",
                price: 2499.99,
                category: "laptops",
                stock: 10,
                emoji: "💻"
            },
            {
                id: 2,
                name: "iPhone 15 Pro",
                description: "Latest smartphone with advanced features",
                price: 999.99,
                category: "smartphones",
                stock: 25,
                emoji: "📱"
            },
            {
                id: 3,
                name: "AirPods Pro",
                description: "Premium wireless earphones",
                price: 249.99,
                category: "accessories",
                stock: 50,
                emoji: "🎧"
            },
            {
                id: 4,
                name: "Gaming Keyboard",
                description: "Mechanical keyboard for gamers",
                price: 149.99,
                category: "gaming",
                stock: 30,
                emoji: "⌨️"
            },
            {
                id: 5,
                name: "4K Monitor",
                description: "Ultra HD display for work and gaming",
                price: 399.99,
                category: "accessories",
                stock: 15,
                emoji: "🖥️"
            },
            {
                id: 6,
                name: "Gaming Mouse",
                description: "High precision gaming mouse",
                price: 79.99,
                category: "gaming",
                stock: 40,
                emoji: "🖱️"
            }
        ];

        // Load data from localStorage or use samples
        function loadData() {
            const savedProducts = localStorage.getItem('products');
            const savedCart = localStorage.getItem('cart');
            const savedOrders = localStorage.getItem('orders');
            const savedOrderId = localStorage.getItem('currentOrderId');

            products = savedProducts ? JSON.parse(savedProducts) : [...sampleProducts];
            cart = savedCart ? JSON.parse(savedCart) : [];
            orders = savedOrders ? JSON.parse(savedOrders) : [];
            currentOrderId = savedOrderId ? parseInt(savedOrderId) : 1;
        }

        // Save data to localStorage
        function saveData() {
            localStorage.setItem('products', JSON.stringify(products));
            localStorage.setItem('cart', JSON.stringify(cart));
            localStorage.setItem('orders', JSON.stringify(orders));
            localStorage.setItem('currentOrderId', currentOrderId.toString());
        }

        // Page Navigation
        function showPage(pageId) {
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            document.getElementById(pageId).classList.add('active');
            
            // Load specific page content
            switch(pageId) {
                case 'home':
                    loadFeaturedProducts();
                    break;
                case 'products':
                    loadAllProducts();
                    break;
                case 'cart':
                    displayCart();
                    break;
                case 'orders':
                    displayOrders();
                    break;
            }
        }

        // Product Display Functions
        function createProductCard(product) {
            return `
                <div class="product-card">
                    <div class="product-image">${product.emoji}</div>
                    <div class="product-name">${product.name}</div>
                    <div class="product-description">${product.description}</div>
                    <div class="product-price">$${product.price}</div>
                    <button class="add-to-cart" onclick="addToCart(${product.id})" ${product.stock === 0 ? 'disabled' : ''}>
                        ${product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                </div>
            `;
        }

        function loadFeaturedProducts() {
            const featuredProducts = products.slice(0, 3);
            document.getElementById('featuredProducts').innerHTML = 
                featuredProducts.map(createProductCard).join('');
        }

        function loadAllProducts() {
            document.getElementById('allProducts').innerHTML = 
                products.map(createProductCard).join('');
        }

        // Cart Functions
        function addToCart(productId) {
            const product = products.find(p => p.id === productId);
            if (!product || product.stock === 0) return;

            const existingItem = cart.find(item => item.productId === productId);
            
            if (existingItem) {
                if (existingItem.quantity < product.stock) {
                    existingItem.quantity++;
                }
            } else {
                cart.push({
                    productId: productId,
                    name: product.name,
                    price: product.price,
                    quantity: 1
                });
            }
            
            updateCartCount();
            saveData();
            
            // Show feedback
            const button = event.target;
            const originalText = button.textContent;
            button.textContent = 'Added!';
            button.style.background = '#28a745';
            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '';
            }, 1000);
        }

        function removeFromCart(productId) {
            cart = cart.filter(item => item.productId !== productId);
            updateCartCount();
            displayCart();
            saveData();
        }

        function updateQuantity(productId, change) {
            const item = cart.find(item => item.productId === productId);
            const product = products.find(p => p.id === productId);
            
            if (item && product) {
                const newQuantity = item.quantity + change;
                if (newQuantity <= 0) {
                    removeFromCart(productId);
                } else if (newQuantity <= product.stock) {
                    item.quantity = newQuantity;
                    updateCartCount();
                    displayCart();
                    saveData();
                }
            }
        }

        function displayCart() {
            const cartContainer = document.getElementById('cartItems');
            const cartTotal = document.getElementById('cartTotal');
            
            if (cart.length === 0) {
                cartContainer.innerHTML = '<div class="empty-message">Your cart is empty</div>';
                cartTotal.style.display = 'none';
                return;
            }
            
            let total = 0;
            cartContainer.innerHTML = cart.map(item => {
                const itemTotal = item.price * item.quantity;
                total += itemTotal;
                
                return `
                    <div class="cart-item">
                        <div>
                            <strong>${item.name}</strong><br>
                            $${item.price} each
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <button onclick="updateQuantity(${item.productId}, -1)" style="padding: 5px 10px;">-</button>
                            <span>${item.quantity}</span>
                            <button onclick="updateQuantity(${item.productId}, 1)" style="padding: 5px 10px;">+</button>
                            <strong>$${itemTotal.toFixed(2)}</strong>
                            <button onclick="removeFromCart(${item.productId})" style="background: #dc3545; color: white; padding: 5px 10px; border: none; border-radius: 3px;">Remove</button>
                        </div>
                    </div>
                `;
            }).join('');
            
            document.getElementById('totalAmount').textContent = total.toFixed(2);
            cartTotal.style.display = 'block';
        }

        function updateCartCount() {
            const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
            document.getElementById('cartCount').textContent = totalItems;
        }

        // Checkout Function
        function handleCheckout(event) {
            event.preventDefault();
            
            if (cart.length === 0) {
                alert('Your cart is empty!');
                return;
            }
            
            const formData = new FormData(event.target);
            const orderData = {
                id: currentOrderId++,
                date: new Date().toLocaleDateString(),
                status: 'processing',
                items: [...cart],
                total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                customer: {
                    firstName: formData.get('firstName'),
                    lastName: formData.get('lastName'),
                    email: formData.get('email'),
                    address: formData.get('address'),
                    city: formData.get('city'),
                    zipCode: formData.get('zipCode'),
                    paymentMethod: formData.get('paymentMethod')
                }
            };
            
            // Update product stock
            cart.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    product.stock -= item.quantity;
                }
            });
            
            orders.push(orderData);
            
            // Show success message
            document.getElementById('orderIdDisplay').textContent = orderData.id;
            document.getElementById('checkoutSuccess').style.display = 'block';
            
            // Clear cart
            cart = [];
            updateCartCount();
            
            // Reset form
            event.target.reset();
            
            saveData();
            
            // Hide success message after 5 seconds
            setTimeout(() => {
                document.getElementById('checkoutSuccess').style.display = 'none';
            }, 5000);
        }

        // Orders Display
        function displayOrders() {
            const ordersContainer = document.getElementById('ordersList');
            
            if (orders.length === 0) {
                ordersContainer.innerHTML = '<div class="empty-message">No orders found</div>';
                return;
            }
            
            ordersContainer.innerHTML = orders.map(order => `
                <div class="order-item">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3>Order #${order.id}</h3>
                        <span class="order-status status-${order.status}">${order.status.toUpperCase()}</span>
                    </div>
                    <p><strong>Date:</strong> ${order.date}</p>
                    <p><strong>Customer:</strong> ${order.customer.firstName} ${order.customer.lastName}</p>
                    <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
                    <div style="margin-top: 1rem;">
                        <strong>Items:</strong>
                        <ul style="margin-top: 0.5rem;">
                            ${order.items.map(item => `<li>${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `).reverse().join('');
        }

        // Admin Functions
        function handleAddProduct(event) {
            event.preventDefault();
            
            const formData = new FormData(event.target);
            const newProduct = {
                id: Math.max(...products.map(p => p.id), 0) + 1,
                name: formData.get('name'),
                description: formData.get('description'),
                price: parseFloat(formData.get('price')),
                category: formData.get('category'),
                stock: parseInt(formData.get('stock')),
                emoji: getEmojiByCategory(formData.get('category'))
            };
            
            products.push(newProduct);
            saveData();
            
            event.target.reset();
            alert('Product added successfully!');
        }

        function getEmojiByCategory(category) {
            const emojiMap = {
                laptops: '💻',
                smartphones: '📱',
                accessories: '🎧',
                gaming: '🎮'
            };
            return emojiMap[category] || '📦';
        }

        // Initialize Application
        document.addEventListener('DOMContentLoaded', function() {
            loadData();
            updateCartCount();
            loadFeaturedProducts();
            
            // Add event listeners
            document.getElementById('checkoutForm').addEventListener('submit', handleCheckout);
            document.getElementById('addProductForm').addEventListener('submit', handleAddProduct);
        });
    