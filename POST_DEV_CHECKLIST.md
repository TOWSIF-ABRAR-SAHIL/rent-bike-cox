## 1. External Account Setup
The AI agent has written the logic, but you must manually configure these services to get the credentials:
- [ ] **Cloudinary:** Create a free account. Go to the dashboard and grab your **Cloud Name**, **API Key**, and **API Secret**.
- [ ] **SSLCommerz:** Register for a [Sandbox Account](https://developer.sslcommerz.com/). You will receive a **Store ID** and **Store Password**.
- [ ] **MongoDB Atlas:** If not using local Mongo, create a free cluster and copy the **Connection String**.

## 2. Environment Variables (`backend/.env`)
Create a `.env` file in the `/backend` directory and populate it:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rentbikecox
JWT_SECRET=your_random_secure_string

# Cloudinary Credentials
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# SSLCommerz (Sandbox)
STORE_ID=your_store_id
STORE_PASS=your_store_password
IS_LIVE=false

# Redirect URLs (Use ngrok/tunnel URLs for local testing)
SUCCESS_URL=http://localhost:5000/api/payment/success
FAIL_URL=http://localhost:5000/api/payment/fail
CANCEL_URL=http://localhost:5000/api/payment/cancel
```

## 3. Database Initialization

- [ ] **Run Admin Seed**:
    
    ```bash
    cd backend
    node scripts/seedAdmin.js
    ```
- [ ] **Check Access:** Log in at `admin@rentbikecox.com` (or your chosen email) to ensure you can access the Admin Dashboard.

## 4. Local Connectivity (Tunneling)
Since SSLCommerz needs to send data back to your machine:
- [ ] **Start Tunnel:** Run `ngrok http 5000` or a Cloudflare Tunnel.
- [ ] **Update URLs:** Replace `localhost:5000` in your `.env` with the public URL provided by the tunnel.

## 5. Testing the Business Logic
1. **Renter Flow:** Register, upload NID, and list a bike (200tk/hr).
2. **Admin Flow:** Log in and "Verify" the new bike so it appears on the home page.
3. **User Flow:** Select the bike for a 6-hour rental.
4. **Validation:** Verify the system asks for exactly **600 TK** (50% of 1,200 TK) as an advance payment.
5. **Invoice:** Complete the test payment and ensure the generated invoice includes the **Fine Policies** (e.g., 1,000/- for beach sand).

## 6. Final Deployment
- [ ] **Backend:** Deploy to Render/Railway (ensure environment variables are added to the provider's dashboard).
- [ ] **Frontend:** Deploy to Vercel (update the API base URL to your production backend link).


