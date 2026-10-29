# 🌿 RePlate — Intelligent Food Rescue Platform

> **Hackathon Solution for the Food Donation Platform Problem Statement**  
> An intelligent, auditable surplus food rescue platform connecting hospitality donors (restaurants, hotels, banquet halls, supermarkets) with certified hunger relief NGOs and community shelters using a deterministic multi-criteria matching engine.

---

## 🌟 Overview & Problem Addressed

Over **30% of all food produced globally is wasted**, while millions face food insecurity every single day. The bottleneck in food rescue has never been the lack of surplus food—it is the **logistical friction of rapid redistribution before safe shelf-life expires**.

**RePlate** solves this by:
1. Enabling commercial donors to list surplus meals in seconds with food safety parameters (temperature, dietary type, preparation time, collection deadline).
2. Running a **transparent, rule-based intelligent matching algorithm** in the backend that instantly ranks nearby NGOs based on distance, time-to-decay urgency, vehicle capacity, and food category acceptance.
3. Providing an end-to-end **dispatch and verification workflow** (`Available` ➔ `Claimed` ➔ `Picked Up` ➔ `Delivered`) with complete audit trails.
4. Measuring real-time **social, environmental, and economic dividends** (meals delivered, kg food waste diverted, CO2e emissions prevented, and water footprint conserved).

---

## 🚀 Key Features

* **🎨 Premium Modern UI/UX:** Clean emerald and mint green branding, responsive card and table views, live countdown badges, glassmorphic modals, and animated progress steppers.
* **⚡ Rule-Based Intelligent Matching Engine:** 100% deterministic, explainable ranking algorithm evaluated across 5 weighted criteria with transparent scoring breakdowns and ETA calculations.
* **🚚 NGO Dispatch & Lifecycle Pipeline:** Full 4-stage Kanban workflow (`Available` ➔ `Claimed` ➔ `In Transit` ➔ `Delivered`) preventing duplicate claims and logging volunteer verifications.
* **📊 Live Impact Analytics & Charts:** Interactive Chart.js visualizations (category distribution doughnut chart, pipeline stage bar chart) and environmental equivalency calculators.
* **📦 Complete CRUD Food Management:** Create, view, edit, and delete donations with input validation, coordinate handling, and quick demo presets.
* **🏛️ Partner Directories:** Browse registered food donors (hotels, caterers, bakeries) and certified NGOs (community kitchens, shelters, food banks).
* **🌱 Zero External Paid Dependencies:** Runs entirely on local Node.js + Express.js, SQLite, and vanilla modern JavaScript—zero API keys, zero cloud costs, 100% self-contained and offline-capable.

---

## 🧠 Smart Matching Engine: Deterministic Formula

Unlike opaque neural models that hallucinate routes or ignore food health regulations, RePlate implements an **auditable, multi-factor heuristic scoring function** ($0 \le S \le 100$):

$$S = W_{\text{dist}} \cdot S_{\text{dist}} + W_{\text{urgency}} \cdot S_{\text{urgency}} + W_{\text{cap}} \cdot S_{\text{cap}} + W_{\text{cat}} \cdot S_{\text{cat}} + W_{\text{rel}} \cdot S_{\text{rel}}$$

### Factor Weights & Evaluation Rules:

| Factor | Weight | Scoring Logic |
| :--- | :---: | :--- |
| **1. Proximity & Transit Distance** | **35%** | Computes Great-Circle distance using the **Haversine Formula**. Donations within 2 km score 100%; linear decay down to NGO fleet radius; heavy penalty beyond operational perimeter. |
| **2. Shelf-Life Urgency & ETA** | **25%** | Evaluates remaining safe consumption window against estimated mobilization and travel time ($8\text{ min setup} + 2.5\text{ min/km}$). Critical items ($<2\text{ hours}$) heavily penalize distant teams to prevent food spoilage in transit. |
| **3. Fleet & Batch Capacity Fit** | **20%** | Compares donation batch volume to NGO vehicle intake capacity. Rewards ideal single-run load utilization ($30\%\text{--}100\%$) without overloading or extreme vehicle underutilization. |
| **4. Food Category Compatibility** | **15%** | Verifies food requirements (`Cooked Meals`, `Fresh Produce`, `Bakery`, `Dairy`) against NGO distribution equipment (e.g. heated chafing containers vs refrigerated vans). |
| **5. Volunteer Reliability Track Record** | **5%** | Factored from historical verified fulfillment rating (out of 5.0 stars) and volunteer responsiveness. |

---

## 🛠️ Tech Stack

* **Backend:** Node.js + Express.js (RESTful APIs with parameterized SQL queries and full error handling)
* **Database:** SQLite (`replate.db`), automatically created and seeded with realistic sample data on startup
* **Frontend:** Semantic HTML5, Modern CSS3 (CSS Variables, Flexbox/Grid, Animations), ES6+ JavaScript
* **Data Visualization:** Chart.js (bundled locally for 100% offline resilience)
* **Testing:** Custom automated end-to-end test suite (`test.js`) verifying all 13 API endpoints and status transitions

