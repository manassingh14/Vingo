## Vingo – Food Delivery Platform

Vingo is a full‑stack food delivery platform with three roles:

- **User**: browse restaurants, add food to cart, place orders (COD / online), track delivery live, rate items.
- **Owner**: create/manage a shop, manage menu items, receive real‑time orders, assign orders to delivery boys.
- **Delivery Boy**: receive nearby delivery assignments, accept one at a time, navigate to customer, complete delivery via OTP, and see earnings analytics.

The project is split into:

- `backend` – Node.js/Express API, MongoDB models, JWT auth, Razorpay, Cloudinary, Nodemailer, Socket.IO.
- `frontend` – React (Vite) SPA with Redux Toolkit, Tailwind, React Router, Leaflet maps, Socket.IO client.

---

## 1. Tech Stack

- **Backend**
  - Node.js, Express
  - MongoDB + Mongoose
  - JWT auth with httpOnly cookies
  - Socket.IO for realtime events
  - Razorpay for online payments
  - Cloudinary for image uploads
  - Nodemailer (Gmail) for OTP emails
  - Multer for file uploads

- **Frontend**
  - React + Vite
  - Redux Toolkit (`user`, `owner`, `map` slices)
  - React Router DOM
  - Axios
  - Firebase Auth (Google sign‑in)
  - Leaflet / React‑Leaflet for maps
  - Recharts for delivery analytics
  - Tailwind‑style utility classes

---

## 2. Project Structure (High Level)

- **Root**
  - `backend/` – REST API, sockets, models, business logic.
  - `frontend/` – React SPA.

- **Backend**
  - `index.js` – Express app bootstrap, Socket.IO server, route mounting, DB connection.
  - `config/db.js` – connects to MongoDB via `MONGODB_URL`.
  - `models/`
    - `user.model.js` – users (roles: `user`, `owner`, `deliveryBoy`) with geo location and socket info.
    - `shop.model.js` – restaurant/shop info, owner, items.
    - `item.model.js` – food items, price, category, veg/non‑veg, rating aggregate.
    - `order.model.js` – order with embedded per‑shop `shopOrders`, status, OTP, Razorpay fields.
    - `deliveryAssignment.model.js` – broadcasted assignments to delivery boys with status.
  - `routes/`
    - `auth.routes.js` – signup, signin, signout, password reset via OTP, Google auth.
    - `user.routes.js` – current user, update location.
    - `shop.routes.js` – create/edit shop, get owner shop, get shops by city.
    - `item.routes.js` – add/edit/delete item, get by id/city/shop, search, rating.
    - `order.routes.js` – place/verify payment, my orders, delivery assignments, status updates, OTP delivery, analytics.
  - `controllers/` – implementation of all business logic.
  - `middlewares/`
    - `isAuth.js` – verifies JWT from cookie and attaches `req.userId`.
    - `multer.js` – saves uploaded images to `backend/public/` before Cloudinary.
  - `utils/`
    - `token.js` – issues signed JWT.
    - `cloudinary.js` – uploads image files then deletes local copy.
    - `mail.js` – Nodemailer transport + helpers for password and delivery OTPs.
  - `socket.js` – central Socket.IO event handling (identity + live location).

- **Frontend**
  - `src/main.jsx` – mounts React app, wraps with `BrowserRouter` and Redux `Provider`.
  - `src/App.jsx` – defines routes, initial data bootstrapping, and Socket.IO connection.
  - `src/redux/`
    - `userSlice.js` – current user, location/city state, cart, orders, search results, socket.
    - `ownerSlice.js` – current shop (`myShopData`).
    - `mapSlice.js` – map coordinates + address for checkout.
  - `src/hooks/` – data‑fetch hooks for current user, geo location, shops/items, orders, and user location updates.
  - `src/pages/` – top‑level screens (auth, home, shop, cart, checkout, orders, tracking, etc.).
  - `src/components/` – dashboards, cards, Nav, delivery tracking map, etc.
  - `firebase.js` – Firebase app + Auth initialization (Google sign‑in).

---

## 3. Running the Project

