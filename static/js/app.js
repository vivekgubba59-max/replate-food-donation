/**
 * RePlate — Intelligent Food Rescue Platform
 * Front-End Architecture & Reactive Interactions
 */

// Global State
const state = {
  currentView: 'rescues',
  viewMode: 'grid', // 'grid' or 'table'
  donations: [],
  donors: [],
  ngos: [],
  impact: null,
  activeFilterStatus: 'All',
  activeFilterCategory: 'All',
  searchQuery: '',
  charts: {
    category: null,
    status: null
  }
};

// ============================================================================
// Initialization & Lifecycle
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initSearchAndFilters();
  initFormEventListeners();
  loadInitialData();

  // Periodic refresh every 45 seconds to keep countdowns active
  setInterval(() => {
    if (state.currentView === 'rescues' || state.currentView === 'dispatch') {
      fetchDonations(false);
    }
  }, 45000);
});

async function loadInitialData() {
  await Promise.all([
    fetchDonors(),
    fetchNgos(),
    fetchDonations(true),
    fetchImpactMetrics()
  ]);
}

// ============================================================================
// Navigation & Views
// ============================================================================
function initNavigation() {
  const tabButtons = document.querySelectorAll('.nav-tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.dataset.view;
      switchView(targetView);
    });
  });

  // Hero Quick action buttons
  const heroExploreBtn = document.getElementById('hero-explore-btn');
  if (heroExploreBtn) {
    heroExploreBtn.addEventListener('click', () => switchView('rescues'));
  }
  const heroDispatchBtn = document.getElementById('hero-dispatch-btn');
  if (heroDispatchBtn) {
    heroDispatchBtn.addEventListener('click', () => switchView('dispatch'));
  }
}

function switchView(viewName) {
  state.currentView = viewName;

  // Update tabs active state
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // Update view panels
  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `view-${viewName}`);
  });

  // Load view-specific data
  if (viewName === 'rescues') {
    renderDonations();
  } else if (viewName === 'dispatch') {
    renderDispatchPipeline();
  } else if (viewName === 'impact') {
    fetchImpactMetrics();
  } else if (viewName === 'directory') {
    renderDirectory();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// Data Fetching
// ============================================================================
async function fetchDonations(showLoading = true) {
  try {
    const params = new URLSearchParams();
    if (state.activeFilterStatus !== 'All') params.append('status', state.activeFilterStatus);
    if (state.activeFilterCategory !== 'All') params.append('category', state.activeFilterCategory);
    if (state.searchQuery.trim()) params.append('search', state.searchQuery.trim());

    const res = await fetch(`/api/donations?${params.toString()}`);
    const data = await res.json();

    if (data.success) {
      state.donations = data.data;
      updateRescuesCounterBadge();
      renderDonations();
      if (state.currentView === 'dispatch') {
        renderDispatchPipeline();
      }
    }
  } catch (err) {
    console.error('Error fetching donations:', err);
    showToast('Failed to load donations. Check backend connection.', 'error');
  }
}

async function fetchDonors() {
  try {
    const res = await fetch('/api/donors');
    const data = await res.json();
    if (data.success) {
      state.donors = data.data;
      populateDonorSelects();
    }
  } catch (err) {
    console.error('Error fetching donors:', err);
  }
}

async function fetchNgos() {
  try {
    const res = await fetch('/api/ngos');
    const data = await res.json();
    if (data.success) {
      state.ngos = data.data;
      populateNgoSelects();
    }
  } catch (err) {
    console.error('Error fetching NGOs:', err);
  }
}

async function fetchImpactMetrics() {
  try {
    const res = await fetch('/api/impact');
    const data = await res.json();
    if (data.success) {
      state.impact = data.data;
      renderImpactDashboard();
    }
  } catch (err) {
    console.error('Error fetching impact metrics:', err);
  }
}

function updateRescuesCounterBadge() {
  const activeCount = state.donations.filter(d => d.status === 'Available').length;
  const countBadge = document.getElementById('nav-available-count');
  if (countBadge) {
    countBadge.textContent = activeCount;
  }
  const heroAvailableBadge = document.getElementById('hero-active-count');
  if (heroAvailableBadge) {
    heroAvailableBadge.textContent = `${activeCount} Rescues Available`;
  }
}

// ============================================================================
// Search, Filters & View Mode
// ============================================================================
function initSearchAndFilters() {
  const searchInput = document.getElementById('search-donations');
  if (searchInput) {
    let timeout = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        state.searchQuery = e.target.value;
        fetchDonations(false);
      }, 300);
    });
  }

  const statusSelect = document.getElementById('filter-status');
  if (statusSelect) {
    statusSelect.addEventListener('change', (e) => {
      state.activeFilterStatus = e.target.value;
      fetchDonations(false);
    });
  }

  const categorySelect = document.getElementById('filter-category');
  if (categorySelect) {
    categorySelect.addEventListener('change', (e) => {
      state.activeFilterCategory = e.target.value;
      fetchDonations(false);
    });
  }

  // View mode toggle
  const gridBtn = document.getElementById('view-mode-grid');
  const tableBtn = document.getElementById('view-mode-table');
  if (gridBtn && tableBtn) {
    gridBtn.addEventListener('click', () => {
      state.viewMode = 'grid';
      gridBtn.classList.add('active');
      tableBtn.classList.remove('active');
      renderDonations();
    });
    tableBtn.addEventListener('click', () => {
      state.viewMode = 'table';
      tableBtn.classList.add('active');
      gridBtn.classList.remove('active');
      renderDonations();
    });
  }
}

