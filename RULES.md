# Project Manifest: Rent Bike Cox's Bazar

## 1. Tech Stack
*   **Frontend:** React.js (Vite), Tailwind CSS
*   **Backend:** Node.js, Express.js, Helmet, Compression, Rate Limiting
*   **Database:** MongoDB (Mongoose) with indexes
*   **Authentication:** JWT (JSON Web Tokens)
*   **Payments:** SSLCommerz (bKash, Nagad, Bank transfers)
*   **Media Storage:** Cloudinary (multi-angle bike photos + optional video)

## 2. Coding Standards & Architecture
*   Maintain a strict split between `/frontend` and `/backend` directories.
*   Use functional components and React Hooks exclusively.
*   Ensure all UI components are mobile-responsive first via Tailwind CSS.
*   Write clean, modular code. Do not attempt to write the entire application in a single file.
*   Use React.lazy() for route-based code splitting on the frontend.
*   All database models should have appropriate indexes for query performance.

## 3. Global Business Rules & Constraints
*   **Roles:** Admin (can rent bikes & manage platform), Renter (Bike Owner), User (Customer).
*   **Vehicle Categories:** Admin-managed. Default: Bike, Car, Microbus, SUV, Van. New categories can be added from Admin Dashboard.
*   **Base Pricing:** 200 TK per hour. Custom packages (1-day, 2-day, 1-week, monthly) are available and customizable by Admins.
*   **Contact Information:** 01891154443, 01764466757.
*   **Identity Verification:** A valid NID and Driving License are strictly required to confirm any booking.
*   **Payment Policy:**
    *   Advance payment is mandatory.
    *   Short-term rentals (5-6 hours or up to 1 day) require a minimum 50% advance.
    *   Long-term rentals (above 1 day) require a minimum 30% advance.
    *   The "Confirm Order" button must remain disabled until payment is successfully processed.
*   **Security Deposit:** 2,000 TK (cash or documents) required at pickup.
*   **Operational Costs:** The User (Customer) must bear the cost of petrol entirely. The Renter (Owner) does not provide petrol.
*   **Liability:** Most bikes are uninsured. In the event of an accident, the renting User must compensate the Owner for all damages.
*   **Policies Page:** Full legal terms available at `/policies` route.

## 4. Key Policies (Included in Invoices & /policies page)
1.  **Strictly Prohibited:** Taking the bike onto beach sand. Fine: 1,000/- TK.
2.  **Safety:** Driving without a helmet is a legal offense. Max 2 persons per bike. Owner provides the helmet. Lost helmet fine: 2,000/- TK.
3.  **Speed Limit:** Speed must not exceed 50 km/h.
4.  **Boundaries:** Unauthorized travel beyond the Teknaf Marine Drive Zero Point results in a 5,000/- TK fine.
5.  **Responsibility:** The renter is responsible for all accidents, theft, or damage. Traffic laws must be strictly followed.
6.  **Cancellation:** 24+ hours = full refund, 12-24 hours = 50% refund, <12 hours = no refund.
7.  **Insurance:** Most bikes are not insured. Renter assumes full financial responsibility.