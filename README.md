# 🏟️ AltCafe — Turf Booking & Cafe Ordering Platform

A full-stack web app that lets people book a turf, order from an in-house cafe menu, earn referral rewards, and manage everything through a dedicated admin panel — all backed by Firebase in real time.

Built with **React 19 + Vite**, **Firebase (Auth, Firestore)**, and **Recharts** for data visualization.

🔗 **Live site:** [altcafe.vercel.app](https://altcafe.vercel.app/)

---

## ✨ Features

### For users
- **Phone/email login** with country-code support, backed by Firebase Auth
- **Turf booking** — browse turfs with photos, pick a date & time slot from a live calendar, pay via wallet credit + QR payment
- **Cafe ordering** — browse a categorized menu, add items to cart, place and track orders
- **Wallet** — track balance, referral bonuses, and full transaction history
- **Referral system** — every user gets a unique referral code; successful referrals credit their wallet automatically
- **Reviews** — leave and view ratings for both the turf and the cafe
- **Order/booking history**, editable profile, and an About Us page

### For admins
- **Dashboard** with live stats (users, bookings, orders, revenue)
- **User management** — search and browse every registered user, their referral activity, and wallet balance
- **Turf management**
  - Live booking calendar per turf with lock/unlock slots
  - Three-tab workflow: **Booking → Done → Cancel**
  - Upload/remove turf photos
  - **Per-turf editable pricing** — set a custom price for each turf independently
  - Bulk-clear cancelled bookings before going live
- **Cafe management**
  - Full menu CRUD (add/edit/delete items, toggle availability, upload images)
  - Three-tab order workflow: **Orders → Completed → Cancelled**
  - Bulk-clear the menu or cancelled orders in one click
- **Wallet & income dashboard**
  - Total income broken down by **Turf vs Cafe**
  - Monthly income trend chart and income-split visualization (Recharts)
  - Full wallet transaction ledger across all users
- **Reviews moderation** — view every review left across the app and remove any of them
- **Rewards & referral settings**, editable About Us content, and general site settings
- **Real-time notifications** — new orders/bookings trigger a sound + badge in the sidebar the moment they come in

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, Vite |
| Backend / DB | Firebase Authentication, Cloud Firestore |
| Image hosting | imgbb API |
| Charts | Recharts |
| Icons | Lucide React |
| QR codes | react-qr-code |

---

## 📂 Project Structure

```
src/
├── Components/    # Reusable UI (Sidebar, Buttons, Modals, Skeletons, etc.)
├── contexts/      # React context providers (e.g. Toast notifications)
├── layouts/       # Route layouts (AppLayout, AdminLayout)
├── lib/           # Firebase service layer (booking, cafe, user, review, admin logic)
├── Pages/         # Route-level pages (user-facing + admin)
├── styles/        # Shared theme/CSS variables
├── firebase.js    # Firebase app initialization
├── App.jsx        # Route definitions
└── main.jsx       # App entry point
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Firebase project with **Authentication** and **Firestore** enabled
- An [imgbb](https://api.imgbb.com/) API key (for image uploads)

### 1. Clone & install
```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
npm install
```

### 2. Configure environment variables
Create a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_IMGBB_API_KEY=your_imgbb_key
```

### 3. Set up Firestore
- Enable **Email/Password** (or your preferred method) sign-in in Firebase Authentication
- Create any Firestore composite indexes it asks for — Firestore prints a direct console link in the browser error the first time a query needs one
- Configure Firestore **Security Rules** so admin accounts can read/write the `bookings`, `cafe_orders`, `menu_items`, `reviews`, `users`, and `turf_meta` collections

### 4. Run locally
```bash
npm run dev
```

### 5. Build for production
```bash
npm run build
npm run preview   # preview the production build locally
```

---

## 🔑 Admin Access

Admin access is controlled via `src/lib/adminConfig.js` — add an admin's email there (or the equivalent Firestore-backed allowlist) to grant them access to `/admin/*` routes. Any signed-in user without admin access is automatically redirected back to their dashboard.

---

## 🗺️ Routes

| User-facing | Admin panel |
|---|---|
| `/login` | `/admin/users` |
| `/dashboard` | `/admin/bookings` (Turf) |
| `/booking` | `/admin/cafe` |
| `/cafe` | `/admin/wallet` |
| `/wallet` | `/admin/reviews` |
| `/history` | `/admin/rewards` |
| `/reviews` | `/admin/about-us` |
| `/profile` | `/admin/settings` |
| `/about-us` | |

---

## 📄 License

This project is private/unlicensed unless stated otherwise by the repository owner.