// ============================================================================
// Render Donations View (Grid & Table)
// ============================================================================
function renderDonations() {
  const gridContainer = document.getElementById('donations-grid-container');
  const tableContainer = document.getElementById('donations-table-container');

  if (!gridContainer || !tableContainer) return;

  if (state.donations.length === 0) {
    gridContainer.style.display = 'block';
    tableContainer.style.display = 'none';
    gridContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🍲</div>
        <h3>No Food Rescues Found</h3>
        <p>No donations match your active filters. Try resetting search criteria or post a new donation.</p>
        <button class="btn btn-primary" onclick="openCreateDonationModal()">
          <span>+</span> Post First Donation
        </button>
      </div>
    `;
    return;
  }

  if (state.viewMode === 'grid') {
    gridContainer.style.display = 'grid';
    tableContainer.style.display = 'none';
    gridContainer.innerHTML = state.donations.map(d => createDonationCardHTML(d)).join('');
  } else {
    gridContainer.style.display = 'none';
    tableContainer.style.display = 'block';
    tableContainer.innerHTML = createDonationsTableHTML(state.donations);
  }
}

function createDonationCardHTML(d) {
  const isAvailable = d.status === 'Available';
  const isClaimed = d.status === 'Claimed';
  const isPickedUp = d.status === 'Picked Up';
  const isDelivered = d.status === 'Delivered';

  const categoryClass = getCategoryClass(d.category);
  const statusClass = getStatusClass(d.status);
  const expiryInfo = formatExpiryCountdown(d.expiry_time);

  let statusStripClass = 'status-available';
  if (isClaimed) statusStripClass = 'status-claimed';
  if (isPickedUp) statusStripClass = 'status-picked_up';
  if (isDelivered) statusStripClass = 'status-delivered';
  if (isAvailable && expiryInfo.isUrgent) statusStripClass = 'status-urgent';

  return `
    <div class="donation-card ${statusStripClass}">
      <div class="card-top-strip"></div>
      <div class="donation-card-body">
        <div class="card-header-row">
          <span class="category-badge ${categoryClass}">
            ${getCategoryIcon(d.category)} ${escapeHTML(d.category)}
          </span>
          <span class="status-badge ${statusClass}">
            ${escapeHTML(d.status)}
          </span>
        </div>

        <h3 class="card-food-name">${escapeHTML(d.food_name)}</h3>
        
        <div class="card-donor-info">
          <span>🏛️</span>
          <strong>${escapeHTML(d.donor_name)}</strong>
          <span>• ${escapeHTML(d.donor_type)}</span>
        </div>

        <div class="card-meta-chips">
          <span class="meta-chip qty-highlight">
            📦 ${d.quantity} ${escapeHTML(d.unit)}
          </span>
          <span class="meta-chip">
            🥗 ${escapeHTML(d.dietary_type)}
          </span>
          <span class="meta-chip">
            🌡️ ${escapeHTML(d.storage_instructions)}
          </span>
          <span class="meta-chip ${expiryInfo.isUrgent ? 'urgency-alert' : ''}">
            ${expiryInfo.label}
          </span>
        </div>

        <div class="card-location">
          <span>📍</span>
          <span>${escapeHTML(d.pickup_address)}</span>
        </div>

        ${d.notes ? `<div class="card-notes">"${escapeHTML(d.notes)}"</div>` : ''}

        ${d.ngo_name ? `
          <div class="claimed-ngo-badge">
            <strong>🚚 Rescued by:</strong> ${escapeHTML(d.ngo_name)}
            ${d.beneficiary_notes ? `<div style="font-size:0.75rem;margin-top:2px;color:#1E3A8A;">Status Note: ${escapeHTML(d.beneficiary_notes)}</div>` : ''}
          </div>
        ` : ''}

        <div class="card-actions">
          <div class="card-actions-left">
            ${isAvailable ? `
              <button class="btn btn-outline-emerald btn-sm" onclick="openSmartMatchModal(${d.id})" title="Intelligent NGO Match Engine">
                ⚡ Match NGOs
              </button>
              <button class="btn btn-primary btn-sm" onclick="openClaimModal(${d.id})">
                🚚 Claim
              </button>
            ` : ''}

            ${isClaimed ? `
              <button class="btn btn-primary btn-sm" onclick="advanceStatus(${d.id}, 'Picked Up')">
                📦 Pick Up
              </button>
            ` : ''}

            ${isPickedUp ? `
              <button class="btn btn-primary btn-sm" onclick="advanceStatus(${d.id}, 'Delivered')">
                ✅ Deliver
              </button>
            ` : ''}

            ${isDelivered ? `
              <span style="font-size:0.8rem; font-weight:700; color:var(--primary-700);">
                🎉 Waste Prevented!
              </span>
            ` : ''}
          </div>

          <div style="display: flex; gap: 0.3rem;">
            ${isAvailable ? `
              <button class="btn btn-secondary btn-sm" onclick="openEditDonationModal(${d.id})" title="Edit Details">
                ✏️
              </button>
            ` : ''}
            ${!isDelivered ? `
              <button class="btn btn-danger btn-sm" onclick="confirmDeleteDonation(${d.id})" title="Remove Donation">
                🗑️
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

function createDonationsTableHTML(donations) {
  return `
    <div class="donations-table-wrapper">
      <table class="donations-table">
        <thead>
          <tr>
            <th>Food Item</th>
            <th>Category</th>
            <th>Quantity</th>
            <th>Donor Organization</th>
            <th>Pickup Location</th>
            <th>Time Window</th>
            <th>Status</th>
            <th style="text-align: right;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${donations.map(d => {
            const expiry = formatExpiryCountdown(d.expiry_time);
            return `
              <tr>
                <td>
                  <strong>${escapeHTML(d.food_name)}</strong>
                  <div style="font-size:0.75rem; color:var(--neutral-500);">${escapeHTML(d.dietary_type)}</div>
                </td>
                <td>
                  <span class="category-badge ${getCategoryClass(d.category)}">
                    ${escapeHTML(d.category)}
                  </span>
                </td>
                <td><strong>${d.quantity} ${escapeHTML(d.unit)}</strong></td>
                <td>
                  <div>${escapeHTML(d.donor_name)}</div>
                  <div style="font-size:0.75rem; color:var(--neutral-500);">${escapeHTML(d.donor_phone || '')}</div>
                </td>
                <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  📍 ${escapeHTML(d.pickup_address)}
                </td>
                <td>
                  <span class="meta-chip ${expiry.isUrgent ? 'urgency-alert' : ''}">
                    ${expiry.label}
                  </span>
                </td>
                <td>
                  <span class="status-badge ${getStatusClass(d.status)}">
                    ${escapeHTML(d.status)}
                  </span>
                </td>
                <td style="text-align: right; white-space: nowrap;">
                  ${d.status === 'Available' ? `
                    <button class="btn btn-outline-emerald btn-sm" onclick="openSmartMatchModal(${d.id})">
                      ⚡ Match
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="openClaimModal(${d.id})">
                      🚚 Claim
                    </button>
                  ` : d.status === 'Claimed' ? `
                    <button class="btn btn-primary btn-sm" onclick="advanceStatus(${d.id}, 'Picked Up')">
                      📦 Pick Up
                    </button>
                  ` : d.status === 'Picked Up' ? `
                    <button class="btn btn-primary btn-sm" onclick="advanceStatus(${d.id}, 'Delivered')">
                      ✅ Deliver
                    </button>
                  ` : `
                    <span style="font-size:0.8rem; color:var(--primary-700); font-weight:700;">Complete</span>
                  `}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ============================================================================
// Render NGO Dispatch Hub Pipeline (Kanban / Stepper)
// ============================================================================
function renderDispatchPipeline() {
  const cols = {
    'Available': document.getElementById('pipeline-available-list'),
    'Claimed': document.getElementById('pipeline-claimed-list'),
    'Picked Up': document.getElementById('pipeline-picked-list'),
    'Delivered': document.getElementById('pipeline-delivered-list')
  };

  const counts = {
    'Available': document.getElementById('count-available'),
    'Claimed': document.getElementById('count-claimed'),
    'Picked Up': document.getElementById('count-picked'),
    'Delivered': document.getElementById('count-delivered')
  };

  if (!cols['Available']) return;

  // Clear existing
  Object.values(cols).forEach(col => col.innerHTML = '');

  const groups = {
    'Available': [],
    'Claimed': [],
    'Picked Up': [],
    'Delivered': []
  };

  state.donations.forEach(d => {
    if (groups[d.status]) groups[d.status].push(d);
  });

  // Render cards per column
  Object.keys(groups).forEach(status => {
    const list = groups[status];
    if (counts[status]) counts[status].textContent = list.length;

    if (list.length === 0) {
      cols[status].innerHTML = `
        <div style="text-align:center; padding:1.5rem 0.5rem; color:var(--neutral-400); font-size:0.85rem;">
          No donations in this stage
        </div>
      `;
      return;
    }

    cols[status].innerHTML = list.map(d => {
      const stepIdx = status === 'Available' ? 0 : status === 'Claimed' ? 1 : status === 'Picked Up' ? 2 : 3;
      return `
        <div class="pipeline-card">
          <div class="pipeline-card-title">${escapeHTML(d.food_name)}</div>
          <div class="pipeline-card-meta">
            <span>📦 ${d.quantity} ${escapeHTML(d.unit)}</span> • 
            <span>${escapeHTML(d.category)}</span>
          </div>
          <div style="font-size:0.775rem; color:var(--neutral-600); margin-bottom:0.5rem;">
            🏛️ <strong>${escapeHTML(d.donor_name)}</strong>
          </div>
          ${d.ngo_name ? `
            <div style="font-size:0.775rem; color:var(--primary-800); background:var(--primary-50); padding:0.25rem 0.5rem; border-radius:4px; margin-bottom:0.5rem;">
              🚚 <strong>${escapeHTML(d.ngo_name)}</strong>
            </div>
          ` : ''}

          <div class="pipeline-stepper-visual">
            <div class="stepper-node ${stepIdx >= 0 ? 'completed' : ''}" title="Available"></div>
            <div class="stepper-node ${stepIdx >= 1 ? 'completed' : ''}" title="Claimed"></div>
            <div class="stepper-node ${stepIdx >= 2 ? 'completed' : ''}" title="Picked Up"></div>
            <div class="stepper-node ${stepIdx >= 3 ? 'completed' : ''}" title="Delivered"></div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.65rem;">
            <span style="font-size:0.72rem; color:var(--neutral-500);">
              ${formatExpiryCountdown(d.expiry_time).label}
            </span>

            ${status === 'Available' ? `
              <button class="btn btn-outline-emerald btn-sm" onclick="openSmartMatchModal(${d.id})">
                ⚡ Match
              </button>
            ` : status === 'Claimed' ? `
              <button class="btn btn-primary btn-sm" onclick="advanceStatus(${d.id}, 'Picked Up')">
                📦 Pick Up
              </button>
            ` : status === 'Picked Up' ? `
              <button class="btn btn-primary btn-sm" onclick="advanceStatus(${d.id}, 'Delivered')">
                ✅ Deliver
              </button>
            ` : `
              <span style="font-size:0.75rem; color:var(--primary-700); font-weight:700;">Delivered ✓</span>
            `}
          </div>
        </div>
      `;
    }).join('');
  });
}

// ============================================================================
// Render Impact Analytics Dashboard
// ============================================================================
function renderImpactDashboard() {
  if (!state.impact) return;

  const summary = state.impact.summary;
  const env = state.impact.environmental;

  // Update Hero counters as well!
  setTextSafe('hero-stat-meals', summary.meals_delivered.toLocaleString());
  setTextSafe('hero-stat-waste', env.kg_diverted.toLocaleString() + ' kg');
  setTextSafe('hero-stat-co2', env.co2_saved_kg.toLocaleString() + ' kg');
  setTextSafe('hero-stat-water', env.water_saved_liters.toLocaleString() + ' L');

  // Update Impact view stat cards
  setTextSafe('impact-meals-delivered', summary.meals_delivered.toLocaleString());
  setTextSafe('impact-meals-total', summary.total_meals_donated.toLocaleString());
  setTextSafe('impact-waste-kg', env.kg_diverted.toLocaleString() + ' kg');
  setTextSafe('impact-co2-kg', env.co2_saved_kg.toLocaleString() + ' kg');
  setTextSafe('impact-water-liters', env.water_saved_liters.toLocaleString() + ' L');
  setTextSafe('impact-money-usd', '$' + env.money_saved_usd.toLocaleString());

  // Environmental Equivalencies calculation
  // 1 passenger vehicle generates ~4.6 metric tons CO2 / year (~12.6 kg / day)
  const carsOffRoad = (env.co2_saved_kg / 12.6).toFixed(1);
  setTextSafe('equiv-cars', `${carsOffRoad} Car Days`);

  // Average household consumes ~300 liters water/day
  const householdDays = Math.round(env.water_saved_liters / 300);
  setTextSafe('equiv-water', `${householdDays} Household Days`);

  // Zero-landfill diverted
  setTextSafe('equiv-landfill', `${env.kg_diverted} kg`);

  // Render Chart.js
  renderCharts();
}

function renderCharts() {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded yet');
    return;
  }

  const categoryCtx = document.getElementById('chart-category');
  const statusCtx = document.getElementById('chart-status');

  if (!categoryCtx || !statusCtx) return;

  // Category Doughnut Chart
  const categories = state.impact.by_category || [];
  const catLabels = categories.map(c => c.category);
  const catData = categories.map(c => c.quantity);

  if (state.charts.category) {
    state.charts.category.destroy();
  }

  state.charts.category = new Chart(categoryCtx, {
    type: 'doughnut',
    data: {
      labels: catLabels,
      datasets: [{
        data: catData,
        backgroundColor: [
          '#059669', // Emerald
          '#10B981', // Mint
          '#F59E0B', // Amber
          '#3B82F6', // Blue
          '#8B5CF6'  // Purple
        ],
        borderWidth: 2,
        borderColor: '#FFFFFF'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { size: 11, family: 'system-ui' } }
        }
      },
      cutout: '65%'
    }
  });

  // Pipeline Status Bar Chart
  const statuses = state.impact.by_status || [];
  const statusLabels = statuses.map(s => s.status);
  const statusData = statuses.map(s => s.quantity);

  if (state.charts.status) {
    state.charts.status.destroy();
  }

  state.charts.status = new Chart(statusCtx, {
    type: 'bar',
    data: {
      labels: statusLabels,
      datasets: [{
        label: 'Meals in Stage',
        data: statusData,
        backgroundColor: [
          '#10B981', // Available
          '#3B82F6', // Claimed
          '#F59E0B', // Picked Up
          '#047857'  // Delivered
        ],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { font: { size: 10 } }
        },
        x: {
          ticks: { font: { size: 11 } }
        }
      }
    }
  });
}

// ============================================================================
// Render Partner Directory
// ============================================================================
function renderDirectory() {
  const donorContainer = document.getElementById('directory-donors-list');
  const ngoContainer = document.getElementById('directory-ngos-list');

  if (donorContainer) {
    donorContainer.innerHTML = state.donors.map(donor => `
      <div class="directory-card">
        <div class="dir-header">
          <div class="dir-title">${escapeHTML(donor.name)}</div>
          <span class="dir-tag">${escapeHTML(donor.type)}</span>
        </div>
        <div class="dir-body">
          <div class="dir-detail-row">
            <span>👤 Contact:</span>
            <strong>${escapeHTML(donor.contact_person)}</strong>
          </div>
          <div class="dir-detail-row">
            <span>📞 Phone:</span>
            <span>${escapeHTML(donor.phone)}</span>
          </div>
          <div class="dir-detail-row">
            <span>✉️ Email:</span>
            <span>${escapeHTML(donor.email)}</span>
          </div>
          <div class="dir-detail-row">
            <span>📍 Address:</span>
            <span>${escapeHTML(donor.address)}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  if (ngoContainer) {
    ngoContainer.innerHTML = state.ngos.map(ngo => `
      <div class="directory-card">
        <div class="dir-header">
          <div class="dir-title">${escapeHTML(ngo.name)}</div>
          <span class="dir-tag" style="background:var(--primary-100); color:var(--primary-800);">
            ⭐ ${ngo.reliability_rating} / 5.0
          </span>
        </div>
        <div class="dir-body">
          <div style="font-weight:600; color:var(--primary-700); margin-bottom:0.4rem;">
            🎯 ${escapeHTML(ngo.focus_area)}
          </div>
          <div class="dir-detail-row">
            <span>🚚 Capacity:</span>
            <strong>${ngo.max_capacity_meals} meals/run</strong>
          </div>
          <div class="dir-detail-row">
            <span>🌐 Fleet Radius:</span>
            <span>Up to ${ngo.operating_radius_km} km</span>
          </div>
          <div class="dir-detail-row">
            <span>🥗 Accepts:</span>
            <span style="font-size:0.75rem;">${escapeHTML(ngo.accepted_categories)}</span>
          </div>
          <div class="dir-detail-row">
            <span>👤 Lead:</span>
            <span>${escapeHTML(ngo.contact_person)} (${escapeHTML(ngo.phone)})</span>
          </div>
          <div class="dir-detail-row">
            <span>📍 Dispatch Center:</span>
            <span>${escapeHTML(ngo.address)}</span>
          </div>
        </div>
      </div>
    `).join('');
  }
}

// ============================================================================
// Smart NGO Matcher Modal Logic
// ============================================================================
async function openSmartMatchModal(donationId) {
  const modal = document.getElementById('modal-smart-match');
  const container = document.getElementById('match-results-container');
  const banner = document.getElementById('match-donation-banner');

  if (!modal || !container) return;

  container.innerHTML = `
    <div style="text-align:center; padding:2rem;">
      <div class="pulse-dot" style="margin: 0 auto 1rem auto; width:14px; height:14px;"></div>
      <p style="font-size:0.9rem; color:var(--neutral-600); font-weight:600;">
        Running multi-criteria matching algorithm...
      </p>
    </div>
  `;
  modal.classList.add('active');

  try {
    const res = await fetch(`/api/donations/${donationId}/match`);
    const data = await res.json();

    if (!data.success) {
      container.innerHTML = `<div class="empty-state"><p>${data.error}</p></div>`;
      return;
    }

    const donation = data.donation;
    const matches = data.matches;

    banner.innerHTML = `
      <div>
        <h4 style="font-size:1.05rem; font-weight:700; color:var(--neutral-900); margin-bottom:2px;">
          ${escapeHTML(donation.food_name)}
        </h4>
        <div style="font-size:0.8rem; color:var(--neutral-600);">
          📦 ${donation.quantity} ${escapeHTML(donation.unit)} • 
          🏷️ ${escapeHTML(donation.category)} • 
          📍 ${escapeHTML(donation.pickup_address)}
        </div>
      </div>
      <span class="status-badge status-available">
        ${formatExpiryCountdown(donation.expiry_time).label}
      </span>
    `;

    if (matches.length === 0) {
      container.innerHTML = `<div class="empty-state"><p>No active NGOs currently found.</p></div>`;
      return;
    }

    container.innerHTML = `
      <div class="match-ranked-list">
        ${matches.map((m, idx) => {
          const isTop = idx === 0;
          const scoreClass = m.total_score >= 88 ? 'score-emerald' : m.total_score >= 72 ? 'score-teal' : m.total_score >= 55 ? 'score-amber' : 'score-rose';

          return `
            <div class="match-item-card ${isTop ? 'top-recommended' : ''}">
              ${isTop ? `<div class="recommended-ribbon">⭐ Highest Match Score</div>` : ''}
              
              <div class="match-item-header">
                <div>
                  <div class="match-ngo-name">${escapeHTML(m.ngo_name)}</div>
                  <div style="font-size:0.8rem; color:var(--neutral-500);">
                    🎯 ${escapeHTML(m.ngo_focus)} • 📍 ${escapeHTML(m.ngo_address)}
                  </div>
                </div>
                <div class="match-score-badge ${scoreClass}">
                  <span>${m.total_score}%</span>
                </div>
              </div>

              <!-- Quick Facts -->
              <div style="display:flex; gap:1rem; flex-wrap:wrap; font-size:0.8rem; margin-bottom:0.75rem;">
                <span>🚗 <strong>${m.distance_km} km</strong> away</span>
                <span>⏱️ ETA: ~<strong>${m.estimated_eta_minutes} mins</strong></span>
                <span>🚚 Fleet Capacity: <strong>${m.ngo_capacity} meals</strong></span>
                <span style="color:var(--primary-700); font-weight:700;">${m.match_tier}</span>
              </div>

              <!-- 5-Factor Score Breakdown Bars -->
              <div class="match-breakdown-bars">
                <div class="breakdown-bar-item">
                  <div class="bar-label-row">
                    <span>Proximity (35%)</span>
                    <span>${m.breakdown.distance.score} / 35</span>
                  </div>
                  <div class="bar-track">
                    <div class="bar-fill" style="width: ${(m.breakdown.distance.score / 35) * 100}%;"></div>
                  </div>
                </div>

                <div class="breakdown-bar-item">
                  <div class="bar-label-row">
                    <span>Urgency & ETA (25%)</span>
                    <span>${m.breakdown.urgency.score} / 25</span>
                  </div>
                  <div class="bar-track">
                    <div class="bar-fill" style="width: ${(m.breakdown.urgency.score / 25) * 100}%;"></div>
                  </div>
                </div>

                <div class="breakdown-bar-item">
                  <div class="bar-label-row">
                    <span>Capacity Fit (20%)</span>
                    <span>${m.breakdown.capacity.score} / 20</span>
                  </div>
                  <div class="bar-track">
                    <div class="bar-fill" style="width: ${(m.breakdown.capacity.score / 20) * 100}%;"></div>
                  </div>
                </div>

                <div class="breakdown-bar-item">
                  <div class="bar-label-row">
                    <span>Food Acceptance (15%)</span>
                    <span>${m.breakdown.category_demand.score} / 15</span>
                  </div>
                  <div class="bar-track">
                    <div class="bar-fill" style="width: ${(m.breakdown.category_demand.score / 15) * 100}%;"></div>
                  </div>
                </div>
              </div>

              <!-- Why this score? Transparent Explanations -->
              <div class="match-factors-accordion">
                <strong style="color:var(--neutral-800); display:block; margin-bottom:4px;">Scoring Explanations:</strong>
                <ul>
                  <li>• ${escapeHTML(m.breakdown.distance.explanation)}</li>
                  <li>• ${escapeHTML(m.breakdown.urgency.explanation)}</li>
                  <li>• ${escapeHTML(m.breakdown.capacity.explanation)}</li>
                  <li>• ${escapeHTML(m.breakdown.category_demand.explanation)}</li>
                  <li>• ${escapeHTML(m.breakdown.reliability.explanation)}</li>
                </ul>
              </div>

              <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:0.75rem;">
                <button class="btn btn-primary btn-sm" onclick="directAssignNgo(${donation.id}, ${m.ngo_id}, '${escapeHTML(m.ngo_name)}')">
                  🚚 Assign & Dispatch Rescue Team
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (err) {
    console.error('Error fetching match results:', err);
    container.innerHTML = `<div class="empty-state"><p>Error evaluating matches.</p></div>`;
  }
}

async function directAssignNgo(donationId, ngoId, ngoName) {
  try {
    const res = await fetch(`/api/donations/${donationId}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ngo_id: ngoId,
        notes: `Smart-matched and auto-dispatched to ${ngoName}`
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Assigned to ${ngoName}! Moved to Claimed status.`, 'success');
      closeModal('modal-smart-match');
      await fetchDonations(false);
      await fetchImpactMetrics();
    } else {
      showToast(data.error || 'Failed to assign NGO', 'error');
    }
  } catch (err) {
    showToast('Network error while assigning NGO', 'error');
  }
}

// ============================================================================
// Create & Edit Donation Form Logic
// ============================================================================
function initFormEventListeners() {
  const form = document.getElementById('form-donation');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleDonationSubmit();
    });
  }

  // Location preset chips
  document.querySelectorAll('.preset-loc-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const addr = btn.dataset.address;
      const lat = btn.dataset.lat;
      const lon = btn.dataset.lon;

      document.getElementById('don-address').value = addr;
      document.getElementById('don-lat').value = lat;
      document.getElementById('don-lon').value = lon;
    });
  });

  // Demo Preset generator buttons
  const demoBuffetBtn = document.getElementById('demo-preset-buffet');
  if (demoBuffetBtn) {
    demoBuffetBtn.addEventListener('click', () => fillDemoFormPreset('buffet'));
  }
  const demoProduceBtn = document.getElementById('demo-preset-produce');
  if (demoProduceBtn) {
    demoProduceBtn.addEventListener('click', () => fillDemoFormPreset('produce'));
  }
  const demoBakeryBtn = document.getElementById('demo-preset-bakery');
  if (demoBakeryBtn) {
    demoBakeryBtn.addEventListener('click', () => fillDemoFormPreset('bakery'));
  }
}

