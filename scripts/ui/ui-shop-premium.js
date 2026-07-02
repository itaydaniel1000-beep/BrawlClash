// ui-shop-premium.js — real-money ("₪") purchases + post-match ad interstitial.
//
// Architecture: this is a client-side-only game on GitHub Pages — there is
// no backend that can validate payments. That means a motivated user can
// always edit localStorage in DevTools to fake purchases. We accept that
// trade-off explicitly: the goal of this file is to make HONEST purchases
// work cleanly, not to enforce them cryptographically.
//
// Flow for a real-money purchase:
//   1. User clicks "Buy with ₪X" → openPurchaseFlow(productId)
//   2. We open the payment provider's hosted checkout in a NEW TAB.
//        URLs live in REAL_MONEY_PRODUCTS[id].paymentUrl — admin (game
//        owner) fills these in with Stripe Payment Links / PayPal Buy
//        Buttons / etc.
//   3. The provider redirects on success to a URL containing
//        ?bc_purchase=<productId>
//      e.g. https://itaydaniel1000-beep.github.io/PixelArena/?bc_purchase=premium_pass
//   4. On page load _consumePurchaseFromUrl() detects the param and
//      grants the entitlement locally.
//
// Ad interstitial: after a battle ends (win OR loss), if the local user
// does NOT have adFree, showInterstitialAd() pops a full-screen overlay
// with a placeholder ad block + a 5-second skip timer. Replace the
// placeholder block with a real ad-network snippet (AdSense / etc.) once
// you have an approved account.

// === Bit manual payment settings ===========================================
// The game currently accepts real money via *manual* Bit transfers to a
// parent-owned Bit account (no card processor → no 2.9 % fee, but no
// automated grant either — the parent must eyeball the incoming Bit
// notification and hit "אשר עסקה" in the admin panel to hand the item
// out).  Replace _BIT_RECEIVER_PHONE below with the real Bit number of
// whoever is receiving the money.
const _BIT_RECEIVER_PHONE   = '054-000-0000';   // ← REPLACE WITH REAL BIT NUMBER
const _BIT_RECEIVER_NAME    = 'הורה של השחקן';   // ← displayed to the buyer so they can double-check
const _BIT_CONTACT_WHATSAPP = '054-000-0000';   // ← WhatsApp for the receipt screenshot; same as Bit is fine

// === Product catalogue =====================================================
// `paymentUrl` is the hosted checkout link — leave EMPTY for a Bit manual
// product (`bitPayment: true`), the buy button then opens the Bit modal
// instead of a new browser tab. If you later switch to Stripe/PayPal for
// a specific product, fill in `paymentUrl` and drop the `bitPayment`
// flag on that product only.
const REAL_MONEY_PRODUCTS = {
    premium_pass: {
        name:    '👑 Brawl Pass פרימיום',
        desc:    'פותח את שורת הפרסים העליונה לכל המסלול',
        price:   2,
        currency: '₪',
        bitPayment: true,
        paymentUrl: '',
        oneShot: true,
        grant: () => {
            if (typeof playerStats === 'undefined' || !playerStats) return;
            playerStats.hasBrawlPass = true;
        },
        alreadyOwned: () => !!(playerStats && playerStats.hasBrawlPass)
    },
    gems_100: {
        name: '💎 100 יהלומים', desc: 'חבילה קטנה', price: 5, currency: '₪',
        bitPayment: true, paymentUrl: '',
        grant: () => { playerStats.gems = (playerStats.gems || 0) + 100; }
    },
    gems_500: {
        name: '💎 500 יהלומים', desc: 'חבילה בינונית • בונוס 25%', price: 20, currency: '₪',
        bitPayment: true, paymentUrl: '',
        grant: () => { playerStats.gems = (playerStats.gems || 0) + 500; }
    },
    gems_1500: {
        name: '💎 1,500 יהלומים', desc: 'חבילה גדולה • הכי משתלם', price: 50, currency: '₪',
        bitPayment: true, paymentUrl: '',
        grant: () => { playerStats.gems = (playerStats.gems || 0) + 1500; }
    },
    ad_free: {
        name: '🚫 הסרת פרסומות לכל החיים',
        desc: 'לא יוצגו יותר פרסומות אחרי קרבות',
        price: 15,
        currency: '₪',
        bitPayment: true,
        paymentUrl: '',
        oneShot: true,
        grant: () => {
            if (typeof playerStats === 'undefined' || !playerStats) return;
            playerStats.adFree = true;
        },
        alreadyOwned: () => !!(playerStats && playerStats.adFree)
    }
};
window.REAL_MONEY_PRODUCTS = REAL_MONEY_PRODUCTS;

