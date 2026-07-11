# Engineering Report: test_ecommerce_diagram

**Original Diagram:** test_ecommerce_diagram.png
**Generated At:** 2026-07-02 11:06:34

## 1. Architecture Summary
This architecture represents a modern, resilient e-commerce microservices platform. The system is designed to handle high transaction volumes and read-heavy operations, utilizing an API Gateway to routing traffic to decoupled backend services. Real-time asynchronous communications are managed through RabbitMQ, enabling horizontal scalability of payment processing and inventory updates.

## 2. Workflow Explanation
1. **User Browsing & Cart:** The user interacts with the React Single Page Application (SPA). Product detail reads are served via the Product Catalog Service with Redis caching.
2. **Checkout Initiation:** The SPA calls the Cart & Order Service to create a pending order. Order status transitions to 'unpaid'.
3. **Payment Processing:** The client makes a secure tokenized call to the Stripe API. Upon successful payment, Stripe calls our webhook, which updates the Order Service via RabbitMQ messages. This ensures eventual consistency and prevents database locks during high traffic peaks.
4. **Inventory & Notification:** Once paid, the Inventory Service reduces stock counts and the Notification Service dispatches a transactional confirmation email to the user.

## 3. Technology Stack
- **Frontend:** React.js, Tailwind CSS, Vite, Redux Toolkit
- **Backend:** Python, FastAPI, RabbitMQ (Message Broker), Stripe SDK
- **Database:** PostgreSQL (Primary DB), Redis (Session & Catalog Caching)
- **Devops:** Docker, AWS ECS (Fargate), Nginx API Gateway, GitHub Actions CI/CD

## 4. Components List
- **React Client App** (Frontend SPA): Highly responsive shopping portal, catalog, and checkout flow.
- **Nginx API Gateway** (Reverse Proxy): SSL termination, rate limiting, and request routing to microservices.
- **Auth Service** (Microservice): Issues JWT tokens, manages user accounts, and stores password hashes in postgres.
- **Order Service** (Microservice): Manages order state machines, cart items, and links with payments.
- **Product Catalog Service** (Microservice): Handles product details, categories, and inventory sync (cached with Redis).
- **RabbitMQ** (Message Broker): Asynchronous event broker for order placements, notifications, and inventory updates.

## 5. Suggested APIs
### `POST` /api/v1/auth/register
**Description:** Register a new buyer account.
**Request Body:**
```json
{"username": "buyer", "password": "securepwd123", "email": "buyer@example.com"}
```
**Response Body:**
```json
{"id": 101, "username": "buyer", "created_at": "2026-07-02T12:00:00Z"}
```

### `GET` /api/v1/products
**Description:** Fetch paginated catalog list.
**Request Body:**
```json
None (Query params: page, limit, category)
```
**Response Body:**
```json
{"products": [{"id": "p1", "name": "Blue T-Shirt", "price": 29.99}], "total": 1}
```

### `POST` /api/v1/orders
**Description:** Create a new shopping cart checkout order.
**Request Body:**
```json
{"items": [{"product_id": "p1", "quantity": 2}], "shipping_address": "123 Main St"}
```
**Response Body:**
```json
{"order_id": "ord_90112", "status": "pending", "amount": 59.98}
```

### `POST` /api/v1/payments/stripe-webhook
**Description:** Stripe webhook to process transaction status.
**Request Body:**
```json
{"id": "evt_payment_intent_succeeded", "type": "payment_intent.succeeded", "data": {...}}
```
**Response Body:**
```json
{"received": true}
```

## 6. Database Entities
### Table: `User`
| Column Name | Type/Attributes |
| --- | --- |
| id | INTEGER (PK) |
| username | VARCHAR(50) (UNIQUE) |
| hashed_password | VARCHAR(255) |
| email | VARCHAR(100) |
| created_at | TIMESTAMP |

### Table: `Product`
| Column Name | Type/Attributes |
| --- | --- |
| id | VARCHAR(36) (PK) |
| name | VARCHAR(255) |
| price | DECIMAL(10, 2) |
| stock_quantity | INTEGER |
| category | VARCHAR(100) |

### Table: `Order`
| Column Name | Type/Attributes |
| --- | --- |
| id | VARCHAR(36) (PK) |
| user_id | INTEGER (FK) |
| total_amount | DECIMAL(10, 2) |
| status | VARCHAR(20) -- pending, paid, shipped, cancelled |
| created_at | TIMESTAMP |