function openCreateDonationModal() {
  const modal = document.getElementById('modal-donation-form');
  const title = document.getElementById('donation-form-title');
  const form = document.getElementById('form-donation');
  if (!modal || !form) return;

  form.reset();
  document.getElementById('don-id').value = '';
  title.textContent = 'Post Fresh Food Donation';

  // Set default prep & expiry times relative to now
  const now = new Date();
  const prep = new Date(now.getTime() - (30 * 60000)); // 30 mins ago
  const exp = new Date(now.getTime() + (3.5 * 3600000)); // 3.5 hrs from now

  document.getElementById('don-prep-time').value = formatDateTimeLocal(prep);
  document.getElementById('don-expiry-time').value = formatDateTimeLocal(exp);

  // Default coordinates to downtown
  document.getElementById('don-lat').value = '40.7150';
  document.getElementById('don-lon').value = '-74.0050';

  modal.classList.add('active');
}

function openEditDonationModal(id) {
  const donation = state.donations.find(d => d.id === id);
  if (!donation) return;

  if (donation.status !== 'Available') {
    showToast(`Cannot edit donation in '${donation.status}' status`, 'warning');
    return;
  }

  const modal = document.getElementById('modal-donation-form');
  const title = document.getElementById('donation-form-title');
  if (!modal) return;

  title.textContent = 'Edit Food Donation Details';
  document.getElementById('don-id').value = donation.id;
  document.getElementById('don-donor-id').value = donation.donor_id;
  document.getElementById('don-food-name').value = donation.food_name;
  document.getElementById('don-category').value = donation.category;
  document.getElementById('don-quantity').value = donation.quantity;
  document.getElementById('don-unit').value = donation.unit;
  document.getElementById('don-dietary').value = donation.dietary_type;
  document.getElementById('don-storage').value = donation.storage_instructions;
  document.getElementById('don-prep-time').value = donation.preparation_time.replace(' ', 'T');
  document.getElementById('don-expiry-time').value = donation.expiry_time.replace(' ', 'T');
  document.getElementById('don-address').value = donation.pickup_address;
  document.getElementById('don-lat').value = donation.latitude;
  document.getElementById('don-lon').value = donation.longitude;
  document.getElementById('don-notes').value = donation.notes || '';

  modal.classList.add('active');
}

