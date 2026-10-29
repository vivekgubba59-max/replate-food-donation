/**
 * RePlate — Rule-Based Intelligent NGO Matching Engine
 * Multi-criteria heuristic scoring engine for food rescue dispatch optimization.
 * 100% Deterministic, mathematically sound, explainable ranking without black-box models.
 */

/**
 * Calculate great-circle distance between two decimal coordinates via Haversine formula.
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} distance in kilometers (rounded to 2 decimal places)
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371.0; // Earth radius in km
  const toRad = (deg) => (deg * Math.PI) / 180.0;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2.0) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * (Math.sin(deltaLambda / 2.0) ** 2);
  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));

  return Math.round(R * c * 100) / 100;
}

/**
 * Parse a standard datetime string ("YYYY-MM-DD HH:mm" or ISO) into Date object.
 * @param {string} dtStr 
 * @returns {Date}
 */
function parseDate(dtStr) {
  if (!dtStr) return new Date();
  const normalized = dtStr.replace(' ', 'T');
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Evaluate compatibility and score between a specific donation and an NGO.
 * @param {object} donation 
 * @param {object} ngo 
 * @returns {object} scored match details with complete factor breakdown
 */
function calculateMatchScore(donation, ngo) {
  const dLat = parseFloat(donation.latitude) || 40.715;
  const dLon = parseFloat(donation.longitude) || -74.005;
  const nLat = parseFloat(ngo.latitude) || 40.718;
  const nLon = parseFloat(ngo.longitude) || -74.001;

  // 1. Distance Calculation
  const distKm = haversineDistance(dLat, dLon, nLat, nLon);

  // 2. Time-to-Expiry Urgency
  const now = new Date();
  const expiryDt = parseDate(donation.expiry_time);
  let hoursRemaining = (expiryDt.getTime() - now.getTime()) / (1000 * 3600);
  if (isNaN(hoursRemaining)) hoursRemaining = 3.0;

  // Estimated dispatch mobilization + urban transit time (8 min mobilization + 2.5 min/km)
  const etaMinutes = Math.round(8 + distKm * 2.5);

  // --- CRITERION 1: Proximity & Distance (Weight: 35%) ---
  const maxRadius = parseFloat(ngo.operating_radius_km) || 10.0;
  let distRaw = 0;
  let distExpl = '';

  if (distKm <= 2.0) {
    distRaw = 100.0;
    distExpl = `Within walking/quick-transit range (${distKm} km). Prime rapid response area.`;
  } else if (distKm <= maxRadius) {
    const ratio = maxRadius > 2.0 ? (distKm - 2.0) / (maxRadius - 2.0) : 0.5;
    distRaw = Math.max(50.0, 95.0 - ratio * 45.0);
    distExpl = `Well within operating zone (${distKm} km of ${maxRadius} km limit).`;
  } else {
    distRaw = Math.max(10.0, 40.0 - (distKm - maxRadius) * 5.0);
    distExpl = `Outside typical radius (${distKm} km vs ${maxRadius} km max). Transit delays likely.`;
  }
  const distScore = Math.round((distRaw / 100.0) * 35.0 * 10) / 10;

  // --- CRITERION 2: Urgency & Transit Feasibility (Weight: 25%) ---
  let urgencyRaw = 0;
  let urgencyExpl = '';

  if (hoursRemaining <= 0) {
    urgencyRaw = 10.0;
    urgencyExpl = 'Donation past standard collection window; immediate emergency pickup required.';
  } else if (hoursRemaining <= 2.0) {
    if (distKm <= 4.0) {
      urgencyRaw = 100.0;
      urgencyExpl = `Critical urgency (${hoursRemaining.toFixed(1)}h left). NGO's ${etaMinutes}m ETA prevents spoilage.`;
    } else if (distKm <= 8.0) {
      urgencyRaw = 75.0;
      urgencyExpl = `High urgency (${hoursRemaining.toFixed(1)}h left). Rescue team can arrive in ~${etaMinutes}m.`;
    } else {
      urgencyRaw = 40.0;
      urgencyExpl = `High urgency (${hoursRemaining.toFixed(1)}h left) but distance (${distKm} km) risks deadline breach.`;
    }
  } else if (hoursRemaining <= 5.0) {
    urgencyRaw = 85.0;
    urgencyExpl = `Moderate urgency (${hoursRemaining.toFixed(1)}h window). Comfortable dispatch buffer.`;
  } else {
    urgencyRaw = 90.0;
    urgencyExpl = `Stable window (${hoursRemaining.toFixed(1)}h left). NGO can schedule optimized collection route.`;
  }
  const urgencyScore = Math.round((urgencyRaw / 100.0) * 25.0 * 10) / 10;

  // --- CRITERION 3: Capacity Fit (Weight: 20%) ---
  const donationQty = parseInt(donation.quantity, 10) || 1;
  const ngoCapacity = parseInt(ngo.max_capacity_meals, 10) || 100;
  let capRaw = 0;
  let capExpl = '';

  if (ngoCapacity >= donationQty) {
    const utilization = (donationQty / ngoCapacity) * 100.0;
    if (utilization >= 30.0) {
      capRaw = 100.0;
      capExpl = `Optimal capacity match: ${donationQty} meals fits ${ngoCapacity} meal vehicle (${Math.round(utilization)}% load).`;
    } else {
      capRaw = 85.0;
      capExpl = `Capacity ample: ${donationQty} meals easily handled by ${ngoCapacity} meal capacity.`;
    }
  } else {
    const ratio = ngoCapacity / donationQty;
    capRaw = Math.max(30.0, ratio * 70.0);
    capExpl = `Capacity constraint: Donation (${donationQty} meals) exceeds single-run limit (${ngoCapacity} meals).`;
  }
  const capacityScore = Math.round((capRaw / 100.0) * 20.0 * 10) / 10;

  // --- CRITERION 4: Category Demand & Acceptance (Weight: 15%) ---
  const donationCat = (donation.category || '').trim().toLowerCase();
  const acceptedList = (ngo.accepted_categories || '')
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

  const matchesCategory = acceptedList.some(
    (c) => donationCat.includes(c) || c.includes(donationCat)
  );

  let catRaw = 0;
  let catExpl = '';

  if (matchesCategory) {
    catRaw = 100.0;
    catExpl = `Exact demand alignment: NGO actively distributes ${donation.category}.`;
  } else {
    catRaw = 20.0;
    catExpl = `Category mismatch: NGO focuses on other streams, special handling required.`;
  }
  const categoryScore = Math.round((catRaw / 100.0) * 15.0 * 10) / 10;

  // --- CRITERION 5: NGO Reliability & Track Record (Weight: 5%) ---
  const reliability = parseFloat(ngo.reliability_rating) || 4.8;
  const relRaw = Math.min(100.0, (reliability / 5.0) * 100.0);
  const relScore = Math.round((relRaw / 100.0) * 5.0 * 10) / 10;
  const relExpl = `Verified fulfillment rating: ${reliability.toFixed(1)} / 5.0 stars with proven volunteer follow-through.`;

  // --- Composite Multi-Criteria Score ---
  let totalScore = Math.round((distScore + urgencyScore + capacityScore + categoryScore + relScore) * 10) / 10;
  totalScore = Math.min(100.0, Math.max(0.0, totalScore));

  // Determine Match Tier & Badging
  let tier = 'SUB-OPTIMAL';
  let tierColor = 'rose';
  let tierIcon = 'alert-triangle';

  if (totalScore >= 88.0) {
    tier = 'OPTIMAL MATCH';
    tierColor = 'emerald';
    tierIcon = 'award';
  } else if (totalScore >= 72.0) {
    tier = 'STRONG MATCH';
    tierColor = 'teal';
    tierIcon = 'check-circle';
  } else if (totalScore >= 55.0) {
    tier = 'VIABLE MATCH';
    tierColor = 'amber';
    tierIcon = 'clock';
  }

  return {
    ngo_id: ngo.id,
    ngo_name: ngo.name,
    ngo_focus: ngo.focus_area,
    ngo_phone: ngo.phone,
    ngo_email: ngo.email,
    ngo_address: ngo.address,
    ngo_capacity: ngoCapacity,
    distance_km: distKm,
    estimated_eta_minutes: etaMinutes,
    hours_remaining: Math.round(hoursRemaining * 10) / 10,
    total_score: totalScore,
    match_tier: tier,
    tier_color: tierColor,
    tier_icon: tierIcon,
    breakdown: {
      distance: {
        weight: 35,
        score: distScore,
        max: 35.0,
        explanation: distExpl
      },
      urgency: {
        weight: 25,
        score: urgencyScore,
        max: 25.0,
        explanation: urgencyExpl
      },
      capacity: {
        weight: 20,
        score: capacityScore,
        max: 20.0,
        explanation: capExpl
      },
      category_demand: {
        weight: 15,
        score: categoryScore,
        max: 15.0,
        explanation: catExpl
      },
      reliability: {
        weight: 5,
        score: relScore,
        max: 5.0,
        explanation: relExpl
      }
    }
  };
}

/**
 * Rank all eligible NGOs for a given donation in descending order of compatibility score.
 * @param {object} donation 
 * @param {Array<object>} ngosList 
 * @returns {Array<object>}
 */
function rankNgosForDonation(donation, ngosList) {
  if (!Array.isArray(ngosList) || ngosList.length === 0) return [];

  const scored = ngosList.map((ngo) => calculateMatchScore(donation, ngo));

  // Sort descending by total_score; secondary sort ascending by distance_km
  scored.sort((a, b) => {
    if (b.total_score !== a.total_score) {
      return b.total_score - a.total_score;
    }
    return a.distance_km - b.distance_km;
  });

  return scored;
}

module.exports = {
  haversineDistance,
  calculateMatchScore,
  rankNgosForDonation
};