// === Purchase flow =========================================================

function openPurchaseFlow(productId) {
    const p = REAL_MONEY_PRODUCTS[productId];
    if (!p) return;
    // One-shot products (premium pass, ad-free) — refuse a second buy.
    if (p.oneShot && typeof p.alreadyOwned === 'function' && p.alreadyOwned()) {
        if (typeof showTransientToast === 'function')
            showTransientToast('✓ כבר רכשת את הפריט הזה');
        return;
    }
    // Bit-manual flow — pop the "העבר בביט" modal so the buyer sends the
    // money outside the browser and pings us on WhatsApp. The admin
    // (parent) then approves the pending record from the admin panel.
    if (p.bitPayment) {
        _openBitPaymentModal(productId, p);
        return;
    }
    if (!p.paymentUrl) {
        if (typeof showTransientToast === 'function')
            showTransientToast('🛒 התשלום עוד לא הוגדר — נסה שוב מאוחר יותר');
        return;
    }
    try {
        window.open(p.paymentUrl, '_blank', 'noopener');
        if (typeof showTransientToast === 'function')
            showTransientToast('💳 עמוד התשלום נפתח בלשונית חדשה');
    } catch (e) {
        if (typeof showTransientToast === 'function')
            showTransientToast('❌ לא הצלחנו לפתוח את עמוד התשלום');
    }
}
window.openPurchaseFlow = openPurchaseFlow;

// === Bit manual — pending purchases store ===================================
// Buyers who click "כבר העברתי" push a record here; the admin panel reads
// this list and either grants the item (calling _grantPurchase) or rejects
// it. State lives in localStorage so it survives refreshes and lets the
// admin (parent) log in later and process the queue.
const _BIT_PENDING_KEY = 'bc_bit_pending_v1';

