# Business Rules — Rent Bike Cox's Bazar

## Global Business Rules & Constraints
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

## Key Policies (Included in Invoices & /policies page)
1.  **Strictly Prohibited:** Taking the bike onto beach sand. Fine: 1,000/- TK.
2.  **Safety:** Driving without a helmet is a legal offense. Max 2 persons per bike. Owner provides the helmet. Lost helmet fine: 2,000/- TK.
3.  **Speed Limit:** Speed must not exceed 50 km/h.
4.  **Boundaries:** Unauthorized travel beyond the Teknaf Marine Drive Zero Point results in a 5,000/- TK fine.
5.  **Responsibility:** The renter is responsible for all accidents, theft, or damage. Traffic laws must be strictly followed.
6.  **Cancellation:** 24+ hours = full refund, 12-24 hours = 50% refund, <12 hours = no refund.
7.  **Insurance:** Most bikes are not insured. Renter assumes full financial responsibility.