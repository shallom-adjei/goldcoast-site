
let promoInterval = null;
let promoEndTime = null;

async function loadInvestorCount() {
  const span = document.getElementById('investor-count-number');
  if (!span) return;

  let target = 500;
  try {
    const res = await fetch(`${API_BASE}/api/settings/investor_count`);
    if (res.ok) {
      const data = await res.json();
      target = data.count || 500;
    }
  } catch (e) { /* fallback to 500 */ }

  // Always start from 0 so the count-up is visible
  span.textContent = '0';

  // Animate smoothly over 1.5 seconds with an ease-out curve
  const duration = 1500;
  const start = performance.now();
  const startValue = 0;

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out (cubic)
    const eased = 1 - Math.pow(1 - progress, 3);
    span.textContent = Math.floor(startValue + (target - startValue) * eased);
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      span.textContent = target;  // ensure exact final number
    }
  }

  requestAnimationFrame(update);
}

async function loadPromoBanner() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/promo-status`);
    const data = await res.json();
    const modal = document.getElementById('promo-modal');
    const bubble = document.getElementById('promo-bubble');
    if (!modal || !bubble) return;

    if (!data.active) {
      modal.classList.add('hidden');
      bubble.classList.add('hidden');
      if (promoInterval) clearInterval(promoInterval);
      return;
    }

    // Populate modal
    document.getElementById('promo-modal-message').textContent = data.message || 'Limited‑time deposit bonus!';
    document.getElementById('promo-modal-min').textContent = '₵' + data.min_deposit;
    document.getElementById('promo-modal-bonus').textContent = data.bonus + '%';
    promoEndTime = new Date(data.end_time).getTime();

    // Show modal automatically on login (if not already minimised this session)
    if (!window._promoMinimised) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      bubble.classList.add('hidden');
    } else {
      // Already minimised – show bubble instead
      modal.classList.add('hidden');
      bubble.classList.remove('hidden');
    }

    // Start countdown
    updatePromoCountdown();
    if (promoInterval) clearInterval(promoInterval);
    promoInterval = setInterval(updatePromoCountdown, 1000);
  } catch (e) { /* ignore */ }
}

function updatePromoCountdown() {
  if (!promoEndTime) return;
  const diff = promoEndTime - Date.now();
  const expired = diff <= 0;
  const text = expired ? 'Expired' : formatCountdown(diff);
  document.getElementById('promo-modal-countdown').textContent = text;
  document.getElementById('promo-bubble-countdown').textContent = text;
  if (expired) {
    clearInterval(promoInterval);
    document.getElementById('promo-modal').classList.add('hidden');
    document.getElementById('promo-bubble').classList.add('hidden');
  }
}

function formatCountdown(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}h ${m}m ${s}s`;
}

function minimizePromo() {
  const modal = document.getElementById('promo-modal');
  const bubble = document.getElementById('promo-bubble');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  bubble.classList.remove('hidden');
  window._promoMinimised = true;   // only for this session
}

function expandPromo() {
  const modal = document.getElementById('promo-modal');
  const bubble = document.getElementById('promo-bubble');
  bubble.classList.add('hidden');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  window._promoMinimised = false;
}

function openDepositModalFromPromo() {
  minimizePromo();   // hide promo while depositing
  openDepositModal();
}

        function initLeadershipCarousel() {
  const track = document.getElementById('leadershipTrack');
  if (!track || typeof leadershipTeam === 'undefined') return;

  const cardsHTML = leadershipTeam.map(member => `
    <div class="leadership-card glass-premium rounded-2xl p-4 sm:p-5 text-center flex-shrink-0">
      <img src="${member.img}" alt="${member.name}" class="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-2 border-gold-400/30">
      <h5 class="text-base font-bold text-white">${member.name}</h5>
      <p class="text-gold-400 text-xs font-semibold mb-2">${member.role}</p>
      <p class="text-gray-400 text-[11px] leading-relaxed">${member.bio}</p>
    </div>
  `).join('');

  // Duplicate for seamless loop
  track.innerHTML = cardsHTML + cardsHTML;
}

document.addEventListener('DOMContentLoaded', initLeadershipCarousel);

        function openPlatformStrengthModal() {
  toggleProfileDropdown();   // close the profile dropdown
  const modal = document.getElementById('platform-strength-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lucide.createIcons();
  }
}

