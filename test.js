/**
 * RePlate — Automated End-to-End Verification Test Suite
 * Tests all REST API routes, matching logic, status workflow transitions,
 * validations, error handling, and impact statistics.
 */

const http = require('http');
const app = require('./server');
const db = require('./db');

let server;
const PORT = 5055;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Helper function for HTTP requests
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method: method.toUpperCase(),
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log('============================================================');
  console.log('  RePlate — Running Automated Verification Test Suite');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    process.stdout.write(`• ${name}... `);
    try {
      await fn();
      console.log('PASSED ✅');
      passed++;
    } catch (err) {
      console.log(`FAILED ❌\n  Error: ${err.message}`);
      failed++;
    }
  }

  // Start test server
  await new Promise((resolve) => {
    server = app.listen(PORT, '127.0.0.1', () => {
      resolve();
    });
  });

  try {
    // Test 1: Reset demo data
    await test('POST /api/reset-demo initializes fresh seed data', async () => {
      const res = await request('POST', '/api/reset-demo');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success: true');
    });

    // Test 2: List donors
    await test('GET /api/donors retrieves registered food donors', async () => {
      const res = await request('GET', '/api/donors');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Array.isArray(res.data.data), 'Expected data to be an array');
      assert(res.data.data.length >= 5, 'Expected at least 5 donors seeded');
      assert(res.data.data.some((d) => d.name.includes('Grand Central')), 'Expected Grand Central donor in list');
    });

    // Test 3: List NGOs
    await test('GET /api/ngos retrieves registered rescue NGOs', async () => {
      const res = await request('GET', '/api/ngos');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Array.isArray(res.data.data), 'Expected array of NGOs');
      assert(res.data.data.length >= 5, 'Expected at least 5 NGOs seeded');
    });

    // Test 4: List donations and filters
    await test('GET /api/donations retrieves seeded donations with filters', async () => {
      const resAll = await request('GET', '/api/donations');
      assert(resAll.status === 200, `Expected 200, got ${resAll.status}`);
      assert(resAll.data.count >= 7, 'Expected at least 7 initial donations');

      // Status filter
      const resAvail = await request('GET', '/api/donations?status=Available');
      assert(resAvail.data.data.every((d) => d.status === 'Available'), 'All should be Available');

      // Category filter
      const resCooked = await request('GET', '/api/donations?category=Cooked Meals');
      assert(resCooked.data.data.every((d) => d.category === 'Cooked Meals'), 'All should be Cooked Meals');

      // Search filter
      const resSearch = await request('GET', '/api/donations?search=Pilaf');
      assert(resSearch.data.count >= 1, 'Search for Pilaf should return results');
      assert(resSearch.data.data[0].food_name.includes('Pilaf'), 'Matches Pilaf');
    });

    // Test 5: Get single donation
    await test('GET /api/donations/:id retrieves single donation details', async () => {
      const res = await request('GET', '/api/donations/1');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.data.id === 1, 'Expected donation ID 1');
      assert(res.data.data.donor_name.includes('Grand Central'), 'Joined donor name present');
    });

    // Test 6: Create donation validation
    let createdDonationId = null;
    await test('POST /api/donations validates input & creates valid donation', async () => {
      // Missing field validation
      const badRes = await request('POST', '/api/donations', {
        food_name: 'Incomplete Food Item'
      });
      assert(badRes.status === 400, 'Expected 400 on missing required fields');

      // Invalid quantity validation
      const badQty = await request('POST', '/api/donations', {
        donor_id: 1,
        food_name: 'Test Meals',
        category: 'Cooked Meals',
        quantity: -10,
        preparation_time: '2026-10-29 10:00',
        expiry_time: '2026-10-29 14:00',
        pickup_address: '100 Main St'
      });
      assert(badQty.status === 400, 'Expected 400 on negative quantity');

      // Valid creation
      const validRes = await request('POST', '/api/donations', {
        donor_id: 2,
        food_name: 'Fresh Hydroponic Lettuce & Spinach',
        category: 'Fresh Produce',
        quantity: 40,
        unit: 'kg',
        dietary_type: 'Vegan',
        storage_instructions: 'Refrigerate (<4°C)',
        preparation_time: '2026-10-29 09:00',
        expiry_time: '2026-10-29 18:00',
        pickup_address: '45 Market Square, West End',
        latitude: 40.728,
        longitude: -74.012,
        notes: 'Cold room storage ready'
      });

      assert(validRes.status === 201, `Expected 201, got ${validRes.status}`);
      assert(validRes.data.success === true, 'Expected success: true');
      assert(validRes.data.data.food_name === 'Fresh Hydroponic Lettuce & Spinach', 'Name matches');
      assert(validRes.data.data.status === 'Available', 'Status is Available');
      createdDonationId = validRes.data.data.id;
    });

    // Test 7: Smart NGO Matching Engine
    await test('GET /api/donations/:id/match ranks NGOs with multi-criteria breakdown', async () => {
      const res = await request('GET', `/api/donations/${createdDonationId}/match`);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success: true');
      assert(Array.isArray(res.data.matches), 'Matches must be an array');
      assert(res.data.matches.length >= 5, 'Should rank all registered NGOs');

      const topMatch = res.data.matches[0];
      assert(topMatch.total_score >= 0 && topMatch.total_score <= 100, 'Score must be between 0 and 100');
      assert(topMatch.breakdown.distance !== undefined, 'Distance breakdown required');
      assert(topMatch.breakdown.urgency !== undefined, 'Urgency breakdown required');
      assert(topMatch.breakdown.capacity !== undefined, 'Capacity breakdown required');
      assert(topMatch.breakdown.category_demand !== undefined, 'Category demand breakdown required');
      assert(topMatch.breakdown.reliability !== undefined, 'Reliability breakdown required');
      assert(typeof topMatch.distance_km === 'number', 'Distance in km must be a number');
      assert(typeof topMatch.estimated_eta_minutes === 'number', 'ETA must be a number');

      // Check sorting descending
      for (let i = 0; i < res.data.matches.length - 1; i++) {
        assert(
          res.data.matches[i].total_score >= res.data.matches[i + 1].total_score,
          'Matches must be sorted descending by total score'
        );
      }
    });

    // Test 8: Edit available donation
    await test('PUT /api/donations/:id updates available donation', async () => {
      const res = await request('PUT', `/api/donations/${createdDonationId}`, {
        quantity: 45,
        notes: 'Updated note: Added 5 extra kg'
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.data.quantity === 45, 'Quantity should be updated to 45');
      assert(res.data.data.notes === 'Updated note: Added 5 extra kg', 'Notes updated');
    });

    // Test 9: Complete Lifecycle: Available -> Claimed -> Picked Up -> Delivered
    await test('Complete Workflow: Available -> Claimed -> Picked Up -> Delivered', async () => {
      // 1. Claim
      const claimRes = await request('POST', `/api/donations/${createdDonationId}/claim`, {
        ngo_id: 2, // Second Harvest
        notes: 'Volunteer driver assigned'
      });
      assert(claimRes.status === 200, `Expected 200, got ${claimRes.status}`);
      assert(claimRes.data.data.status === 'Claimed', 'Status must be Claimed');
      assert(claimRes.data.data.claimed_by_ngo_id === 2, 'Claimed by NGO 2');

      // Duplicate claim must fail
      const dupRes = await request('POST', `/api/donations/${createdDonationId}/claim`, {
        ngo_id: 1
      });
      assert(dupRes.status === 400, 'Duplicate claim on non-available donation must be rejected');

      // Invalid transition: Claimed -> Delivered directly must fail
      const badTrans = await request('POST', `/api/donations/${createdDonationId}/status`, {
        target_status: 'Delivered'
      });
      assert(badTrans.status === 400, 'Direct Claimed -> Delivered transition must be rejected');

      // 2. Pick Up
      const pickRes = await request('POST', `/api/donations/${createdDonationId}/status`, {
        target_status: 'Picked Up',
        notes: 'Loaded into refrigerated van'
      });
      assert(pickRes.status === 200, `Expected 200, got ${pickRes.status}`);
      assert(pickRes.data.data.status === 'Picked Up', 'Status must be Picked Up');

      // Editing picked up donation must be rejected
      const editPicked = await request('PUT', `/api/donations/${createdDonationId}`, {
        quantity: 50
      });
      assert(editPicked.status === 400, 'Cannot edit donation in Picked Up status');

      // Deleting picked up donation must be rejected
      const delPicked = await request('DELETE', `/api/donations/${createdDonationId}`);
      assert(delPicked.status === 400, 'Cannot delete donation in Picked Up status');

      // 3. Deliver
      const delivRes = await request('POST', `/api/donations/${createdDonationId}/status`, {
        target_status: 'Delivered',
        notes: 'Handed over to community pantry distribution team'
      });
      assert(delivRes.status === 200, `Expected 200, got ${delivRes.status}`);
      assert(delivRes.data.data.status === 'Delivered', 'Status must be Delivered');
    });

    // Test 10: Beginner Workflow (/request and 'Completed' status)
    await test('Beginner Workflow: POST /request and target_status: Completed', async () => {
      // Create donation
      const createRes = await request('POST', '/api/donations', {
        donor_id: 1,
        food_name: 'Dinner Buffet Extras',
        category: 'Cooked Meals',
        quantity: 30,
        preparation_time: '2026-10-29 18:00',
        expiry_time: '2026-10-29 23:00',
        pickup_address: '100 Grand Boulevard'
      });
      const dId = createRes.data.data.id;

      // 1. Request via /request alias
      const reqRes = await request('POST', `/api/donations/${dId}/request`, {
        ngo_id: 1,
        notes: 'Requested by Hope Street'
      });
      assert(reqRes.status === 200, 'Expected 200 on /request');

      // 2. Pick up
      const pickRes = await request('POST', `/api/donations/${dId}/status`, {
        target_status: 'Picked Up',
        notes: 'Driver collected'
      });
      assert(pickRes.status === 200, 'Expected 200 on Picked Up');

      // 3. Complete
      const compRes = await request('POST', `/api/donations/${dId}/status`, {
        target_status: 'Completed',
        notes: 'Meals distributed to community'
      });
      assert(compRes.status === 200, 'Expected 200 on Completed');
      assert(compRes.data.data.status === 'Completed', 'Status must be Completed');
    });

    // Test 11: Delete available donation
    await test('DELETE /api/donations/:id removes an available donation', async () => {
      // Create a temporary donation to delete
      const tempRes = await request('POST', '/api/donations', {
        donor_id: 3,
        food_name: 'Temporary Day-Old Bagels',
        category: 'Bakery',
        quantity: 15,
        preparation_time: '2026-10-29 08:00',
        expiry_time: '2026-10-29 16:00',
        pickup_address: '78 Baker Street'
      });
      const tempId = tempRes.data.data.id;

      const delRes = await request('DELETE', `/api/donations/${tempId}`);
      assert(delRes.status === 200, `Expected 200, got ${delRes.status}`);

      const checkRes = await request('GET', `/api/donations/${tempId}`);
      assert(checkRes.status === 404, 'Deleted donation must return 404');
    });

    // Test 11: Real-time Impact Metrics Calculation
    await test('GET /api/impact returns live environmental and economic metrics', async () => {
      const res = await request('GET', '/api/impact');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success: true');

      const { summary, environmental, by_category, by_status } = res.data.data;
      assert(summary.total_meals_donated > 0, 'Total meals must be positive');
      assert(summary.meals_delivered > 0, 'Meals delivered must be positive');
      assert(summary.completed_donations !== undefined, 'completed_donations alias must be present');
      assert(summary.meals_shared !== undefined, 'meals_shared alias must be present');
      assert(environmental.kg_diverted > 0, 'Kg diverted must be positive');
      assert(environmental.co2_saved_kg > 0, 'CO2 saved must be positive');
      assert(environmental.water_saved_liters > 0, 'Water saved must be positive');
      assert(environmental.money_saved_usd > 0, 'Money saved must be positive');
      assert(Array.isArray(by_category) && by_category.length > 0, 'Category breakdown present');
      assert(Array.isArray(by_status) && by_status.length > 0, 'Status breakdown present');
    });

    // Test 12: Transparent Algorithm Documentation
    await test('GET /api/system/algorithm provides multi-criteria heuristic transparency', async () => {
      const res = await request('GET', '/api/system/algorithm');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success: true');
      assert(res.data.weights.proximity_distance.weight_percent === 35, 'Distance weight 35%');
      assert(res.data.weights.urgency_time_decay.weight_percent === 25, 'Urgency weight 25%');
      assert(res.data.weights.vehicle_capacity_fit.weight_percent === 20, 'Capacity weight 20%');
      assert(res.data.weights.category_demand_match.weight_percent === 15, 'Demand weight 15%');
      assert(res.data.weights.fulfillment_reliability.weight_percent === 5, 'Reliability weight 5%');
    });

    // Test 13: Single-Page Application HTML Serving
    await test('GET / serves single-page frontend application', async () => {
      const res = await request('GET', '/');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(typeof res.data === 'string' && res.data.includes('RePlate'), 'HTML contains RePlate title');
      assert(res.data.includes('/static/css/style.css'), 'HTML references stylesheet');
      assert(res.data.includes('/static/js/app.js'), 'HTML references app logic');
    });

    console.log('\n============================================================');
    console.log(`  Test Suite Completed: ${passed} Passed, ${failed} Failed`);
    console.log('============================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
  }
}

if (require.main === module) {
  runTests().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}