---

## ⚡ Quick Start & Installation

### Prerequisites
* **Node.js** (v18, v20, v22, or v24+)
* **npm**

### Installation

```bash
# 1. Navigate to the project directory
cd "C:\Users\Gubba  vivek\.gemini\antigravity\scratch\replate"

# 2. Install dependencies
npm install

# 3. Launch the platform
npm start
```

Open your browser to:
```
http://127.0.0.1:5000
```

---

## 🧪 Automated Verification & Testing

RePlate includes a built-in end-to-end test suite that verifies database creation, input validation, smart ranking calculations, duplicate claim prevention, and status transitions:

```bash
npm test
```

Expected output:
```
============================================================
  RePlate — Running Automated Verification Test Suite
============================================================

• POST /api/reset-demo initializes fresh seed data... PASSED ✅
• GET /api/donors retrieves registered food donors... PASSED ✅
• GET /api/ngos retrieves registered rescue NGOs... PASSED ✅
• GET /api/donations retrieves seeded donations with filters... PASSED ✅
• GET /api/donations/:id retrieves single donation details... PASSED ✅
• POST /api/donations validates input & creates valid donation... PASSED ✅
• GET /api/donations/:id/match ranks NGOs with multi-criteria breakdown... PASSED ✅
• PUT /api/donations/:id updates available donation... PASSED ✅
• Complete Workflow: Available -> Claimed -> Picked Up -> Delivered... PASSED ✅
• DELETE /api/donations/:id removes an available donation... PASSED ✅
• GET /api/impact returns live environmental and economic metrics... PASSED ✅
• GET /api/system/algorithm provides multi-criteria heuristic transparency... PASSED ✅
• GET / serves single-page frontend application... PASSED ✅

============================================================
  Test Suite Completed: 13 Passed, 0 Failed
============================================================
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Serves the single-page application dashboard |
| `GET` | `/api/donations` | List donations with optional filters (`status`, `category`, `search`) |
| `GET` | `/api/donations/:id` | Get details of a single donation |
| `POST` | `/api/donations` | Create a new donation with validation (quantity > 0, required fields) |
| `PUT` | `/api/donations/:id` | Update an available donation |
| `DELETE` | `/api/donations/:id` | Remove an available donation |
| `GET` | `/api/donations/:id/match` | Execute the smart NGO matching engine and return ranked NGOs |
| `POST` | `/api/donations/:id/claim` | NGO claims an available donation |
| `POST` | `/api/donations/:id/status` | Advance donation status (`Claimed` ➔ `Picked Up` ➔ `Delivered`) |
| `GET` | `/api/impact` | Real-time environmental, hunger, and economic impact metrics |
| `GET` | `/api/donors` | List all registered donor organizations |
| `GET` | `/api/ngos` | List all registered rescue NGOs |
| `GET` | `/api/system/algorithm` | Explanations and weights of the transparent matching algorithm |
| `POST` | `/api/reset-demo` | Reset database to clean seed state for live demonstrations |

---

## 🎯 Hackathon Live Demo Walkthrough

When presenting this project to hackathon judges:

1. **Active Rescues:** Show real-time cards with urgency countdown timers (e.g., `⏰ Urgent: 1h 45m left`), dietary chips, and category tags. Toggle between **Grid View** and **Compact Table View**.
2. **Smart NGO Matcher:** Click **"⚡ Match NGOs"** on an active donation. Walk through the 5-factor scoring breakdown bars and explanations. Show how proximity, urgency, and capacity dynamically rank the best NGO. Click **"Assign & Dispatch"**.
3. **NGO Dispatch Hub:** Navigate to **"🚚 NGO Dispatch Hub"** to show the 4-phase pipeline (`Available` ➔ `Claimed` ➔ `In Transit` ➔ `Delivered`). Click **"📦 Pick Up"** and **"✅ Deliver"** with volunteer notes.
4. **Post a New Donation:** Click **"+ Post Food Donation"**. Use the **Quick Demo Presets** (`🍱 Hot Banquet Buffet`, `🥬 Farm Fresh Produce`, `🥖 Artisan Bakery Breads`) to fill the form in one click and publish immediately.
5. **Live Impact Dashboard:** Navigate to **"📊 Impact Dashboard"** to watch meals delivered, kg of waste diverted, and CO2 emissions saved update automatically from SQLite records with interactive Chart.js visualizations.
6. **Reset Button:** Use the **"⚙️ Reset Seed"** button anytime to instantly restore a clean demo state.

---

## 📄 License
MIT License — Free to use, adapt, and build upon for hunger relief initiatives worldwide.