function fillDemoFormPreset(type) {
  const now = new Date();
  if (type === 'buffet') {
    document.getElementById('don-food-name').value = 'Executive Buffet: Herb Roasted Salmon & Wild Rice';
    document.getElementById('don-category').value = 'Cooked Meals';
    document.getElementById('don-quantity').value = '45';
    document.getElementById('don-unit').value = 'meals';
    document.getElementById('don-dietary').value = 'Non-Vegetarian';
    document.getElementById('don-storage').value = 'Keep Hot (>60°C)';
    document.getElementById('don-donor-id').value = '1'; // Grand Central
    document.getElementById('don-address').value = '100 Grand Boulevard, Downtown (Kitchen Loading Dock B)';
    document.getElementById('don-lat').value = '40.7150';
    document.getElementById('don-lon').value = '-74.0050';
    document.getElementById('don-notes').value = 'Freshly held in chafing pans at 65°C. Safe food rescue ready.';

    const exp = new Date(now.getTime() + (2 * 3600000)); // 2 hrs window
    document.getElementById('don-expiry-time').value = formatDateTimeLocal(exp);
  } else if (type === 'produce') {
    document.getElementById('don-food-name').value = 'Farm Fresh Bell Peppers, Heirloom Tomatoes & Cucumbers';
    document.getElementById('don-category').value = 'Fresh Produce';
    document.getElementById('don-quantity').value = '90';
    document.getElementById('don-unit').value = 'kg';
    document.getElementById('don-dietary').value = 'Vegan';
    document.getElementById('don-storage').value = 'Refrigerate (<4°C)';
    document.getElementById('don-donor-id').value = '2'; // GreenLeaf
    document.getElementById('don-address').value = '45 Market Square, West End (Rear Distribution Bay)';
    document.getElementById('don-lat').value = '40.7280';
    document.getElementById('don-lon').value = '-74.0120';
    document.getElementById('don-notes').value = 'Surplus farm delivery, pristine grade. Packed in clean stackable wooden crates.';

    const exp = new Date(now.getTime() + (6 * 3600000)); // 6 hrs window
    document.getElementById('don-expiry-time').value = formatDateTimeLocal(exp);
  } else if (type === 'bakery') {
    document.getElementById('don-food-name').value = 'Artisan Brioche Buns, Cinnamon Rolls & Multigrain Loaves';
    document.getElementById('don-category').value = 'Bakery';
    document.getElementById('don-quantity').value = '70';
    document.getElementById('don-unit').value = 'meals';
    document.getElementById('don-dietary').value = 'Vegetarian';
    document.getElementById('don-storage').value = 'Room Temperature';
    document.getElementById('don-donor-id').value = '3'; // Artisan Hearth
    document.getElementById('don-address').value = '78 Baker Street, North Quarter';
    document.getElementById('don-lat').value = '40.7350';
    document.getElementById('don-lon').value = '-73.9920';
    document.getElementById('don-notes').value = 'Baked fresh early today. Separated into sanitary pastry boxes.';

    const exp = new Date(now.getTime() + (4.5 * 3600000)); // 4.5 hrs
    document.getElementById('don-expiry-time').value = formatDateTimeLocal(exp);
  }
  showToast('Demo Preset Loaded!', 'success');
}

