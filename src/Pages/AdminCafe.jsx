import { useEffect, useState } from "react";
import { Coffee, Plus, Pencil, Trash2, ShoppingBag, EyeOff, Eye, ImagePlus, Clock, CheckCircle2 } from "lucide-react";
import {
  CAFE_CATEGORIES,
  addMenuItem,
  deleteMenuItem,
  ensureMenuSeeded,
  listenToMenu,
  listenToOrders,
  setMenuItemAvailability,
  updateMenuItem,
  updateOrderStatus,
  uploadMenuItemImage,
} from "../lib/cafeService";
import Modal from "../components/Modal";
import Button from "../components/Button";
import Skeleton from "../components/Skeleton";
import { useToast } from "../contexts/ToastContext";
import "./Admin.css";
import "./AdminCafe.css";

function formatDate(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const emptyForm = { name: "", category: CAFE_CATEGORIES[0], price: "", desc: "", icon: "", image: "" };

function AdminCafe() {
  const { showToast } = useToast();
  const [tab, setTab] = useState("menu"); // "menu" | "orders"

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

  useEffect(() => {
    let unsubMenu = () => {};
    ensureMenuSeeded().finally(() => {
      unsubMenu = listenToMenu((items) => {
        setMenu(items);
        setMenuLoading(false);
      });
    });
    const unsubOrders = listenToOrders((data) => {
      setOrders(data);
      setOrdersLoading(false);
    });
    return () => {
      unsubMenu();
      unsubOrders();
    };
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

  const handleMarkDone = async (order) => {
    setUpdatingOrderId(order.id);
    try {
      await updateOrderStatus(order.id, order.status === "done" ? "placed" : "done");
      showToast(order.status === "done" ? "Order marked as waiting" : "Order marked as done");
    } catch (err) {
      console.error(err);
      showToast("Could not update order status.", "error");
    } finally {
      setUpdatingOrderId(null);
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
          <ShoppingBag size={15} strokeWidth={2.2} /> Orders ({orders.length})
        </button>
      </div>

      {tab === "menu" ? (
        <>
          <div className="admin-cafe-toolbar">
            <p style={{ color: "var(--color-subtext)", fontSize: 13.5 }}>
              {menu.length} item{menu.length === 1 ? "" : "s"} on the menu
            </p>
            <Button icon={Plus} size="sm" onClick={openAddForm}>
              Add Item
            </Button>
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
          <h2>All Orders ({orders.length})</h2>
          {ordersLoading ? (
            <Skeleton height={200} />
          ) : orders.length === 0 ? (
            <div className="admin-empty-state">
              <ShoppingBag size={26} strokeWidth={1.8} />
              <p>No orders yet</p>
              <span>Orders placed from the Cafe page will show up here.</span>
            </div>
          ) : (
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Placed</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const isDone = order.status === "done";
                  return (
                    <tr key={order.id}>
                      <td>{order.userName || order.userContact || "—"}</td>
                      <td>{(order.items || []).map((i) => `${i.name} x${i.qty}`).join(", ")}</td>
                      <td>₹{order.total}</td>
                      <td>
                        <span className={`admin-payment-pill ${order.paymentMethod === "qr" ? "qr" : "cash"}`}>
                          {order.paymentMethod === "qr" ? "QR" : "Cash"}
                        </span>
                      </td>
                      <td>{formatDate(order.created_at)}</td>
                      <td>
                        <span className={`admin-order-status ${isDone ? "done" : "waiting"}`}>
                          {isDone ? <CheckCircle2 size={13} strokeWidth={2.2} /> : <Clock size={13} strokeWidth={2.2} />}
                          {isDone ? "Done" : "Waiting"}
                        </span>
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant={isDone ? "ghost" : "primary"}
                          onClick={() => handleMarkDone(order)}
                          loading={updatingOrderId === order.id}
                        >
                          {isDone ? "Mark Waiting" : "Mark Done"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
