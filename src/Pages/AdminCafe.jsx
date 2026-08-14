import { useEffect, useRef, useState } from "react";
import { Coffee, Plus, Pencil, Trash2, ShoppingBag, EyeOff, Eye, ImagePlus, CheckCircle2, XCircle } from "lucide-react";
import {
  CAFE_CATEGORIES,
  ORDER_PHASES,
  ORDER_PHASE_LABELS,
  addMenuItem,
  confirmOrder,
  deleteAllCancelledOrders,
  deleteAllMenuItems,
  deleteMenuItem,
  ensureMenuSeeded,
  listenToMenu,
  listenToOrders,
  setMenuItemAvailability,
  updateMenuItem,
  updateOrderStatus,
  uploadMenuItemImage,
} from "../lib/cafeService";
import Modal from "../Components/Modal";
import Button from "../Components/Button";
import Skeleton from "../Components/Skeleton";
import { useToast } from "../contexts/ToastContext";
import "./Admin.css";
import "./AdminCafe.css";

function formatDate(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatLocation(location) {
  if (!location || !location.type) return "—";
  if (location.type === "table") return `Table ${location.table ?? "—"}`;
  if (location.type === "standing") return "Standing";
  if (location.type === "turf") return "Turf";
  return "—";
}

const emptyForm = { name: "", category: CAFE_CATEGORIES[0], price: "", desc: "", icon: "", image: "" };

// Orders placed before the token/phase system only have a "placed"/"done"
// status — read those the same way the customer-facing tracker does.
function resolvePhase(order) {
  if (order.phase) return order.phase;
  return order.status === "done" ? "completed" : "placed";
}

function AdminCafe() {
  const { showToast } = useToast();
  const [tab, setTab] = useState("menu"); // "menu" | "orders" | "completed" | "cancelled"

  const [menu, setMenu] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [confirmingOrderId, setConfirmingOrderId] = useState(null);
  const [etaDrafts, setEtaDrafts] = useState({}); // orderId -> in-progress ETA input value
  const [clearingMenu, setClearingMenu] = useState(false);
  const [clearingCancelled, setClearingCancelled] = useState(false);

  const knownOrderIds = useRef(null); // null until first snapshot, so we don't toast on page load

  // Orders never get deleted — they just move between these three buckets
  // as admin changes the phase, so all history stays visible under Complete/Cancel.
  const activeOrders = orders.filter((o) => {
    const phase = resolvePhase(o);
    return phase !== "completed" && phase !== "cancelled";
  });
  const completedOrders = orders.filter((o) => resolvePhase(o) === "completed");
  const cancelledOrders = orders.filter((o) => resolvePhase(o) === "cancelled");

  const visibleOrders =
    tab === "orders" ? activeOrders : tab === "completed" ? completedOrders : tab === "cancelled" ? cancelledOrders : [];

  useEffect(() => {
    let unsubMenu = () => {};
    ensureMenuSeeded().finally(() => {
      unsubMenu = listenToMenu((items) => {
        setMenu(items);
        setMenuLoading(false);
      });
    });
    const unsubOrders = listenToOrders((data) => {
      if (knownOrderIds.current) {
        const newOnes = data.filter((o) => !knownOrderIds.current.has(o.id));
        newOnes.forEach((o) => showToast(`New order — token #${o.token ?? "—"}`, "info"));
      }
      knownOrderIds.current = new Set(data.map((o) => o.id));
      setOrders(data);
      setOrdersLoading(false);
    });
    return () => {
      unsubMenu();
      unsubOrders();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAddForm = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEditForm = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      category: item.category,
      price: item.price,
      desc: item.desc,
      icon: item.icon,
      image: item.image || "",
    });
    setFormOpen(true);
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await uploadMenuItemImage(file);
      setForm((f) => ({ ...f, image: url }));
    } catch (err) {
      console.error(err);
      showToast(err.message || "Could not upload image. Please try again.", "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) {
      showToast("Name and price are required.", "error");
      return;
    }
    setSaving(true);
    try {
      if (editingItem) {
        await updateMenuItem(editingItem.id, {
          name: form.name.trim(),
          category: form.category,
          price: Number(form.price),
          desc: form.desc.trim(),
          icon: form.icon || "🍽️",
          image: form.image || "",
        });
        showToast("Item updated");
      } else {
        await addMenuItem(form);
        showToast("Item added to menu");
      }
      setFormOpen(false);
    } catch (err) {
      console.error(err);
      showToast("Could not save item. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      await setMenuItemAvailability(item.id, item.available === false);
    } catch (err) {
      console.error(err);
      showToast("Could not update availability.", "error");
    }
  };

  const handlePhaseChange = async (order, phase) => {
    setUpdatingOrderId(order.id);
    try {
      await updateOrderStatus(order.id, { phase });
      showToast(`Order #${order.token ?? "—"} → ${ORDER_PHASE_LABELS[phase] || phase}`);
    } catch (err) {
      console.error(err);
      showToast("Could not update order status.", "error");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleConfirmOrder = async (order) => {
    setConfirmingOrderId(order.id);
    try {
      await confirmOrder(order.id);
      showToast(`Order #${order.token ?? "—"} confirmed`);
    } catch (err) {
      console.error(err);
      showToast("Could not confirm order.", "error");
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const handleEtaCommit = async (order) => {
    const raw = etaDrafts[order.id];
    if (raw === undefined || raw === "" || Number(raw) === order.estimatedMinutes) return;
    try {
      await updateOrderStatus(order.id, { estimatedMinutes: Number(raw) });
      showToast(`ETA updated for order #${order.token ?? "—"}`);
    } catch (err) {
      console.error(err);
      showToast("Could not update ETA.", "error");
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Remove "${item.name}" from the menu permanently?`)) return;
    try {
      await deleteMenuItem(item.id);
      showToast("Item removed");
    } catch (err) {
      console.error(err);
      showToast("Could not remove item.", "error");
    }
  };

  const handleClearMenu = async () => {
    if (!window.confirm(`Delete all ${menu.length} menu items permanently? This can't be undone.`)) return;
    setClearingMenu(true);
    try {
      await deleteAllMenuItems();
      showToast("Menu cleared");
    } catch (err) {
      console.error(err);
      showToast("Could not clear menu.", "error");
    } finally {
      setClearingMenu(false);
    }
  };

  const handleClearCancelledOrders = async () => {
    if (!window.confirm(`Permanently delete all ${cancelledOrders.length} cancelled orders?`)) return;
    setClearingCancelled(true);
    try {
      await deleteAllCancelledOrders();
      showToast("Cancelled orders cleared");
    } catch (err) {
      console.error(err);
      showToast("Could not clear cancelled orders.", "error");
    } finally {
      setClearingCancelled(false);
    }
  };

  return (
    <>
      <h1 className="admin-title">Cafe</h1>

      <div className="admin-cafe-tabs">
        <button
          type="button"
          className={`admin-cafe-tab ${tab === "menu" ? "active" : ""}`}
          onClick={() => setTab("menu")}
        >
          <Coffee size={15} strokeWidth={2.2} /> Menu
        </button>
        <button
          type="button"
          className={`admin-cafe-tab ${tab === "orders" ? "active" : ""}`}
          onClick={() => setTab("orders")}
        >
          <ShoppingBag size={15} strokeWidth={2.2} /> Orders ({activeOrders.length})
        </button>
        <button
          type="button"
          className={`admin-cafe-tab ${tab === "completed" ? "active" : ""}`}
          onClick={() => setTab("completed")}
        >
          <CheckCircle2 size={15} strokeWidth={2.2} /> Complete ({completedOrders.length})
        </button>
        <button
          type="button"
          className={`admin-cafe-tab ${tab === "cancelled" ? "active" : ""}`}
          onClick={() => setTab("cancelled")}
        >
          <XCircle size={15} strokeWidth={2.2} /> Cancel ({cancelledOrders.length})
        </button>
      </div>

      {tab === "menu" ? (
        <>
          <div className="admin-cafe-toolbar">
            <p style={{ color: "var(--color-subtext)", fontSize: 13.5 }}>
              {menu.length} item{menu.length === 1 ? "" : "s"} on the menu
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              {menu.length > 0 && (
                <Button icon={Trash2} size="sm" variant="danger" loading={clearingMenu} onClick={handleClearMenu}>
                  Clear All
                </Button>
              )}
              <Button icon={Plus} size="sm" onClick={openAddForm}>
                Add Item
              </Button>
            </div>
          </div>

          {menuLoading ? (
            <Skeleton height={220} />
          ) : menu.length === 0 ? (
            <div className="admin-users-card surface-card admin-empty-state">
              <Coffee size={26} strokeWidth={1.8} />
              <p>No menu items yet</p>
              <span>Add your first item to get the Cafe page started.</span>
            </div>
          ) : (
            <div className="admin-cafe-grid">
              {menu.map((item) => (
                <div key={item.id} className={`admin-cafe-item surface-card ${item.available === false ? "unavailable" : ""}`}>
                  <div className="admin-cafe-item-icon">
                    {item.image ? <img src={item.image} alt={item.name} /> : item.icon}
                  </div>
                  <div className="admin-cafe-item-body">
                    <div className="admin-cafe-item-top">
                      <strong>{item.name}</strong>
                      <span>₹{item.price}</span>
                    </div>
                    <p>{item.desc}</p>
                    <span className="admin-cafe-item-category">{item.category}</span>
                  </div>
                  <div className="admin-cafe-item-actions">
                    <button
                      type="button"
                      title={item.available === false ? "Mark available" : "Mark not available"}
                      onClick={() => handleToggleAvailability(item)}
                    >
                      {item.available === false ? <Eye size={15} strokeWidth={2.1} /> : <EyeOff size={15} strokeWidth={2.1} />}
                    </button>
                    <button type="button" title="Edit" onClick={() => openEditForm(item)}>
                      <Pencil size={15} strokeWidth={2.1} />
                    </button>
                    <button type="button" title="Delete" onClick={() => handleDelete(item)} className="danger">
                      <Trash2 size={15} strokeWidth={2.1} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="admin-users-card surface-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <h2>
              {tab === "orders" ? "Active Orders" : tab === "completed" ? "Completed Orders" : "Cancelled Orders"} (
              {visibleOrders.length})
            </h2>
            {tab === "cancelled" && cancelledOrders.length > 0 && (
              <Button
                size="sm"
                variant="danger"
                icon={Trash2}
                loading={clearingCancelled}
                onClick={handleClearCancelledOrders}
              >
                Clear Cancelled
              </Button>
            )}
          </div>

          {ordersLoading ? (
            <Skeleton height={200} />
          ) : visibleOrders.length === 0 ? (
            <div className="admin-empty-state">
              <ShoppingBag size={26} strokeWidth={1.8} />
              <p>{tab === "orders" ? "No active orders" : "Nothing here yet"}</p>
              <span>
                {tab === "orders"
                  ? "New orders from the Cafe page will show up here."
                  : tab === "completed"
                  ? "Orders marked Completed will show up here."
                  : "Orders marked Cancelled will show up here."}
              </span>
            </div>
          ) : (
            <div className="admin-table-scroll">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Location</th>
                  <th>Payment</th>
                  <th>Txn ID</th>
                  <th>Status</th>
                  <th>Placed</th>
                  <th>Phase</th>
                  <th>ETA (min)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => {
                  const phase = resolvePhase(order);
                  const cancelled = phase === "cancelled";
                  const completed = phase === "completed";
                  const orderStatus = order.status || "pending";
                  return (
                    <tr key={order.id}>
                      <td>
                        <strong className="admin-order-token">#{order.token ?? "—"}</strong>
                      </td>
                      <td>{order.userName || order.userContact || "—"}</td>
                      <td className="admin-cell-wrap" title={(order.items || []).map((i) => `${i.name} x${i.qty}`).join(", ")}>
                        {(order.items || []).map((i) => `${i.name} x${i.qty}`).join(", ")}
                      </td>
                      <td>₹{order.total}</td>
                      <td>{formatLocation(order.location)}</td>
                      <td>
                        <span className={`admin-payment-pill ${order.paymentMethod === "qr" ? "qr" : "cash"}`}>
                          {order.paymentMethod === "qr" ? "QR" : "Cash"}
                        </span>
                      </td>
                      <td className="admin-cell-wrap" title={order.paymentMethod === "qr" ? order.transactionId || "" : ""}>
                        {order.paymentMethod === "qr" ? (order.transactionId || "—") : "—"}
                      </td>
                      <td>
                        <span className={`admin-booking-status ${orderStatus}`}>{orderStatus}</span>
                      </td>
                      <td>{formatDate(order.created_at)}</td>
                      <td>
                        <select
                          className="admin-order-phase-select"
                          value={phase}
                          disabled={updatingOrderId === order.id}
                          onChange={(e) => handlePhaseChange(order, e.target.value)}
                        >
                          {ORDER_PHASES.map((p) => (
                            <option key={p} value={p}>{ORDER_PHASE_LABELS[p]}</option>
                          ))}
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          className="admin-order-eta-input"
                          disabled={completed || cancelled}
                          value={etaDrafts[order.id] ?? order.estimatedMinutes ?? ""}
                          onChange={(e) => setEtaDrafts((d) => ({ ...d, [order.id]: e.target.value }))}
                          onBlur={() => handleEtaCommit(order)}
                        />
                      </td>
                      <td className="admin-cell-actions">
                        {orderStatus === "pending" && (
                          <Button
                            size="sm"
                            loading={confirmingOrderId === order.id}
                            onClick={() => handleConfirmOrder(order)}
                          >
                            Confirm
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)}>
        <h2 style={{ marginBottom: 18 }}>{editingItem ? "Edit Item" : "Add Menu Item"}</h2>
        <form className="admin-cafe-form" onSubmit={handleSubmit}>
          <label>Name</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />

          <label>Category</label>
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            {CAFE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label>Price (₹)</label>
          <input
            type="number"
            min="0"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            required
          />

          <label>Description</label>
          <input value={form.desc} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))} />

          <label>Photo (optional)</label>
          <div className="admin-cafe-image-row">
            {form.image && <img src={form.image} alt="" className="admin-cafe-image-preview" />}
            <label className="admin-cafe-upload-btn">
              <ImagePlus size={15} strokeWidth={2.1} />
              {uploadingImage ? "Uploading..." : form.image ? "Change Photo" : "Upload Photo"}
              <input type="file" accept="image/*" onChange={handleImageChange} hidden disabled={uploadingImage} />
            </label>
          </div>

          <label>Emoji Icon (used if no photo)</label>
          <input
            value={form.icon}
            onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
            placeholder="☕"
            maxLength={4}
          />

          <Button type="submit" loading={saving || uploadingImage} className="admin-cafe-form-submit">
            {editingItem ? "Save Changes" : "Add to Menu"}
          </Button>
        </form>
      </Modal>
    </>
  );
}

export default AdminCafe;