> Adjust ports if you change them in `.env` or `App.jsx`. The frontend hard‑codes `serverUrl` and the backend CORS/socket config must match.

### 3.1. Backend

From `backend/`:

```bash
npm install
npm run dev
```

Key points:

- Listens on `process.env.PORT || 5000` (set `PORT` to match the `serverUrl` in the frontend, e.g. `8000`).
- CORS and Socket.IO are configured to accept:
  - `origin: "http://localhost:5173"`
  - `credentials: true`

### 3.2. Frontend

From `frontend/`:

```bash
npm install
npm run dev
```

By default Vite runs on `http://localhost:5173`.

The app expects a constant in `App.jsx`:

```js
export const serverUrl = "http://localhost:8000"; // or your backend URL
```

Ensure your backend `PORT` and this `serverUrl` line are consistent.

---

## 4. Environment Variables

### 4.1. Backend (`backend/.env`)

- **Core**
  - `PORT` – backend HTTP & Socket.IO port (e.g. `8000`).
  - `MONGODB_URL` – MongoDB connection string.
  - `JWT_SECRET` – secret for signing/verifying JWT auth cookies.

- **Mail (Nodemailer / Gmail)**
  - `EMAIL` – Gmail address used to send OTPs.
  - `PASS` – app password or Gmail password for the SMTP transport.