function closePlatformStrengthModal() {
  const modal = document.getElementById('platform-strength-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

        function toggleProfileDropdown() {
  const dropdown = document.getElementById('profile-dropdown');
  const chevron = document.getElementById('profile-chevron');
  dropdown.classList.toggle('hidden');
  if (chevron) {
    chevron.style.transform = dropdown.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
  const dropdown = document.getElementById('profile-dropdown');
  const trigger = e.target.closest('[onclick="toggleProfileDropdown()"]');
  if (!trigger && dropdown && !dropdown.classList.contains('hidden')) {
    dropdown.classList.add('hidden');
    const chevron = document.getElementById('profile-chevron');
    if (chevron) chevron.style.transform = 'rotate(0deg)';
  }
});

        function toggleCollapse(headerEl) {
  const content = headerEl.nextElementSibling;
  const icon = headerEl.querySelector('[data-lucide]');
  content.classList.toggle('collapsed');
  if (icon) {
    icon.style.transform = content.classList.contains('collapsed') ? 'rotate(-90deg)' : 'rotate(0deg)';
  }
}

        let currentReinvestTier = 1;
let reinvestPayout = 0;
let reinvestOriginalPlan = '';

function openReinvestModal(investmentId) {
  const inv = allInvestmentsLocal.find(i => i.id === investmentId);
  if (!inv) return;

  const rate = { starter:0.5, growth:0.7, premium:1.0 }[inv.plan] || 1.0;
  const payout = inv.amount * (1 + rate);
  reinvestPayout = payout;
  reinvestOriginalPlan = inv.plan;

  document.getElementById('reinvest-payout').textContent = '₵' + payout.toFixed(2);
  document.getElementById('reinvest-original-plan').textContent = inv.plan;
  document.getElementById('reinvest-investment-id').value = inv.id;

  // Reset to Tier 1
  currentReinvestTier = 1;
  document.getElementById('reinvest-tier1').classList.add('glass-gold');
  document.getElementById('reinvest-tier2-wrapper').classList.remove('glass-gold');
  document.getElementById('reinvest-tier2-options').classList.add('hidden');
  document.getElementById('reinvest-new-plan').value = inv.plan;

  document.getElementById('reinvest-modal').classList.remove('hidden');
  document.getElementById('reinvest-modal').classList.add('flex');
  lucide.createIcons();
}

function closeReinvestModal() {
  document.getElementById('reinvest-modal').classList.add('hidden');
  document.getElementById('reinvest-modal').classList.remove('flex');
}

function acceptTerms() {
  localStorage.setItem('gcc_terms_accepted', 'true');
  const modal = document.getElementById('terms-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

        function closeLockModal() {
  document.getElementById('lock-info-modal').classList.add('hidden');
  document.getElementById('lock-info-modal').classList.remove('flex');
}

function startNewPlanAndClose() {
  closeLockModal();
  // Close reinvest modal if open (it might be)
  closeReinvestModal();
  openDepositModal();
}
        
function selectTier1() {
  currentReinvestTier = 1;
  const tier1 = document.getElementById('reinvest-tier1');
  const wrapper = document.getElementById('reinvest-tier2-wrapper');
  const options = document.getElementById('reinvest-tier2-options');
  if (tier1) tier1.classList.add('glass-gold');
  if (wrapper) wrapper.classList.remove('glass-gold');
  if (options) options.classList.add('hidden');
}

function selectTier2() {
  currentReinvestTier = 2;
  const tier1 = document.getElementById('reinvest-tier1');
  const wrapper = document.getElementById('reinvest-tier2-wrapper');
  const options = document.getElementById('reinvest-tier2-options');
  if (tier1) tier1.classList.remove('glass-gold');
  if (wrapper) wrapper.classList.add('glass-gold');
  if (options) options.classList.remove('hidden');
  updateTier2Info();
  // populate MoMo
  const momoNum = document.getElementById('reinvest-momo-number');
  const momoName = document.getElementById('reinvest-momo-name');
  if (momoNum) momoNum.textContent = paymentSettings.momo_number || '••••••••••';
  if (momoName) momoName.textContent = paymentSettings.momo_name || '';
}

function updateTier2Info() {
  const planSelect = document.getElementById('reinvest-new-plan');
  const freshEl = document.getElementById('fresh-amount');
  const extraInput = document.getElementById('reinvest-extra-amount');
  const bonusEl = document.getElementById('reinvest-tier2-bonus');
  if (!planSelect || !freshEl || !bonusEl) return;

  const minAmounts = { starter: 200, growth: 300, premium: 500 };
  const requiredMin = minAmounts[planSelect.value] || 200;
  freshEl.textContent = '₵' + requiredMin;
  extraInput.min = requiredMin;
  extraInput.placeholder = `Min ₵${requiredMin}`;
 updateTier2Bonus();   // recalculate bonus using the current amount

  // Show payment credentials for the current method
  updateReinvestPaymentDetails();
}

function updateTier2Bonus() {
  const extraInput = document.getElementById('reinvest-extra-amount');
  const bonusEl = document.getElementById('reinvest-tier2-bonus');
  if (!extraInput || !bonusEl) return;

  const amount = parseFloat(extraInput.value) || 0;
  const bonus = Math.min(Math.floor(0.07 * amount), 30);   // 7% capped at 30
  bonusEl.textContent = `₵${bonus} (7% of ₵${amount})`;

  const freshDisplay = document.getElementById('fresh-amount-display');
  if (freshDisplay) {
    freshDisplay.textContent = `₵${amount.toFixed(2)}`;
      document.getElementById('tier2-summary-plan').textContent = document.getElementById('reinvest-new-plan').options[document.getElementById('reinvest-new-plan').selectedIndex].text;
document.getElementById('tier2-summary-amount').textContent = '₵' + amount.toFixed(2);
// Total = payout (reinvestPayout) + fresh amount
const total = reinvestPayout + amount;
document.getElementById('tier2-summary-total').textContent = '₵' + total.toFixed(2);
  }
}

function updateReinvestPaymentDetails() {
  const container = document.getElementById('reinvest-payment-credentials');
  const extraAmount = parseFloat(document.getElementById('reinvest-extra-amount').value) || 0;
  if (!container) return;

  // We only support MoMo now – no method selector needed
  const momoNumber = paymentSettings.momo_number || '••••••••••';
  const momoName = paymentSettings.momo_name || '';

  container.innerHTML = `
    <div class="bg-dark-950/50 rounded-xl p-4 mb-3 border border-white/5 text-center">
      <p class="text-xs text-gray-400 uppercase tracking-wider">MTN MoMo Number</p>
      <div class="flex items-center justify-center gap-3 mt-2">
        <p class="text-xl font-bold text-gradient tracking-wider">${momoNumber}</p>
        <button onclick="copyAddress('${momoNumber}')" class="text-gold-400 hover:text-gold-300">
          <i data-lucide="copy" class="w-5 h-5"></i>
        </button>
      </div>
      ${momoName ? `<p class="text-xs text-gray-400 mt-1">${momoName}</p>` : ''}
    </div>
    <label class="block text-sm text-gray-300 text-left mb-2">MoMo Transaction ID</label>
    <input type="text" id="reinvest-txid" placeholder="e.g., 1234567890" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-2">
  `;
  lucide.createIcons();
}

        async function processWithdrawal(investmentId, amount) {
  try {
    const res = await fetch(`${API_BASE}/api/withdrawals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ investment_id: investmentId })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Withdrawal failed', 'error');
      return;
    }
    showToast(data.message || 'Payout request submitted!', 'success');
    updateDashboard();
  } catch (e) {
    showToast('Connection error', 'error');
  }
}

async function submitReinvest() {
  const invId = document.getElementById('reinvest-investment-id').value;
  const plan = document.getElementById('reinvest-new-plan').value;
  const extraInput = document.getElementById('reinvest-extra-amount');
  const extraAmount = parseFloat(extraInput.value) || 0;

  const minAmounts = { starter: 200, growth: 300, premium: 500 };
  const requiredMin = minAmounts[plan];

  if (currentReinvestTier === 2) {
    if (extraAmount < requiredMin) {
      showToast(`Minimum fresh deposit for ${plan} is ₵${requiredMin}`, 'error');
      return;
    }
  }
    if (currentReinvestTier === 2) {
  const txid = document.getElementById('reinvest-txid').value.trim();
  if (!txid) {
    showToast('Please enter your MoMo Transaction ID', 'error');
    return;
  }
}
  const body = {
    original_investment_id: invId,
    new_plan: plan,
    extra_amount: currentReinvestTier === 2 ? extraAmount : 0,
    method: currentReinvestTier === 2 ? 'momo' : undefined,
    transaction_id: currentReinvestTier === 2 ? document.getElementById('reinvest-txid').value : undefined
  };

  if (currentReinvestTier === 2 && (!body.transaction_id || !body.method)) {
    showToast('Please enter transaction ID and payment method', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/reinvest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Reinvest failed', 'error');
      return;
    }
    closeReinvestModal();
    showToast(`Reinvest successful! ₵${data.bonus} bonus added to Prizes & Rewards.`, 'success');
    updateDashboard();
  } catch (e) {
    showToast('Connection error', 'error');
  }
}



        // Copy referral link to clipboard
function copyReferralLink() {
  const code = document.getElementById('dash-referral-code').textContent.trim();
  const refLink = `https://goldcoastcapital.org?ref=${encodeURIComponent(code)}`;
  navigator.clipboard.writeText(refLink).then(() => {
    showToast('Referral link copied!', 'success');
  }).catch(() => {
    showToast('Failed to copy', 'error');
  });
}

// Share referral link via WhatsApp or Telegram
function shareReferral(platform) {
  const code = document.getElementById('dash-referral-code').textContent.trim();
  const refLink = `https://goldcoastcapital.org?ref=${encodeURIComponent(code)}`;
  const message = `Join Gold Coast Capital and start investing with just ₵200! Sign up with my referral link: ${refLink}`;

  if (platform === 'whatsapp') {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  } else if (platform === 'telegram') {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('Join Gold Coast Capital today!')}`, '_blank');
  }
}

        // Store dismissed IDs in an array (localStorage)
function getDismissedIds() {
  try { return JSON.parse(localStorage.getItem('dismissed_announcements') || '[]'); } catch(e) { return []; }
}

function addDismissedId(id) {
  const ids = getDismissedIds();
  ids.push(id);
  localStorage.setItem('dismissed_announcements', JSON.stringify(ids));
}

async function openAnnouncementsModal() {
  const modal = document.getElementById('announcements-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  const list = document.getElementById('announcements-list');
  list.innerHTML = '<div class="text-gray-500 text-center py-2">Loading...</div>';

  try {
    const res = await fetch(`${API_BASE}/api/admin/announcements?limit=10`);
    if (!res.ok) throw new Error('Failed');
    const { announcements } = await res.json();
    if (!announcements || announcements.length === 0) {
      list.innerHTML = '<div class="text-gray-500 text-center py-4">No announcements.</div>';
      return;
    }
    const dismissedIds = getDismissedIds();
    const visible = announcements.filter(a => !dismissedIds.includes(a.id));
    if (visible.length === 0) {
      list.innerHTML = '<div class="text-gray-500 text-center py-4">No new announcements.</div>';
      return;
    }
    list.innerHTML = visible.map(a => `
      <div class="flex items-start justify-between border-b border-white/5 pb-2">
        <div>
          <p class="text-white">${a.message}</p>
          <span class="text-xs text-gray-500">${new Date(a.created_at).toLocaleString()}</span>
        </div>
        <button onclick="dismissSingleAnnouncement(${a.id})" class="text-gray-400 hover:text-red-400 ml-2 shrink-0"><i data-lucide="x" class="w-4 h-4"></i></button>
      </div>
    `).join('');
    lucide.createIcons();
  } catch(e) {
    list.innerHTML = '<div class="text-gray-500 text-center py-4">Failed to load announcements.</div>';
  }
}

function closeAnnouncementsModal() {
  document.getElementById('announcements-modal').classList.add('hidden');
  document.getElementById('announcements-modal').classList.remove('flex');
}

function dismissSingleAnnouncement(id) {
  addDismissedId(id);
  // Reload the modal list
  openAnnouncementsModal();
}

async function clearAllAnnouncements() {
  if (!await customConfirm('Dismiss all announcements?')) return;
  // Get all visible IDs and add them to dismissed list
  try {
    const res = await fetch(`${API_BASE}/api/admin/announcements?limit=100`);
    if (res.ok) {
      const { announcements } = await res.json();
      const ids = getDismissedIds();
      announcements.forEach(a => { if (!ids.includes(a.id)) ids.push(a.id); });
      localStorage.setItem('dismissed_announcements', JSON.stringify(ids));
    }
  } catch(e) {}
  closeAnnouncementsModal();
 const dot = document.getElementById('announcement-dot');
if (dot) dot.classList.add('hidden');
}

       let currentAnnouncementId = null;
async function loadAnnouncement() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/announcements`);
    if (!res.ok) return;
    const { announcements } = await res.json();
    const announcement = announcements && announcements.length > 0 ? announcements[0] : null;
    
    const dot = document.getElementById('announcement-dot');
    if (!announcement) {
      if (dot) dot.classList.add('hidden');
      return;
    }

    const dismissedIds = getDismissedIds();
    if (dismissedIds.includes(announcement.id)) {
      if (dot) dot.classList.add('hidden');
      return;
    }

    // Show the dot on the bell (but don’t show the banner)
    if (dot) dot.classList.remove('hidden');
    currentAnnouncementId = announcement.id; // keep for other functions
  } catch(e) {}
}

       async function loadTransactionHistory() {
  const tableBody = document.getElementById('transaction-table-body');
  const cardsContainer = document.getElementById('transaction-cards');
  try {
    const res = await fetch(`${API_BASE}/api/transactions`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!res.ok) throw new Error('Failed');
    const { transactions } = await res.json();

    // Table (sm+)
    if (tableBody) {
      tableBody.innerHTML = transactions.length === 0
        ? '<tr><td colspan="5" class="py-8 text-center text-gray-500">No transactions yet.</td></tr>'
        : transactions.map(tx => `
          <tr class="border-b border-white/5">
            <td class="py-3 capitalize">${tx.type}</td>
            <td class="py-3">${tx.description}</td>
            <td class="py-3 ${tx.type === 'withdrawal' || tx.type === 'referral_bonus' ? 'text-red-400' : 'text-green-400'}">₵${formatNumber(tx.amount)}</td>
            <td class="py-3"><span class="status-${tx.status}">${tx.status}</span></td>
            <td class="py-3 text-gray-400">${new Date(tx.date).toLocaleString()}</td>
          </tr>
        `).join('');
    }

    // Cards (mobile)
    if (cardsContainer) {
      cardsContainer.innerHTML = transactions.length === 0
        ? '<div class="text-gray-500 text-center py-4">No transactions yet.</div>'
        : transactions.map(tx => `
          <div class="glass rounded-lg p-3 mb-2 flex justify-between items-start">
            <div>
              <div class="font-semibold capitalize">${tx.type}</div>
              <div class="text-sm text-gray-300">${tx.description}</div>
              <div class="text-xs text-gray-500">${new Date(tx.date).toLocaleString()}</div>
            </div>
            <div class="text-right">
              <div class="${tx.type === 'withdrawal' || tx.type === 'referral_bonus' ? 'text-red-400' : 'text-green-400'} font-semibold">₵${formatNumber(tx.amount)}</div>
              <span class="status-${tx.status} text-xs">${tx.status}</span>
            </div>
          </div>
        `).join('');
    }
  } catch(e) {
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-gray-500">Failed to load transactions.</td></tr>';
    if (cardsContainer) cardsContainer.innerHTML = '<div class="text-gray-500 text-center py-4">Failed to load transactions.</div>';
  }
}

        async function handleForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value;
  const msgDiv = document.getElementById('forgot-message');
  try {
    const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    msgDiv.textContent = data.message;
    msgDiv.classList.remove('hidden');
    if (res.ok) {
      showToast('Reset link sent! Check your email.', 'success');
    }
  } catch (err) {
    msgDiv.textContent = 'Connection error.';
    msgDiv.classList.remove('hidden');
  }
}

async function handleResetPassword(e) {
  e.preventDefault();
  const token = document.getElementById('reset-token').value;
  const newPassword = document.getElementById('reset-password').value;
  const msgDiv = document.getElementById('reset-message');
  try {
    const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ token, newPassword })
    });
    const data = await res.json();
    msgDiv.textContent = data.message || data.error;
    msgDiv.classList.remove('hidden');
    if (res.ok) {
      showToast('Password reset successfully! Please login.', 'success');
      setTimeout(() => navigateTo('login'), 2000);
    }
  } catch (err) {
    msgDiv.textContent = 'Connection error.';
    msgDiv.classList.remove('hidden');
  }
}

        function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon = btn.querySelector('[data-lucide]');
  if (input.type === 'password') {
    input.type = 'text';
    icon.setAttribute('data-lucide', 'eye-off');
  } else {
    input.type = 'password';
    icon.setAttribute('data-lucide', 'eye');
  }
  lucide.createIcons();
}

// Simple XSS sanitizer – use for all user-supplied data you display
function safe(str) {
  return String(str).replace(/[&<>"']/g, function(m) {
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m];
  });
}

