// Premium Shop Data
const shopData = {
    categories: [
        { id: 1, name: "Смартфоны", icon: "📱", count: 8 },
        { id: 2, name: "Ноутбуки", icon: "💻", count: 6 },
        { id: 3, name: "Планшеты", icon: "📟", count: 4 },
        { id: 4, name: "Аксессуары", icon: "🎧", count: 12 }
    ],
    products: [
        {
            id: 1,
            name: "iPhone 15 Pro Max",
            description: "Флагманский смартфон с титановым корпусом и камерой 48 МП",
            price: 129990,
            category: 1,
            image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=400&fit=crop"
        },
        {
            id: 2,
            name: "Samsung Galaxy S24 Ultra",
            description: "Мощный смартфон с S-Pen и AI-функциями",
            price: 99990,
            category: 1,
            image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=400&fit=crop"
        },
        {
            id: 3,
            name: "MacBook Pro 16\" M3",
            description: "Профессиональный ноутбук для творческих задач",
            price: 249990,
            category: 2,
            image: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=400&fit=crop"
        },
        {
            id: 4,
            name: "iPad Pro M2",
            description: "Мощный планшет для работы и творчества",
            price: 89990,
            category: 3,
            image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop"
        },
        {
            id: 5,
            name: "AirPods Pro 2",
            description: "Беспроводные наушники с активным шумоподавлением",
            price: 24990,
            category: 4,
            image: "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&h=400&fit=crop"
        },
        {
            id: 6,
            name: "Apple Watch Series 9",
            description: "Умные часы с расширенными функциями здоровья",
            price: 41990,
            category: 4,
            image: "https://images.unsplash.com/photo-1579586337278-3f436c8e6d45?w=400&h=400&fit=crop"
        },
        {
            id: 7,
            name: "Sony WH-1000XM5",
            description: "Премиальные наушники с лучшим шумоподавлением",
            price: 34990,
            category: 4,
            image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop"
        },
        {
            id: 8,
            name: "Samsung Galaxy Book3",
            description: "Стильный ультрабук для работы и развлечений",
            price: 89990,
            category: 2,
            image: "https://images.unsplash.com/photo-1587614382346-4ec70e388b28?w=400&h=400&fit=crop"
        }
    ]
};

// Shopping Cart
let cart = JSON.parse(localStorage.getItem('ewo_mobile_cart')) || [];

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    loadCategories();
    loadProducts();
    updateCartUI();
    setupEventListeners();
}

function setupEventListeners() {
    document.getElementById('cartButton').addEventListener('click', openCart);
    document.getElementById('closeCart').addEventListener('click', closeCart);
    document.getElementById('checkoutBtn').addEventListener('click', checkout);
    
    // Close cart when clicking outside
    document.getElementById('cartOverlay').addEventListener('click', function(e) {
        if (e.target === this) {
            closeCart();
        }
    });
}

// Load Categories with Premium Design
function loadCategories() {
    const categoriesContainer = document.getElementById('categories');
    categoriesContainer.innerHTML = '';
    
    shopData.categories.forEach(category => {
        const categoryElement = document.createElement('div');
        categoryElement.className = 'category-card';
        categoryElement.innerHTML = `
            <div class="category-icon">${category.icon}</div>
            <div class="category-name">${category.name}</div>
            <div class="category-count">${category.count} товаров</div>
        `;
        categoryElement.addEventListener('click', () => filterProducts(category.id));
        categoriesContainer.appendChild(categoryElement);
    });
}

// Load Products with Premium Design
function loadProducts(products = shopData.products) {
    const productsContainer = document.getElementById('products');
    productsContainer.innerHTML = '';
    
    products.forEach(product => {
        const productElement = document.createElement('div');
        productElement.className = 'product-card';
        productElement.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop'">
            <div class="product-info">
                <div class="product-title">${product.name}</div>
                <div class="product-description">${product.description}</div>
                <div class="product-price">${formatPrice(product.price)}</div>
                <button class="add-to-cart" onclick="addToCart(${product.id})">
                    Добавить в корзину
                </button>
            </div>
        `;
        productsContainer.appendChild(productElement);
    });
}

// Filter Products by Category
function filterProducts(categoryId) {
    const filteredProducts = shopData.products.filter(product => product.category === categoryId);
    loadProducts(filteredProducts);
    scrollToProducts();
}

// Show All Products
function showAllProducts() {
    loadProducts(shopData.products);
    scrollToProducts();
}

// Scroll to Products Section
function scrollToProducts() {
    document.getElementById('productsSection').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// Cart Management
function addToCart(productId) {
    const product = shopData.products.find(p => p.id === productId);
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });
    }
    
    updateCartUI();
    saveCart();
    showNotification('Товар добавлен в корзину!', 'success');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
    saveCart();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            updateCartUI();
            saveCart();
        }
    }
}

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartEmpty = document.getElementById('cartEmpty');
    const cartTotal = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    // Update cart count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    // Show/hide empty cart message
    if (cart.length === 0) {
        cartItems.style.display = 'none';
        cartEmpty.style.display = 'block';
        checkoutBtn.disabled = true;
    } else {
        cartItems.style.display = 'block';
        cartEmpty.style.display = 'none';
        checkoutBtn.disabled = false;
        
        // Update cart items
        cartItems.innerHTML = '';
        let totalPrice = 0;
        
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            totalPrice += itemTotal;
            
            const cartItemElement = document.createElement('div');
            cartItemElement.className = 'cart-item';
            cartItemElement.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="cart-item-image" onerror="this.src='https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop'">
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">${formatPrice(item.price)}</div>
                    <div class="cart-item-actions">
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                        <button class="remove-item" onclick="removeFromCart(${item.id})">Удалить</button>
                    </div>
                </div>
            `;
            cartItems.appendChild(cartItemElement);
        });
        
        // Update total price
        cartTotal.textContent = formatPrice(totalPrice);
    }
    
    saveCart();
}

function openCart() {
    document.getElementById('cartOverlay').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    document.getElementById('cartOverlay').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function checkout() {
    if (cart.length === 0) {
        showNotification('Корзина пуста!', 'error');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // In a real app, this would integrate with Telegram for order processing
    const orderDetails = cart.map(item => 
        `${item.name} × ${item.quantity} = ${formatPrice(item.price * item.quantity)}`
    ).join('\n');
    
    const confirmation = confirm(`Подтвердите заказ:\n\n${orderDetails}\n\nИтого: ${formatPrice(total)}\n\nПродолжить оформление?`);
    
    if (confirmation) {
        showNotification('Заказ успешно оформлен! Мы свяжемся с вами в ближайшее время.', 'success');
        
        // Clear cart after successful order
        cart = [];
        updateCartUI();
        closeCart();
        
        // In real app, send order data to server/Telegram bot
        console.log('Order placed:', { items: cart, total: total });
    }
}

// Utility Functions
function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU').format(price);
}

function saveCart() {
    localStorage.setItem('ewo_mobile_cart', JSON.stringify(cart));
}

function showNotification(message, type = 'info') {
    // Simple notification - in real app you might want a prettier solution
    alert(message);
}

// Load cart from localStorage on page load
function loadCart() {
    const savedCart = localStorage.getItem('ewo_mobile_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartUI();
    }
}

// Initialize cart on load
loadCart();