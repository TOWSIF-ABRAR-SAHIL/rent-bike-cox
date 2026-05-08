# Project TODO: Rent Bike Cox's Bazar

This list covers the remaining technical and configuration steps required to move from the current prototype to a production-ready application.

## 1. Environment & API Configuration 🔑
- [ ] **Fill `.env` Variables**: Update `backend/.env` with real credentials for:
  - `CLOUDINARY_CLOUD_NAME`, `API_KEY`, `API_SECRET` (For NID/License/Bike uploads).
  - `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASS` (For real-world payments).
  - `MONGODB_URI` (Point to MongoDB Atlas for production).
- [ ] **Frontend API Base URL**: In `frontend/src/` components, replace hardcoded `http://localhost:5000` with a dynamic environment variable (e.g., `import.meta.env.VITE_API_URL`).

## 2. Administrative Setup 🏗️
- [ ] **Run Seed Script**: Execute `node backend/scripts/seedAdmin.js` to create the initial system administrator.
- [ ] **Admin Dashboard (Packages)**: Implement the UI/Backend for Admins to create and update the "Custom Packages" (1-day, 2-day, 1-week, etc.) mentioned in `RULES.md`. Currently, only the base hourly rate (200 TK) is fully managed.

## 3. Booking Engine Refinement 🏍️
- [ ] **Package Pricing Logic**: Update `backend/controllers/bookingController.js` to calculate totals based on selected packages (e.g., Daily/Weekly rates) instead of only calculating by hour.
- [ ] **Booking Restrictions**: Implement a check to ensure a User's NID and License have been "Approved" or "Verified" by an Admin before allowing the "Confirm Order" button to become active (if strict verification is desired).

## 4. UI/UX Polishing 🎨
- [ ] **Mobile-First Review**: Audit all Tailwind CSS classes to ensure the site is fully responsive on mobile devices (required by `RULES.md`).
- [ ] **Agreement Checkbox**: Add an "I agree to Terms & Conditions" checkbox on the `Checkout` page that explicitly mentions the petrol cost, sand fine (1,000 TK), and liability for damages.
- [ ] **Loading & Error States**: Add better feedback (spinners, toast notifications) during file uploads and payment processing.

## 5. Security & Deployment 🚀
- [ ] **SSL (HTTPS)**: Set up an SSL certificate for the production server. SSLCommerz callbacks (`success_url`, etc.) require a secure connection in live mode.
- [ ] **Production Redirects**: Update `backend/controllers/paymentController.js` success/fail redirect URLs from `localhost:5173` to your production frontend domain.
- [ ] **JWT Expiry**: Adjust token expiry times for better security (currently set to 1 day).

## 6. Testing 🧪
- [ ] **E2E Flow**: Perform a complete test from:
  1. Signup (uploading NID/License).
  2. Renter listing a bike with multi-angle photos.
  3. User booking a bike and completing the SSLCommerz sandbox payment.
  4. Generating and printing the final invoice.
