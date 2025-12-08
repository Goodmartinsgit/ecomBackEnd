# E-Commerce API Documentation

## Overview
Complete REST API for the e-commerce platform with authentication, product management, cart, orders, payments, and more.

## Base URL
- Development: `http://localhost:5000`
- Production: `https://api.ecommerce.com`

## Interactive Documentation
Access Swagger UI at: `http://localhost:5000/api-docs`

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Quick Start

### 1. Register User
```bash
POST /api/users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890"
}
```

### 2. Login
```bash
POST /api/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

### 3. Browse Products
```bash
GET /api/products?category=1&minPrice=10&maxPrice=100
```

### 4. Add to Cart
```bash
POST /api/cart
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": 1,
  "quantity": 2,
  "size": "M",
  "color": "Blue"
}
```

### 5. Create Order
```bash
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "addressId": 1,
  "paymentMethod": "flutterwave"
}
```

### 6. Initialize Payment
```bash
POST /api/payment/initialize
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 150.00,
  "email": "user@example.com",
  "orderId": 1
}
```

## API Endpoints

### Users & Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/users/register` | Register new user | No |
| POST | `/api/users/login` | Login user | No |
| GET | `/api/users/profile` | Get user profile | Yes |
| PUT | `/api/users/profile` | Update profile | Yes |
| POST | `/api/users/verify-email` | Verify email | No |
| POST | `/api/users/forgot-password` | Request password reset | No |
| POST | `/api/users/reset-password` | Reset password | No |

### Products
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/products` | Get all products | No |
| GET | `/api/products/{id}` | Get product by ID | No |
| POST | `/api/products` | Create product | Admin |
| PUT | `/api/products/{id}` | Update product | Admin |
| DELETE | `/api/products/{id}` | Delete product | Admin |

### Categories
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/categories` | Get all categories | No |
| GET | `/api/categories/{id}` | Get category by ID | No |
| POST | `/api/categories` | Create category | Admin |
| PUT | `/api/categories/{id}` | Update category | Admin |
| DELETE | `/api/categories/{id}` | Delete category | Admin |

### Cart
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/cart` | Get user cart | Yes |
| POST | `/api/cart` | Add item to cart | Yes |
| PUT | `/api/cart/{productId}` | Update cart item | Yes |
| DELETE | `/api/cart/{productId}` | Remove cart item | Yes |
| DELETE | `/api/cart` | Clear cart | Yes |

### Orders
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/orders` | Get user orders | Yes |
| GET | `/api/orders/{id}` | Get order by ID | Yes |
| POST | `/api/orders` | Create order | Yes |
| PATCH | `/api/orders/{id}` | Update order status | Admin |
| POST | `/api/orders/{id}/cancel` | Cancel order | Yes |

### Payment
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/payment/initialize` | Initialize payment | Yes |
| GET | `/api/payment/verify` | Verify payment | Yes |

### Addresses
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/addresses` | Get user addresses | Yes |
| POST | `/api/addresses` | Add address | Yes |
| PUT | `/api/addresses/{id}` | Update address | Yes |
| DELETE | `/api/addresses/{id}` | Delete address | Yes |
| PATCH | `/api/addresses/{id}/default` | Set default address | Yes |

### Wishlist
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/wishlist` | Get wishlist | Yes |
| POST | `/api/wishlist` | Add to wishlist | Yes |
| DELETE | `/api/wishlist/{productId}` | Remove from wishlist | Yes |

### Reviews
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/reviews/product/{productId}` | Get product reviews | No |
| POST | `/api/reviews/product/{productId}` | Add review | Yes |
| PUT | `/api/reviews/{id}` | Update review | Yes |
| DELETE | `/api/reviews/{id}` | Delete review | Yes |

## Query Parameters

### Products Filtering
- `category` - Filter by category ID
- `search` - Search in name/description
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `isBestSeller` - Filter bestsellers (true/false)
- `isNewArrival` - Filter new arrivals (true/false)

Example:
```
GET /api/products?category=1&minPrice=20&maxPrice=100&isBestSeller=true
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## Rate Limiting
- General endpoints: 100 requests per 15 minutes
- Authentication endpoints: 5 requests per 15 minutes
- Password reset: 3 requests per hour

## File Uploads
For endpoints accepting file uploads (products, categories), use `multipart/form-data`:

```bash
POST /api/products
Authorization: Bearer <token>
Content-Type: multipart/form-data

name=Product Name
price=99.99
images=@/path/to/image1.jpg
images=@/path/to/image2.jpg
```

## Testing with cURL

### Register
```bash
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","firstName":"Test","lastName":"User"}'
```

### Login
```bash
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Get Products
```bash
curl http://localhost:5000/api/products
```

### Add to Cart
```bash
curl -X POST http://localhost:5000/api/cart \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId":1,"quantity":2}'
```

## Environment Variables
Required environment variables in `.env`:
```env
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET_KEY=your-secret-key
FLW_SECRET_KEY=your-flutterwave-secret
PORT=5000
FRONTEND_URL=http://localhost:5173
```

## Support
For issues or questions, contact: support@ecommerce.com