async function handleDonationSubmit() {
  const donationId = document.getElementById('don-id').value;
  const isEdit = Boolean(donationId);

  const payload = {
    donor_id: document.getElementById('don-donor-id').value,
    food_name: document.getElementById('don-food-name').value.trim(),
    category: document.getElementById('don-category').value,
    quantity: document.getElementById('don-quantity').value,
    unit: document.getElementById('don-unit').value,
    dietary_type: document.getElementById('don-dietary').value,
    storage_instructions: document.getElementById('don-storage').value,
    preparation_time: document.getElementById('don-prep-time').value.replace('T', ' '),
    expiry_time: document.getElementById('don-expiry-time').value.replace('T', ' '),
    pickup_address: document.getElementById('don-address').value.trim(),
    latitude: document.getElementById('don-lat').value,
    longitude: document.getElementById('don-lon').value,
    notes: document.getElementById('don-notes').value.trim()
  };

  if (!payload.food_name || !payload.pickup_address || !payload.quantity) {
    showToast('Please complete all required fields', 'error');
    return;
  }

  try {
    const url = isEdit ? `/api/donations/${donationId}` : '/api/donations';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      showToast(isEdit ? 'Donation updated successfully!' : 'Food donation published successfully!', 'success');
      closeModal('modal-donation-form');
      await fetchDonations(false);
      await fetchImpactMetrics();
    } else {
      showToast(data.error || 'Operation failed', 'error');
    }
  } catch (err) {
    showToast('Error saving donation', 'error');
  }
}

