# Rent Bike Cox's Bazar - MERN Stack

A motorcycle and car rental platform specifically designed for Cox's Bazar, featuring role-based access, identity verification, and real-time payments.

## Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/zaheen4/rent-bike-cox.git
cd rent-bike-cox
```

### 2. Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
4. Fill in the required values in `.env` (Cloudinary, SSLCommerz, MongoDB, etc.).
5. Run the seed script to create an admin:
   ```bash
   node scripts/seedAdmin.js
   ```
6. Start the server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
4. Start the frontend:
   ```bash
   npm run dev
   ```

## Key Rules & Constraints
Refer to `RULES.md` for detailed business logic, fine policies, and operational constraints.
