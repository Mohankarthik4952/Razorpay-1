# ⚡ Electronics AI

## AI Growth & Agentic Commerce

Electronics AI is an AI-powered electronics e-commerce platform that combines intelligent product recommendations, an independent AI Growth Agent, real commerce transactions, Razorpay payments, PostgreSQL, and merchant-focused AI commerce analytics.

Built for the **Razorpay AI Buildathon — Track 1: AI Growth & Agentic Commerce**.

---

## 🏆 Razorpay AI Buildathon

### Track 1 — AI Growth & Agentic Commerce

Electronics AI is designed to help merchants identify relevant cross-selling opportunities using an AI Growth Agent.

The platform connects artificial intelligence with the complete commerce journey:

Customer → Product Discovery → AI Recommendation → Cart → Checkout → Payment → Order → AI Revenue → Merchant Analytics

The goal is to move beyond static product recommendations and create an AI-assisted commerce workflow where recommendations can participate in the customer journey and be connected to measurable commerce outcomes.

---

# 🎯 Problem

Electronics purchases frequently involve complementary products.

For example, when a customer purchases a laptop, they may also need:

- Wireless Mouse
- Keyboard
- Headset
- Cooling Pad
- Laptop Bag

A traditional e-commerce experience may display products, but it does not always understand the context of the customer's current product interaction.

This can create several problems:

- Missed cross-selling opportunities
- Generic product recommendations
- Poor contextual relevance
- Lower potential order value
- Limited visibility into AI-driven commerce activity
- Difficulty measuring the commercial impact of recommendations

The problem is therefore not simply:

> How do we recommend products?

The larger problem is:

> How can AI participate in the commerce journey to identify relevant growth opportunities and connect recommendations with measurable business outcomes?

---

# 💡 Solution

Electronics AI introduces an independent AI Growth Agent into the commerce workflow.

The AI Agent receives product context, identifies complementary products, evaluates recommendation relevance, applies business guardrails, and returns recommendations to the commerce application.

The overall workflow is:

Product Context
↓
Recommendation Engine
↓
Candidate Products
↓
Relevance Evaluation
↓
Business Guardrails
↓
Agent Decision
↓
Recommendation
↓
Customer Action
↓
Purchase
↓
AI Revenue Analytics

Instead of treating recommendations as a separate feature, Electronics AI connects them directly with:

- Product discovery
- Shopping cart
- Checkout
- Payments
- Orders
- AI revenue attribution
- Merchant analytics

---

# 🧠 Core Idea

The core idea is to transform AI-powered product recommendations into a measurable merchant growth mechanism.

Example:

Customer views a laptop
↓
AI Growth Agent analyzes the product
↓
Complementary products are identified
↓
Recommendations are evaluated
↓
Relevant recommendations are displayed
↓
Customer selects a recommendation
↓
Product is added to cart
↓
Customer completes checkout
↓
Order is created
↓
AI commerce activity is recorded
↓
Merchant views analytics

This creates a complete AI-to-commerce feedback loop.

---

# 🤖 AI Growth Agent

The AI Growth Agent is implemented as an independent Python service.

### Technologies

- Python
- FastAPI
- Recommendation Engine
- Agent Decision Logic
- Business Guardrails
- Action Tracking

### Responsibilities

The AI Agent is responsible for:

- Receiving product context
- Analyzing product information
- Identifying complementary products
- Generating recommendation candidates
- Evaluating recommendation relevance
- Applying business rules
- Returning recommendations
- Tracking agent actions

The AI Agent is deployed separately from the main Node.js backend.

This separation keeps the AI layer modular and allows the recommendation service to be developed and deployed independently.

---

# 🔄 AI Agent Decision Flow

Product Context
↓
Analyze Product
↓
Generate Candidate Products
↓
Evaluate Relevance
↓
Apply Business Rules
↓
Apply Guardrails
↓
Agent Decision
↓
Recommend or Reject
↓
Track Agent Action

The system is designed so that the agent does not blindly recommend products.

Recommendations are evaluated based on the available product context and business rules before being returned to the commerce application.

---

# 🏗️ System Architecture

Customer
↓
React + Vite Frontend
↓
Node.js + Express Backend
↓
├── PostgreSQL Database
├── Razorpay Payment Gateway
└── Python + FastAPI AI Growth Agent
↓
Recommendation
↓
Customer Action
↓
Cart
↓
Checkout
↓
Payment
↓
Order
↓
AI Revenue
↓
AI Commerce Analytics Dashboard

---

# 🔄 Complete End-to-End Data Flow