async function confirmDeleteDonation(id) {
  if (!confirm('Are you sure you want to remove this donation record? This action cannot be undone.')) {
    return;
  }

  try {
    const res = await fetch(`/api/donations/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Donation removed successfully', 'success');
      await fetchDonations(false);
      await fetchImpactMetrics();
    } else {
      showToast(data.error || 'Could not delete donation', 'error');
    }
  } catch (err) {
    showToast('Error deleting donation', 'error');
  }
}

// ============================================================================
// Claiming & Status Workflow Progression
// ============================================================================
function openClaimModal(donationId) {
  const donation = state.donations.find(d => d.id === donationId);
  if (!donation) return;

  const modal = document.getElementById('modal-claim');
  const banner = document.getElementById('claim-donation-info');
  if (!modal || !banner) return;

  document.getElementById('claim-donation-id').value = donation.id;
  banner.innerHTML = `
    <strong>${escapeHTML(donation.food_name)}</strong><br>
    <span style="font-size:0.8rem; color:var(--neutral-600);">
      📦 ${donation.quantity} ${escapeHTML(donation.unit)} from ${escapeHTML(donation.donor_name)}
    </span>
  `;

  modal.classList.add('active');
}

async function handleClaimSubmit(event) {
  event.preventDefault();
  const donationId = document.getElementById('claim-donation-id').value;
  const ngoId = document.getElementById('claim-ngo-id').value;
  const notes = document.getElementById('claim-notes').value.trim();

  try {
    const res = await fetch(`/api/donations/${donationId}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ngo_id: ngoId, notes })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Donation claimed! Added to dispatch schedule.', 'success');
      closeModal('modal-claim');
      await fetchDonations(false);
      await fetchImpactMetrics();
    } else {
      showToast(data.error || 'Claim failed', 'error');
    }
  } catch (err) {
    showToast('Error submitting claim', 'error');
  }
}

