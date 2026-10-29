/**
 * RePlate — Database Initialization & Persistence Layer
 * Native SQLite data access with parameterized queries, audit logging,
 * and dynamic relative seed data for live hackathon demonstration.
 */

const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'replate.db');

let dbInstance = null;

/**
 * Initialize or get database connection.
 * Supports better-sqlite3 with seamless fallback to node:sqlite.
 */
function getDb() {
  if (dbInstance) return dbInstance;

  try {
    const Database = require('better-sqlite3');
    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    dbInstance = {
      type: 'better-sqlite3',
      raw: db,
      exec: (sql) => db.exec(sql),
      prepare: (sql) => {
        const stmt = db.prepare(sql);
        return {
          all: (...params) => stmt.all(...params),
          get: (...params) => stmt.get(...params),
          run: (...params) => {
            const res = stmt.run(...params);
            return {
              lastInsertRowid: Number(res.lastInsertRowid),
              changes: res.changes
            };
          }
        };
      },
      close: () => {
        db.close();
        dbInstance = null;
      }
    };
  } catch (err) {
    // Fallback to Node.js 22+ built-in node:sqlite
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA foreign_keys = ON;');
    dbInstance = {
      type: 'node:sqlite',
      raw: db,
      exec: (sql) => db.exec(sql),
      prepare: (sql) => {
        const stmt = db.prepare(sql);
        return {
          all: (...params) => stmt.all(...params),
          get: (...params) => stmt.get(...params),
          run: (...params) => {
            const res = stmt.run(...params);
            return {
              lastInsertRowid: Number(res.lastInsertRowid),
              changes: res.changes
            };
          }
        };
      },
      close: () => {
        db.close();
        dbInstance = null;
      }
    };
  }

  return dbInstance;
}

/**
 * Helper to format a Date into "YYYY-MM-DD HH:mm" string
 */
function formatDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/**
 * Initialize database tables and automatically seed data if empty.
 */
function initDb() {
  const db = getDb();

  // 1. Donors Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS donors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      contact_person TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      address TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. NGOs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ngos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      focus_area TEXT NOT NULL,
      contact_person TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      address TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      max_capacity_meals INTEGER NOT NULL,
      accepted_categories TEXT NOT NULL,
      operating_radius_km REAL NOT NULL,
      reliability_rating REAL DEFAULT 4.8,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Donations Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS donations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      donor_id INTEGER NOT NULL,
      food_name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit TEXT DEFAULT 'meals',
      dietary_type TEXT DEFAULT 'Vegetarian',
      storage_instructions TEXT DEFAULT 'Room Temperature',
      preparation_time TEXT NOT NULL,
      expiry_time TEXT NOT NULL,
      pickup_address TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'Available',
      claimed_by_ngo_id INTEGER,
      claimed_at TEXT,
      picked_up_at TEXT,
      delivered_at TEXT,
      beneficiary_notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (donor_id) REFERENCES donors (id) ON DELETE CASCADE,
      FOREIGN KEY (claimed_by_ngo_id) REFERENCES ngos (id) ON DELETE SET NULL
    );
  `);

  // 4. Delivery Status Audit Logs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS delivery_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      donation_id INTEGER NOT NULL,
      ngo_id INTEGER,
      status_from TEXT,
      status_to TEXT,
      notes TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (donation_id) REFERENCES donations (id) ON DELETE CASCADE
    );
  `);

  // Check if donors exist
  const row = db.prepare('SELECT COUNT(*) as count FROM donors').get();
  if (row.count === 0) {
    seedSampleData();
  }
}

/**
 * Seed realistic initial data with dynamic relative timestamps.
 */
