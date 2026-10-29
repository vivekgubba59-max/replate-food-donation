# 🌿 RePlate — Food Donation Platform

> **Simple, Beginner-Friendly College Hackathon Project**  
> Connects restaurants, hostels, event caterers, and supermarkets with local charities and shelters to share extra food and reduce hunger.

---

## 🌟 Overview & Problem Addressed

Over **30% of all food produced is thrown into trash bins**, while local shelters and families in our communities face hunger every day. 

The main problem is not a shortage of food—it is the **lack of a simple, quick way for donors to notify nearby charities before fresh food spoils**.

**RePlate** solves this with a clean, beginner-friendly web application:
1. **🍲 Donate Food:** Donors list extra food in under 30 seconds with quantity, category, and pickup location.
2. **👀 Available Food:** Charities and volunteers browse all available food with search and category filters.
3. **🤝 Request Food:** NGOs claim food donations with one click and track the pickup schedule.
4. **📊 Dashboard:** Displays real-time counts of total donations, completed deliveries, and meals shared.
5. **ℹ️ About Us:** Explains the mission, problem statement, and community benefits in clear, simple English.

---

## 🚀 Key Features

* **🎨 Clean Green-and-White Modern UI:** Fast, responsive layout that looks great on mobile phones and laptops with smooth animations and intuitive cards.
* **📦 Donate Food in 30 Seconds:** Simple form with 1-click demo presets (`Hot Buffet`, `Fresh Vegetables`, `Artisan Bread`) designed for quick hackathon presentations.
* **🍲 Browse Available Food:** Search by food name or street address, filter by food category, and toggle between card and table views.
* **🚚 4-Stage Status Tracking:** Follow donations through an easy pipeline:
  $$\text{Available} \longrightarrow \text{Requested} \longrightarrow \text{In Transit (Picked Up)} \longrightarrow \text{Completed (Delivered)}$$
* **📊 Live Impact Dashboard:** Displays live numbers calculated directly from the database: Total Donations, Completed Donations, Meals Shared, and Food Saved in kg.
* **🌱 Zero Paid Subscriptions & Zero API Keys:** Runs 100% locally with Node.js, Express, and SQLite. Completely self-contained and offline-capable.

---

## 🛠️ Tech Stack

* **Backend:** Node.js + Express.js (REST APIs with parameterized SQL queries and input validation)
* **Database:** SQLite (`replate.db`), automatically created and seeded with realistic sample data on startup
* **Frontend:** Semantic HTML5, Clean CSS3, Vanilla ES6+ JavaScript
* **Charts:** Chart.js (included locally for 100% offline reliability)
* **Testing:** Automated verification suite (`test.js`) with 14 passing tests

---

## ⚡ Quick Start & Installation

### Prerequisites
* **Node.js** (v18, v20, v22, or v24+)
* **npm**

### Launch Commands
```bash
# 1. Open the project folder
cd "C:\Users\Gubba  vivek\.gemini\antigravity\scratch\replate"

# 2. Install dependencies (runs in seconds)
npm install

# 3. Start the application
npm start
```

Open your browser to:
```
http://127.0.0.1:5000
```

---

## 🧪 Automated Testing

RePlate includes a built-in test suite covering all API endpoints, database operations, and status workflows:

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
• Beginner Workflow: POST /request and target_status: Completed... PASSED ✅
• DELETE /api/donations/:id removes an available donation... PASSED ✅
• GET /api/impact returns live environmental and economic metrics... PASSED ✅
• GET /api/system/algorithm provides multi-criteria heuristic transparency... PASSED ✅
• GET / serves single-page frontend application... PASSED ✅

============================================================
  Test Suite Completed: 14 Passed, 0 Failed
============================================================
```

---

## 🎤 2-Minute College Hackathon Presentation Guide

Follow these exact steps when presenting to judges:

1. **Introduction (15 seconds):**
   > *"Hi Judges! This is RePlate. Every day, colleges, restaurants, and hotels discard tons of good food while local shelters struggle to feed people. RePlate is a simple platform connecting food donors with local charities in minutes."*

2. **Show Available Food (30 seconds):**
   * Click **"🍲 Available Food"**.
   * Show the cards: food name, quantity (e.g., `85 meals`), donor name, and freshness window countdown (`⏰ 1h 45m left`).
   * Filter by category (e.g. *Cooked Meals*) and search for a dish.

3. **Demonstrate Donating Food (30 seconds):**
   * Click **"+ Donate Food"**.
   * Click the **"🍱 Hot Lunch Buffet"** button to fill all fields instantly in 1 click!
   * Click **"Save & Post Donation"**.
   * Show that the new donation appears immediately at the top of the feed and the counter increases!

4. **Demonstrate Requesting & Delivery Workflow (30 seconds):**
   * Click **"🤝 Request Food"** on the newly posted donation. Select a charity (e.g., *Hope Street Community Kitchen*) and confirm.
   * Switch to **"🤝 Request Food"** in the top navigation to show the 4-stage Kanban pipeline.
   * Click **"📦 Mark Picked Up"** and then **"✅ Mark Completed"**.
   * Highlight that status transitions are validated and duplicate requests are prevented.

5. **Show Live Impact Dashboard (15 seconds):**
   * Click **"📊 Dashboard"**.
   * Show that **Total Donations**, **Completed Deliveries**, and **Meals Shared** updated automatically from SQLite records with interactive charts.
   * Click **"⚙️ Reset Demo Data"** to show judges that sample data can be restored anytime with one click.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Serves the single-page application dashboard |
| `GET` | `/api/donations` | List donations with optional filters (`status`, `category`, `search`) |
| `GET` | `/api/donations/:id` | Get details of a single donation |
| `POST` | `/api/donations` | Create a new food donation (validates quantity > 0, required fields) |
| `PUT` | `/api/donations/:id` | Update an available food donation |
| `DELETE` | `/api/donations/:id` | Remove an available food donation |
| `POST` | `/api/donations/:id/request` | NGO requests/claims an available donation |
| `POST` | `/api/donations/:id/status` | Advance status (`Requested` ➔ `Picked Up` ➔ `Completed`) |
| `GET` | `/api/donations/:id/match` | Recommend closest and best-equipped charities for a donation |
| `GET` | `/api/impact` | Live statistics: total donations, completed deliveries, meals shared, kg saved |
| `GET` | `/api/donors` | List registered food donor organizations |
| `GET` | `/api/ngos` | List registered charity and shelter partners |
| `POST` | `/api/reset-demo` | Reset database to clean sample data for presentations |

---

## 📄 License
MIT License — Free to use, adapt, and build upon for college projects and community hunger relief initiatives worldwide.