async function advanceStatus(donationId, targetStatus) {
  let notes = '';
  if (targetStatus === 'Delivered') {
    notes = prompt('Enter delivery verification notes (e.g. "Delivered to 80 shelter residents"):') || 'Delivered to beneficiaries';
  } else if (targetStatus === 'Picked Up') {
    notes = prompt('Volunteer Driver verification (e.g. "Driver Marcus confirmed loading"):') || 'Physical pickup completed';
  }

  try {
    const res = await fetch(`/api/donations/${donationId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_status: targetStatus, notes })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Donation marked as ${targetStatus}!`, 'success');
      await fetchDonations(false);
      await fetchImpactMetrics();
    } else {
      showToast(data.error || 'Failed to update status', 'error');
    }
  } catch (err) {
    showToast('Error advancing status', 'error');
  }
}

// ============================================================================
// Reset Demo Seed Data
// ============================================================================
async function resetDemoData() {
  if (!confirm('Reset the database to clean demo seed state? (This re-seeds realistic donors, NGOs, and sample donations for presentation)')) {
    return;
  }

  try {
    const res = await fetch('/api/reset-demo', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Demo data re-seeded to initial state!', 'success');
      await loadInitialData();
    }
  } catch (err) {
    showToast('Error resetting demo', 'error');
  }
}

