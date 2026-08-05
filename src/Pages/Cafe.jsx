import { useMemo, useState } from "react";
import { Search, Plus, Minus, ShoppingBag, Flame, Trash2 } from "lucide-react";
import Modal from "../components/Modal";
import Button from "../components/Button";
import CafeOrderSuccess from "../components/CafeOrderSuccess";
import { useToast } from "../contexts/ToastContext";
import "./Cafe.css";

const categories = ["All", "Coffee", "Tea", "Snacks", "Desserts"];

const menu = [
  { id: "c1", name: "Cold Brew", category: "Coffee", price: 120, icon: "☕", desc: "Slow-steeped, smooth & bold", popular: true },
  { id: "c2", name: "Cappuccino", category: "Coffee", price: 150, icon: "☕", desc: "Espresso, steamed milk, foam" },
  { id: "c3", name: "Americano", category: "Coffee", price: 110, icon: "☕", desc: "Espresso, hot water" },
  { id: "c4", name: "Caramel Latte", category: "Coffee", price: 160, icon: "☕", desc: "Espresso, milk, caramel syrup", popular: true },
  { id: "t1", name: "Masala Chai", category: "Tea", price: 60, icon: "🍵", desc: "Spiced milk tea" },
  { id: "t2", name: "Green Tea", category: "Tea", price: 70, icon: "🍵", desc: "Light & antioxidant-rich" },
  { id: "t3", name: "Lemon Iced Tea", category: "Tea", price: 90, icon: "🧊", desc: "Chilled, citrusy, refreshing" },
  { id: "s1", name: "Club Sandwich", category: "Snacks", price: 180, icon: "🥪", desc: "Triple-decker, chicken & egg", popular: true },
  { id: "s2", name: "French Fries", category: "Snacks", price: 120, icon: "🍟", desc: "Crispy, salted, served hot" },
  { id: "s3", name: "Chicken Wrap", category: "Snacks", price: 200, icon: "🌯", desc: "Grilled chicken, house sauce" },
  { id: "d1", name: "Chocolate Brownie", category: "Desserts", price: 150, icon: "🍫", desc: "Fudgy, warm, served with ice cream" },
  { id: "d2", name: "Cheesecake Slice", category: "Desserts", price: 180, icon: "🍰", desc: "Classic New York style" },
  { id: "d3", name: "Blueberry Muffin", category: "Desserts", price: 110, icon: "🧁", desc: "Soft, bakery-fresh" },
];

function Cafe() {
  const { showToast } = useToast();
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menu.filter((item) => {
      const matchesCategory = activeCategory === "All" || item.category === activeCategory;
      const matchesQuery = !q || item.name.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query]);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ ...menu.find((m) => m.id === id), qty }));
  }, [cart]);

  const totalItems = cartItems.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = cartItems.reduce((sum, i) => sum + i.qty * i.price, 0);

  const updateQty = (id, delta) => {
    setCart((prev) => {
      const next = Math.max(0, (prev[id] || 0) + delta);
      return { ...prev, [id]: next };
    });
  };

  const handlePlaceOrder = () => {
    setLastOrder({ count: totalItems, total: totalPrice });
    setCart({});
    setCartOpen(false);
    setSuccess(true);
    showToast("Order placed");
  };

  return (
    <div className="cafe-page">
      <div className="cafe-inner">
        <div className="cafe-header">
          <h1 className="cafe-title">Cafe Menu</h1>
          <p className="cafe-subtitle">Fresh brews &amp; bites, ready in ~10 minutes</p>
        </div>

        <label className="cafe-search">
          <Search size={17} strokeWidth={2.2} />
          <input
            type="text"
            placeholder="Search coffee, snacks, desserts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <div className="cafe-category-strip">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`cafe-category-chip ${activeCategory === cat ? "selected" : ""}`}
              onClick={() => setActiveCategory(cat)}
              type="button"
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="cafe-menu-list">
          {filtered.map((item) => {
            const qty = cart[item.id] || 0;
            return (
              <div key={item.id} className="cafe-item-card">
                <div className="cafe-item-icon">{item.icon}</div>

                <div className="cafe-item-body">
                  <div className="cafe-item-top">
                    <span className="cafe-item-name">{item.name}</span>
                    {item.popular && (
                      <span className="cafe-item-badge">
                        <Flame size={11} strokeWidth={2.4} /> Popular
                      </span>
                    )}
                  </div>
                  <p className="cafe-item-desc">{item.desc}</p>
                  <span className="cafe-item-price">₹{item.price}</span>
                </div>

                {qty === 0 ? (
                  <button className="cafe-add-btn" onClick={() => updateQty(item.id, 1)} type="button">
                    Add
                  </button>
                ) : (
                  <div className="cafe-stepper">
                    <button onClick={() => updateQty(item.id, -1)} aria-label="Decrease quantity" type="button">
                      <Minus size={14} strokeWidth={2.4} />
                    </button>
                    <span>{qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} aria-label="Increase quantity" type="button">
                      <Plus size={14} strokeWidth={2.4} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && <p className="cafe-empty">No items match your search.</p>}
        </div>
      </div>

      {totalItems > 0 && (
        <button className="cafe-cart-bar" onClick={() => setCartOpen(true)} type="button">
          <span className="cafe-cart-bar-count">
            <ShoppingBag size={16} strokeWidth={2.2} />
            {totalItems} item{totalItems > 1 ? "s" : ""}
          </span>
          <span className="cafe-cart-bar-total">₹{totalPrice}</span>
          <span className="cafe-cart-bar-cta">View Cart</span>
        </button>
      )}

      <Modal open={cartOpen} onClose={() => setCartOpen(false)}>
        <h2 style={{ marginBottom: 18 }}>Your Order</h2>

        {cartItems.length === 0 ? (
          <p className="cafe-cart-empty">Your cart is empty.</p>
        ) : (
          <>
            <div className="cafe-cart-list">
              {cartItems.map((item) => (
                <div key={item.id} className="cafe-cart-row">
                  <span className="cafe-cart-row-icon">{item.icon}</span>
                  <div className="cafe-cart-row-body">
                    <span className="cafe-cart-row-name">{item.name}</span>
                    <span className="cafe-cart-row-price">₹{item.price} each</span>
                  </div>
                  <div className="cafe-stepper cafe-stepper-sm">
                    <button onClick={() => updateQty(item.id, -1)} aria-label="Decrease quantity" type="button">
                      <Minus size={13} strokeWidth={2.4} />
                    </button>
                    <span>{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} aria-label="Increase quantity" type="button">
                      <Plus size={13} strokeWidth={2.4} />
                    </button>
                  </div>
                  <button
                    className="cafe-cart-row-remove"
                    onClick={() => setCart((prev) => ({ ...prev, [item.id]: 0 }))}
                    aria-label={`Remove ${item.name}`}
                    type="button"
                  >
                    <Trash2 size={15} strokeWidth={2.1} />
                  </button>
                </div>
              ))}
            </div>

            <div className="stitch-divider cafe-cart-divider" />

            <div className="cafe-cart-total-row">
              <span>Total</span>
              <strong>₹{totalPrice}</strong>
            </div>

            <Button className="cafe-cart-checkout-btn" onClick={handlePlaceOrder}>
              Place Order · ₹{totalPrice}
            </Button>
          </>
        )}
      </Modal>

      <CafeOrderSuccess
        open={success}
        onClose={() => setSuccess(false)}
        count={lastOrder?.count}
        total={lastOrder?.total}
      />
    </div>
  );
}

export default Cafe;