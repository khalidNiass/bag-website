# Vercel Deployment Guide

Your backend has been converted to Vercel Serverless Functions. Follow these steps to deploy:

## 1. Set Environment Variables on Vercel

Go to your Vercel project settings → Environment Variables and add:

- **GOOGLE_WEB_APP_URL**: Your Google Apps Script URL
- **PAYSTACK_SECRET_KEY**: Your Paystack secret key
- **SESSION_SECRET**: A random secret string
- **MAIL_USER**: Your email for notifications
- **MAIL_PASS**: Your email app password
- **ADMIN_USER**: Admin username
- **ADMIN_PASS**: Admin password (or use ADMIN_PASS_HASH)
- **FRONTEND_URL**: Your frontend URL (e.g., https://bag-website-six.vercel.app)
- **MAIL_TO**: Where to send order notifications (optional)
- **MAIL_SERVICE**: Email service (default: gmail)

## 2. API Endpoints

All endpoints are now serverless functions in the `/api` folder:

- `GET /api/products` - Fetch products from Google Sheets
- `POST /api/products` - Add/Edit/Delete products
- `GET /api/sheets/all` - Fetch all data
- `POST /api/sheets/orders` - Record order
- `PATCH /api/sheets/orders/status` - Update order status
- `DELETE /api/sheets/orders/:ref` - Delete order
- `POST /api/sheets/products` - Add product
- `PUT /api/sheets/products/:id` - Edit product
- `DELETE /api/sheets/products/:id` - Delete product
- `POST /api/subscribe` - Newsletter subscription
- `POST /api/pay` - Initialize Paystack payment
- `GET /api/verify` - Verify payment

## 3. Local Development

To test locally before deploying:

```bash
npm install
# Create .env file with required variables
vercel dev
```

Then access http://localhost:3000

## 4. Deploy to Vercel

```bash
git add .
git commit -m "Convert to Vercel serverless functions"
git push
```

Vercel will automatically deploy when you push to your main branch.

## 5. Troubleshooting

- **404 errors**: Ensure environment variables are set in Vercel dashboard
- **CORS issues**: Already handled in utils.js
- **Payment redirect**: Make sure FRONTEND_URL is set correctly
- **Email not sending**: Check MAIL_USER, MAIL_PASS, and email service settings

## 6. Frontend URL Updates

These files have been updated to use Vercel API:
- `/public/script.js`
- `/public/shop.js`
- `/public/admin.js`

Change the domain from `bag-website-six.vercel.app` if your project uses a different URL.