// ============================================================================
// Helper Utilities & Formatting
// ============================================================================
function populateDonorSelects() {
  const sel = document.getElementById('don-donor-id');
  if (!sel) return;
  sel.innerHTML = state.donors.map(d => `
    <option value="${d.id}">${escapeHTML(d.name)} (${escapeHTML(d.type)})</option>
  `).join('');
}

function populateNgoSelects() {
  const sel = document.getElementById('claim-ngo-id');
  if (!sel) return;
  sel.innerHTML = state.ngos.map(n => `
    <option value="${n.id}">${escapeHTML(n.name)} (Cap: ${n.max_capacity_meals} meals)</option>
  `).join('');
}

function formatExpiryCountdown(expiryStr) {
  try {
    const expiry = new Date(expiryStr.replace(' ', 'T'));
    const now = new Date();
    const diffMs = expiry - now;

    if (diffMs <= 0) {
      return { label: '⚠️ Expired Window', isUrgent: true };
    }

    const diffHours = diffMs / 3600000;
    const hours = Math.floor(diffHours);
    const mins = Math.round((diffHours - hours) * 60);

    if (hours === 0) {
      return { label: `⏰ Urgent: ${mins}m left`, isUrgent: true };
    } else if (hours < 2) {
      return { label: `⏰ Urgent: ${hours}h ${mins}m left`, isUrgent: true };
    } else {
      return { label: `⏳ ${hours}h ${mins}m left`, isUrgent: false };
    }
  } catch (e) {
    return { label: expiryStr, isUrgent: false };
  }
}

function formatDateTimeLocal(dt) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = dt.getFullYear();
  const m = pad(dt.getMonth() + 1);
  const d = pad(dt.getDate());
  const h = pad(dt.getHours());
  const min = pad(dt.getMinutes());
  return `${y}-${m}-${d}T${h}:${min}`;
}

function getCategoryClass(cat) {
  if (cat.includes('Cooked')) return 'cat-cooked';
  if (cat.includes('Produce')) return 'cat-produce';
  if (cat.includes('Bakery')) return 'cat-bakery';
  if (cat.includes('Dairy')) return 'cat-dairy';
  return 'cat-packaged';
}

function getCategoryIcon(cat) {
  if (cat.includes('Cooked')) return '🍲';
  if (cat.includes('Produce')) return '🥬';
  if (cat.includes('Bakery')) return '🥖';
  if (cat.includes('Dairy')) return '🥛';
  return '🥫';
}

function getStatusClass(status) {
  if (status === 'Available') return 'status-available';
  if (status === 'Claimed') return 'status-claimed';
  if (status === 'Picked Up') return 'status-picked_up';
  return 'status-delivered';
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setTextSafe(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅';

  toast.innerHTML = `
    <div style="display:flex; align-items:center; gap:0.5rem;">
      <span>${icon}</span>
      <span>${escapeHTML(message)}</span>
    </div>
    <button style="border:none; background:none; cursor:pointer; color:var(--neutral-400); font-weight:700;" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 300ms ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