function seedSampleData() {
  const db = getDb();
  const now = new Date();

  // 1. Seed Donors
  const donors = [
    [
      1,
      'Grand Central Banquet & Suites',
      'Hotel / Hospitality',
      'Chef Marcus Vance',
      '+1 (555) 234-5678',
      'catering@grandcentral.example.com',
      '100 Grand Boulevard, Downtown',
      40.7150,
      -74.0050
    ],
    [
      2,
      'GreenLeaf Organic Supermarket',
      'Grocery & Supermarket',
      'Sarah Jenkins (Store Mgr)',
      '+1 (555) 345-6789',
      'donations@greenleaf.example.com',
      '45 Market Square, West End',
      40.7280,
      -74.0120
    ],
    [
      3,
      'Artisan Hearth Bakery & Cafe',
      'Bakery & Cafe',
      'Antoine Dubois',
      '+1 (555) 456-7890',
      'antoine@artisanhearth.example.com',
      '78 Baker Street, North Quarter',
      40.7350,
      -73.9920
    ],
    [
      4,
      'Metro University Dining Commons',
      'Institutional Cafeteria',
      'Dave Miller (Food Services)',
      '+1 (555) 567-8901',
      'dining@metrouni.example.com',
      '250 Campus Walk, University District',
      40.7020,
      -74.0150
    ],
    [
      5,
      'Spice Symphony Gourmet Kitchen',
      'Restaurant',
      'Priya Sharma (Owner)',
      '+1 (555) 678-9012',
      'contact@spicesymphony.example.com',
      '312 Curry Row, Mid-City',
      40.7210,
      -73.9880
    ]
  ];

  const insertDonor = db.prepare(`
    INSERT INTO donors (id, name, type, contact_person, phone, email, address, latitude, longitude)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const d of donors) {
    insertDonor.run(...d);
  }

  // 2. Seed NGOs
  const ngos = [
    [
      1,
      'Hope Street Community Kitchen',
      'Hot Meal Distribution & Homeless Relief',
      'Elena Gomez (Director)',
      '+1 (555) 901-1122',
      'dispatch@hopestreet.org',
      '14 Hope Street, Downtown',
      40.7180,
      -74.0010,
      180,
      'Cooked Meals, Bakery, Fresh Produce, Dairy & Cold, Packaged Groceries',
      10.0,
      4.95
    ],
    [
      2,
      'Second Harvest Metro Food Bank',
      'Large Scale Pantry & Family Food Boxes',
      'Robert Washington',
      '+1 (555) 902-2233',
      'intake@secondharvestmetro.org',
      '520 Logistics Blvd, Eastside',
      40.7390,
      -73.9800,
      350,
      'Fresh Produce, Packaged Groceries, Bakery, Dairy & Cold',
      25.0,
      4.88
    ],
    [
      3,
      'NourishYouth Student Food Pantry',
      'Youth & Campus Hunger Relief',
      'Maya Patel',
      '+1 (555) 903-3344',
      'help@nourishyouth.org',
      '88 College Road, University District',
      40.7050,
      -74.0120,
      80,
      'Cooked Meals, Bakery, Packaged Groceries',
      6.0,
      4.92
    ],
    [
      4,
      'Mercy Haven Night Shelter',
      'Emergency Night Shelter & Warm Soups',
      'Father Thomas Byrne',
      '+1 (555) 904-4455',
      'shelter@mercyhaven.org',
      '205 Pinehurst Ave, North Quarter',
      40.7320,
      -73.9960,
      120,
      'Cooked Meals, Bakery, Dairy & Cold',
      8.0,
      4.80
    ],
    [
      5,
      'GreenCare Fresh Food Collective',
      'Produce Rescue & Senior Citizens Care',
      'Claire Lefebvre',
      '+1 (555) 905-5566',
      'contact@greencarecollective.org',
      '34 Community Center Way, West End',
      40.7250,
      -74.0180,
      100,
      'Fresh Produce, Bakery, Packaged Groceries',
      7.5,
      4.75
    ]
  ];

  const insertNgo = db.prepare(`
    INSERT INTO ngos (id, name, focus_area, contact_person, phone, email, address, latitude, longitude, max_capacity_meals, accepted_categories, operating_radius_km, reliability_rating)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const n of ngos) {
    insertNgo.run(...n);
  }

  // 3. Dynamic Relative Timestamps
  const prep1 = formatDate(new Date(now.getTime() - 1.5 * 3600000));
  const exp1 = formatDate(new Date(now.getTime() + 1.75 * 3600000)); // Urgent! ~1.75 hrs

  const prep2 = formatDate(new Date(now.getTime() - 2 * 3600000));
  const exp2 = formatDate(new Date(now.getTime() + 6 * 3600000));

  const prep3 = formatDate(new Date(now.getTime() - 3 * 3600000));
  const exp3 = formatDate(new Date(now.getTime() + 4 * 3600000));

  const prep4 = formatDate(new Date(now.getTime() - 2.5 * 3600000));
  const exp4 = formatDate(new Date(now.getTime() + 3 * 3600000));
  const claimed4 = formatDate(new Date(now.getTime() - 25 * 60000));

  const prep5 = formatDate(new Date(now.getTime() - 4 * 3600000));
  const exp5 = formatDate(new Date(now.getTime() + 5 * 3600000));
  const claimed5 = formatDate(new Date(now.getTime() - 1.5 * 3600000));
  const picked5 = formatDate(new Date(now.getTime() - 40 * 60000));

  const prep6 = formatDate(new Date(now.getTime() - 6 * 3600000));
  const exp6 = formatDate(new Date(now.getTime() + 1 * 3600000));
  const claimed6 = formatDate(new Date(now.getTime() - 4 * 3600000));
  const picked6 = formatDate(new Date(now.getTime() - 3 * 3600000));
  const deliv6 = formatDate(new Date(now.getTime() - 1.25 * 3600000));

  const prep7 = formatDate(new Date(now.getTime() - 12 * 3600000));
  const exp7 = formatDate(new Date(now.getTime() - 4 * 3600000));
  const claimed7 = formatDate(new Date(now.getTime() - 10 * 3600000));
  const picked7 = formatDate(new Date(now.getTime() - 9 * 3600000));
  const deliv7 = formatDate(new Date(now.getTime() - 7.5 * 3600000));

  // 4. Seed Donations
  const donations = [
    [
      1,
      1, // Grand Central
      'Gourmet Rice Pilaf, Roasted Veggies & Grilled Tofu',
      'Cooked Meals',
      85,
      'meals',
      'Vegetarian',
      'Keep Hot (>60°C)',
      prep1,
      exp1,
      '100 Grand Boulevard, Downtown (Kitchen Loading Dock B)',
      40.7150,
      -74.0050,
      'Freshly prepared for luncheon banquet, packaged in food-grade thermal containers.',
      'Available',
      null,
      null,
      null,
      null,
      null,
      formatDate(new Date(now.getTime() - 1 * 3600000))
    ],
    [
      2,
      2, // GreenLeaf
      'Organic Crisp Apples, Bell Peppers & Baby Greens',
      'Fresh Produce',
      120,
      'kg',
      'Vegan',
      'Refrigerate (<4°C)',
      prep2,
      exp2,
      '45 Market Square, West End (Rear Distribution Bay)',
      40.7280,
      -74.0120,
      'High quality surplus produce, sorted into 6 ready-to-transport stackable crates.',
      'Available',
      null,
      null,
      null,
      null,
      null,
      formatDate(new Date(now.getTime() - 2 * 3600000))
    ],
    [
      3,
      3, // Artisan Hearth
      'Sourdough Loaves, Croissants & Whole Grain Baguettes',
      'Bakery',
      60,
      'meals',
      'Vegetarian',
      'Room Temperature',
      prep3,
      exp3,
      '78 Baker Street, North Quarter (Bakery Side Entrance)',
      40.7350,
      -73.9920,
      'Baked early this morning. Packed in sanitary bakery bags, ideal for shelter breakfasts.',
      'Available',
      null,
      null,
      null,
      null,
      null,
      formatDate(new Date(now.getTime() - 2.75 * 3600000))
    ],
    [
      4,
      5, // Spice Symphony
      'Paneer Tikka Masala, Dal Makhani & Naan Bread',
      'Cooked Meals',
      50,
      'meals',
      'Vegetarian',
      'Keep Hot (>60°C)',
      prep4,
      exp4,
      '312 Curry Row, Mid-City',
      40.7210,
      -73.9880,
      'Surplus catering order. Seal-packed in aluminum foil pans.',
      'Claimed',
      1, // Hope Street
      claimed4,
      null,
      null,
      'Van 2 dispatched. Estimated pickup ETA 15 minutes.',
      formatDate(new Date(now.getTime() - 2 * 3600000))
    ],
    [
      5,
      2, // GreenLeaf
      'Assorted Sweet Oranges, Carrots & Spinach Crates',
      'Fresh Produce',
      90,
      'kg',
      'Vegan',
      'Refrigerate (<4°C)',
      prep5,
      exp5,
      '45 Market Square, West End',
      40.7280,
      -74.0120,
      'Surplus grocery crates in cold storage.',
      'Picked Up',
      2, // Second Harvest
      claimed5,
      picked5,
      null,
      'Driver Alex collected 6 crates. En route to Eastside pantry.',
      formatDate(new Date(now.getTime() - 3 * 3600000))
    ],
    [
      6,
      4, // Metro University
      'Deli Turkey & Veggie Wraps, Fresh Apple Slices',
      'Cooked Meals',
      75,
      'meals',
      'Any',
      'Refrigerate (<4°C)',
      prep6,
      exp6,
      '250 Campus Walk, Student Center Cafeteria',
      40.7020,
      -74.0150,
      'Individually wrapped lunch grab-and-go boxes from symposium.',
      'Delivered',
      3, // NourishYouth
      claimed6,
      picked6,
      deliv6,
      'Distributed to 65 commuter students and local community youth center.',
      formatDate(new Date(now.getTime() - 5 * 3600000))
    ],
    [
      7,
      1, // Grand Central
      'Slow-Cooked Herb Chicken, Mashed Potatoes & Green Beans',
      'Cooked Meals',
      110,
      'meals',
      'Non-Vegetarian',
      'Keep Hot (>60°C)',
      prep7,
      exp7,
      '100 Grand Boulevard, Downtown',
      40.7150,
      -74.0050,
      'Buffet evening dinner excess.',
      'Delivered',
      4, // Mercy Haven
      claimed7,
      picked7,
      deliv7,
      'Served as hot evening dinner to 105 shelter residents.',
      formatDate(new Date(now.getTime() - 11 * 3600000))
    ]
  ];

  const insertDonation = db.prepare(`
    INSERT INTO donations (
      id, donor_id, food_name, category, quantity, unit, dietary_type,
      storage_instructions, preparation_time, expiry_time, pickup_address,
      latitude, longitude, notes, status, claimed_by_ngo_id,
      claimed_at, picked_up_at, delivered_at, beneficiary_notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const d of donations) {
    insertDonation.run(...d);
  }

  // 5. Seed Delivery Audit Logs
  const insertLog = db.prepare(`
    INSERT INTO delivery_logs (donation_id, ngo_id, status_from, status_to, notes, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertLog.run(4, 1, 'Available', 'Claimed', 'Claimed by Hope Street Community Kitchen volunteer dispatch', claimed4);
  insertLog.run(5, 2, 'Available', 'Claimed', 'Claimed by Second Harvest Metro Food Bank', claimed5);
  insertLog.run(5, 2, 'Claimed', 'Picked Up', 'Volunteer driver Alex confirmed physical pickup', picked5);
  insertLog.run(6, 3, 'Available', 'Claimed', 'Claimed by NourishYouth Student Food Pantry', claimed6);
  insertLog.run(6, 3, 'Claimed', 'Picked Up', 'Picked up from University Cafeteria', picked6);
  insertLog.run(6, 3, 'Picked Up', 'Delivered', 'Successfully delivered to student center', deliv6);
  insertLog.run(7, 4, 'Available', 'Claimed', 'Claimed by Mercy Haven Night Shelter', claimed7);
  insertLog.run(7, 4, 'Claimed', 'Picked Up', 'Picked up from Grand Central Banquet', picked7);
  insertLog.run(7, 4, 'Picked Up', 'Delivered', '110 warm meals served to shelter residents', deliv7);
}

// ============================================================================
// Query & Mutation API
// ============================================================================

function getAllDonations(statusFilter, categoryFilter, searchTerm) {
  const db = getDb();
  let sql = `
    SELECT 
      d.*,
      donor.name as donor_name,
      donor.type as donor_type,
      donor.phone as donor_phone,
      donor.email as donor_email,
      ngo.name as ngo_name,
      ngo.phone as ngo_phone,
      ngo.focus_area as ngo_focus
    FROM donations d
    JOIN donors donor ON d.donor_id = donor.id
    LEFT JOIN ngos ngo ON d.claimed_by_ngo_id = ngo.id
    WHERE 1=1
  `;
  const params = [];

  if (statusFilter && statusFilter !== 'All') {
    sql += ' AND d.status = ?';
    params.push(statusFilter);
  }

  if (categoryFilter && categoryFilter !== 'All') {
    sql += ' AND d.category = ?';
    params.push(categoryFilter);
  }

  if (searchTerm && searchTerm.trim()) {
    const term = `%${searchTerm.trim()}%`;
    sql += ' AND (d.food_name LIKE ? OR donor.name LIKE ? OR d.pickup_address LIKE ?)';
    params.push(term, term, term);
  }

  sql += `
    ORDER BY 
      CASE d.status 
        WHEN 'Available' THEN 1 
        WHEN 'Claimed' THEN 2 
        WHEN 'Picked Up' THEN 3 
        WHEN 'Delivered' THEN 4 
        ELSE 5 
      END, 
      d.expiry_time ASC
  `;

  return db.prepare(sql).all(...params);
}

function getDonationById(id) {
  const db = getDb();
  const sql = `
    SELECT 
      d.*,
      donor.name as donor_name,
      donor.type as donor_type,
      donor.phone as donor_phone,
      donor.email as donor_email,
      ngo.name as ngo_name,
      ngo.phone as ngo_phone,
      ngo.focus_area as ngo_focus
    FROM donations d
    JOIN donors donor ON d.donor_id = donor.id
    LEFT JOIN ngos ngo ON d.claimed_by_ngo_id = ngo.id
    WHERE d.id = ?
  `;
  return db.prepare(sql).get(id);
}

function createDonation(data) {
  const db = getDb();
  const now = new Date();
  const createdAt = formatDate(now);

  const stmt = db.prepare(`
    INSERT INTO donations (
      donor_id, food_name, category, quantity, unit, dietary_type,
      storage_instructions, preparation_time, expiry_time, pickup_address,
      latitude, longitude, notes, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Available', ?)
  `);

  const res = stmt.run(
    Number(data.donor_id),
    String(data.food_name).trim(),
    String(data.category).trim(),
    Number(data.quantity),
    data.unit || 'meals',
    data.dietary_type || 'Vegetarian',
    data.storage_instructions || 'Room Temperature',
    String(data.preparation_time).trim(),
    String(data.expiry_time).trim(),
    String(data.pickup_address).trim(),
    parseFloat(data.latitude) || 40.7150,
    parseFloat(data.longitude) || -74.0050,
    (data.notes || '').trim(),
    createdAt
  );

  return res.lastInsertRowid;
}

function updateDonation(id, data) {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE donations
    SET donor_id = ?,
        food_name = ?,
        category = ?,
        quantity = ?,
        unit = ?,
        dietary_type = ?,
        storage_instructions = ?,
        preparation_time = ?,
        expiry_time = ?,
        pickup_address = ?,
        latitude = ?,
        longitude = ?,
        notes = ?
    WHERE id = ? AND status = 'Available'
  `);

  const res = stmt.run(
    Number(data.donor_id),
    String(data.food_name).trim(),
    String(data.category).trim(),
    Number(data.quantity),
    data.unit || 'meals',
    data.dietary_type || 'Vegetarian',
    data.storage_instructions || 'Room Temperature',
    String(data.preparation_time).trim(),
    String(data.expiry_time).trim(),
    String(data.pickup_address).trim(),
    parseFloat(data.latitude) || 40.7150,
    parseFloat(data.longitude) || -74.0050,
    (data.notes || '').trim(),
    Number(id)
  );

  return res.changes > 0;
}

function deleteDonation(id) {
  const db = getDb();
  const stmt = db.prepare("DELETE FROM donations WHERE id = ? AND status IN ('Available', 'Claimed')");
  const res = stmt.run(Number(id));
  return res.changes > 0;
}

function claimDonation(donationId, ngoId, notes) {
  const db = getDb();
  const donation = db.prepare('SELECT status, expiry_time FROM donations WHERE id = ?').get(Number(donationId));

  if (!donation) {
    return { success: false, message: 'Donation not found.' };
  }

  if (donation.status !== 'Available') {
    return { success: false, message: `This donation is no longer available (currently '${donation.status}').` };
  }

  const now = new Date();
  const claimedAt = formatDate(now);
  const logNotes = notes || 'Claimed via RePlate portal';

  const updateStmt = db.prepare(`
    UPDATE donations
    SET status = 'Claimed',
        claimed_by_ngo_id = ?,
        claimed_at = ?,
        beneficiary_notes = ?
    WHERE id = ? AND status = 'Available'
  `);

  const res = updateStmt.run(Number(ngoId), claimedAt, logNotes, Number(donationId));
  if (res.changes === 0) {
    return { success: false, message: 'Could not claim donation; it may have just been claimed by another NGO.' };
  }

  const logStmt = db.prepare(`
    INSERT INTO delivery_logs (donation_id, ngo_id, status_from, status_to, notes, timestamp)
    VALUES (?, ?, 'Available', 'Claimed', ?, ?)
  `);
  logStmt.run(Number(donationId), Number(ngoId), logNotes, claimedAt);

  return { success: true, message: 'Donation claimed successfully!' };
}

function advanceDonationStatus(donationId, targetStatus, notes) {
  const validTransitions = {
    Available: ['Claimed', 'Requested'],
    Claimed: ['Picked Up'],
    Requested: ['Picked Up'],
    'Picked Up': ['Delivered', 'Completed']
  };

  const db = getDb();
  const row = db.prepare('SELECT status, claimed_by_ngo_id FROM donations WHERE id = ?').get(Number(donationId));
  if (!row) {
    return { success: false, message: 'Donation not found.' };
  }

  const currentStatus = row.status;
  const ngoId = row.claimed_by_ngo_id;
  const allowed = validTransitions[currentStatus] || [];

  if (!allowed.includes(targetStatus)) {
    return {
      success: false,
      message: `Invalid workflow transition from '${currentStatus}' to '${targetStatus}'.`
    };
  }

  const nowStr = formatDate(new Date());

  if (targetStatus === 'Picked Up') {
    db.prepare(`
      UPDATE donations
      SET status = 'Picked Up',
          picked_up_at = ?,
          beneficiary_notes = COALESCE(?, beneficiary_notes)
      WHERE id = ?
    `).run(nowStr, notes || null, Number(donationId));
  } else if (targetStatus === 'Delivered' || targetStatus === 'Completed') {
    db.prepare(`
      UPDATE donations
      SET status = ?,
          delivered_at = ?,
          beneficiary_notes = COALESCE(?, beneficiary_notes)
      WHERE id = ?
    `).run(targetStatus, nowStr, notes || null, Number(donationId));
  }

  db.prepare(`
    INSERT INTO delivery_logs (donation_id, ngo_id, status_from, status_to, notes, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(Number(donationId), ngoId, currentStatus, targetStatus, notes || `Moved to ${targetStatus}`, nowStr);

  return { success: true, message: `Donation status updated to '${targetStatus}'.` };
}

function getAllNgos() {
  const db = getDb();
  return db.prepare('SELECT * FROM ngos WHERE is_active = 1 ORDER BY name ASC').all();
}

function getAllDonors() {
  const db = getDb();
  return db.prepare('SELECT * FROM donors ORDER BY name ASC').all();
}

function getImpactMetrics() {
  const db = getDb();

  const totals = db.prepare(`
    SELECT 
      COUNT(*) as total_donations,
      COALESCE(SUM(quantity), 0) as total_meals_donated,
      COALESCE(SUM(CASE WHEN status IN ('Delivered', 'Completed') THEN quantity ELSE 0 END), 0) as meals_delivered,
      COALESCE(SUM(CASE WHEN status = 'Picked Up' THEN quantity ELSE 0 END), 0) as meals_in_transit,
      COALESCE(SUM(CASE WHEN status IN ('Claimed', 'Requested') THEN quantity ELSE 0 END), 0) as meals_claimed,
      COALESCE(SUM(CASE WHEN status = 'Available' THEN quantity ELSE 0 END), 0) as meals_pending,
      COALESCE(SUM(CASE WHEN status IN ('Delivered', 'Completed') THEN 1 ELSE 0 END), 0) as deliveries_completed,
      COALESCE(SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END), 0) as active_listings
    FROM donations
  `).get();

  // Add beginner-friendly aliases
  totals.completed_donations = totals.deliveries_completed;
  totals.meals_shared = totals.meals_delivered;

  const byCategory = db.prepare(`
    SELECT category, COUNT(*) as count, SUM(quantity) as quantity
    FROM donations
    GROUP BY category
    ORDER BY quantity DESC
  `).all();

  const byStatus = db.prepare(`
    SELECT status, COUNT(*) as count, SUM(quantity) as quantity
    FROM donations
    GROUP BY status
  `).all();

  // Environmental and Economic Conversions (UN / FAO food waste rescue benchmarks)
  const deliveredMeals = Number(totals.meals_delivered) || 0;
  const kgDiverted = Math.round(deliveredMeals * 0.42 * 10) / 10;
  const co2SavedKg = Math.round(kgDiverted * 2.5 * 10) / 10;
  const waterSavedLiters = Math.round(deliveredMeals * 850);
  const moneySavedUsd = Math.round(deliveredMeals * 3.75 * 100) / 100;

  return {
    summary: totals,
    environmental: {
      kg_diverted: kgDiverted,
      co2_saved_kg: co2SavedKg,
      water_saved_liters: waterSavedLiters,
      money_saved_usd: moneySavedUsd
    },
    by_category: byCategory,
    by_status: byStatus
  };
}

function resetDb() {
  const db = getDb();
  db.exec('DROP TABLE IF EXISTS delivery_logs;');
  db.exec('DROP TABLE IF EXISTS donations;');
  db.exec('DROP TABLE IF EXISTS ngos;');
  db.exec('DROP TABLE IF EXISTS donors;');
  initDb();
}

module.exports = {
  getDb,
  initDb,
  formatDate,
  getAllDonations,
  getDonationById,
  createDonation,
  updateDonation,
  deleteDonation,
  claimDonation,
  advanceDonationStatus,
  getAllNgos,
  getAllDonors,
  getImpactMetrics,
  resetDb
};