// Custom confirmation dialog (replaces native confirm)
function customConfirm(message) {
  return new Promise((resolve) => {
    document.getElementById('custom-confirm-message').innerHTML = message;
    document.getElementById('custom-confirm-modal').classList.remove('hidden');
    document.getElementById('custom-confirm-modal').classList.add('flex');

    function cleanup() {
      document.getElementById('custom-confirm-modal').classList.add('hidden');
      document.getElementById('custom-confirm-modal').classList.remove('flex');
      document.getElementById('custom-confirm-ok').removeEventListener('click', onOk);
      document.getElementById('custom-confirm-cancel').removeEventListener('click', onCancel);
    }

    function onOk() {
      cleanup();
      resolve(true);
    }
    function onCancel() {
      cleanup();
      resolve(false);
    }

    document.getElementById('custom-confirm-ok').addEventListener('click', onOk);
    document.getElementById('custom-confirm-cancel').addEventListener('click', onCancel);
  });
}

        const API_BASE = 'https://goldcoast-api.onrender.com';
        let currentUser = null;
        let authToken = localStorage.getItem('gcc_token');
        let selectedPlan = 'growth';
        let selectedPayment = 'momo';
        const returnRates = { starter: 0.5, growth: 0.7, premium: 1.0 };

// Payment detail generators (no hardcoded info in HTML)
function getMomoDetailsHtml(amountText) {
    const note = paymentSettings.payment_note || 'Send exactly the amount shown.';
    const momoNumber = paymentSettings.momo_number;
    const momoName = paymentSettings.momo_name;
    
    if (!momoNumber) {
        // No number configured – show a clean message
        return `<div class="text-gray-500 text-sm text-center py-4">⚠️ MoMo payment details not configured yet.</div>`;
    }

    return `
        <div class="flex items-center gap-2 mb-4"><i data-lucide="smartphone" class="w-5 h-5 text-gold-400"></i><span class="font-medium">Send to MTN Mobile Money</span></div>
                <div class="bg-dark-950/50 rounded-lg p-4 mb-4 text-center">
            <p class="text-gray-400 text-xs mb-1">MTN MoMo Number</p>
            <div class="flex items-center justify-center gap-2">
                <p class="text-2xl font-bold text-gradient tracking-wider">${momoNumber}</p>
                <button onclick="copyAddress('${momoNumber}')" class="text-gold-400 hover:text-gold-300 transition-colors" title="Copy number">
                    <i data-lucide="copy" class="w-4 h-4"></i>
                </button>
            </div>
            ${momoName ? `<p class="text-gray-400 text-xs mt-1">${momoName}</p>` : ''}
        </div>
        <div class="space-y-2 text-sm text-gray-400">
            <div class="flex items-start gap-2"><i data-lucide="info" class="w-4 h-4 mt-0.5 text-gold-400 shrink-0"></i> ${note} <span class="text-white font-medium mx-1">${amountText}</span></div>
        </div>
    `;
}

function getCryptoDetailsHtml(amountText) {
    const usdt = paymentSettings.usdt_address;
    const btc = paymentSettings.btc_address;
    const eth = paymentSettings.eth_address;
    if (!usdt && !btc && !eth) {
        return `<div class="text-gray-500 text-sm text-center py-4">⚠️ Crypto payment details not configured yet.</div>`;
    }

    return `
        <div class="flex items-center gap-2 mb-4"><i data-lucide="bitcoin" class="w-5 h-5 text-orange-400"></i><span class="font-medium">Send Cryptocurrency</span></div>
        <div class="space-y-4">
            ${usdt ? `<div class="bg-dark-950/50 rounded-lg p-4">
                <div class="flex items-center justify-between mb-1"><span class="text-xs text-gray-400">USDT (TRC20)</span><button onclick="copyAddress('${usdt}')" class="text-gold-400 text-xs hover:underline"><i data-lucide="copy" class="w-3 h-3"></i> Copy</button></div>
                <p class="text-sm font-mono break-all text-gray-300">${usdt}</p>
            </div>` : ''}
            ${btc ? `<div class="bg-dark-950/50 rounded-lg p-4">
                <div class="flex items-center justify-between mb-1"><span class="text-xs text-gray-400">Bitcoin (BTC)</span><button onclick="copyAddress('${btc}')" class="text-gold-400 text-xs hover:underline"><i data-lucide="copy" class="w-3 h-3"></i> Copy</button></div>
                <p class="text-sm font-mono break-all text-gray-300">${btc}</p>
            </div>` : ''}
            ${eth ? `<div class="bg-dark-950/50 rounded-lg p-4">
                <div class="flex items-center justify-between mb-1"><span class="text-xs text-gray-400">Ethereum (ETH)</span><button onclick="copyAddress('${eth}')" class="text-gold-400 text-xs hover:underline"><i data-lucide="copy" class="w-3 h-3"></i> Copy</button></div>
                <p class="text-sm font-mono break-all text-gray-300">${eth}</p>
            </div>` : ''}
        </div>
        <div class="mt-4 space-y-2 text-sm text-gray-400">
            <div class="flex items-start gap-2"><i data-lucide="alert-triangle" class="w-4 h-4 mt-0.5 text-orange-400 shrink-0"></i> Send equivalent of <span class="text-white font-medium mx-1">${amountText}</span></div>
        </div>
    `;
}

        // Payment settings (will be loaded from backend)
let paymentSettings = {
  momo_number: '',
  usdt_address: '',
  btc_address: '',
  eth_address: '',
  payment_note: ''
};