1. Customer opens the Electronics AI storefront.
2. Frontend requests product data from the backend.
3. Backend retrieves product information from PostgreSQL.
4. Customer opens a product.
5. AI recommendation functionality is triggered.
6. Backend communicates with the AI Growth Agent.
7. AI Agent analyzes the product context.
8. AI Agent identifies candidate complementary products.
9. Recommendations are evaluated for relevance.
10. Business guardrails are applied.
11. The recommendation is returned to the backend.
12. Backend sends the recommendation to the frontend.
13. Customer selects a relevant recommendation.
14. Product is added to the shopping cart.
15. Customer proceeds to checkout.
16. Backend validates cart contents and product stock.
17. Customer selects Razorpay or Cash on Delivery.
18. Payment/order processing takes place.
19. Order is created.
20. AI-related commerce information is recorded.
21. AI-attributed revenue data is available for analytics.
22. Merchant views the AI Commerce Dashboard.

---

# 👤 Customer Journey

Home
↓
Product Catalogue
↓
Product Details
↓
AI Recommendation
↓
Add to Cart
↓
Cart
↓
Checkout
↓
Payment
↓
Order Confirmation
↓
Order History

---

# 📈 Merchant Growth Loop

Product Discovery
↓
AI Recommendation
↓
Customer Interaction
↓
Add to Cart
↓
Purchase
↓
AI Revenue Attribution
↓
Merchant Analytics
↓
Growth Insights

The platform connects AI activity with commerce activity so merchants can understand the role of AI-assisted recommendations in the customer journey.

---

# 🛒 Cart Architecture

Electronics AI uses a backend PostgreSQL cart for transactional operations while also handling frontend cart synchronization.

The flow is:

Frontend Cart
↓
Checkout
↓
Cart Synchronization
↓
PostgreSQL Cart
↓
Stock Validation
↓
Order Creation
↓
Payment

The backend remains responsible for validating:

- Product availability
- Product status
- Stock
- Quantity
- Product price
- Cart contents

The frontend is not treated as the authoritative source for transaction pricing.

---

# 💳 Payment Architecture

Electronics AI integrates Razorpay into the checkout process.

## Online Payment Flow

Customer
↓
Checkout
↓
Backend
↓
Razorpay Order Creation
↓
Razorpay Checkout
↓
Payment
↓
Payment Verification
↓
Backend
↓
PostgreSQL
↓
Order Confirmation

---

## Cash on Delivery Flow

Customer
↓
Checkout
↓
Cash on Delivery
↓
Backend
↓
Order Creation
↓
COD_PENDING
↓
Order Confirmation

---

# 💰 AI Revenue Attribution

The platform records AI-related commerce activity so that recommendations can be connected with transaction data.

Conceptually:

AI Recommendation
↓
Customer Interaction
↓
Recommended Product
↓
Add to Cart
↓
Order
↓
Payment / COD
↓
AI Revenue

This creates a connection between AI-assisted product discovery and measurable commerce activity.

---

# 📊 AI Commerce Dashboard

Electronics AI includes a dedicated AI Commerce Dashboard for merchant-focused analytics.

The dashboard provides visibility into:

- AI-attributed revenue
- Recommendation activity
- Agent actions
- Top products
- Revenue by product
- Revenue trends
- Recent AI revenue
- Recent agent actions

### Analytics Flow

PostgreSQL
↓
Orders
Products
Recommendations
AI Revenue
Agent Actions
↓
Backend Analytics APIs
↓
React AI Commerce Dashboard
↓
Merchant Insights

---

# 🗄️ Database Architecture

PostgreSQL provides the persistent data layer for the application.

Major data areas include:

- Customers
- Products
- Carts
- Cart Items
- Orders
- Order Items
- Recommendations
- AI Revenue
- Agent Actions

Conceptual relationship:

Customers
↓
Carts
↓
Cart Items
↓
Products

Customers
↓
Recommendations
↓
AI Revenue

Customers
↓
Orders
↓
Order Items
↓
Products

Agent Actions

---

# 🧩 Application Components

## Frontend

The frontend provides the customer-facing commerce experience.

### Technology

- React.js
- Vite
- JavaScript
- CSS

### Responsibilities

- Product discovery
- Product catalogue
- Product details
- AI recommendations
- Shopping cart
- Checkout
- Payment interface
- Customer authentication
- Order history
- Order details
- AI Commerce Dashboard

---

## Backend

The backend acts as the central orchestration layer.

### Technology

- Node.js
- Express.js
- REST APIs
- Axios
- PostgreSQL
- Razorpay SDK
- Nodemailer / Resend

### Responsibilities

- Product management
- Customer management
- Authentication
- Cart management
- Cart synchronization
- Order management
- Payment processing
- AI Agent integration
- Analytics
- Notifications

---

## AI Agent

The AI Agent provides the recommendation intelligence.

### Technology

- Python
- FastAPI
- Recommendation Engine

### Responsibilities

- Product context analysis
- Recommendation generation
- Relevance evaluation
- Business guardrails
- Agent decision logic
- Action tracking

---

## Database

PostgreSQL stores persistent commerce and AI-related data.

