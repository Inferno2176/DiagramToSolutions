import time
from typing import Dict, Any

def analyze_architecture(ocr_text: str) -> Dict[str, Any]:
    """
    Mock LLM service that simulates analyzing OCR text to generate structured engineering documentation.
    """
    time.sleep(3)
    
    if "ecommerce" in ocr_text.lower() or "shop" in ocr_text.lower() or "stripe" in ocr_text.lower():
        return {
            "architecture_summary": (
                "This architecture represents a modern, resilient e-commerce microservices platform. "
                "The system is designed to handle high transaction volumes and read-heavy operations, utilizing an API "
                "Gateway to routing traffic to decoupled backend services. Real-time asynchronous communications "
                "are managed through RabbitMQ, enabling horizontal scalability of payment processing and inventory updates."
            ),
            "workflow_explanation": (
                "1. **User Browsing & Cart:** The user interacts with the React Single Page Application (SPA). "
                "Product detail reads are served via the Product Catalog Service with Redis caching.\n"
                "2. **Checkout Initiation:** The SPA calls the Cart & Order Service to create a pending order. "
                "Order status transitions to 'unpaid'.\n"
                "3. **Payment Processing:** The client makes a secure tokenized call to the Stripe API. Upon successful payment, "
                "Stripe calls our webhook, which updates the Order Service via RabbitMQ messages. "
                "This ensures eventual consistency and prevents database locks during high traffic peaks.\n"
                "4. **Inventory & Notification:** Once paid, the Inventory Service reduces stock counts and the Notification "
                "Service dispatches a transactional confirmation email to the user."
            ),
            "tech_stack": {
                "frontend": ["React.js", "Tailwind CSS", "Vite", "Redux Toolkit"],
                "backend": ["Python", "FastAPI", "RabbitMQ (Message Broker)", "Stripe SDK"],
                "database": ["PostgreSQL (Primary DB)", "Redis (Session & Catalog Caching)"],
                "devops": ["Docker", "AWS ECS (Fargate)", "Nginx API Gateway", "GitHub Actions CI/CD"]
            },
            "components": [
                {"name": "React Client App", "type": "Frontend SPA", "description": "Highly responsive shopping portal, catalog, and checkout flow."},
                {"name": "Nginx API Gateway", "type": "Reverse Proxy", "description": "SSL termination, rate limiting, and request routing to microservices."},
                {"name": "Auth Service", "type": "Microservice", "description": "Issues JWT tokens, manages user accounts, and stores password hashes in postgres."},
                {"name": "Order Service", "type": "Microservice", "description": "Manages order state machines, cart items, and links with payments."},
                {"name": "Product Catalog Service", "type": "Microservice", "description": "Handles product details, categories, and inventory sync (cached with Redis)."},
                {"name": "RabbitMQ", "type": "Message Broker", "description": "Asynchronous event broker for order placements, notifications, and inventory updates."}
            ],
            "suggested_apis": [
                {
                    "method": "POST",
                    "path": "/api/v1/auth/register",
                    "description": "Register a new buyer account.",
                    "request_body": "{\"username\": \"buyer\", \"password\": \"securepwd123\", \"email\": \"buyer@example.com\"}",
                    "response_body": "{\"id\": 101, \"username\": \"buyer\", \"created_at\": \"2026-07-02T12:00:00Z\"}"
                },
                {
                    "method": "GET",
                    "path": "/api/v1/products",
                    "description": "Fetch paginated catalog list.",
                    "request_body": "None (Query params: page, limit, category)",
                    "response_body": "{\"products\": [{\"id\": \"p1\", \"name\": \"Blue T-Shirt\", \"price\": 29.99}], \"total\": 1}"
                },
                {
                    "method": "POST",
                    "path": "/api/v1/orders",
                    "description": "Create a new shopping cart checkout order.",
                    "request_body": "{\"items\": [{\"product_id\": \"p1\", \"quantity\": 2}], \"shipping_address\": \"123 Main St\"}",
                    "response_body": "{\"order_id\": \"ord_90112\", \"status\": \"pending\", \"amount\": 59.98}"
                },
                {
                    "method": "POST",
                    "path": "/api/v1/payments/stripe-webhook",
                    "description": "Stripe webhook to process transaction status.",
                    "request_body": "{\"id\": \"evt_payment_intent_succeeded\", \"type\": \"payment_intent.succeeded\", \"data\": {...}}",
                    "response_body": "{\"received\": true}"
                }
            ],
            "database_entities": [
                {
                    "name": "User",
                    "columns": [
                        {"name": "id", "type": "INTEGER (PK)"},
                        {"name": "username", "type": "VARCHAR(50) (UNIQUE)"},
                        {"name": "hashed_password", "type": "VARCHAR(255)"},
                        {"name": "email", "type": "VARCHAR(100)"},
                        {"name": "created_at", "type": "TIMESTAMP"}
                    ]
                },
                {
                    "name": "Product",
                    "columns": [
                        {"name": "id", "type": "VARCHAR(36) (PK)"},
                        {"name": "name", "type": "VARCHAR(255)"},
                        {"name": "price", "type": "DECIMAL(10, 2)"},
                        {"name": "stock_quantity", "type": "INTEGER"},
                        {"name": "category", "type": "VARCHAR(100)"}
                    ]
                },
                {
                    "name": "Order",
                    "columns": [
                        {"name": "id", "type": "VARCHAR(36) (PK)"},
                        {"name": "user_id", "type": "INTEGER (FK)"},
                        {"name": "total_amount", "type": "DECIMAL(10, 2)"},
                        {"name": "status", "type": "VARCHAR(20) -- pending, paid, shipped, cancelled"},
                        {"name": "created_at", "type": "TIMESTAMP"}
                    ]
                }
            ]
        }
    elif "chat" in ocr_text.lower() or "websocket" in ocr_text.lower() or "messenger" in ocr_text.lower():
        return {
            "architecture_summary": (
                "This architecture outlines a high-throughput, low-latency real-time chat application. "
                "It separates RESTful configurations (user metadata, login) from WebSocket-based real-time "
                "message delivery. A Redis memory store is utilized to keep track of active user connections "
                "(presence management) across multiple horizontally-scaled WebSocket nodes."
            ),
            "workflow_explanation": (
                "1. **Authentication:** The user logs in via the Express/HTTP router and retrieves a JWT token.\n"
                "2. **WebSocket Handshake:** The client establishes a WebSocket connection with the Socket.io server, "
                "passing the JWT token for auth validation.\n"
                "3. **Presence:** The client's active status is written to Redis (`user:presence:active`).\n"
                "4. **Sending a Message:** When User A sends a message to User B, the message is sent over the WS connection. "
                "The server writes the message to MongoDB for persistent history, and queries Redis to locate User B's "
                "active server node. If online, the server pushes the message to User B instantly. If offline, "
                "it posts an event to Kafka, triggering the Push Notification Service via Firebase Cloud Messaging."
            ),
            "tech_stack": {
                "frontend": ["Next.js", "Tailwind CSS", "Socket.io-client", "Zustand"],
                "backend": ["Node.js (Express)", "Socket.io", "Kafka", "FCM SDK"],
                "database": ["MongoDB (Chat History)", "Redis (Presence & Connection registry)"],
                "devops": ["AWS ALB (Load Balancer with Sticky Sessions)", "Docker", "AWS ECS", "Kubernetes"]
            },
            "components": [
                {"name": "Next.js Web App", "type": "Frontend SPA", "description": "Interactive chat UI supporting lists, message inputs, presence circles, and typing indicators."},
                {"name": "Load Balancer", "type": "AWS ALB", "description": "Balances connections with sticky-session routing (essential for keeping WebSocket handshakes stable)."},
                {"name": "WebSocket Server Cluster", "type": "Node.js (Socket.io)", "description": "Handles persistent socket pipes, routing events, and presence updates."},
                {"name": "Message API", "type": "REST Server", "description": "Deals with contact searches, history pagination, profile updates, and JWT authorization."},
                {"name": "Redis Cluster", "type": "In-Memory Store", "description": "Stores user routing maps (e.g. User A is on Server Node 3) and presence states."}
            ],
            "suggested_apis": [
                {
                    "method": "POST",
                    "path": "/api/chats/create",
                    "description": "Create a 1-on-1 or group chat room.",
                    "request_body": "{\"participants\": [12, 45], \"is_group\": false}",
                    "response_body": "{\"chat_id\": \"room_88a\", \"created_at\": \"2026-07-02T12:00:00Z\"}"
                },
                {
                    "method": "GET",
                    "path": "/api/chats/{chat_id}/messages",
                    "description": "Fetch paginated message logs.",
                    "request_body": "None (Query params: before_timestamp, limit)",
                    "response_body": "{\"messages\": [{\"id\": \"msg_1\", \"sender\": 12, \"text\": \"Hey!\"}], \"has_more\": true}"
                }
            ],
            "database_entities": [
                {
                    "name": "User",
                    "columns": [
                        {"name": "id", "type": "INTEGER (PK)"},
                        {"name": "username", "type": "STRING"},
                        {"name": "status_message", "type": "STRING"},
                        {"name": "last_seen", "type": "TIMESTAMP"}
                    ]
                },
                {
                    "name": "Message (NoSQL Document)",
                    "columns": [
                        {"name": "_id", "type": "ObjectId (PK)"},
                        {"name": "chat_id", "type": "String (Index)"},
                        {"name": "sender_id", "type": "Int"},
                        {"name": "content", "type": "String"},
                        {"name": "attachments", "type": "Array"},
                        {"name": "timestamp", "type": "Date"}
                    ]
                }
            ]
        }
    elif "analytics" in ocr_text.lower() or "data" in ocr_text.lower() or "spark" in ocr_text.lower():
        return {
            "architecture_summary": (
                "This is a high-volume, real-time analytics data pipeline. "
                "The design is optimized for massive data ingestion rates and reliable schema transformations, "
                "handling telemetry data from IoT units and web analytics SDKs, culminating in a Snowflake warehouse "
                "for BI reporting."
            ),
            "workflow_explanation": (
                "1. **Ingestion:** Devices push telemetry packets via HTTPS to Kinesis Firehose.\n"
                "2. **Raw Storage:** Kinesis buffers events and dumps them in batch formats into AWS S3 raw buckets (Data Lake).\n"
                "3. **Processing:** Apache Spark periodically reads raw data, cleanses JSON formats, enforces schemas, "
                "and writes optimized Parquet outputs to the S3 Cleaned bucket.\n"
                "4. **Load & Transform:** Snowflake loads clean Parquet data via Snowpipe. DBT schedules queries "
                "every hour to compile aggregates and user-level session counts.\n"
                "5. **Visualization:** Metabase/Tableau dashboards execute read-only queries against Snowflake metrics tables."
            ),
            "tech_stack": {
                "frontend": ["Metabase Dashboards", "React Embeds"],
                "backend": ["Python", "PySpark", "DBT Core", "Apache Airflow (DAGs)"],
                "database": ["AWS S3 (Data Lake)", "Snowflake (Data Warehouse)", "AWS Glue Data Catalog"],
                "devops": ["AWS Kinesis Firehose", "Terraform", "AWS EMR (Elastic MapReduce)"]
            },
            "components": [
                {"name": "AWS Kinesis", "type": "Streaming Ingestion", "description": "Ingests data packets with autoscaling, buffering before writing to S3."},
                {"name": "S3 Data Lake", "type": "Object Storage", "description": "Houses raw, cleaned, and aggregated datasets in partition-structured paths."},
                {"name": "EMR Spark Cluster", "type": "Distributed Processor", "description": "Performs distributed memory-efficient schema enforcement and aggregations."},
                {"name": "Snowflake DW", "type": "Data Warehouse", "description": "Separates computing and storage, providing extremely fast SQL analytical queries."}
            ],
            "suggested_apis": [
                {
                    "method": "POST",
                    "path": "/api/v1/telemetry/event",
                    "description": "Send event payload from device.",
                    "request_body": "{\"device_id\": \"d-88\", \"event_type\": \"click\", \"payload\": {...}}",
                    "response_body": "{\"status\": \"ingested\", \"event_id\": \"evt_7b1981\"}"
                }
            ],
            "database_entities": [
                {
                    "name": "Fact_Events",
                    "columns": [
                        {"name": "event_key", "type": "VARCHAR(36) (PK)"},
                        {"name": "device_id", "type": "VARCHAR(50)"},
                        {"name": "event_timestamp", "type": "TIMESTAMP_NTZ"},
                        {"name": "event_type", "type": "VARCHAR(50)"},
                        {"name": "properties_json", "type": "VARIANT"}
                    ]
                },
                {
                    "name": "Dim_Devices",
                    "columns": [
                        {"name": "device_key", "type": "VARCHAR(50) (PK)"},
                        {"name": "model", "type": "VARCHAR(100)"},
                        {"name": "os_version", "type": "VARCHAR(20)"},
                        {"name": "first_registered_at", "type": "TIMESTAMP"}
                    ]
                }
            ]
        }
    else:
        return {
            "architecture_summary": (
                "This layout displays a standard, highly secure, and responsive 3-tier web application architecture. "
                "Traffic is proxied through a CDN for protection and static assets caching, then routed via a Load Balancer "
                "to FastAPI application servers. Background long-running tasks are offloaded to Celery workers "
                "using Redis as a message broker to keep the API server highly responsive."
            ),
            "workflow_explanation": (
                "1. **DNS & CDN Routing:** User requests are received by Cloudflare, serving cached files (HTML, CSS, JS) "
                "and filtering out malicious requests.\n"
                "2. **API Requests:** Application requests are forwarded to the Load Balancer, which routes requests to "
                "healthy FastAPI web servers.\n"
                "3. **Authentication:** FastAPI handles user authentication by validating JWT signatures.\n"
                "4. **Database Operations:** Normal CRUD operations read/write from/to the PostgreSQL database.\n"
                "5. **Asynchronous Tasks:** For slow tasks (e.g. PDF report compilations, outbound emails), FastAPI sends "
                "a job description to Redis. A background Celery worker picks up the job and writes the results "
                "directly to PostgreSQL upon completion."
            ),
            "tech_stack": {
                "frontend": ["React.js", "Tailwind CSS", "HTML5", "Vite"],
                "backend": ["Python", "FastAPI", "Celery", "Pydantic"],
                "database": ["PostgreSQL (Primary Database)", "Redis (Task Queue & Cache)"],
                "devops": ["Cloudflare CDN", "AWS Application Load Balancer", "AWS EC2 Auto Scaling", "Docker"]
            },
            "components": [
                {"name": "React Frontend", "type": "Client SPA", "description": "Single-page application containing clean, componentized layout routes."},
                {"name": "FastAPI Server", "type": "Web Server", "description": "Lightweight, highly performant web framework serving JSON responses and hosting auth routing."},
                {"name": "Redis Cache", "type": "In-memory database", "description": "Acts as the message broker for Celery queues and temporary key storage."},
                {"name": "Celery Workers", "type": "Background Worker", "description": "Asynchronous process pool that executes compute-intensive tasks outside the HTTP loop."},
                {"name": "PostgreSQL Database", "type": "Relational DB", "description": "Stores users, uploads, and final architecture analysis reports."}
            ],
            "suggested_apis": [
                {
                    "method": "POST",
                    "path": "/api/auth/token",
                    "description": "Authenticate user credentials and return JWT token.",
                    "request_body": "{\"username\": \"john_doe\", \"password\": \"mysecretpwd\"}",
                    "response_body": "{\"access_token\": \"eyJhbGciOi...\", \"token_type\": \"bearer\"}"
                },
                {
                    "method": "POST",
                    "path": "/api/diagrams/upload",
                    "description": "Upload a diagram for processing.",
                    "request_body": "Multipart form-data: file (PDF, PNG, JPG)",
                    "response_body": "{\"id\": \"diag_278912\", \"status\": \"PENDING\", \"filename\": \"network_schema.png\"}"
                },
                {
                    "method": "GET",
                    "path": "/api/diagrams/{id}",
                    "description": "Get current status and generated analysis results.",
                    "request_body": "None",
                    "response_body": "{\"id\": \"diag_278912\", \"status\": \"COMPLETED\", \"tech_stack\": {...}, ...}"
                }
            ],
            "database_entities": [
                {
                    "name": "User",
                    "columns": [
                        {"name": "id", "type": "INTEGER (PK)"},
                        {"name": "username", "type": "VARCHAR(50) (UNIQUE)"},
                        {"name": "hashed_password", "type": "VARCHAR(255)"},
                        {"name": "created_at", "type": "TIMESTAMP"}
                    ]
                },
                {
                    "name": "Diagram",
                    "columns": [
                        {"name": "id", "type": "VARCHAR(36) (PK)"},
                        {"name": "user_id", "type": "INTEGER (FK)"},
                        {"name": "filename", "type": "VARCHAR(255)"},
                        {"name": "file_path", "type": "VARCHAR(555)"},
                        {"name": "status", "type": "VARCHAR(30)"},
                        {"name": "ocr_text", "type": "TEXT"},
                        {"name": "architecture_summary", "type": "TEXT"},
                        {"name": "created_at", "type": "TIMESTAMP"}
                    ]
                }
            ]
        }
