import time
import os

def extract_text_from_diagram(file_path: str) -> str:
    """
    Mock OCR service that simulates extracting text from an architecture diagram.
    """
    time.sleep(2)
    filename = os.path.basename(file_path).lower()
    
    if "ecommerce" in filename or "shop" in filename:
        return (
            "[OCR Result]\n"
            "Detected text labels:\n"
            "- React Frontend (Client App)\n"
            "- API Gateway (Nginx / Kong)\n"
            "- Authentication Service (JWT / Users DB)\n"
            "- Product Catalog Service (Read-heavy, Redis Cache)\n"
            "- Shopping Cart & Order Processing Service\n"
            "- Payment Gateway Integration (Stripe API)\n"
            "- PostgreSQL Primary Database (Replicated)\n"
            "- RabbitMQ Message Broker\n"
            "- Inventory Management Service\n"
            "- HTTPS Protocol, TLS 1.3, VPC Subnet"
        )
    elif "chat" in filename or "social" in filename or "messenger" in filename:
        return (
            "[OCR Result]\n"
            "Detected text labels:\n"
            "- Next.js Web App / Mobile Client (React Native)\n"
            "- WebSocket Server (Socket.io / Node.js Node Server)\n"
            "- Load Balancer (AWS ALB)\n"
            "- Presence Service (Redis Memory Store)\n"
            "- Message History Database (MongoDB / Cassandra)\n"
            "- Media Storage Service (AWS S3)\n"
            "- Push Notification Router (FCM / APNs)\n"
            "- Kafka Event Streams (Analytics & Moderation)\n"
            "- Gateway API (Express.js Router)"
        )
    elif "analytics" in filename or "data" in filename or "pipeline" in filename:
        return (
            "[OCR Result]\n"
            "Detected text labels:\n"
            "- IoT Devices / Web Event SDKs\n"
            "- AWS Kinesis Firehose / Apache Kafka Ingestion\n"
            "- AWS S3 Raw Data Lake\n"
            "- Apache Spark Batch/Streaming Processing\n"
            "- AWS Glue Data Catalog\n"
            "- Snowflake Data Warehouse\n"
            "- DBT (Data Build Tool) Transformations\n"
            "- BI Dashboard / Metabase / Tableau\n"
            "- Airflow Dag Orchestrator"
        )
    else:
        return (
            "[OCR Result]\n"
            "Detected text labels:\n"
            "- User Web Browser (SPA React Client)\n"
            "- Cloudflare CDN & WAF Protection\n"
            "- Load Balancer (Proxy Router)\n"
            "- FastAPI Application Server (Gunicorn Workers)\n"
            "- Background Workers (Celery Queue)\n"
            "- Redis Cache and Session Storage\n"
            "- PostgreSQL Relational Database (Primary Node)\n"
            "- S3 Object Store for Static Assets\n"
            "- Auth0 Identity Provider Authentication"
        )