---

# 🔌 API Communication

## Frontend → Backend

React Frontend
↓
HTTP / REST API
↓
Express Backend

---

## Backend → AI Agent

Express Backend
↓
HTTP Request
↓
FastAPI AI Agent
↓
Recommendation Engine
↓
Recommendation Response
↓
Express Backend
↓
React Frontend

---

## Backend → PostgreSQL

Express Backend
↓
PostgreSQL

---

## Backend → Razorpay

Express Backend
↓
Razorpay
↓
Payment Verification
↓
Express Backend

---

# 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React.js |
| Build Tool | Vite |
| Backend | Node.js |
| API Framework | Express.js |
| AI Agent | Python |
| AI API | FastAPI |
| Database | PostgreSQL |
| Payments | Razorpay |
| Communication | REST APIs |
| HTTP Client | Axios |
| Email | Nodemailer / Resend |
| Frontend Deployment | Vercel |
| Backend Deployment | Render |
| AI Agent Deployment | Render |
| Database Hosting | Render PostgreSQL |
| Version Control | Git / GitHub |

---

# 📁 Project Structure

Electronics/
│
├── AI-Agent/
│   ├── .venv/
│   ├── .env
│   ├── agent.py
│   ├── ai_api.py
│   ├── app.py
│   ├── approval.py
│   ├── database.py
│   ├── recommender.py
│   └── requirements.txt
│
├── Backend/
│   ├── middleware/
│   ├── routes/
│   │   ├── cart.js
│   │   ├── payment.js
│   │   └── ...
│   ├── services/
│   ├── .env
│   ├── database.js
│   ├── package.json
│   ├── razorpay.js
│   └── server.js
│
├── Frontend/
│   ├── components/
│   ├── public/
│   ├── src/
│   │   ├── pages/
│   │   └── components/
│   ├── .env
│   ├── index.html
│   └── package.json
│
├── .gitignore
└── README.md

---

# ✨ Features

## Customer Features

- Product catalogue
- Product browsing
- Product details
- AI-powered recommendations
- Shopping cart
- Cart synchronization
- Checkout
- Razorpay payments
- Cash on Delivery
- Customer registration
- Customer login
- Order history
- Order details
- Order confirmation

## AI Features

- Contextual product recommendations
- Complementary product discovery
- Recommendation evaluation
- Business guardrails
- Agent decision logic
- Agent action tracking
- AI revenue attribution

## Merchant Features

- AI Commerce Dashboard
- AI-attributed revenue
- Recommendation analytics
- Agent action history
- Top product analysis
- Revenue by product
- Revenue trends
- Recent AI commerce activity

---

# 🧪 Testing & Validation

The application has been tested across individual services and the complete commerce workflow.

## Backend Health

The production backend provides a health endpoint that verifies service availability and database connectivity.

Expected response structure:

{
  "success": true,
  "service": "electronics-backend",
  "status": "healthy",
  "database": "connected"
}

---

## AI Agent Health

The production AI Agent provides a health endpoint.

Expected response structure:

{
  "success": true,
  "service": "electronics-ai-agent",
  "status": "healthy"
}

---

## Product Catalogue

The production application currently contains:

64 Products

---

## Tested Areas

- Product Retrieval
- Customer Authentication
- Product Details
- AI Recommendations
- Cart
- Cart Synchronization
- Checkout
- Cash on Delivery
- Razorpay Payment
- Payment Verification
- Order Creation
- Order History
- AI Revenue
- Analytics Dashboard

---

# ☁️ Deployment Architecture

The production system is divided into independent services.

Internet
│
▼
Frontend
React + Vite
Vercel
│
│ HTTPS / REST API
▼
Backend
Node.js + Express
Render
│
├───────────────┐
│               │
▼               ▼
PostgreSQL      Razorpay
Render          Payment Gateway
│
▲
│
AI Growth Agent
Python + FastAPI
Render

---

# 🌐 Production Services

## Frontend

React + Vite
↓
Vercel

The frontend communicates with the backend using:

VITE_API_URL

---

## Backend

Node.js + Express
↓
Render

Production backend:

https://razorpay-1-1.onrender.com

---

## AI Agent

Python + FastAPI
↓
Render

The backend communicates with the AI Agent through:

AI_AGENT_URL

---

## Database

PostgreSQL
↓
Render PostgreSQL

---

# 🔐 Environment Variables

Sensitive credentials are stored outside the Git repository.

## Backend

Create:

Backend/.env

Example:

DATABASE_URL=

DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=

PORT=5000
NODE_ENV=development

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

AI_AGENT_URL=

SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

---

## Frontend

Create:

Frontend/.env

Example:

VITE_RAZORPAY_KEY_ID=
VITE_API_URL=http://localhost:5000

Production:

VITE_API_URL=https://razorpay-1-1.onrender.com

