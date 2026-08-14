import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Minus, ShoppingBag, Flame, Trash2, Coffee } from "lucide-react";
import Modal from "../components/Modal";
import Button from "../components/Button";
import CafeOrderSuccess from "../components/CafeOrderSuccess";
import PaymentMethodModal from "../components/PaymentMethodModal";
import LocationModal from "../components/LocationModal";
import WalletCreditPrompt from "../components/WalletCreditPrompt";
import Skeleton from "../components/Skeleton";
import { useToast } from "../contexts/ToastContext";
import { auth } from "../firebase";
import { addWalletTransaction, applyWalletCredit, getUserProfile } from "../lib/userService";
import { CAFE_CATEGORIES, createOrder, ensureMenuSeeded, listenToMenu } from "../lib/cafeService";
import "./Cafe.css";

const categories = ["All", ...CAFE_CATEGORIES];

function Cafe() {
  const { showToast } = useToast();
  const [menu, setMenu] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [success, setSuccess] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [orderLocation, setOrderLocation] = useState(null); // { type: "table"|"standing"|"turf", table: number|null }
  const [pendingProfile, setPendingProfile] = useState(null);
  const [walletPromptOpen, setWalletPromptOpen] = useState(false);
  const [walletCreditApplied, setWalletCreditApplied] = useState(0);
  const [walletChoiceLoading, setWalletChoiceLoading] = useState(false);

  useEffect(() => {
    let unsubscribe = () => {};
    ensureMenuSeeded().finally(() => {
      unsubscribe = listenToMenu((items) => {
        setMenu(items);
        setMenuLoading(false);
      });
    });
    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menu.filter((item) => {
      const matchesCategory = activeCategory === "All" || item.category === activeCategory;
      const matchesQuery = !q || item.name.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query, menu]);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ ...menu.find((m) => m.id === id), qty }))
      .filter((item) => item.id);
  }, [cart, menu]);

  const totalItems = cartItems.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = cartItems.reduce((sum, i) => sum + i.qty * i.price, 0);

  const updateQty = (item, delta) => {
    if (delta > 0 && item.available === false) {
      showToast(`${item.name} is currently not available.`, "error");
      return;
    }
    setCart((prev) => {
      const next = Math.max(0, (prev[item.id] || 0) + delta);
      return { ...prev, [item.id]: next };
    });
  };

  // Opens the cart → location step, doesn't place the order yet.
  const handleGoToPayment = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      showToast("Please log in again to order.", "error");
      return;
    }
    const profile = await getUserProfile(currentUser.uid);
    setPendingProfile(profile);
    setCartOpen(false);
    setLocationModalOpen(true);
  };

  // Location chosen → ask about wallet credit first if they have any,
  // otherwise go straight to the payment-method step.
  const handleLocationContinue = (location) => {
    setOrderLocation(location);
    setLocationModalOpen(false);
    setWalletCreditApplied(0);
    setWalletPromptOpen(true);
  };

  const handleUseWalletCredit = async () => {
    const applied = Math.min(pendingProfile?.wallet_balance || 0, totalPrice);
    setWalletCreditApplied(applied);
    setWalletPromptOpen(false);

    if (applied >= totalPrice) {
      // Wallet fully covers it — no cash/QR step needed at all.
      setWalletChoiceLoading(true);
      try {
        await handlePlaceOrder("wallet", "", applied);
      } finally {
        setWalletChoiceLoading(false);
      }
    } else {
      setPaymentModalOpen(true);
    }
  };

  const handleSkipWalletCredit = () => {
    setWalletCreditApplied(0);
    setWalletPromptOpen(false);
    setPaymentModalOpen(true);
  };

  const handlePlaceOrder = async (paymentMethod, transactionId, creditApplied = walletCreditApplied) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      showToast("Please log in again to order.", "error");
      return;
    }

    setPlacingOrder(true);
    try {
      const profile = pendingProfile || (await getUserProfile(currentUser.uid));
      const itemsLabel = cartItems.map((item) => `${item.name} x${item.qty}`).join(", ");
      const orderItems = cartItems.map((item) => ({ name: item.name, qty: item.qty, price: item.price }));
      const remaining = totalPrice - creditApplied;

      const { token } = await createOrder(currentUser.uid, {
        items: orderItems,
        total: totalPrice,
        walletCreditApplied: creditApplied,
        userName: profile?.name || "",
        userContact: profile?.phone || profile?.email || "",
        paymentMethod: remaining === 0 ? "wallet" : paymentMethod,
        transactionId,
        location: orderLocation,
      });

      const label = `Cafe order #${token} — ${itemsLabel}`;

      // Wallet-credit portion actually reduces the real balance. The
      // cash/QR portion is only logged for the Wallet/History pages.
      if (creditApplied > 0) {
        await applyWalletCredit(currentUser.uid, creditApplied, `${label} (wallet credit)`);
      }
      if (remaining > 0) {
        await addWalletTransaction(currentUser.uid, { label, amount: -remaining });
      }

      setLastOrder({ count: totalItems, total: totalPrice, token });
      setCart({});
      setOrderLocation(null);
      setPendingProfile(null);
      setPaymentModalOpen(false);
      setSuccess(true);
      showToast(`Order placed — token #${token}`);
    } catch (err) {
      console.error(err);
      showToast("Could not place order. Please try again.", "error");
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="cafe-page">
      <div className="cafe-inner">
        <div className="cafe-hero">
          <div className="cafe-hero-icon">
            <Coffee size={26} strokeWidth={2} />
          </div>
          <h1 className="cafe-hero-title">AltCafe</h1>
          <p className="cafe-hero-subtitle">Fresh brews &amp; bites, ready in ~10 minutes</p>
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

        {menuLoading ? (
          <div className="cafe-menu-list">
            <Skeleton height={220} />
            <Skeleton height={220} />
            <Skeleton height={220} />
            <Skeleton height={220} />
          </div>
        ) : (
          <div className="cafe-menu-list">
            {filtered.map((item) => {
              const qty = cart[item.id] || 0;
              const unavailable = item.available === false;
              return (
                <div
                  key={item.id}
                  className={`cafe-item-card ${unavailable ? "unavailable" : ""}`}
                  onClick={() => setDetailItem(item)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="cafe-item-icon">
                    {item.image ? <img src={item.image} alt={item.name} /> : item.icon}
                  </div>

                  <div className="cafe-item-body">
                    <div className="cafe-item-top">
                      <span className="cafe-item-name">{item.name}</span>
                      {item.popular && !unavailable && (
                        <span className="cafe-item-badge">
                          <Flame size={11} strokeWidth={2.4} /> Popular
                        </span>
                      )}
                      {unavailable && <span className="cafe-item-badge unavailable-badge">Not Available</span>}
                    </div>
                    <p className="cafe-item-desc">{item.desc}</p>
                    <span className="cafe-item-price">₹{item.price}</span>
                  </div>

                  {unavailable ? (
                    <span className="cafe-add-btn disabled">Sold Out</span>
                  ) : qty === 0 ? (
                    <button
                      className="cafe-add-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateQty(item, 1);
                      }}
                      type="button"
                    >
                      Add
                    </button>
                  ) : (
                    <div className="cafe-stepper" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => updateQty(item, -1)} aria-label="Decrease quantity" type="button">
                        <Minus size={14} strokeWidth={2.4} />
                      </button>
                      <span>{qty}</span>
                      <button onClick={() => updateQty(item, 1)} aria-label="Increase quantity" type="button">
                        <Plus size={14} strokeWidth={2.4} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && <p className="cafe-empty">No items match your search.</p>}
          </div>
        )}
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
                    <button onClick={() => updateQty(item, -1)} aria-label="Decrease quantity" type="button">
                      <Minus size={13} strokeWidth={2.4} />
                    </button>
                    <span>{item.qty}</span>
                    <button onClick={() => updateQty(item, 1)} aria-label="Increase quantity" type="button">
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

            <Button className="cafe-cart-checkout-btn" onClick={handleGoToPayment}>
              Checkout · ₹{totalPrice}
            </Button>
          </>
        )}
      </Modal>

      <Modal open={!!detailItem} onClose={() => setDetailItem(null)}>
        {detailItem && (
          <div className="cafe-detail">
            <div className="cafe-detail-image">
              {detailItem.image ? <img src={detailItem.image} alt={detailItem.name} /> : <span>{detailItem.icon}</span>}
            </div>
            <div className="cafe-detail-top">
              <h2>{detailItem.name}</h2>
              {detailItem.popular && detailItem.available !== false && (
                <span className="cafe-item-badge">
                  <Flame size={11} strokeWidth={2.4} /> Popular
                </span>
              )}
            </div>
            <span className="cafe-detail-category">{detailItem.category}</span>
            <p className="cafe-detail-desc">{detailItem.desc}</p>
            <div className="cafe-detail-bottom">
              <span className="cafe-detail-price">₹{detailItem.price}</span>
              {detailItem.available === false ? (
                <span className="cafe-add-btn disabled">Sold Out</span>
              ) : (cart[detailItem.id] || 0) === 0 ? (
                <button className="cafe-add-btn" onClick={() => updateQty(detailItem, 1)} type="button">
                  Add to Cart
                </button>
              ) : (
                <div className="cafe-stepper">
                  <button onClick={() => updateQty(detailItem, -1)} aria-label="Decrease quantity" type="button">
                    <Minus size={14} strokeWidth={2.4} />
                  </button>
                  <span>{cart[detailItem.id]}</span>
                  <button onClick={() => updateQty(detailItem, 1)} aria-label="Increase quantity" type="button">
                    <Plus size={14} strokeWidth={2.4} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <LocationModal
        open={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        onContinue={handleLocationContinue}
      />

      <PaymentMethodModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        amount={totalPrice - walletCreditApplied}
        label={`${totalItems} item${totalItems > 1 ? "s" : ""}`}
        confirming={placingOrder}
        onConfirm={handlePlaceOrder}
      />

      <WalletCreditPrompt
        open={walletPromptOpen}
        onClose={() => setWalletPromptOpen(false)}
        balance={pendingProfile?.wallet_balance || 0}
        total={totalPrice}
        onUse={handleUseWalletCredit}
        onSkip={handleSkipWalletCredit}
        loading={walletChoiceLoading}
      />

      <CafeOrderSuccess
        open={success}
        onClose={() => setSuccess(false)}
        count={lastOrder?.count}
        total={lastOrder?.total}
        token={lastOrder?.token}
      />
    </div>
  );
}

export default Cafe;