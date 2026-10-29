/**
 * RePlate — Intelligent Food Rescue Platform
 * Node.js & Express RESTful API Server
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const matcher = require('./matcher');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize SQLite database and seeds
db.initDb();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets
app.use('/static', express.static(path.join(__dirname, 'static')));

// ---------------------------------------------------------------------------
// Frontend Route
// ---------------------------------------------------------------------------
app.get(['/', '/index.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

// ---------------------------------------------------------------------------
// REST APIs: Donations Management
// ---------------------------------------------------------------------------

/**
 * GET /api/donations
 * Retrieve donations with optional query filters: status, category, search
 */
app.get('/api/donations', (req, res) => {
  try {
    const { status, category, search } = req.query;
    const donations = db.getAllDonations(status, category, search);
    return res.json({
      success: true,
      count: donations.length,
      data: donations
    });
  } catch (err) {
    console.error('Error fetching donations:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/donations/:id
 * Retrieve a single donation by ID
 */
app.get('/api/donations/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid donation ID' });
    }
    const donation = db.getDonationById(id);
    if (!donation) {
      return res.status(404).json({ success: false, error: 'Donation not found' });
    }
    return res.json({ success: true, data: donation });
  } catch (err) {
    console.error('Error fetching donation:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/donations
 * Create a new food donation listing
 */
app.post('/api/donations', (req, res) => {
  try {
    const data = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid request payload' });
    }

    const requiredFields = [
      'food_name',
      'category',
      'quantity',
      'preparation_time',
      'expiry_time',
      'pickup_address',
      'donor_id'
    ];

    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null || String(data[field]).trim() === '') {
        return res.status(400).json({ success: false, error: `Missing required field: ${field}` });
      }
    }

    const qty = parseInt(data.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, error: 'Quantity must be a positive integer' });
    }

    const donorId = parseInt(data.donor_id, 10);
    if (isNaN(donorId) || donorId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid donor ID' });
    }

    const lat = parseFloat(data.latitude) || 40.7150;
    const lon = parseFloat(data.longitude) || -74.0050;

    const payload = {
      donor_id: donorId,
      food_name: String(data.food_name).trim(),
      category: String(data.category).trim(),
      quantity: qty,
      unit: data.unit || 'meals',
      dietary_type: data.dietary_type || 'Vegetarian',
      storage_instructions: data.storage_instructions || 'Room Temperature',
      preparation_time: String(data.preparation_time).trim(),
      expiry_time: String(data.expiry_time).trim(),
      pickup_address: String(data.pickup_address).trim(),
      latitude: lat,
      longitude: lon,
      notes: (data.notes || '').trim()
    };

    const newId = db.createDonation(payload);
    const created = db.getDonationById(newId);

    return res.status(201).json({
      success: true,
      message: 'Donation created successfully!',
      data: created
    });
  } catch (err) {
    console.error('Error creating donation:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/donations/:id
 * Update an existing available donation
 */
app.put('/api/donations/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid donation ID' });
    }

    const existing = db.getDonationById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Donation not found' });
    }

    if (existing.status !== 'Available') {
      return res.status(400).json({
        success: false,
        error: `Cannot edit donation in '${existing.status}' status.`
      });
    }

    const data = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid request payload' });
    }

    const qty = parseInt(data.quantity !== undefined ? data.quantity : existing.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, error: 'Quantity must be a positive integer' });
    }

    const updatePayload = {
      donor_id: parseInt(data.donor_id || existing.donor_id, 10),
      food_name: String(data.food_name || existing.food_name).trim(),
      category: String(data.category || existing.category).trim(),
      quantity: qty,
      unit: data.unit || existing.unit,
      dietary_type: data.dietary_type || existing.dietary_type,
      storage_instructions: data.storage_instructions || existing.storage_instructions,
      preparation_time: String(data.preparation_time || existing.preparation_time).trim(),
      expiry_time: String(data.expiry_time || existing.expiry_time).trim(),
      pickup_address: String(data.pickup_address || existing.pickup_address).trim(),
      latitude: parseFloat(data.latitude || existing.latitude),
      longitude: parseFloat(data.longitude || existing.longitude),
      notes: (data.notes !== undefined ? data.notes : existing.notes || '').trim()
    };

    const updated = db.updateDonation(id, updatePayload);
    if (updated) {
      const refreshed = db.getDonationById(id);
      return res.json({
        success: true,
        message: 'Donation updated successfully',
        data: refreshed
      });
    }

    return res.status(400).json({ success: false, error: 'Failed to update donation' });
  } catch (err) {
    console.error('Error updating donation:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/donations/:id
 * Remove a donation if not yet in transit or delivered
 */
app.delete('/api/donations/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid donation ID' });
    }

    const existing = db.getDonationById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Donation not found' });
    }

    if (existing.status === 'Picked Up' || existing.status === 'Delivered') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete donation that has already been picked up or delivered.'
      });
    }

    const removed = db.deleteDonation(id);
    if (removed) {
      return res.json({ success: true, message: 'Donation removed successfully.' });
    }

    return res.status(400).json({ success: false, error: 'Failed to remove donation.' });
  } catch (err) {
    console.error('Error deleting donation:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// REST APIs: Smart NGO Matching Engine
// ---------------------------------------------------------------------------

/**
 * GET /api/donations/:id/match
 * Multi-criteria heuristic scoring engine ranking all eligible NGOs
 */
app.get('/api/donations/:id/match', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid donation ID' });
    }

    const donation = db.getDonationById(id);
    if (!donation) {
      return res.status(404).json({ success: false, error: 'Donation not found' });
    }

    const allNgos = db.getAllNgos();
    const rankedMatches = matcher.rankNgosForDonation(donation, allNgos);

    return res.json({
      success: true,
      donation: {
        id: donation.id,
        food_name: donation.food_name,
        category: donation.category,
        quantity: donation.quantity,
        unit: donation.unit,
        status: donation.status,
        pickup_address: donation.pickup_address,
        expiry_time: donation.expiry_time
      },
      matches: rankedMatches
    });
  } catch (err) {
    console.error('Error computing matches:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// REST APIs: NGO Actions & Status Progression Workflow
// ---------------------------------------------------------------------------

/**
 * POST /api/donations/:id/claim or /api/donations/:id/request
 * NGO claims or requests an available donation
 */
app.post(['/api/donations/:id/claim', '/api/donations/:id/request'], (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid donation ID' });
    }

    const { ngo_id, notes } = req.body;
    if (!ngo_id) {
      return res.status(400).json({ success: false, error: 'Missing ngo_id in request' });
    }

    const ngoId = parseInt(ngo_id, 10);
    if (isNaN(ngoId)) {
      return res.status(400).json({ success: false, error: 'ngo_id must be a valid integer' });
    }

    const result = db.claimDonation(id, ngoId, notes);
    if (result.success) {
      const updated = db.getDonationById(id);
      return res.json({
        success: true,
        message: result.message,
        data: updated
      });
    }

    return res.status(400).json({ success: false, error: result.message });
  } catch (err) {
    console.error('Error claiming donation:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/donations/:id/status
 * Progress donation lifecycle: Available -> Claimed -> Picked Up -> Delivered
 */
app.post('/api/donations/:id/status', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid donation ID' });
    }

    const { target_status, notes } = req.body;
    if (!target_status || !String(target_status).trim()) {
      return res.status(400).json({ success: false, error: 'Missing target_status in request' });
    }

    const target = String(target_status).trim();
    const result = db.advanceDonationStatus(id, target, notes);

    if (result.success) {
      const updated = db.getDonationById(id);
      return res.json({
        success: true,
        message: result.message,
        data: updated
      });
    }

    return res.status(400).json({ success: false, error: result.message });
  } catch (err) {
    console.error('Error updating status:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// REST APIs: Analytics & Directories
// ---------------------------------------------------------------------------

/**
 * GET /api/impact
 * Real-time environmental, hunger, and economic impact metrics
 */
app.get('/api/impact', (req, res) => {
  try {
    const metrics = db.getImpactMetrics();
    return res.json({ success: true, data: metrics });
  } catch (err) {
    console.error('Error fetching impact metrics:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/donors
 * List all registered food donor partners
 */
app.get('/api/donors', (req, res) => {
  try {
    const donors = db.getAllDonors();
    return res.json({ success: true, data: donors });
  } catch (err) {
    console.error('Error fetching donors:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/ngos
 * List all registered rescue organizations
 */
app.get('/api/ngos', (req, res) => {
  try {
    const ngos = db.getAllNgos();
    return res.json({ success: true, data: ngos });
  } catch (err) {
    console.error('Error fetching ngos:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/system/algorithm
 * Provides transparent rule-based matching documentation
 */
app.get('/api/system/algorithm', (req, res) => {
  return res.json({
    success: true,
    algorithm: 'RePlate Multi-Criteria Heuristic Matcher v1.0',
    description:
      'Deterministic, explainable scoring engine optimizing rapid rescue and minimal spoilage without black-box models.',
    weights: {
      proximity_distance: {
        weight_percent: 35,
        description:
          'Proximity calculated via Haversine formula. Scores maximum (100%) for <2km; linear decay up to NGO max operating radius.'
      },
      urgency_time_decay: {
        weight_percent: 25,
        description:
          'Calculates remaining shelf-life vs NGO dispatch ETA. Severe urgency prioritizes close NGOs to avoid food spoilage in transit.'
      },
      vehicle_capacity_fit: {
        weight_percent: 20,
        description:
          'Compares donation volume to NGO vehicle/batch capacity. Rewards optimal single-trip load utilization.'
      },
      category_demand_match: {
        weight_percent: 15,
        description:
          'Matches food category (Cooked, Fresh Produce, Bakery, etc.) with NGO facility cold chain or warming storage.'
      },
      fulfillment_reliability: {
        weight_percent: 5,
        description:
          'Reward for NGO historical delivery completion rate and volunteer response track record.'
      }
    }
  });
});

/**
 * POST /api/reset-demo
 * Reset database to fresh seed state for live judging presentations
 */
app.post('/api/reset-demo', (req, res) => {
  try {
    db.resetDb();
    return res.json({
      success: true,
      message: 'Demo data reset to clean initial state!'
    });
  } catch (err) {
    console.error('Error resetting demo data:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Server Startup
// ---------------------------------------------------------------------------
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('============================================================');
    console.log('  RePlate — Intelligent Food Rescue Platform');
    console.log(`  Local Server Running at: http://127.0.0.1:${PORT}`);
    console.log('  Tech Stack: Node.js + Express.js + SQLite');
    console.log('============================================================');
  });
}

module.exports = app;