---

## AI Agent

Create:

AI-Agent/.env

Configure the required database connection variables.

Never commit production credentials to GitHub.

---

# ⚙️ Local Development

## Prerequisites

Install:

- Node.js
- npm
- Python 3.10+
- PostgreSQL
- Git

---

# 1. Clone Repository

git clone https://github.com/Mohankarthik4952/Razorpay-1.git

cd Razorpay-1

---

# 2. Start Backend

cd Backend

npm install

npm start

Backend:

http://localhost:5000

---

# 3. Start Frontend

Open another terminal:

cd Frontend

npm install

npm run dev

Frontend:

http://localhost:5173

---

# 4. Start AI Agent

Open another terminal:

cd AI-Agent

Windows:

.\.venv\Scripts\activate

Install dependencies:

pip install -r requirements.txt

Start the FastAPI service:

uvicorn ai_api:app --reload

AI Agent:

http://localhost:8000

---

# 🔎 Health Checks

## Backend

GET /health

Local:

http://localhost:5000/health

---

## AI Agent

GET /health

Local:

http://localhost:8000/health

---

# 🔐 Security

The application uses environment variables for sensitive configuration.

The repository excludes:

- .env
- node_modules/
- .venv/
- Build files
- Local databases
- Logs
- Private keys
- Payment secrets
- Database credentials

Sensitive information should never be committed to the repository.

---

# 📈 Business Value

Electronics AI is designed to help merchants:

- Increase cross-selling opportunities
- Improve relevant product discovery
- Increase potential order value
- Connect AI recommendations with transactions
- Measure AI-assisted commerce activity
- Understand agent actions
- Generate merchant insights

The primary business loop is:

AI Recommendation
↓
Customer Engagement
↓
Product Selection
↓
Purchase
↓
AI Revenue
↓
Merchant Analytics

---

# 🏆 Why Agentic Commerce?

Electronics AI goes beyond a static recommendation component.

The AI Growth Agent participates in a controlled commerce workflow:

Observe
↓
Analyze
↓
Generate
↓
Evaluate
↓
Apply Guardrails
↓
Recommend
↓
Customer Action
↓
Measure

This connects AI decision-making with an actual commerce experience.

---

# 🎥 Demo Flow

Recommended demonstration sequence:

1. Open the deployed Electronics AI website.
2. Browse the product catalogue.
3. Open a product.
4. Demonstrate the AI recommendation.
5. Add the recommended product to the cart.
6. Open the cart.
7. Proceed to checkout.
8. Demonstrate Razorpay or Cash on Delivery.
9. Complete the order.
10. Show order confirmation.
11. Open the AI Commerce Dashboard.
12. Show AI revenue and agent activity.
13. Show the production architecture.
14. Show the GitHub repository.

---

# 🎯 Buildathon Value Proposition

## Problem

Electronics customers frequently need complementary products, but traditional commerce experiences may miss contextual cross-selling opportunities.

## Solution

Electronics AI introduces an AI Growth Agent that identifies relevant complementary products and brings them into the customer journey.

## AI

The AI Agent analyzes product context, evaluates recommendations, applies business guardrails, and tracks agent actions.

## Commerce

Recommendations connect directly to:

Product
↓
Cart
↓
Checkout
↓
Payment
↓
Order

## Growth

AI-assisted product discovery is connected with commerce activity and AI-attributed revenue.

## Analytics

Merchants can view:

- AI Revenue
- Recommendations
- Agent Actions
- Product Performance
- Revenue Trends

---

# 🚀 Key Differentiator

Electronics AI is not designed as a standalone recommendation engine.

It connects AI directly to the commerce lifecycle.

AI
↓
Recommendation
↓
Customer Action
↓
Cart
↓
Checkout
↓
Payment
↓
Order
↓
AI Revenue
↓
Merchant Analytics
↓
Growth Insights

This creates an end-to-end AI Growth and Agentic Commerce workflow.

---

# 📌 Project Summary

Electronics AI brings together:

- 🛒 E-Commerce
- 🤖 AI Growth Agent
- 💳 Razorpay Payments
- 🗄️ PostgreSQL
- 📊 AI Commerce Analytics
- ☁️ Cloud Deployment

The platform demonstrates how an AI agent can participate in the commerce journey, generate relevant cross-selling opportunities, connect recommendations with transactions, and provide merchants with AI-powered commerce insights.

---

# 🔗 Project Links

## GitHub

https://github.com/Mohankarthik4952/Razorpay-1

## Frontend

Add your deployed frontend URL here.

## Backend

https://razorpay-1-1.onrender.com

## AI Agent

Add your deployed AI Agent URL here.

---

# 👨‍💻 Built For

Razorpay AI Buildathon

Track 1 — AI Growth & Agentic Commerce

---

# 📜 License

This project was developed as part of an AI buildathon project.