async function loadPaymentSettings() {
  if (!authToken) return;
  try {
    const res = await fetch(`${API_BASE}/api/settings`, {
      headers: {'Authorization': `Bearer ${authToken}`}
    });
    if (res.ok) {
      const data = await res.json();
      if (data.settings) paymentSettings = data.settings;
    }
  } catch(e) { /* keep defaults */ }
}

        let growthChart = null;   
        let countdownTimer = null; 

       function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');

    // 🔁 Auto‑fill the referral code when navigating to the signup page
    if (page === 'signup') {
        const storedRef = localStorage.getItem('gcc_ref_code');
        if (storedRef) {
            const refInput = document.getElementById('signup-referral');
            if (refInput) refInput.value = storedRef;
        }
    }

    if (page === 'dashboard') updateDashboard();
    window.scrollTo(0, 0);
}

        async function handleSignup(e) {
            e.preventDefault();
            const payload = {
                name: document.getElementById('signup-name').value,
                email: document.getElementById('signup-email').value,
                phone: document.getElementById('signup-phone').value,
                password: document.getElementById('signup-password').value,
                referral: document.getElementById('signup-referral').value
            };
            try {
                const res = await fetch(`${API_BASE}/api/auth/register`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (!res.ok) return showToast(data.error || 'Registration failed', 'error');
                authToken = data.token;
                currentUser = data.user;
                localStorage.setItem('gcc_token', authToken);
                localStorage.setItem('gcc_user', JSON.stringify(data.user));
                loadPaymentSettings();
                showToast('Account created!', 'success');
                navigateTo('dashboard');
            } catch (err) { showToast('Connection error', 'error'); }
        }

        async function handleLogin(e) {
            e.preventDefault();
            const payload = {
                email: document.getElementById('login-email').value,
                password: document.getElementById('login-password').value
            };
            try {
                const res = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (!res.ok) return showToast(data.error || 'Login failed', 'error');
                authToken = data.token;
                currentUser = data.user;
                localStorage.setItem('gcc_token', authToken);
                localStorage.setItem('gcc_user', JSON.stringify(data.user));
                loadPaymentSettings();
                showToast('Welcome back!', 'success');
                navigateTo('dashboard');
            } catch (err) { showToast('Connection error', 'error'); }
        }

        function handleLogout() {
    if (countdownTimer) clearInterval(countdownTimer);   // <-- add this line
    localStorage.removeItem('gcc_token');
    localStorage.removeItem('gcc_user');
    authToken = null;
    currentUser = null;
    navigateTo('landing');
     const badge = document.getElementById('investor-count-fixed');
if (badge) badge.style.display = 'none';
}

        async function updateDashboard() {
            if (!authToken) return handleLogout();
            if (!currentUser) {
                const res = await fetch(`${API_BASE}/api/auth/me`, {
                    headers: {'Authorization': `Bearer ${authToken}`}
                });
                if (!res.ok) { handleLogout(); return; }
                const data = await res.json();
                currentUser = data.user;
                // Show loader
            document.getElementById('dashboard-loader').classList.remove('hidden');
            }

            document.getElementById('dash-name').textContent = safe(currentUser.name.split(' ')[0]);
            document.getElementById('dash-username').textContent = safe(currentUser.name.split(' ')[0]);
            document.getElementById('dash-avatar').textContent = currentUser.name[0].toUpperCase();
            // VIP badge
              const badge = document.getElementById('partner-badge');
               if (badge) {
                if (currentUser.is_partner) {
                 badge.classList.remove('hidden');
                   } else {
                      badge.classList.add('hidden');
                       }
                    }
            document.getElementById('dash-referral-code').textContent = currentUser.referral_code || currentUser.id;
            document.getElementById('dash-bonus').textContent = `₵${formatNumber(currentUser.bonus || 0)}`;
            document.getElementById('dash-game-balance').textContent = `₵${formatNumber(currentUser.game_balance || 0)}`;
            loadLeaderboard();
            loadAnnouncement();
            

const btn = document.getElementById('withdraw-bonus-btn');
if (btn) {
    const b = parseFloat((currentUser.bonus || 0).toString());
    btn.disabled = b < 50;
    btn.style.opacity = b < 50 ? '0.5' : '1';
}
const gameBtn = document.getElementById('withdraw-game-btn');
if (gameBtn) {
    const gb = parseFloat((currentUser.game_balance || 0).toString());
    gameBtn.disabled = gb < 30;
    gameBtn.style.opacity = gb < 30 ? '0.5' : '1';
}
   const [invRes, wdrRes] = await Promise.all([
    fetch(`${API_BASE}/api/investments`, { headers: {'Authorization': `Bearer ${authToken}`} }),
    fetch(`${API_BASE}/api/withdrawals`, { headers: {'Authorization': `Bearer ${authToken}`} })
]);
const { investments } = await invRes.json();
const { withdrawals } = await wdrRes.json();
window.allInvestmentsLocal = investments;
window.allWithdrawalsLocal = withdrawals;

            const withdrawalMap = {};
            withdrawals.forEach(w => { withdrawalMap[w.investment_id] = w; });

            const totalInvested = investments.reduce((s, i) => (i.status !== 'rejected' && i.status !== 'reinvested') ? s + i.amount : s, 0);
            // Total active balance (used for withdrawal eligibility)
const totalActive = investments
  .filter(i => i.status === 'active')
  .reduce((s, i) => s + i.amount, 0);

document.getElementById('stat-active-total').textContent = '₵' + formatNumber(totalActive);
          const totalEarnings = investments.reduce((s, i) => {
    if (i.status !== 'active') return s;  // only active investments
    const rate = returnRates[i.plan] || 1;
    const progress = getProgress(i) / 100;
    return s + (i.amount * rate * progress);
}, 0);
          const totalExpected = investments.reduce((s, i) => {
    if (i.status === 'pending') return s + i.amount;
    if (i.status === 'rejected' || i.status === 'matured' || i.status === 'reinvested') return s;
    return s + i.amount * (1 + (returnRates[i.plan] || 1));
}, 0);
            const activityEl = document.getElementById('recent-activity');
if (activityEl) {
  if (investments.length === 0) {
    activityEl.innerHTML = '<div class="text-gray-500 text-sm text-center py-4">No activity yet</div>';
  } else {
    activityEl.innerHTML = investments.slice(-3).reverse().map(inv => `
      <div class="flex items-center justify-between glass rounded-lg p-2.5">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-full ${inv.method==='momo'?'bg-yellow-500/20':'bg-orange-500/20'} flex items-center justify-center"><span class="text-xs">${inv.method==='momo'?'M':'₿'}</span></div>
          <div><div class="text-xs font-medium">₵${formatNumber(inv.amount)}</div><div class="text-[10px] text-gray-500">${inv.plan}</div></div>
        </div>
        <span class="text-[10px] text-gray-500">${timeAgo(inv.date)}</span>
      </div>
    `).join('');
  }
}
           const activeInvs = investments.filter(i => i.status !== 'pending' && i.status !== 'rejected' && i.status !== 'matured' && i.status !== 'reinvested');

// --- Live countdown for Days Left (skip already‑passed maturities) ---
if (countdownTimer) clearInterval(countdownTimer);
let nextMaturity = null;

if (activeInvs.length > 0) {
    const now = Date.now();
    // Fallback planDays only used if duration_days is missing (shouldn't happen after migration)
    const planDays = { starter: 10, growth: 20, premium: 30 };
    for (const inv of activeInvs) {
        const effectiveDays = inv.duration_days || planDays[inv.plan] || 14;
        const matureTime = new Date(inv.date).getTime() + effectiveDays * 86400000;
        if (matureTime > now && (nextMaturity === null || matureTime < nextMaturity)) {
            nextMaturity = matureTime;
        }
    }
}

if (nextMaturity) {
    const updateCountdown = () => {
        const distance = nextMaturity - Date.now();
        if (distance <= 0) {
            document.getElementById('stat-days').textContent = 'Matured';
            clearInterval(countdownTimer);
            return;
        }
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        document.getElementById('stat-days').textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    };
    countdownTimer = setInterval(updateCountdown, 1000);
    updateCountdown();
} else {
    // Either no active investments or all have already passed maturity
    document.getElementById('stat-days').textContent = activeInvs.length > 0 ? 'Matured' : '0';
}

            document.getElementById('stat-invested').textContent = `₵${formatNumber(totalInvested)}`;
            document.getElementById('stat-earnings').textContent = `₵${formatNumber(totalEarnings)}`;
            document.getElementById('stat-expected').textContent = `₵${formatNumber(totalExpected)}`;
            // Total successful withdrawals (paid)
const totalWithdrawn = withdrawals.filter(w => w.status === 'paid').reduce((s, w) => s + w.amount, 0);
document.getElementById('stat-withdrawn').textContent = `₵${formatNumber(totalWithdrawn)}`;

            const tbody = document.getElementById('investments-table');
const cardContainer = document.getElementById('investments-cards');

if (investments.length === 0) {
  tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-gray-500">No investments yet.</td></tr>';
  if (cardContainer) cardContainer.innerHTML = '<div class="text-gray-500 text-center py-4">No investments yet.</div>';
} else {
  tbody.innerHTML = investments.map(inv => {
    const wd = withdrawalMap[inv.id];
    const status = inv.status;
    const isPending = status === 'pending';
    const isMatured = status === 'matured';
    const earnings = getCurrentEarnings(inv);
    const progress = getProgress(inv);
    const daysLeft = getDaysLeft(inv);

    let statusBadge = '';
    if (isPending) statusBadge = '<span class="bg-yellow-500/20 text-yellow-400 rounded-full px-2 py-1 text-xs">Pending ⏳</span>';
    else if (status === 'rejected') statusBadge = '<span class="bg-red-500/20 text-red-400 rounded-full px-2 py-1 text-xs">Rejected ❌</span>';
    else if (isMatured) statusBadge = '<span class="bg-green-500/20 text-green-400 rounded-full px-2 py-1 text-xs">Matured ✅</span>';
    else if (status === 'reinvested') statusBadge = '<span class="bg-blue-500/20 text-blue-400 rounded-full px-2 py-1 text-xs">Reinvested 🔄</span>';
    else statusBadge = `<span class="bg-gold-500/20 text-gold-400 rounded-full px-2 py-1 text-xs">Active (${daysLeft}d)</span>`;

    let actionHtml = '';
     if (isMatured && !wd && inv.status !== 'reinvested') {
  actionHtml = `<button onclick="openReinvestModal(${inv.id})" class="gradient-gold text-dark-950 font-semibold py-1.5 px-2 rounded-lg text-xs mr-1" style="animation: gentleBounce 1.5s ease-in-out infinite;">⚡ Reinvest & Earn</button>
              <button onclick="requestWithdrawal(${inv.id})" class="bg-purple-600 text-white rounded-lg px-3 py-1 text-xs hover:bg-purple-500">Withdraw</button>`;
} else if (inv.status === 'reinvested') {
  actionHtml = '<span class="text-green-400 text-xs">Reinvested ✅</span>';
} else if (wd) {
  const totalPayout = inv.amount * (1 + (returnRates[inv.plan] || 1));
const allWithdrawals = withdrawals
    .filter(w => w.investment_id === inv.id && w.status !== 'rejected')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

const alreadyPaid = allWithdrawals
    .filter(w => w.status === 'paid')
    .reduce((s, w) => s + w.amount, 0);

const remaining = totalPayout - alreadyPaid;

// Timeline icons
let timelineHtml = '';
allWithdrawals.forEach(w => {
    let statusText = '';
    let colorClass = '';
    if (w.status === 'pending') { statusText = 'Pending'; colorClass = 'text-yellow-400'; }
    else if (w.status === 'approved') { statusText = 'Approved'; colorClass = 'text-green-400'; }
    else if (w.status === 'paid') { statusText = 'Paid'; colorClass = 'text-green-400'; }
    else { statusText = ''; colorClass = 'text-gray-400'; }

    timelineHtml += `<div class="flex items-center gap-1 ${colorClass} text-xs">
      <span>₵${formatNumber(w.amount)} ${statusText}</span>
    </div>`;
});

// Remaining balance and lock/unlock
let remainingHtml = '';

if (remaining > 0) {
    const hasActiveRequest = allWithdrawals.some(
        w => w.status === 'pending' || w.status === 'approved'
    );

if (hasActiveRequest) {
    remainingHtml = `<div class="text-blue-400 text-xs mt-1">Withdrawal in progress ⏳</div>`;
} else {
        // No active request – show the remaining balance and the lock/unlock button
        remainingHtml = `<div class="text-yellow-400 text-[10px] mt-1">₵${formatNumber(remaining)} available with next plan</div>`;
        const availableActive = getAvailableActiveForFullUnlock();
        const hasQualifyingActive = availableActive >= inv.amount;
        if (hasQualifyingActive) {
            remainingHtml += `<button onclick="requestWithdrawal(${inv.id})"
                class="bg-purple-600 text-white rounded-lg px-3 py-1 text-xs hover:bg-purple-500 mt-1">
                Withdraw
            </button>`;
        } else {
            remainingHtml += `<button onclick="requestRemainingWithdrawal(${inv.id})"
                class="bg-purple-600/50 text-white/70 rounded-lg px-3 py-1 text-xs flex items-center gap-1 mt-1 cursor-pointer">
                <i data-lucide="lock" class="w-3 h-3"></i> Withdraw
            </button>`;
        }
    }
} else {
    // remaining === 0 — everything has been accounted for
    const allPaid = allWithdrawals.length > 0 &&
                    allWithdrawals.every(w => w.status === 'paid');

    if (allPaid) {
        remainingHtml = `<div class="text-green-400 text-xs mt-1">All paid ⚡️</div>`;
    } else {
        // There are pending/approved withdrawals that sum to the full payout
        remainingHtml = `<div class="text-blue-400 text-xs mt-1">Withdrawal being processed ⏳</div>`;
    }
}

actionHtml = `<div class="text-xs">${timelineHtml}${remainingHtml}</div>`;
     }
         
    return `<tr class="border-b border-white/5">
      <td class="py-4 font-medium">₵${formatNumber(inv.amount)}</td>
      <td class="py-4 hidden sm:table-cell"><span class="glass-gold rounded-full px-2 py-1 text-xs">${inv.plan}</span></td>
      <td class="py-4 text-green-400">₵${formatNumber(earnings)}</td>
      <td class="py-4"><div class="flex items-center gap-2"><div class="w-20 h-2 bg-white/5 rounded-full"><div class="h-full gradient-gold rounded-full" style="width:${Math.min(100, progress)}%"></div></div><span class="text-xs">${Math.round(progress)}%</span></div></td>
      <td class="py-4">${statusBadge}</td>
      <td class="py-4">${actionHtml}</td>
    </tr>`;
  }).join('');
    lucide.createIcons();

  if (cardContainer) {
    cardContainer.innerHTML = investments.map(inv => {
      const wd = withdrawalMap[inv.id];
      const status = inv.status;
      const isPending = status === 'pending';
      const isMatured = status === 'matured';
      const earnings = getCurrentEarnings(inv);
      const progress = getProgress(inv);
      const daysLeft = getDaysLeft(inv);

      let statusBadge = '';
      if (isPending) statusBadge = '<span class="bg-yellow-500/20 text-yellow-400 rounded-full px-2 py-1 text-xs">Pending ⏳</span>';
      else if (status === 'rejected') statusBadge = '<span class="bg-red-500/20 text-red-400 rounded-full px-2 py-1 text-xs">Rejected ❌</span>';
      else if (isMatured) statusBadge = '<span class="bg-green-500/20 text-green-400 rounded-full px-2 py-1 text-xs">Matured ✅</span>';
      else if (status === 'reinvested') statusBadge = '<span class="bg-blue-500/20 text-blue-400 rounded-full px-2 py-1 text-xs">Reinvested 🔄</span>';
      else statusBadge = `<span class="bg-gold-500/20 text-gold-400 rounded-full px-2 py-1 text-xs">Active (${daysLeft}d)</span>`;

      let actionHtml = '';
     if (isMatured && !wd && inv.status !== 'reinvested') {
  actionHtml = `<button onclick="openReinvestModal(${inv.id})" class="gradient-gold text-dark-950 font-semibold py-1.5 px-2 rounded-lg text-xs mr-1" style="animation: gentleBounce 1.5s ease-in-out infinite;">Reinvest</button>
              <button onclick="requestWithdrawal(${inv.id})" class="bg-purple-600 text-white rounded-lg px-3 py-1 text-xs hover:bg-purple-500">Withdraw</button>`;
} else if (inv.status === 'reinvested') {
  actionHtml = '<span class="text-green-400 text-xs">Reinvested ✅</span>';
} else if (wd) {
  const totalPayout = inv.amount * (1 + (returnRates[inv.plan] || 1));
const allWithdrawals = withdrawals
    .filter(w => w.investment_id === inv.id && w.status !== 'rejected')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

const alreadyPaid = allWithdrawals
    .filter(w => w.status === 'paid')
    .reduce((s, w) => s + w.amount, 0);

const remaining = totalPayout - alreadyPaid;

// Timeline icons
let timelineHtml = '';
allWithdrawals.forEach(w => {
    let statusText = '';
    let colorClass = '';
    if (w.status === 'pending') { statusText = 'Pending'; colorClass = 'text-yellow-400'; }
    else if (w.status === 'approved') { statusText = 'Approved'; colorClass = 'text-green-400'; }
    else if (w.status === 'paid') { statusText = 'Paid'; colorClass = 'text-green-400'; }
    else { statusText = ''; colorClass = 'text-gray-400'; }

    timelineHtml += `<div class="flex items-center gap-1 ${colorClass} text-xs">
      <span>₵${formatNumber(w.amount)} ${statusText}</span>
    </div>`;
});

let remainingHtml = '';

if (remaining > 0) {
    const hasActiveRequest = allWithdrawals.some(
        w => w.status === 'pending' || w.status === 'approved'
    );

if (hasActiveRequest) {
    remainingHtml = `<div class="text-blue-400 text-xs mt-1">Withdrawal in progress ⏳</div>`;
} else {
        // No active request – show the remaining balance and the lock/unlock button
        remainingHtml = `<div class="text-yellow-400 text-[10px] mt-1">₵${formatNumber(remaining)} available with next plan</div>`;
        const availableActive = getAvailableActiveForFullUnlock();
        const hasQualifyingActive = availableActive >= inv.amount;
        if (hasQualifyingActive) {
            remainingHtml += `<button onclick="requestWithdrawal(${inv.id})"
                class="bg-purple-600 text-white rounded-lg px-3 py-1 text-xs hover:bg-purple-500 mt-1">
                Withdraw
            </button>`;
        } else {
            remainingHtml += `<button onclick="requestRemainingWithdrawal(${inv.id})"
                class="bg-purple-600/50 text-white/70 rounded-lg px-3 py-1 text-xs flex items-center gap-1 mt-1 cursor-pointer">
                <i data-lucide="lock" class="w-3 h-3"></i> Withdraw
            </button>`;
        }
    }
} else {
    // remaining === 0 — everything has been accounted for
    const allPaid = allWithdrawals.length > 0 &&
                    allWithdrawals.every(w => w.status === 'paid');

    if (allPaid) {
        remainingHtml = `<div class="text-green-400 text-xs mt-1">All paid ⚡️</div>`;
    } else {
        // There are pending/approved withdrawals that sum to the full payout
        remainingHtml = `<div class="text-blue-400 text-xs mt-1">Withdrawal being processed ⏳</div>`;
    }
}

actionHtml = `<div class="text-xs">${timelineHtml}${remainingHtml}</div>`;
}

      return `<div class="glass rounded-lg p-3 mb-2">
        <div class="flex justify-between items-start">
          <div>
            <div class="font-semibold">₵${formatNumber(inv.amount)} <span class="text-xs text-gray-400 capitalize">${inv.plan}</span></div>
            <div class="text-sm text-green-400">Earnings: ₵${formatNumber(earnings)}</div>
            <div class="flex items-center gap-2 mt-1">
              <div class="w-16 h-1.5 bg-white/5 rounded-full"><div class="h-full gradient-gold rounded-full" style="width:${Math.min(100, progress)}%"></div></div>
              <span class="text-xs text-gray-400">${Math.round(progress)}%</span>
            </div>
            <div class="mt-1">${statusBadge}</div>
          </div>
          <div class="flex flex-col items-end gap-2">
            ${actionHtml}
          </div>
        </div>
      </div>`;
    }).join('');
  }
}
            lucide.createIcons();

            drawChart(investments);
            loadTransactionHistory();
            // Hide loader when everything is done
document.getElementById('dashboard-loader').classList.add('hidden');
            loadInvestorCount();
            loadPromoBanner();
        }

async function requestWithdrawal(investmentId) {
  const inv = window.allInvestmentsLocal.find(i => i.id === investmentId);
  if (!inv) return;

  const rate = returnRates[inv.plan] || 1;
  const totalPayout = inv.amount * (1 + rate);
  const profit = totalPayout - inv.amount;

  const alreadyWithdrawn = (window.allWithdrawalsLocal || [])
    .filter(w => w.investment_id === investmentId && w.status !== 'rejected')
    .reduce((s, w) => s + w.amount, 0);

  const maxWithdrawable = totalPayout - alreadyWithdrawn;
  if (maxWithdrawable <= 0) {
    showToast('Full payout already withdrawn.', 'error');
    return;
  }

  // Total active balance across all active plans
  const totalActiveAmount = (window.allInvestmentsLocal || [])
    .filter(i => i.status === 'active')
    .reduce((sum, i) => sum + i.amount, 0);

const availableActive = getAvailableActiveForFullUnlock();
const hasQualifyingActive = availableActive >= inv.amount;

  let amount, confirmMessage;

  // ── FIRST WITHDRAWAL ──
  if (alreadyWithdrawn === 0) {

    if (hasQualifyingActive) {
      // Qualifying active balance → allow 100% immediately
      amount = maxWithdrawable;
      confirmMessage = `
        <div class="text-left text-sm space-y-2">
          <p class="text-white font-semibold">Full Withdrawal Available</p>
          <p>Total payout: <span class="text-gold-400">₵${totalPayout.toFixed(2)}</span></p>
          <p>You will receive now: <span class="text-green-400 font-bold">₵${amount.toFixed(2)}</span></p>
          <p class="text-xs text-gray-400">Your total active balance (₵${totalActiveAmount}) qualifies you for instant full access.</p>
          <p class="text-xs text-gray-500">Proceed with withdrawal?</p>
        </div>
      `;

      if (!await customConfirm(confirmMessage)) return;
      await processWithdrawal(investmentId, amount);
      return;
    }

    // No qualifying active balance → 20% profit share modal
    amount = Math.floor(profit * 0.2 * 100) / 100;
    const locked = totalPayout - amount;
    const encouragement = inv.amount >= 500
      ? 'Most members immediately reinvest and double their returns within weeks.'
      : 'Members who keep a plan active earn 3× more bonuses over time.';

    window._pendingWithdrawalId = investmentId;
    window._pendingWithdrawalAmount = amount;

    document.getElementById('withdraw-confirm-content').innerHTML = `
      <div class="text-left text-sm space-y-3">
        <div class="text-center">
          <p class="text-lg font-bold text-white">🎉 Your Money Has Grown</p>
          <p class="text-xs text-gray-400 mt-1">Total value: <span class="text-gold-400 font-semibold">₵${totalPayout.toFixed(2)}</span></p>
        </div>

        <div class="bg-dark-950/60 rounded-xl p-4 text-center border border-gold-500/30">
          <p class="text-xs text-gray-400 uppercase tracking-wider">Cash Out Instantly</p>
          <p class="text-3xl font-black text-green-400 mt-1">₵${amount.toFixed(2)}</p>
          <p class="text-xs text-green-400/70 mt-1">Sent to your wallet immediately</p>
        </div>

        <div class="text-center text-xs text-gray-400 mt-3">
          <p>Your <strong class="text-white">₵${inv.amount.toFixed(2)}</strong> principal is held securely and ready to be reactivated.</p>
          <p class="text-yellow-400 mt-1">Start a new plan of <strong>₵${inv.amount}</strong> to unlock the full <strong>₵${locked.toFixed(2)}</strong> balance.</p>
        </div>

        <div class="text-[10px] text-gray-500 text-center italic">${encouragement}</div>

        <div class="flex gap-2 mt-2">
          <button onclick="withdrawConfirmUnlock()" class="flex-1 gradient-gold text-dark-950 font-semibold py-2.5 rounded-xl text-xs hover:opacity-90 transition">
            ⚡ Unlock & Grow
          </button>
          <button onclick="withdrawConfirmJustWithdraw()" class="flex-1 bg-transparent border border-white/20 text-gray-300 py-2.5 rounded-xl text-xs hover:bg-white/5 transition">
            Just Withdraw
          </button>
        </div>
        <div class="text-center mt-2">
          <button onclick="withdrawConfirmMaybeLater()" class="text-gray-500 text-xs hover:text-gray-300 transition">
            Maybe Later
          </button>
        </div>
      </div>
    `;

    document.getElementById('withdraw-confirm-modal').classList.remove('hidden');
    document.getElementById('withdraw-confirm-modal').classList.add('flex');
    return;
  }

  // ── SUBSEQUENT WITHDRAWAL ──
  if (totalActiveAmount < inv.amount) {
    showToast(`You need a total active balance of at least ₵${inv.amount} to unlock the remaining balance.`, 'error');
    return;
  }

  amount = maxWithdrawable;
  confirmMessage = `
    <div class="text-left text-sm space-y-2">
      <p class="text-white font-semibold">Unlock Remaining Balance</p>
      <p>You will receive: <span class="text-green-400 font-bold">₵${amount.toFixed(2)}</span></p>
      <p class="text-xs text-gray-500">Proceed with withdrawal?</p>
    </div>
  `;

  if (!await customConfirm(confirmMessage)) return;
  await processWithdrawal(investmentId, amount);
} 

function requestRemainingWithdrawal(investmentId) {
  const inv = window.allInvestmentsLocal.find(i => i.id === investmentId);
  if (!inv) return;

  const totalActive = (window.allInvestmentsLocal || [])
    .filter(i => i.status === 'active')
    .reduce((sum, i) => sum + i.amount, 0);

  const availableActive = getAvailableActiveForFullUnlock();
  const shortfall = Math.max(0, inv.amount - availableActive);

  const modal = document.getElementById('lock-info-modal');
  if (!modal) return;

  let message = '';

  if (totalActive === 0) {
    message = `
      <div style="font-family: 'Inter', sans-serif; color: #e0e0e0; line-height: 1.5;">
        <h3 style="color:#FFD700; font-weight:600; margin-bottom:8px;">Payout Secured</h3>
        <p style="margin-bottom:8px;">Your funds are held safely and will be released in full once an active investment of <strong>₵${inv.amount}</strong> is established.</p>
        <p style="margin-bottom:8px;">This requirement protects the integrity of your capital and the stability of the platform.</p>
        <p style="margin-bottom:16px;">Start a new plan to activate your withdrawal immediately.</p>
      </div>`;
  } else if (availableActive === 0) {
    message = `
      <div style="font-family: 'Inter', sans-serif; color: #e0e0e0; line-height: 1.5;">
        <h3 style="color:#FFD700; font-weight:600; margin-bottom:8px;">Active Capital Fully Allocated</h3>
        <p style="margin-bottom:8px;">Your current active investment of <strong>₵${totalActive}</strong> has already been allocated to a previous payout unlock.</p>
        <p style="margin-bottom:8px;">To release this payout, a new active investment of at least <strong>₵${inv.amount}</strong> is required.</p>
        <p style="margin-bottom:16px;">This allocation policy ensures that every withdrawal remains fully backed, protecting the platform and its longevity.</p>
      </div>`;
  } else {
    message = `
      <div style="font-family: 'Inter', sans-serif; color: #e0e0e0; line-height: 1.5;">
        <h3 style="color:#FFD700; font-weight:600; margin-bottom:8px;">Additional Active Capital Required</h3>
        <p style="margin-bottom:8px;">Your available active balance is <strong>₵${availableActive}</strong>. To release this payout, a total of <strong>₵${inv.amount}</strong> is needed.</p>
        <p style="margin-bottom:8px;">A new investment of <strong>₵${shortfall}</strong> will meet this threshold and make your full balance accessible.</p>
        <p style="margin-bottom:16px;">This policy exists to safeguard all members and ensure long‑term platform health.</p>
      </div>`;
  }

  document.getElementById('lock-info-message').innerHTML = message;

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

    async function requestGameRewardWithdrawal() {
    const balanceText = document.getElementById('dash-game-balance').textContent.replace('₵','').replace(/,/g,'');
    const balance = parseFloat(balanceText) || 0;
    if (balance < 30) {
        showToast('Minimum withdrawal is ₵30', 'error');
        return;
    }
    if (!await customConfirm(`Withdraw your game rewards of ₵${balance}?`)) return;
    try {
        const res = await fetch(`${API_BASE}/api/game-reward-withdrawal`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (!res.ok) {
            // Check for the active‑investment requirement message
            if (data.error && data.error.includes('active investment')) {
                showToast('You need an active investment to withdraw Prizes & Rewards. Start one from just ₵200!', 'error');
            } else {
                showToast(data.error || 'Withdrawal failed', 'error');
            }
            return;
        }
        showToast('Game reward withdrawal requested!', 'success');
        updateDashboard();
    } catch (e) { showToast('Connection error', 'error'); }
}

        async function requestReferralWithdrawal() {
    const bonusText = document.getElementById('dash-bonus').textContent.replace('₵','').replace(/,/g,'');
    const bonus = parseFloat(bonusText) || 0;
    if (bonus < 50) {
        showToast('Minimum referral withdrawal is ₵50', 'error');
        return;
    }
    if (!await customConfirm(`Withdraw your referral bonus of ₵${bonus}?`)) return;
    try {
        const res = await fetch(`${API_BASE}/api/referral-withdrawal`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (!res.ok) return showToast(data.error, 'error');
        showToast('Referral withdrawal requested!', 'success');
        updateDashboard();
    } catch (e) { showToast('Connection error', 'error'); }
}

        function withdrawConfirmMaybeLater() {
  document.getElementById('withdraw-confirm-modal').classList.add('hidden');
  document.getElementById('withdraw-confirm-modal').classList.remove('flex');
  window._pendingWithdrawalId = null;
  window._pendingWithdrawalAmount = null;
}

        function withdrawConfirmUnlock() {
  document.getElementById('withdraw-confirm-modal').classList.add('hidden');
  document.getElementById('withdraw-confirm-modal').classList.remove('flex');
  openDepositModal();
}

async function withdrawConfirmJustWithdraw() {
  document.getElementById('withdraw-confirm-modal').classList.add('hidden');
  document.getElementById('withdraw-confirm-modal').classList.remove('flex');

  const investmentId = window._pendingWithdrawalId;
  window._pendingWithdrawalId = null;

  try {
    const res = await fetch(`${API_BASE}/api/withdrawals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ investment_id: investmentId })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Withdrawal failed', 'error');
      return;
    }
    showToast(data.message || 'Payout request submitted!', 'success');
    updateDashboard();
  } catch (e) { showToast('Connection error', 'error'); }
}

       function getCurrentEarnings(inv) {
    if (inv.status === 'pending') return 0;
    if (inv.status === 'rejected') return 0;
    if (inv.status === 'matured' || inv.status === 'reinvested') {
        const rate = returnRates[inv.plan] || 1;
        return inv.amount * rate;
    }
    // active
    const progress = getProgress(inv) / 100;
    const rate = returnRates[inv.plan] || 1;
    return inv.amount * rate * progress;
}

function getAvailableActiveForFullUnlock() {
  const investments = window.allInvestmentsLocal || [];
  const withdrawals = window.allWithdrawalsLocal || [];
  const rateMap = { starter: 0.5, growth: 0.7, premium: 1.0 };

  // Total active
  const totalActive = investments
    .filter(i => i.status === 'active')
    .reduce((sum, i) => sum + i.amount, 0);

  // Find the earliest start date among all active plans
  const activeStartDates = investments
    .filter(i => i.status === 'active')
    .map(i => new Date(i.date).getTime());
  const oldestActiveStart = activeStartDates.length > 0
    ? Math.min(...activeStartDates)
    : Date.now();

  // Consumed = sum of original deposits of matured plans that:
  // 1. Have been fully paid (total withdrawn >= total payout)
  // 2. Were fully paid AFTER the oldest active plan started
  let consumed = 0;
  for (const inv of investments) {
    if (inv.status !== 'matured') continue;
    const rate = rateMap[inv.plan] || 1.0;
    const totalPayout = inv.amount * (1 + rate);
    const planWithdrawals = withdrawals.filter(
      w => w.investment_id === inv.id && w.status !== 'rejected'
    );
    const totalWithdrawn = planWithdrawals.reduce((s, w) => s + w.amount, 0);
    if (totalWithdrawn >= totalPayout) {
      // Get the most recent withdrawal date for this plan
      const lastWithdrawalDate = planWithdrawals.length > 0
        ? Math.max(...planWithdrawals.map(w => new Date(w.created_at).getTime()))
        : null;
      if (lastWithdrawalDate && lastWithdrawalDate >= oldestActiveStart) {
        consumed += inv.amount;
      }
    }
  }

  return totalActive - consumed;
}

        function getProgress(inv) {
    if (inv.status === 'pending') return 0;
    if (inv.status === 'rejected') return 0;
    if (inv.status === 'matured' || inv.status === 'reinvested') return 100;
    // active
    const planDays = { starter: 10, growth: 20, premium: 30 };
    const totalDays = inv.duration_days || planDays[inv.plan] || 14;
    const start = new Date(inv.date);
    const now = new Date();
    const elapsed = (now - start) / (1000 * 60 * 60 * 24);
    return Math.min(100, (elapsed / totalDays) * 100);
}

       function getDaysLeft(inv) {
    if (inv.status === 'matured' || inv.status === 'reinvested') return 'Completed';
    const planDays = { starter: 10, growth: 20, premium: 30 };
    const totalDays = inv.duration_days || planDays[inv.plan] || 14;
    const start = new Date(inv.date);
    const now = new Date();
    const elapsed = (now - start) / (1000 * 60 * 60 * 24);
    return Math.ceil(Math.max(0, totalDays - elapsed));
}

     function drawChart(investments) {
  const canvas = document.getElementById('growth-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Destroy previous chart instance
  if (growthChart) growthChart.destroy();

  // Filter only active & reinvested? Actually we want only active investments for projection
  const activeInvs = investments.filter(i => i.status !== 'pending' && i.status !== 'rejected' && i.status !== 'reinvested');

  // Compute total invested and current portfolio value
  const totalInvested = activeInvs.reduce((s, i) => s + i.amount, 0);
  let currentValue = 0;
  activeInvs.forEach(inv => {
    const planDays = { starter: 10, growth: 20, premium: 30 };
    const durDays = inv.duration_days || planDays[inv.plan] || 14;
    const start = new Date(inv.date);
    const now = new Date();
    const elapsed = (now - start) / (1000 * 60 * 60 * 24);
    const progress = Math.min(1, Math.max(0, elapsed / durDays));
    const rate = returnRates[inv.plan] || 1;
    currentValue += inv.amount + (inv.amount * rate * progress);
  });

  const growthPct = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested * 100) : 0;
  document.getElementById('portfolio-total').textContent = '₵' + formatNumber(currentValue);
  document.getElementById('portfolio-growth-pct').textContent = (growthPct >= 0 ? '+' : '') + growthPct.toFixed(1) + '%';

  // If no active investments, draw empty chart
  if (activeInvs.length === 0) {
    growthChart = new Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { display: false } }
      }
    });
    return;
  }

  const planDays = { starter: 10, growth: 20, premium: 30 };
  const earliest = Math.min(...activeInvs.map(i => new Date(i.date).getTime()));
  const latest = Math.max(...activeInvs.map(i => {
    const d = new Date(i.date);
    d.setDate(d.getDate() + (i.duration_days || planDays[i.plan] || 14));
    return d.getTime();
  }));
  const totalDays = Math.ceil((latest - earliest) / (1000 * 60 * 60 * 24));

  let labels = [], dataPoints = [];
  for (let day = 0; day <= totalDays; day++) {
    const dayTime = earliest + day * 24 * 60 * 60 * 1000;
    let value = 0;
    activeInvs.forEach(inv => {
      const start = new Date(inv.date).getTime();
      const durDays = inv.duration_days || planDays[inv.plan] || 14;
      const end = start + durDays * 24 * 60 * 60 * 1000;
      if (dayTime >= start) {
        const progress = Math.min(1, (dayTime - start) / (end - start));
        const rate = returnRates[inv.plan] || 1;
        value += inv.amount + (inv.amount * rate * progress);
      }
    });
    labels.push(`Day ${day}`);
    dataPoints.push(value);
  }

  // Find index of today
  const nowTime = Date.now();
  let todayIndex = 0;
  for (let i = 0; i <= totalDays; i++) {
    const dayTime = earliest + i * 24 * 60 * 60 * 1000;
    if (dayTime > nowTime) {
      todayIndex = i;
      break;
    }
    todayIndex = i;
  }

  // Split data into realized (solid) and projected (dashed)
  const realizedData = dataPoints.slice(0, todayIndex + 1);
  const projectedData = dataPoints.slice(todayIndex);

  // Glow plugin
  const glowLinePlugin = {
    id: 'glowLine',
    beforeDatasetsDraw(chart) {
      const { ctx } = chart;
      ctx.save();
      ctx.shadowColor = '#FFD86A';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    },
    afterDatasetsDraw(chart) {
      chart.ctx.restore();
    }
  };

  // Premium gradient fill for realized line
  const gradient = ctx.createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, 'rgba(255, 215, 0, 0.35)');
  gradient.addColorStop(0.5, 'rgba(212, 160, 23, 0.12)');
  gradient.addColorStop(1, 'rgba(212, 160, 23, 0)');

  growthChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Realized',
          data: realizedData,
          borderColor: '#FFD700',
          backgroundColor: gradient,
          borderWidth: 2.8,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 9,
          pointHoverBackgroundColor: '#FFD700',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 3,
          fill: true,
          order: 2
        },
        {
          label: 'Projected',
          data: projectedData,
          borderColor: 'rgba(255, 215, 128, 0.6)',
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          borderDash: [8, 6],
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1500, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(5,5,10,0.97)',
          titleColor: '#FFD86A',
          bodyColor: '#fff',
          borderColor: 'rgba(255,215,80,0.18)',
          borderWidth: 1,
          cornerRadius: 16,
          padding: 14,
          titleFont: { weight: '700' },
          displayColors: false,
          callbacks: {
            label: (ctx) => ' ₵' + ctx.raw.toLocaleString()
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { 
            color: 'rgba(255,255,255,0.4)', 
            font: { family: 'Inter', size: 10 },
            maxTicksLimit: 6
          }
        },
        y: {
          grid: { display: false },
          ticks: {
            color: 'rgba(255,255,255,0.4)',
            font: { family: 'Inter', size: 10 },
            callback: (value) => '₵' + value.toLocaleString(),
            maxTicksLimit: 5
          }
        }
      }
    },
    plugins: [glowLinePlugin]
  });
}

        // Deposit modal functions
       function openDepositModal() {
    document.getElementById('deposit-modal').classList.remove('hidden');
    document.getElementById('deposit-modal').classList.add('flex');
    document.getElementById('deposit-step1').classList.remove('hidden');
    document.getElementById('deposit-step2').classList.add('hidden');
    document.getElementById('deposit-amount').value = '';
    updateCalculator();

    document.getElementById('deposit-min-note').textContent = 'Minimum deposit is ₵300';
    document.getElementById('deposit-amount').placeholder = 'Min ₵300';
}

        function closeDepositModal() {
            document.getElementById('deposit-modal').classList.add('hidden');
            document.getElementById('deposit-modal').classList.remove('flex');
            sessionStorage.removeItem('gcc_deposit');
        }

function selectPlan(plan) {
  // ---- new restriction checks ----
  const check = canSelectPlan(plan);
if (!check.allowed) {
  if (check.message) {
    showToast(check.message, 'error');
  }
  // If message is null, the modal has already been shown (Starter Loyalty Rule)
  return;
}

  selectedPlan = plan;
  document.getElementById('deposit-plan').value = plan;
  ['starter', 'growth', 'premium'].forEach(p => {
    const el = document.getElementById(`plan-${p}`);
    el.className = p === plan ? 'glass-gold rounded-xl p-3 text-center' : 'glass rounded-xl p-3 text-center';
  });
  updateCalculator();
  const minAmounts = { starter: 200, growth: 300, premium: 500 };
  document.getElementById('deposit-min-note').textContent = `Minimum deposit is ₵${minAmounts[plan]}`;
  document.getElementById('deposit-amount').placeholder = `Min ₵${minAmounts[plan]}`;
}

        function canSelectPlan(plan) {
  const investments = window.allInvestmentsLocal || [];
  const now = Date.now();

  // 1. Already have an active Starter → cannot select another Starter
  if (plan === 'starter') {
    const activeStarter = investments.some(
      i => i.status === 'active' && i.plan === 'starter'
    );
    if (activeStarter) {
      return {
        allowed: false,
        message: 'You already have an active Starter plan. Please choose Growth or Premium to diversify your investment! 🌱'
      };
    }

    // 2. Any investment maturing within 10 days → cannot open a new Starter
    const planDays = { starter: 10, growth: 20, premium: 30 };
    const nearMaturity = investments.some(i => {
      if (i.status !== 'active') return false;
      const totalDays = i.duration_days || planDays[i.plan] || 14;
      const matureTime = new Date(i.date).getTime() + totalDays * 86400000;
      return (matureTime - now) <= 10 * 86400000 && matureTime > now;
    });
    if (nearMaturity) {
      return {
        allowed: false,
        message: 'You have an investment maturing within 10 days. Please choose Growth or Premium instead, or wait until your current plan completes! ⏳'
      };
    }

    // 3. Starter Loyalty Rule – after 3 matured Starters, minimum becomes ₵400
    const starterMaturedCount = investments.filter(
      i => i.plan === 'starter' && i.status === 'matured'
    ).length;
   if (starterMaturedCount >= 3) {
  setTimeout(() => showStarterLimitModal(), 50);  
  return { allowed: false, message: null };
}
  }

  return { allowed: true };
}

        function showStarterLimitModal() {
  const modal = document.getElementById('starter-limit-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeStarterLimitModal() {
  const modal = document.getElementById('starter-limit-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function selectPlanFromModal(plan) {
  closeStarterLimitModal();
  selectPlan(plan);   // re‑use the normal plan selection logic
}

        function selectPayment(method) {
    selectedPayment = method;
    document.getElementById('deposit-payment').value = method;
    document.getElementById('pay-momo').className = method === 'momo' ? 'glass-gold rounded-xl p-4 text-center' : 'glass rounded-xl p-4 text-center';
    document.getElementById('pay-crypto').className = method === 'crypto' ? 'glass-gold rounded-xl p-4 text-center' : 'glass rounded-xl p-4 text-center';
    
    const amount = document.getElementById('deposit-amount').value;
    const amountText = amount ? `₵${formatNumber(parseFloat(amount))}` : '₵0';

    // Show the chosen method and hide the other
    if (method === 'momo') {
        document.getElementById('momo-details').innerHTML = getMomoDetailsHtml(amountText);
        document.getElementById('momo-details').classList.remove('hidden');
        document.getElementById('crypto-details').classList.add('hidden');
    } else {
        document.getElementById('crypto-details').innerHTML = getCryptoDetailsHtml(amountText);
        document.getElementById('crypto-details').classList.remove('hidden');
        document.getElementById('momo-details').classList.add('hidden');
    }
}

async function goToStep2() {
  const amount = parseFloat(document.getElementById('deposit-amount').value);
  if (!amount) {
    showToast('Please enter an amount', 'error');
    return;
  }

  const minAmounts = { starter: 200, growth: 300, premium: 500 };
  if (amount < minAmounts[selectedPlan]) {
    showToast(`Minimum deposit for ${selectedPlan} is ₵${minAmounts[selectedPlan]}`, 'error');
    return;
  }

  const btn = document.querySelector('#deposit-step1 button[onclick="goToStep2()"]');
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Loading…`;
  lucide.createIcons();

  // Fetch a unique reference code from the backend
  try {
    const res = await fetch(`${API_BASE}/api/generate-reference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ amount, plan: selectedPlan })
    });
    const data = await res.json();
    document.getElementById('pay-reference-code').textContent = data.reference;
    document.getElementById('pay-reference-expiry').textContent = `Expires in 30 minutes`;
  } catch (e) {
    showToast('Failed to generate reference code', 'error');
    btn.disabled = false;
    btn.innerHTML = originalHTML;
    lucide.createIcons();
    return;
  }

  // Populate MoMo details from settings
  document.getElementById('pay-momo-number').textContent = paymentSettings.momo_number || '••••••••••';
  document.getElementById('pay-momo-name').textContent = paymentSettings.momo_name || '';
  document.getElementById('pay-amount-display').textContent = '₵' + formatNumber(amount);
  document.getElementById('summary-plan').textContent = selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1);
  document.getElementById('summary-amount').textContent = '₵' + formatNumber(amount);
  const rate = returnRates[selectedPlan] || 1;
  document.getElementById('summary-payout').textContent = '₵' + formatNumber(amount * (1 + rate));

  document.getElementById('deposit-step1').classList.add('hidden');
  document.getElementById('deposit-step2').classList.remove('hidden');
  lucide.createIcons();

  // Save deposit state so user can return after leaving the site
  sessionStorage.setItem('gcc_deposit', JSON.stringify({
    step: 2,
    plan: selectedPlan,
    amount: amount,
    reference: document.getElementById('pay-reference-code').textContent,
    expires: Date.now() + 30 * 60 * 1000
  }));

  btn.disabled = false;
  btn.innerHTML = originalHTML;
  lucide.createIcons();
}

        function goToStep1() {
            document.getElementById('deposit-step1').classList.remove('hidden');
            document.getElementById('deposit-step2').classList.add('hidden');
            sessionStorage.removeItem('gcc_deposit');
        }

async function submitDeposit() {
  const amount = parseFloat(document.getElementById('deposit-amount').value);
  const plan = document.getElementById('deposit-plan').value;
  const txid = document.getElementById('deposit-txid').value.trim();

  if (!amount || !plan) {
    showToast('Please select a plan and enter an amount', 'error');
    return;
  }

  const minAmounts = { starter: 200, growth: 300, premium: 500 };
  if (amount < minAmounts[plan]) {
    showToast(`Minimum deposit for ${plan} is ₵${minAmounts[plan]}`, 'error');
    return;
  }

  if (!txid) {
    showToast('Please enter your MoMo Transaction ID', 'error');
    return;
  }

  if (!authToken || !currentUser) {
    showToast('You must be logged in', 'error');
    return;
  }

  const reference = document.getElementById('pay-reference-code').textContent;

  const payload = {
    amount: amount,
    plan: plan,
    method: 'momo',
    transaction_id: txid,
    reference: reference
  };

  try {
    const res = await fetch(`${API_BASE}/api/investments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Deposit failed', 'error');
      return;
    }
    sessionStorage.removeItem('gcc_deposit');
    closeDepositModal();
    showToast('Deposit submitted! Pending admin approval.', 'success');
    updateDashboard();
  } catch (e) {
    showToast('Connection error', 'error');
  }
}

        document.addEventListener('input', function(e) { if (e.target.id === 'deposit-amount') updateCalculator(); });
        function updateCalculator() {
            const amount = parseFloat(document.getElementById('deposit-amount').value) || 0;
            const rate = returnRates[selectedPlan] || 1;
            document.getElementById('calc-invest').textContent = `₵${formatNumber(amount)}`;
            document.getElementById('calc-earn').textContent = `₵${formatNumber(amount * rate)}`;
            document.getElementById('calc-total').textContent = `₵${formatNumber(amount * (1 + rate))}`;
            const rateLabel = document.getElementById('calc-rate-label');
            if (rateLabel) rateLabel.textContent = Math.round(rate * 100);
        }

        function formatNumber(n) { return Number(n).toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
        function timeAgo(dateStr) {
            const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
            if (diff < 60) return 'Just now';
            if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
            if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
            return `${Math.floor(diff/86400)}d ago`;
        }
        function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const colors = type === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-red-500/20 border-red-500/50 text-red-400';
    const icon = type === 'success' ? 'check-circle' : 'alert-circle';
    toast.className = `toast glass ${colors} border rounded-xl px-4 py-3 flex items-center gap-3 min-w-[280px] max-w-sm`;
    toast.innerHTML = `<i data-lucide="${icon}" class="w-5 h-5 shrink-0"></i><span class="text-sm">${message}</span>`;
    container.appendChild(toast);
    lucide.createIcons();
    // Keep success toasts for 4 seconds, error toasts for 8 seconds
    const duration = type === 'error' ? 8000 : 4000;
    setTimeout(() => toast.remove(), duration);
}
        function copyAddress(addr) {
    navigator.clipboard.writeText(addr).then(() => showToast('Copied!', 'success'));
}
        function toggleFaq(btn) {
            const content = btn.nextElementSibling;
            const icon = btn.querySelector('[data-lucide]');
            content.classList.toggle('hidden');
            icon.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
        }

         async function loadLeaderboard() {
  const list = document.getElementById('leaderboard-list');
  if (!list) return;
  const period = document.getElementById('leaderboard-period')?.value || 'all';
  try {
    const res = await fetch(`${API_BASE}/api/referral-leaderboard?period=${period}`);
    const data = await res.json();
    if (!data.leaderboard || data.leaderboard.length === 0) {
      list.innerHTML = '<div class="text-gray-500 text-center py-4 text-sm">No referrals yet this period.</div>';
      return;
    }

    const top = data.leaderboard.slice(0, 6);
   const getTier = (count) => {
  if (count >= 100) return { name: 'Diamond', class: 'text-gold-400 border-gold-500/30 bg-gold-500/10' };
  if (count >= 50) return { name: 'Platinum', class: 'text-gray-300 border-gray-400/30 bg-gray-500/10' };
  if (count >= 20) return { name: 'Gold', class: 'text-amber-400 border-amber-500/30 bg-amber-500/10' };
  if (count >= 1) return { name: 'Elite', class: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' };
  return { name: 'Newbie', class: 'text-gray-500 border-gray-500/30 bg-gray-500/5' };
};
    // Render top 3 as podium cards, 4-6 as simple rows
    let html = '';

// Champion (#1) full-width hero
if (top.length >= 1) {
  const champ = top[0];
  const champTier = getTier(champ.total_referrals);
  html += `
  <div class="leaderboard-champion mb-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="rank-chip gold">01</div>
        <div>
          <div class="champion-badge">TOP REFERRER</div>
          <div class="text-base font-bold text-white mt-0.5">
            ${safe(champ.name)}
            ${champ.is_partner ? '<span class="ml-1.5 inline-block align-middle" title="VIP Partner"><svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16l-2-9 5 4 4-6 4 6 5-4-2 9H5z"/></svg></span>' : ''}
          </div>
          <div class="text-xs text-gold-400 mt-0.5">
            <span class="tier-badge ${champTier.class}">${champTier.name}</span>
            <span class="ml-2">${champ.total_referrals} referrals</span>
          </div>
        </div>
      </div>
      <div class="bonus-pill">₵${formatNumber(champ.bonus)}</div>
    </div>
  </div>`;
}

// #2 and #3 side by side
if (top.length >= 2 || top.length >= 3) {
  html += '<div class="grid grid-cols-2 gap-3 mb-3">';
  for (let i = 1; i <= 2 && i < top.length; i++) {
    const entry = top[i];
    const tier = getTier(entry.total_referrals);
    const chipClass = i === 1 ? 'silver' : 'bronze';
    html += `
    <div class="glass rounded-xl p-4 hover:bg-white/5 transition-all">
      <div class="flex items-center gap-2 mb-2">
        <div class="rank-chip ${chipClass}">0${i+1}</div>
        <span class="tier-badge ${tier.class}">${tier.name}</span>
      </div>
      <div class="text-sm font-semibold text-white truncate">
        ${safe(entry.name)}
        ${entry.is_partner ? '<span class="ml-1 inline-block align-middle" title="VIP Partner"><svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16l-2-9 5 4 4-6 4 6 5-4-2 9H5z"/></svg></span>' : ''}
      </div>
      <div class="flex justify-between items-center mt-3">
        <span class="text-xs text-gray-400">${entry.total_referrals} ref</span>
        <span class="bonus-pill text-xs">₵${formatNumber(entry.bonus)}</span>
      </div>
    </div>`;
  }
  html += '</div>';
}

// #4–#6 as subtle rows
if (top.length > 3) {
  html += '<div class="space-y-2">';
  for (let i = 3; i < top.length; i++) {
    const entry = top[i];
    const tier = getTier(entry.total_referrals);
    html += `
    <div class="flex items-center justify-between glass rounded-lg px-4 py-2 hover:bg-white/5 transition-all">
      <div class="flex items-center gap-3">
        <span class="text-xs font-bold text-gray-400 w-4">${i+1}</span>
        <span class="text-sm font-medium text-gray-200 truncate max-w-[120px]">
          ${safe(entry.name)}
          ${entry.is_partner ? '<span class="ml-1 inline-block align-middle" title="VIP Partner"><svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16l-2-9 5 4 4-6 4 6 5-4-2 9H5z"/></svg></span>' : ''}
        </span>
        <span class="tier-badge ${tier.class}">${tier.name}</span>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-xs text-gray-400">${entry.total_referrals} ref</span>
        <span class="bonus-pill text-xs">₵${formatNumber(entry.bonus)}</span>
      </div>
    </div>`;
  }
  html += '</div>';
}

    list.innerHTML = html;
  } catch(e) {
    list.innerHTML = '<div class="text-gray-500 text-center py-4 text-sm">Failed to load leaderboard.</div>';
  }
}

       function animateCounter() {
    const els = document.querySelectorAll('.hero-counter');
    if (els.length === 0) return;
    let current = 0;
    const target = 2000;
    const step = target / 60;
    const interval = setInterval(() => {
        current += step;
        if (current >= target) {
            current = target;
            clearInterval(interval);
        }
        els.forEach(el => { el.textContent = formatNumber(current); });
    }, 30);
}

        window.addEventListener('scroll', () => {
            const nav = document.getElementById('navbar');
            if (nav) {
                nav.style.background = window.scrollY > 50 ? 'rgba(10,10,18,0.9)' : 'transparent';
                nav.style.backdropFilter = window.scrollY > 50 ? 'blur(20px)' : 'none';
            }
        });

        setInterval(() => {
            if (document.getElementById('page-dashboard').classList.contains('active') && authToken) {
                updateDashboard();
            }
        }, 60000);

        // ========== REAL PAYOUT NOTIFICATIONS ==========
let recentPayouts = [];
let currentPayoutIndex = 0;
let payoutPopupInterval = null;

async function fetchRecentPayouts() {
  try {
    const res = await fetch(`${API_BASE}/api/recent-payouts`);
    if (res.ok) {
      const data = await res.json();
      recentPayouts = data.payouts;
      currentPayoutIndex = 0;
    }
  } catch (e) { /* ignore */ }
}

function showNextPayoutPopup() {
  if (recentPayouts.length === 0) return;
  const payout = recentPayouts[currentPayoutIndex];
  currentPayoutIndex = (currentPayoutIndex + 1) % recentPayouts.length;

  const displayName = formatDisplayName(payout.name);
  const timeAgoStr = timeAgo(payout.created_at);

  const popup = document.createElement('div');
  popup.className = 'payout-popup-premium';
  popup.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg">
        <i data-lucide="check" class="w-5 h-5 text-dark-950"></i>
      </div>
      <div>
        <p class="text-sm font-semibold text-gold-400">${displayName}</p>
        <p class="text-xs text-gray-300">
          just received <span class="text-white font-bold">₵${formatNumber(payout.amount)}</span> from their <span class="text-white">${payout.plan || 'investment'}</span> plan
        </p>
        <p class="text-[10px] text-gray-500 mt-0.5">${timeAgoStr}</p>
      </div>
    </div>
  `;
  document.body.appendChild(popup);

  setTimeout(() => {
    if (popup.parentNode) popup.parentNode.removeChild(popup);
  }, 5000);
}

function formatDisplayName(fullName) {
  if (!fullName) return 'Someone';
  const parts = fullName.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
  }
  return parts[0];
}

// Initialise (replaces the old setTimeout / setInterval)
fetchRecentPayouts().then(() => {
  if (recentPayouts.length > 0) {
    setTimeout(() => showNextPayoutPopup(), 5000);
    payoutPopupInterval = setInterval(showNextPayoutPopup, 45000);
  }
}).catch(() => {});

        // Initialisation
        document.addEventListener('DOMContentLoaded', () => {
            lucide.createIcons();
            if (authToken) {
                fetch(`${API_BASE}/api/auth/me`, { headers: {'Authorization': `Bearer ${authToken}`} })
                    .then(r => r.json())
                    .then(d => { if (d.user) {
    currentUser = d.user;
    loadPaymentSettings();
} else {
    localStorage.removeItem('gcc_token');
    localStorage.removeItem('gcc_user');
    authToken = null;
} })
                    .catch(() => {});
            }
            animateCounter();
            document.getElementById('deposit-modal').addEventListener('click', function(e) { if (e.target === this) closeDepositModal(); });

// Update Tier 2 info when plan is changed
document.getElementById('reinvest-new-plan').addEventListener('change', updateTier2Info);
             const planSelect = document.getElementById('reinvest-new-plan');
  if (planSelect) {
    planSelect.addEventListener('change', updateTier2Info);
  }
            // Restore deposit modal if user was in the middle of a payment
const savedDeposit = sessionStorage.getItem('gcc_deposit');
if (savedDeposit) {
  try {
    const deposit = JSON.parse(savedDeposit);
    if (deposit.expires > Date.now()) {
      selectedPlan = deposit.plan;
      document.getElementById('deposit-plan').value = deposit.plan;
      document.getElementById('deposit-amount').value = deposit.amount;
      document.getElementById('pay-amount-display').textContent = '₵' + formatNumber(deposit.amount);
      document.getElementById('pay-reference-code').textContent = deposit.reference;
      document.getElementById('pay-reference-expiry').textContent = 'Expires in 30 minutes';
      document.getElementById('pay-momo-number').textContent = paymentSettings.momo_number || '••••••••••';
      document.getElementById('pay-momo-name').textContent = paymentSettings.momo_name || '';
      document.getElementById('deposit-step1').classList.add('hidden');
      document.getElementById('deposit-step2').classList.remove('hidden');
      document.getElementById('deposit-modal').classList.remove('hidden');
      document.getElementById('deposit-modal').classList.add('flex');
      lucide.createIcons();
    } else {
      sessionStorage.removeItem('gcc_deposit');
    }
  } catch(e) {
    sessionStorage.removeItem('gcc_deposit');
  }
}
// Show membership agreement if not yet accepted
if (!localStorage.getItem('gcc_terms_accepted')) {
  const termsModal = document.getElementById('terms-modal');
  if (termsModal) {
    termsModal.classList.remove('hidden');
    termsModal.classList.add('flex');
  }
}
            });

document.addEventListener('DOMContentLoaded', () => {
  // Store referral code from URL so it survives navigation
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  if (refCode) {
    localStorage.setItem('gcc_ref_code', refCode);
  } else {
    const storedRef = localStorage.getItem('gcc_ref_code');
    if (storedRef) {
      const refInput = document.getElementById('signup-referral');
      if (refInput) refInput.value = storedRef;
    }
  }

  setInterval(loadLeaderboard, 10000);
});

        setInterval(loadLeaderboard, 10000); 



  // Record a page view (only once per session)
  if (!sessionStorage.getItem('_gcc_pv')) {
    sessionStorage.setItem('_gcc_pv', '1');
    fetch('https://goldcoast-api.onrender.com/api/page-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: 'landing' })
    }).catch(() => {});
  }