- **Cloudinary (image uploads)**
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`

- **Razorpay (online payment)**
  - `RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`

### 4.2. Frontend (`frontend/.env`)

All frontend vars are exposed via `import.meta.env`:

- **Firebase (Google Auth)**
  - `VITE_FIREBASE_APIKEY`

- **Geoapify (geocoding + reverse geocoding)**
  - `VITE_GEOAPIKEY`

- **Razorpay (checkout widget)**
  - `VITE_RAZORPAY_KEY_ID` – used in `CheckOut.jsx` for `window.Razorpay`.

---

## 5. Authentication & Session Flow

### 5.1. Registration & Login (Email/Password)

**Backend**

- `POST /api/auth/signup`
  - Validates:
    - no existing user with same email.
    - password length \(\ge 6\).
    - mobile length \(\ge 10\).
  - Hashes password with `bcrypt`.
  - Creates `User` document with role (`user`/`owner`/`deliveryBoy`).
  - Generates JWT with `genToken(user._id)` (7‑day expiry).
  - Sets **`token` httpOnly cookie**:
    - `httpOnly: true`
    - `sameSite: "strict"`
    - `secure: false` (change to `true` in production with HTTPS).
  - Returns the created user JSON.

- `POST /api/auth/signin`
  - Looks up user by email.
  - Verifies password with `bcrypt.compare`.
  - On success, issues a new JWT cookie (same settings as signup).
  - Returns user JSON.

- `GET /api/auth/signout`
  - Clears the `token` cookie.

**Frontend**

- `SignUp.jsx` / `SignIn.jsx`:
  - Uses `axios.post(..., { withCredentials: true })` so that cookies are sent & received.
  - On success, dispatches `setUserData` in `userSlice` with the returned user object.

- `useGetCurrentUser.jsx`:
  - On initial app load, calls `GET /api/user/current` with `withCredentials: true`.
  - If the cookie is valid, backend reads `req.userId` from JWT and returns user.
  - The hook dispatches `setUserData(result.data)` to bootstrap the session.

- `App.jsx`:
  - Guards routes based on `userData`:
    - unauthenticated users get redirected to `/signin`.
    - authenticated users are redirected away from `/signin` and `/signup`.

### 5.2. Google Authentication

**Frontend**

- Uses Firebase Auth:
  - `GoogleAuthProvider` + `signInWithPopup(auth, provider)`.
  - On Google sign‑in, sends minimal info to backend:
    - `SignIn.jsx` – sends only `email`.
    - `SignUp.jsx` – sends `fullName`, `email`, `role`, `mobile`.

**Backend**

- `POST /api/auth/google-auth`
  - If user with `email` exists, uses that user (login).
  - Otherwise creates a new user with provided data.
  - Issues JWT cookie and returns user JSON (same as email/password flow).

### 5.3. Password Reset via OTP

- **Step 1**: `POST /api/auth/send-otp`
  - Body: `{ email }`.
  - Verifies that user exists.
  - Generates 4‑digit OTP, stores it on user:
    - `resetOtp`
    - `otpExpires` (\+5 minutes)
    - `isOtpVerified = false`
  - Sends email via `sendOtpMail(email, otp)`.

- **Step 2**: `POST /api/auth/verify-otp`
  - Body: `{ email, otp }`.
  - Checks:
    - user exists,
    - `resetOtp == otp`,
    - `otpExpires > Date.now()`.
  - If valid: sets `isOtpVerified = true`, clears OTP fields.

- **Step 3**: `POST /api/auth/reset-password`
  - Body: `{ email, newPassword }`.
  - Requires `user.isOtpVerified === true`.
  - Hashes `newPassword` and stores it; resets `isOtpVerified` to `false`.

**Frontend**

- `ForgotPassword.jsx` drives a 3‑step UI:
  1. Send OTP (step 1).
  2. Verify OTP (step 2).
  3. Reset password (step 3) and navigate back to `/signin`.

---

## 6. Auth Middleware & Current User

- `isAuth.js`:
  - Reads `req.cookies.token`.
  - Uses `jwt.verify(token, JWT_SECRET)` to decode.
  - If verification fails, responds `400` (token not found / not verified).
  - On success: sets `req.userId = decodeToken.userId` and calls `next()`.

- `GET /api/user/current`
  - Requires `isAuth`.
  - Reads `req.userId`, loads user, and returns it.

This is the core link between:

- **JWT in cookie** → **Express middleware** → **`req.userId`** → **controller logic** → **frontend Redux state**.

---

## 7. Roles & High‑Level Feature Flows

### 7.1. Roles

- **User**
  - Browse shops and food items in current city.
  - Add items to cart and manage quantities.
  - Choose delivery location on a map or via address search.
  - Place orders with **COD** or **online payment**.
  - Track orders and see live delivery boy movement.
  - Rate delivered items.

- **Owner**
  - Create or edit owned shop (name, address, image, city/state).
  - Manage menu items: add, edit, delete.
  - See incoming orders for their shop.
  - Update per‑shop order status (pending → preparing → out of delivery).
  - Trigger automatic, nearest‑delivery‑boy assignment.

- **Delivery Boy**
  - Continually share live GPS location.
  - Receive broadcasted order assignments within a radius.
  - Accept one assignment at a time.
  - See current order route (map from own location to customer).
  - Request OTP from customer, verify OTP to mark delivered.
  - See hourly delivery count and calculated earnings for the day.

---

## 8. Location & City Resolution Flow

### 8.1. Updating User Geo Location

- `useUpdateLocation.jsx`:
  - After user is logged in, uses `navigator.geolocation.watchPosition`.
  - On each position update, sends:
    - `POST /api/user/update-location` with `{ lat, lon }` and cookies.

- `updateUserLocation` controller:
  - Updates the logged‑in user’s `location` field:
    - `type: "Point"`
    - `coordinates: [lon, lat]`

- `user.model.js`:
  - Declares `location` as GeoJSON and creates a `2dsphere` index, enabling `$near` queries for delivery boy search.

### 8.2. Detecting City & Human‑Readable Address

- `useGetCity.jsx`:
  - On mount, calls `navigator.geolocation.getCurrentPosition`.
  - Extracts `latitude`, `longitude`.
  - Dispatches `setLocation({ lat, lon })` in `mapSlice`.
  - Calls Geoapify reverse‑geocoding API to get:
    - `city` (or `county` fallback),
    - `state`,
    - address lines.
  - Stores:
    - `currentCity`, `currentState`, `currentAddress` in `userSlice`.
    - `address` in `mapSlice`.

These values are then used for:

- **Filtering shops/items by city** (backend uses case‑insensitive regex).
- **Prefilling checkout location and address**.

---

## 9. Shops & Items Flow

### 9.1. Owner – Shop Management

- **API**
  - `POST /api/shop/create-edit` (auth + `multer.single("image")`)
    - If owner has no shop yet → creates new `Shop`.
    - Else → updates existing `Shop` with new fields (including image if provided).
    - Populates `owner` and `items` and returns the full shop.
  - `GET /api/shop/get-my`
    - Returns the shop belonging to `req.userId`, populated with owner + items.

- **Frontend**
  - `useGetMyShop.jsx`:
    - On login change, calls `/api/shop/get-my`.
    - Dispatches `setMyShopData`.
  - `OwnerDashboard.jsx`:
    - If `myShopData` is `null` → shows a “Add Your Restaurant” CTA.
    - Else → displays shop info and menu, with buttons to edit shop or add items.
  - `CreateEditShop.jsx`:
    - Shows form with `name`, `city`, `state`, `address`, `image`.
    - Prefills from `myShopData` or current city/state/address.
    - Submits multipart `FormData` to `/api/shop/create-edit`.

### 9.2. Owner – Item Management

- **API**
  - `POST /api/item/add-item` – add menu item for owner’s shop.
  - `POST /api/item/edit-item/:itemId` – edit existing item.
  - `GET /api/item/delete/:itemId` – delete item and update `shop.items`.

- **Frontend**
  - `AddItem.jsx` and `EditItem.jsx`:
    - Use `FormData` for `name`, `category`, `foodType`, `price`, `image`.
    - On success, server returns updated shop; component dispatches `setMyShopData`.
  - `OwnerItemCard.jsx`:
    - Shows item details and price.
    - `Edit` navigates to `/edit-item/:itemId`.
    - `Delete` calls `GET /api/item/delete/:id` and updates `myShopData`.

### 9.3. User – Discovering Shops & Items

- **API**
  - `GET /api/shop/get-by-city/:city` – shops in city.
  - `GET /api/item/get-by-city/:city` – all items in shops in city.
  - `GET /api/item/get-by-shop/:shopId` – given shop items.
  - `GET /api/item/search-items?query=&city=` – fuzzy search on item `name` and `category`.

- **Frontend**
  - `useGetShopByCity`, `useGetItemsByCity`:
    - Subscribe to `currentCity` changes.
    - Fetch shops/items and store them in `userSlice`.
  - `UserDashboard.jsx`:
    - Shows categories and uses them to filter `itemsInMyCity` client‑side.
    - Shows “Best Shop in {currentCity}” row.
    - Displays suggested items with `FoodCard`.
  - `Nav.jsx`:
    - Contains search bar.
    - On change of query, calls `/api/item/search-items`.
    - Stores search results in `userSlice.searchItems`.
  - `Shop.jsx`:
    - For a selected shop, fetches `/api/item/get-by-shop/:shopId` to show its menu.

---

## 10. Cart & Checkout Flow

### 10.1. Cart Logic (Frontend)

- `userSlice.cartItems` is an array of:
  - `{ id, name, price, image, shop, quantity, foodType }`

- **Adding to cart**:
  - `FoodCard.jsx`:
    - Local quantity selector.
    - `addToCart` dispatched only if `quantity > 0`.
  - `userSlice.addToCart`:
    - If item already exists in `cartItems`, increment its quantity.
    - Else, push new item.
    - Recomputes `totalAmount` as sum of `price * quantity` for all items.

- **Editing cart**:
  - `CartItemCard.jsx`:
    - `+` and `-` buttons call `updateQuantity`.
    - `remove` button calls `removeCartItem`.
  - `userSlice.updateQuantity`:
    - Adjusts quantity and recomputes `totalAmount`.

### 10.2. Checkout Page & Delivery Address

- `CheckOut.jsx`:
  - Reads:
    - `cartItems` and `totalAmount` from `userSlice`.
    - `location` and `address` from `mapSlice`.
  - Delivery address:
    - User can:
      - drag marker on Leaflet map,
      - click “Current Location” (uses stored `userData.location.coordinates`),
      - or type an address, which is geocoded by Geoapify.
  - Payment method:
    - `cod` (cash on delivery).
    - `online` (Razorpay / card / UPI).
  - Adds conditional delivery fee:
    - if `totalAmount > 500`: free delivery.
    - else: `deliveryFee = 40`.
  - Display order summary and final amount.

### 10.3. Place Order & Payment (Backend)

#### 10.3.1. Placing Order

- `POST /api/order/place-order` (auth required):
  - Body:
    - `cartItems` – list of cart items, each including `shop` and `quantity`.
    - `paymentMethod` – `"cod"` or `"online"`.
    - `deliveryAddress` – `{ text, latitude, longitude }`.
    - `totalAmount` – includes delivery fee logic from frontend.
  - Validates that:
    - `cartItems` is not empty.
    - `deliveryAddress` fields are present.
  - Groups items **by shop** to create `shopOrders`:
    - For each shop:
      - loads `Shop` with `.populate("owner")`.
      - computes `subtotal` for that shop.
      - adds `shopOrderItems` with item details.

  - If `paymentMethod === "online"`:
    - Creates Razorpay order:
      - `amount: Math.round(totalAmount * 100)`.
      - `currency: 'INR'`.
    - Creates `Order` with `payment: false` and `razorpayOrderId`.
    - Returns:
      - `razorOrder` – data needed for Razorpay checkout.
      - `orderId` – internal order ID.

  - If `paymentMethod === "cod"`:
    - Creates `Order` immediately.
    - Populates references for convenience (items, shops, owners, user).
    - Emits real‑time `newOrder` Socket event to each shop owner (see below).
    - Returns the full `Order` document.

#### 10.3.2. Razorpay Payment Verification

- `POST /api/order/verify-payment`
  - Body: `{ razorpay_payment_id, orderId }`.
  - Fetches payment from Razorpay SDK and checks status is `"captured"`.
  - Loads order and sets:
    - `payment = true`.
    - `razorpayPaymentId`.
  - Populates related fields.
  - Emits `newOrder` event for owners (same as COD path).
  - Returns updated `Order`.

**Frontend** (`CheckOut.jsx`):

- If COD:
  - Calls `/place-order`, immediately dispatches `addMyOrder(result.data)` and navigates to `/order-placed`.

- If Online:
  - Calls `/place-order` to get `orderId` and `razorOrder`.
  - Opens `window.Razorpay` with:
    - `key: VITE_RAZORPAY_KEY_ID`.
    - `order_id: razorOrder.id`.
  - On success handler:
    - Calls `/verify-payment` with payment ID + `orderId`.
    - Dispatches `addMyOrder(result.data)` and navigates to `/order-placed`.

---

## 11. Realtime Communication (Socket.IO)

### 11.1. Socket Server Setup

- In `backend/index.js`:
  - `const server = http.createServer(app);`
  - `const io = new Server(server, { cors: { origin: "http://localhost:5173", credentials: true, methods: ["POST", "GET"] } });`
  - `app.set("io", io);` to use inside HTTP controllers.
  - Calls `socketHandler(io)` to register socket events.

### 11.2. Socket Client Setup

- In `App.jsx`:
  - On mount (and when `userData` changes):
    - `const socketInstance = io(serverUrl, { withCredentials: true });`
    - Dispatches `setSocket(socketInstance)` to store it in `userSlice`.
    - On socket `connect`:
      - If `userData` exists, emits:
        - `identity` with `{ userId: userData._id }`.

### 11.3. Identity & Presence

- `socket.js`:
  - On `'connection'`, server listens for:
    - `'identity'`:
      - Updates `User` document:
        - `socketId = socket.id`
        - `isOnline = true`
    - `'disconnect'`:
      - Clears `socketId` and marks `isOnline = false` for user with matching `socketId`.

This allows HTTP controllers to send targeted real‑time events based on a user’s `socketId`.

### 11.4. Delivery Boy Live Location → User Tracking

- **From Delivery Boy side**:
  - `DeliveryBoy.jsx`:
    - Uses `navigator.geolocation.watchPosition`.
    - For each position:
      - Updates local `deliveryBoyLocation` state.
      - Emits `updateLocation` socket event:
        - Payload: `{ latitude, longitude, userId }` (delivery boy’s userId).

- **On the socket server (`socket.js`)**:
  - `'updateLocation'` handler:
    - Updates delivery boy’s `User.location` in MongoDB with the latest point.
    - Emits **global** event `updateDeliveryLocation` with:
      - `{ deliveryBoyId, latitude, longitude }`.

- **On the customer side**:
  - `TrackOrderPage.jsx`:
    - Subscribes to `socket.on('updateDeliveryLocation', ...)`.
    - Maintains `liveLocations` dictionary keyed by `deliveryBoyId`.
    - For each `shopOrder` with an assigned delivery boy and non‑delivered status:
      - Renders `DeliveryBoyTracking` map with:
        - `deliveryBoyLocation` from `liveLocations[deliveryBoyId]` (if available) or from initial DB coordinates.
        - `customerLocation` from order’s `deliveryAddress`.

### 11.5. New Order Notifications for Owners

- In `placeOrder` (COD case) and `verifyPayment`:
  - After populating the order, logic:
    - Loops over each `shopOrder`.
    - For each:
      - Reads `owner.socketId`.
      - If defined, emits over socket:
        - `newOrder` event to that `socketId` with payload:
          - `_id`, `paymentMethod`, `user`, `shopOrders` (for that shop), `createdAt`, `deliveryAddress`, `payment`.

- `MyOrders.jsx` for owner:
  - Listens on:
    - `socket.on('newOrder', (data) => { ... })`
    - If `data.shopOrders.owner._id == userData._id`, inserts the order at the top of `myOrders`.

### 11.6. Order Status Updates → User Realtime Updates

- In `updateOrderStatus` controller:
  - Owner updates status for one `shopOrder` within an `Order`:
    - `pending` → `preparing` → `out of delivery` (and later `delivered` via OTP).
  - After saving, code:
    - Populates `user` (with `socketId`).
    - Determines updated `shopOrder`.
    - If `user.socketId` exists:
      - Emits `update-status` to that socket with:
        - `{ orderId, shopId, status, userId }`.

- `MyOrders.jsx` for user:
  - Listens on:
    - `socket.on('update-status', ({ orderId, shopId, status, userId }) => { ... })`.
    - If `userId == userData._id`, dispatches `updateRealtimeOrderStatus`:
      - Finds order and specific `shopOrder` and updates its `status` in Redux.

- `userSlice.updateRealtimeOrderStatus`:
  - Safely updates nested `shopOrders` status for the correct `shop`.

### 11.7. Broadcasting Assignments to Delivery Boys

When owner sets order status to **`out of delivery`**, if there’s no assignment yet:

1. `updateOrderStatus`:
   - Reads order and finds the relevant `shopOrder`.
   - Computes customer’s delivery point (`order.deliveryAddress`).
   - Finds nearby delivery boys using MongoDB `$near` on `User.location`:
     - `role: "deliveryBoy"`.
     - Max distance: 5000 meters.
   - Filters out busy delivery boys:
     - Those who already have an active `DeliveryAssignment` with `status` not in `["brodcasted", "completed"]`.
   - Creates `DeliveryAssignment` with:
     - `order`, `shop`, `shopOrderId`.
     - `brodcastedTo` list of candidate boy IDs.
     - `status: "brodcasted"`.
   - Sets:
     - `shopOrder.assignment` to assignment ID.
     - `shopOrder.assignedDeliveryBoy` from assignment (if already known).
   - For each **available** delivery boy:
     - Emits a `newAssignment` socket event to their `socketId` with:
       - `assignmentId`, `orderId`, `shopName`, `deliveryAddress`, `items`, `subtotal`.

2. `DeliveryBoy.jsx`:
   - On mount, also manually fetches:
     - `/api/order/get-assignments` – broadcasted assignments for that delivery boy.
     - `/api/order/get-current-order` – currently assigned order, if any.
   - Listens on `socket.on('newAssignment', data => { ... })`:
     - Appends new assignments to local `availableAssignments` state.
   - UI shows available assignments and allows `Accept`:
     - `GET /api/order/accept-order/:assignmentId`.

3. `acceptOrder` controller:
   - Validates that:
     - assignment exists and is still `"brodcasted"`.
     - delivery boy does not already have a non‑completed current assignment.
   - Sets:
     - `assignedTo = req.userId`.
     - `status = "assigned"`.
   - Links the `shopOrder` in the order to this `assignedDeliveryBoy`.

### 11.8. Delivery OTP & Completion

- **Sending OTP**:
  - API: `POST /api/order/send-delivery-otp`
    - Body: `{ orderId, shopOrderId }`.
    - Finds order and specific `shopOrder`.
    - Generates 4‑digit OTP, stores it along with `otpExpires` (+5 minutes).
    - Sends email via `sendDeliveryOtpMail(user, otp)`.

  - Frontend:
    - In `DeliveryBoy.jsx`, clicking “Mark As Delivered”:
      - Calls `/send-delivery-otp` → sets `showOtpBox = true`.

- **Verifying OTP**:
  - API: `POST /api/order/verify-delivery-otp`
    - Body: `{ orderId, shopOrderId, otp }`.
    - Checks that OTP matches and is not expired.
    - Sets:
      - `shopOrder.status = "delivered"`.
      - `shopOrder.deliveredAt = Date.now()`.
    - Deletes the associated `DeliveryAssignment` (marks that job as complete).

  - Frontend:
    - `verifyOtp` in `DeliveryBoy.jsx` calls API, shows success message, and reloads page to refresh state.

### 11.9. Delivery Boy Daily Analytics

- API: `GET /api/order/get-today-deliveries`
  - Finds all orders where:
    - `shopOrders.assignedDeliveryBoy == req.userId`.
    - `shopOrders.status == "delivered"`.
    - `shopOrders.deliveredAt` is today (>= start of the day).
  - Builds an array of `{ hour, count }` based on `deliveredAt` timestamps.

- Frontend:
  - `DeliveryBoy.jsx` calls `/get-today-deliveries`.
  - Renders bar chart via Recharts.
  - Calculates `totalEarning = sum(count * 50)` (rate per delivery is `₹50`).

---

## 12. Orders Listing & Ratings

### 12.1. Fetching “My Orders”

- `GET /api/order/my-orders`
  - For role `"user"`:
    - Finds orders where `order.user == req.userId`.
    - Sorts by `createdAt desc`.
    - Populates:
      - `shopOrders.shop` (name),
      - `shopOrders.owner`,
      - `shopOrders.shopOrderItems.item` (name, image, price).
  - For role `"owner"`:
    - Finds orders where `shopOrders.owner == req.userId`.
    - Sorts by `createdAt desc`.
    - Populates user + items + assigned delivery boy.
    - Maps results to a flattened structure where each item in the list is only the shopOrder belonging to that owner.

- Frontend:
  - `useGetMyOrders.jsx`:
    - Fetches `/api/order/my-orders` when `userData` changes.
    - Stores results via `setMyOrders`.
  - `MyOrders.jsx`:
    - For role `"user"`: renders `UserOrderCard`.
    - For role `"owner"`: renders `OwnerOrderCard`.

### 12.2. Ratings

- API: `POST /api/item/rating`
  - Body: `{ itemId, rating }` where `rating` is 1–5.
  - Validates input and `rating` bounds.
  - For the `Item`:
    - `newCount = oldCount + 1`.
    - `newAverage = (oldAverage * oldCount + rating) / newCount`.
  - Saves updated rating and returns it.

- Frontend:
  - `UserOrderCard.jsx`:
    - For each delivered item, shows a 1–5 star control.
    - Clicking a star calls `/api/item/rating` and stores the chosen rating locally.
  - `FoodCard.jsx`:
    - Displays rating `average` and `count` visually using stars.

---

## 13. Data Models (Conceptual)

### 13.1. User

- `fullName`, `email` (unique), `password?`, `mobile`.
- `role`: `"user" | "owner" | "deliveryBoy"`.
- `location`:
  - GeoJSON `Point` with `[longitude, latitude]`.
  - 2dsphere index for `$near`.
- `socketId`, `isOnline` – for realtime.
- `resetOtp`, `otpExpires`, `isOtpVerified` – password reset state.

### 13.2. Shop

- `name`, `image`, `city`, `state`, `address`.
- `owner` – reference to `User`.
- `items` – array of `Item` references.

### 13.3. Item

- `name`, `image`, `shop` reference.
- `category` – one of fixed strings (Snacks, Main Course, etc.).
- `price`, `foodType` (`veg` / `non veg`).
- `rating`:
  - `average`, `count`.

### 13.4. Order

- `user` – who placed the order.
- `paymentMethod` – `"cod"` or `"online"`.
- `deliveryAddress` – `{ text, latitude, longitude }`.
- `totalAmount`.
- `shopOrders[]`:
  - `shop` – shop reference.
  - `owner` – owner reference.
  - `subtotal`.
  - `shopOrderItems[]` – `{ item, name, price, quantity }`.
  - `status` – `"pending" | "preparing" | "out of delivery" | "delivered"`.
  - `assignment` – ref to `DeliveryAssignment`.
  - `assignedDeliveryBoy` – ref to `User`.
  - `deliveryOtp`, `otpExpires`, `deliveredAt`.
- `payment` – boolean.
- `razorpayOrderId`, `razorpayPaymentId`.

### 13.5. DeliveryAssignment

- `order` – reference to `Order`.
- `shop` – reference to `Shop`.
- `shopOrderId` – identifies which `shopOrder` this assignment is for.
- `brodcastedTo[]` – candidate delivery boy IDs.
- `assignedTo` – chosen delivery boy.
- `status` – `"brodcasted" | "assigned" | "completed"`.
- `acceptedAt`.

---

## 14. Control Flow Summary (End‑to‑End Examples)

### 14.1. A Typical User Order (COD)

1. User signs in → JWT cookie set.
2. On load, `useGetCurrentUser` pulls `/user/current` and populates `userData`.
3. `useGetCity` gets geolocation and city; `useGetShopByCity` and `useGetItemsByCity` fetch city‑based data.
4. User browses `UserDashboard` and `Shop` pages, adds items via `FoodCard` (updating Redux cart and total).
5. On `/cart`, they verify items and proceed to `/checkout`.
6. On `/checkout`, they confirm address on map or via text, choose **COD**, and click “Place Order”.
7. Frontend calls `/order/place-order` with grouped cart payload.
8. Backend creates `Order`, populates, and emits `newOrder` to each relevant shop owner via Socket.IO.
9. Owner sees real‑time `newOrder` in “My Orders”.
10. Owner changes status from `pending` → `preparing` → `out of delivery` (triggering assignment flow).
11. When `status` changes, backend emits `update-status` to user’s `socketId`.
12. User sees status updates in `MyOrders` via Redux state updates.
13. Delivery boy accepts assignment, travels to customer, and completes via OTP; status transitions to `delivered`.
14. User sees `Delivered` status and can rate items.

### 14.2. Live Tracking

1. Delivery boy’s device sends continuous `updateLocation` socket events to server.
2. Server updates DB and emits `updateDeliveryLocation` to all connected clients.
3. Customer opens `/track-order/:orderId`:
   - Page fetches full order and shopOrders.
   - Subscribes to `updateDeliveryLocation`.
4. For each `shopOrder` with assigned delivery boy and status not `delivered`:
   - The map (`DeliveryBoyTracking`) is rendered with current live coordinates.
5. As new location events arrive, markers and polylines update automatically.

---

## 15. Notes & Improvements

- **Security / Production**
  - Set `secure: true` on cookies and use HTTPS in production.
  - Move hard‑coded URLs/ports into environment variables.
  - Add rate limiting and more robust validation on all endpoints.
- **Reliability**
  - Improve error handling in Socket.IO listeners (currently mostly `console.log`).
  - Handle cases where geolocation fails or permissions are denied.
- **UX**
  - Add order cancellation, refunds for online payments, and notifications.
  - Provide UI indication when no delivery boys are available for a shop.

This README intentionally mirrors the real code structure and network flows so you can quickly understand, extend, or refactor any part of Vingo.