function _loadPendingBitPurchases() {
    try {
        const raw = localStorage.getItem(_BIT_PENDING_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
}
function _savePendingBitPurchases(list) {
    try { localStorage.setItem(_BIT_PENDING_KEY, JSON.stringify(list || [])); }
    catch (e) { /* quota / disabled — ignore */ }
}
function _addPendingBitPurchase(productId, product) {
    const list = _loadPendingBitPurchases();
    // Short random reference — the buyer types this in the Bit "note"
    // field so the admin can match the incoming transfer to the pending
    // record even when several users are buying at the same time.
    const ref = 'BC' + Math.floor(100000 + Math.random() * 900000);
    list.push({
        id:         ref,
        productId:  productId,
        productName: product.name,
        price:      product.price,
        currency:   product.currency || '₪',
        username:   (typeof playerStats !== 'undefined' && playerStats && playerStats.username) || '(אורח)',
        ts:         Date.now(),
        status:     'pending'
    });
    _savePendingBitPurchases(list);
    return ref;
}
window._loadPendingBitPurchases = _loadPendingBitPurchases;
window._savePendingBitPurchases = _savePendingBitPurchases;

// Called from the admin approval panel. Grants the item on the CURRENT
// device only (the buyer's device — see the admin-panel notes about
// running approval on the actual buyer's device). Marks the pending
// record as approved so it disappears from the queue.
function _approveBitPurchase(ref) {
    const list = _loadPendingBitPurchases();
    const rec  = list.find(r => r.id === ref);
    if (!rec) return false;
    const ok = _grantPurchase(rec.productId);
    if (!ok) return false;
    rec.status = 'approved';
    rec.approvedAt = Date.now();
    _savePendingBitPurchases(list);
    return true;
}
function _rejectBitPurchase(ref) {
    const list = _loadPendingBitPurchases();
    const rec  = list.find(r => r.id === ref);
    if (!rec) return false;
    rec.status = 'rejected';
    rec.rejectedAt = Date.now();
    _savePendingBitPurchases(list);
    return true;
}
window._approveBitPurchase = _approveBitPurchase;
window._rejectBitPurchase  = _rejectBitPurchase;

// === Bit manual — buyer-facing modal =======================================
// Shows the receiver's Bit number, the amount, the product name, and the
// reference token. Two buttons: "פתח ווטסאפ" (opens a wa.me link with a
// pre-filled message including the ref token so the parent can just glance
// at WhatsApp), and "כבר העברתי" (commits the pending record and closes
// the modal with a "waiting for approval" toast).
function _openBitPaymentModal(productId, product) {
    let ov = document.getElementById('bit-payment-overlay');
    if (!ov) {
        ov = document.createElement('div');
        ov.id = 'bit-payment-overlay';
        ov.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.75); z-index:11000; display:flex; align-items:center; justify-content:center; padding:14px; font-family:"Assistant",sans-serif;';
        document.body.appendChild(ov);
    }
    const ref = _addPendingBitPurchase(productId, product);
    const waNumber = (_BIT_CONTACT_WHATSAPP || '').replace(/\D/g, '');
    const waMsgRaw = `שלום, קניתי במשחק: ${product.name} (${product.currency || '₪'}${product.price}). קוד עסקה: ${ref}. מצורף צילום מסך של ההעברה בביט.`;
    const waHref   = 'https://wa.me/972' + waNumber.replace(/^0/, '') + '?text=' + encodeURIComponent(waMsgRaw);
    ov.innerHTML = `
        <div style="background:linear-gradient(180deg,#1e3a5f,#0f1a2e); color:#fff; border-radius:18px; padding:22px; max-width:420px; width:100%; box-shadow:0 12px 40px rgba(0,0,0,0.6); text-align:right; direction:rtl;">
            <div style="display:flex; align-items:center; gap:10px; font-size:1.15rem; font-weight:bold; margin-bottom:8px;">
                💳 תשלום דרך ביט
            </div>
            <div style="font-size:0.92rem; opacity:0.85; margin-bottom:14px; line-height:1.5;">
                המשחק לא מקבל תשלום אוטומטי דרך כרטיס אשראי, אלא דרך העברה ידנית באפליקציית <b>ביט</b>. אחרי שתעביר את הכסף ותשלח לנו הודעה בווטסאפ, נאשר את הרכישה תוך זמן קצר.
            </div>
            <div style="background:rgba(255,255,255,0.07); border-radius:12px; padding:14px; margin-bottom:14px;">
                <div style="font-size:0.8rem; opacity:0.7; margin-bottom:2px;">מוצר:</div>
                <div style="font-weight:bold; margin-bottom:10px;">${product.name}</div>
                <div style="font-size:0.8rem; opacity:0.7; margin-bottom:2px;">סכום:</div>
                <div style="font-weight:bold; font-size:1.35rem; color:#3498db; margin-bottom:10px;">${product.currency || '₪'}${product.price}</div>
                <div style="font-size:0.8rem; opacity:0.7; margin-bottom:2px;">להעביר בביט אל:</div>
                <div style="font-weight:bold; direction:ltr; text-align:left; margin-bottom:4px;">${_BIT_RECEIVER_PHONE}</div>
                <div style="font-size:0.78rem; opacity:0.7; margin-bottom:10px;">(${_BIT_RECEIVER_NAME})</div>
                <div style="font-size:0.8rem; opacity:0.7; margin-bottom:2px;">להוסיף בהערה:</div>
                <div style="font-weight:bold; letter-spacing:1.5px; color:#f1c40f; direction:ltr; text-align:left;">${ref}</div>
            </div>
            <button id="bit-copy-phone" style="width:100%; background:#3498db; color:#fff; border:none; border-radius:10px; padding:11px; font-size:1rem; font-weight:bold; cursor:pointer; margin-bottom:8px;">📋 העתק את מספר הביט</button>
            <a id="bit-wa-link" href="${waHref}" target="_blank" rel="noopener" style="display:block; width:100%; background:#25d366; color:#fff; border:none; border-radius:10px; padding:11px; font-size:1rem; font-weight:bold; text-align:center; text-decoration:none; margin-bottom:8px; box-sizing:border-box;">💬 שלח צילום מסך בווטסאפ</a>
            <button id="bit-sent-btn" style="width:100%; background:#27ae60; color:#fff; border:none; border-radius:10px; padding:12px; font-size:1.05rem; font-weight:bold; cursor:pointer; margin-bottom:8px;">✅ כבר העברתי, ממתין לאישור</button>
            <button id="bit-cancel-btn" style="width:100%; background:transparent; color:#bdc3c7; border:1px solid rgba(255,255,255,0.2); border-radius:10px; padding:9px; font-size:0.9rem; cursor:pointer;">ביטול</button>
        </div>
    `;
    ov.style.display = 'flex';
    const close = () => { ov.style.display = 'none'; };
    const copyBtn = document.getElementById('bit-copy-phone');
    if (copyBtn) copyBtn.onclick = () => {
        try { navigator.clipboard.writeText(_BIT_RECEIVER_PHONE); }
        catch (e) { /* ignore — user can retype */ }
        if (typeof showTransientToast === 'function')
            showTransientToast('📋 מספר הועתק');
    };
    const sentBtn = document.getElementById('bit-sent-btn');
    if (sentBtn) sentBtn.onclick = () => {
        close();
        if (typeof showTransientToast === 'function')
            showTransientToast(`⏳ הרכישה בבדיקה — קוד עסקה ${ref}`);
    };
    const cancelBtn = document.getElementById('bit-cancel-btn');
    if (cancelBtn) cancelBtn.onclick = () => {
        // If they didn't actually transfer, drop the pending record so
        // the admin queue doesn't fill with abandoned tickets.
        const list = _loadPendingBitPurchases().filter(r => r.id !== ref);
        _savePendingBitPurchases(list);
        close();
    };
}
window._openBitPaymentModal = _openBitPaymentModal;

// === Bit manual — admin approval panel =====================================
// Called from openAdminMenu (ui-admin.js). Injects a "רכישות ממתינות
// לאישור" card at the top of the admin panel body listing every pending
// bit purchase with two buttons per row: "✓ אושר / הענק" and "✗ דחה".
// Approvals call _approveBitPurchase which in turn calls _grantPurchase,
// so the item lands in whoever is logged into THIS device (that's why
// the flow tells the buyer to hand the phone to the parent after paying —
// approving on a device where the buyer isn't logged in would grant the
// gems to the wrong account).
function _renderBitPendingApprovals(isSuper) {
    if (!isSuper) return;
    const container = document.querySelector('#admin-panel-overlay .admin-panel-container');
    if (!container) return;
    let card = document.getElementById('bit-pending-card');
    if (!card) {
        card = document.createElement('div');
        card.id = 'bit-pending-card';
        card.style.cssText = 'background:rgba(52,152,219,0.10); border:1px solid rgba(52,152,219,0.5); border-radius:12px; padding:10px 12px; margin:8px 0 14px; direction:rtl; text-align:right;';
        // Put it right below the container header, before any hack rows.
        const firstHackRow = container.querySelector('.hack-row');
        if (firstHackRow) container.insertBefore(card, firstHackRow);
        else container.insertBefore(card, container.firstChild);
    }
    const list = _loadPendingBitPurchases().filter(r => r.status === 'pending');
    if (list.length === 0) {
        card.innerHTML = `
            <div style="font-weight:bold; color:#3498db; margin-bottom:4px;">💳 רכישות ביט ממתינות לאישור</div>
            <div style="font-size:0.85rem; opacity:0.7;">אין רכישות ממתינות.</div>
        `;
        return;
    }
    const rowsHtml = list.map(r => {
        const dt = new Date(r.ts);
        const timeStr = dt.toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        return `
            <div style="background:rgba(255,255,255,0.06); border-radius:10px; padding:8px 10px; margin-top:6px; display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
                    <span style="font-weight:bold; color:#ecf0f1;">${r.productName}</span>
                    <span style="color:#f1c40f; font-weight:bold; direction:ltr;">${r.id}</span>
                </div>
                <div style="font-size:0.82rem; opacity:0.85;">
                    שחקן: <b>${r.username}</b> • סכום: <b>${r.currency}${r.price}</b> • ${timeStr}
                </div>
                <div style="display:flex; gap:6px;">
                    <button data-bit-approve="${r.id}" style="flex:1; background:#27ae60; color:#fff; border:none; border-radius:8px; padding:8px; font-weight:bold; cursor:pointer;">✓ אישור והענק</button>
                    <button data-bit-reject="${r.id}"  style="flex:1; background:#c0392b; color:#fff; border:none; border-radius:8px; padding:8px; font-weight:bold; cursor:pointer;">✗ דחייה</button>
                </div>
            </div>
        `;
    }).join('');
    card.innerHTML = `
        <div style="font-weight:bold; color:#3498db; margin-bottom:4px;">💳 רכישות ביט ממתינות לאישור (${list.length})</div>
        <div style="font-size:0.78rem; opacity:0.7; margin-bottom:4px;">
            אשר <b>רק אחרי</b> שוודאת שהכסף באמת נכנס לביט שלך. האישור מקנה את הפריט לחשבון שמחובר עכשיו במכשיר הזה.
        </div>
        ${rowsHtml}
    `;
    card.querySelectorAll('[data-bit-approve]').forEach(btn => {
        btn.onclick = () => {
            const ref = btn.getAttribute('data-bit-approve');
            const ok = _approveBitPurchase(ref);
            if (ok) {
                if (typeof showTransientToast === 'function')
                    showTransientToast(`✅ ${ref} אושרה והפריט הוענק`);
            } else if (typeof showTransientToast === 'function') {
                showTransientToast('❌ לא הצלחנו לאשר — הפריט לא ידוע?');
            }
            _renderBitPendingApprovals(true);
        };
    });
    card.querySelectorAll('[data-bit-reject]').forEach(btn => {
        btn.onclick = () => {
            const ref = btn.getAttribute('data-bit-reject');
            _rejectBitPurchase(ref);
            if (typeof showTransientToast === 'function')
                showTransientToast(`🗑️ ${ref} נדחתה`);
            _renderBitPendingApprovals(true);
        };
    });
}
window._renderBitPendingApprovals = _renderBitPendingApprovals;

// Local grant. Called automatically by _consumePurchaseFromUrl after a
// successful checkout redirect. Also callable by the super-admin from the
// console for manual grants ("הוקנה לאחר תשלום ידני").
function _grantPurchase(productId) {
    const p = REAL_MONEY_PRODUCTS[productId];
    if (!p) return false;
    try { p.grant(); } catch (e) { return false; }
    try { if (typeof saveStats === 'function') saveStats(); } catch (e) {}
    try { if (typeof updateStatsUI === 'function') updateStatsUI(); } catch (e) {}
    // Refresh whatever shop / brawl-pass view is currently rendered.
    try { if (typeof renderShop === 'function') renderShop(); } catch (e) {}
    try { if (typeof renderBrawlPass === 'function') renderBrawlPass(); } catch (e) {}
    if (typeof showTransientToast === 'function')
        showTransientToast(`✅ ${p.name} — נוסף לחשבון`);
    return true;
}
window._grantPurchase = _grantPurchase;

// Reads ?bc_purchase=<id> from the URL on page load and applies the grant.
// We strip the param afterwards via history.replaceState so a page refresh
// doesn't re-grant.
function _consumePurchaseFromUrl() {
    try {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('bc_purchase');
        if (!id) return;
        // Wait until playerStats / saveStats are ready (they're set up in
        // globals.js which runs before us, but we defensively delay one
        // tick anyway).
        setTimeout(() => {
            _grantPurchase(id);
            params.delete('bc_purchase');
            const qs = params.toString();
            const url = window.location.pathname + (qs ? ('?' + qs) : '') + window.location.hash;
            try { history.replaceState(null, '', url); } catch (e) {}
        }, 50);
    } catch (e) { /* malformed URL — ignore */ }
}
document.addEventListener('DOMContentLoaded', _consumePurchaseFromUrl);

// === Post-match ad interstitial ============================================
// Full-screen overlay with a placeholder ad block + 5-second countdown
// before "סגור" becomes clickable. Replace the inner div with a real ad
// network's embed snippet (AdSense responsive unit, etc.) once you have
// an approved account. Honors playerStats.adFree → never shows for paid
// users.

const _AD_SKIP_SECONDS = 5;
let _adOpen = false;

// Usernames with a free, permanent ad-blocker — bypass the post-match
// interstitial regardless of whether they've ever bought the upgrade.
// Per user request: super-admins ("Fy", "danniel1234!") never see ads.
const _AD_FREE_USERNAMES = ['Fy', 'danniel1234!'];

function _isAdFree() {
    if (typeof playerStats === 'undefined' || !playerStats) return false;
    if (playerStats.adFree) return true;
    const u = playerStats.username || '';
    if (_AD_FREE_USERNAMES.indexOf(u) !== -1) return true;
    return false;
}
window._isAdFree = _isAdFree;

function showInterstitialAd() {
    if (_adOpen) return;             // dedupe rapid calls
    if (_isAdFree()) return;
    _adOpen = true;
    // Build the overlay lazily on first call, then reuse.
    let ov = document.getElementById('interstitial-ad-overlay');
    if (!ov) {
        ov = document.createElement('div');
        ov.id = 'interstitial-ad-overlay';
        ov.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.92); z-index:10500; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:18px; gap:14px; font-family:"Assistant",sans-serif;';
        ov.innerHTML = `
            <div style="color:#bdc3c7; font-size:0.9rem; font-weight:bold;">פרסומת</div>
            <div id="interstitial-ad-slot" style="width:90%; max-width:360px; border-radius:14px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.5); background:#1a1a2e;">
                <img src="assets/ads/הלל אפקות.jpg"
                     alt="הלל אפקות"
                     style="display:block; width:100%; height:auto; object-fit:cover;"
                     onerror="this.style.display='none'; this.parentNode.innerHTML='<div style=&quot;color:#fff; text-align:center; padding:40px 18px;&quot;><div style=&quot;font-size:3rem; margin-bottom:10px;&quot;>📺</div><div style=&quot;font-weight:bold; margin-bottom:6px;&quot;>פרסומת לדוגמא</div><div style=&quot;font-size:0.85rem; opacity:0.85;&quot;>חסר את הקובץ assets/ads/הלל אפקות.jpg</div></div>';">
            </div>
            <button id="interstitial-ad-close" disabled style="background:#7f8c8d; color:#fff; border:none; border-radius:10px; padding:10px 22px; font-size:1rem; font-weight:bold; opacity:0.6; cursor:not-allowed;">
                <span id="interstitial-ad-countdown">דלג בעוד ${_AD_SKIP_SECONDS}…</span>
            </button>
            <button id="interstitial-ad-remove-btn" style="background:#27ae60; color:#fff; border:none; border-radius:10px; padding:8px 18px; font-size:0.9rem; cursor:pointer;">🚫 הסר פרסומות לכל החיים</button>
        `;
        document.body.appendChild(ov);
    }
    ov.style.display = 'flex';
    // Reset the skip countdown each open.
    const closeBtn = document.getElementById('interstitial-ad-close');
    const countdownEl = document.getElementById('interstitial-ad-countdown');
    const removeBtn = document.getElementById('interstitial-ad-remove-btn');
    let remaining = _AD_SKIP_SECONDS;
    if (closeBtn) {
        closeBtn.disabled = true;
        closeBtn.style.opacity = '0.6';
        closeBtn.style.cursor  = 'not-allowed';
        closeBtn.style.background = '#7f8c8d';
        closeBtn.onclick = null;
    }
    if (countdownEl) countdownEl.innerText = `דלג בעוד ${remaining}…`;
    const tick = setInterval(() => {
        remaining -= 1;
        if (remaining > 0) {
            if (countdownEl) countdownEl.innerText = `דלג בעוד ${remaining}…`;
            return;
        }
        clearInterval(tick);
        if (countdownEl) countdownEl.innerText = 'סגור';
        if (closeBtn) {
            closeBtn.disabled = false;
            closeBtn.style.opacity = '1';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.background = '#e74c3c';
            closeBtn.onclick = () => {
                ov.style.display = 'none';
                _adOpen = false;
            };
        }
    }, 1000);
    if (removeBtn) {
        removeBtn.onclick = () => {
            ov.style.display = 'none';
            _adOpen = false;
            clearInterval(tick);
            openPurchaseFlow('ad_free');
        };
    }
}
window.showInterstitialAd = showInterstitialAd;

// Preview helper — bypasses _isAdFree() so super-admins can verify the ad
// image renders correctly without turning off their permanent ad-block.
// Usage from the browser console:   _previewAd()
function _previewAd() {
    const wasOpen = _adOpen;
    _adOpen = false;
    const origIsAdFree = window._isAdFree;
    window._isAdFree = () => false;
    try { showInterstitialAd(); }
    finally { window._isAdFree = origIsAdFree; }
    if (wasOpen && !_adOpen) _adOpen = wasOpen;
}
window._previewAd = _previewAd;
