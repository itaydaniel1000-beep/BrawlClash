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

// === Product catalogue =====================================================
// `paymentUrl` is the hosted checkout link. LEAVE EMPTY for products you
// haven't set up yet — clicking the buy button will then show a friendly
// "coming soon" toast instead of an empty new tab. Replace with real URLs
// (Stripe Payment Links, PayPal hosted buttons, Gumroad, etc.) when ready.
const REAL_MONEY_PRODUCTS = {
    premium_pass: {
        name:    '👑 Brawl Pass פרימיום',
        desc:    'פותח את שורת הפרסים העליונה לכל המסלול',
        price:   2,
        currency: '₪',
        paymentUrl: '',   // ← put your Stripe / PayPal link here
        oneShot: true,    // can only be bought once
        grant: () => {
            if (typeof playerStats === 'undefined' || !playerStats) return;
            playerStats.hasBrawlPass = true;
        },
        alreadyOwned: () => !!(playerStats && playerStats.hasBrawlPass)
    },
    gems_100: {
        name: '💎 100 יהלומןם', desc: 'חבילה קטנה', price: 5, currency: '₪',
        paymentUrl: '',
        grant: () => { playerStats.gems = (playerStats.gems || 0) + 100; }
    },
    gems_500: {
        name: '💎 500 יהלומןם', desc: 'חבילה בינונית • בונוס 25%', price: 20, currency: '₪',
        paymentUrl: '',
        grant: () => { playerStats.gems = (playerStats.gems || 0) + 500; }
    },
    gems_1500: {
        name: '💎 1,500 יהלומןם', desc: 'חבילה גדולה • הכי משתלם', price: 50, currency: '₪',
        paymentUrl: '',
        grant: () => { playerStats.gems = (playerStats.gems || 0) + 1500; }
    },
    ad_free: {
        name: '🚫 הסרת פרסומות לכל החיים',
        desc: 'לא יוצגו יותר פרסומות אחרי קרבות',
        price: 15,
        currency: '₪',
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
    if (!p.paymentUrl) {
        if (typeof showTransientToast === 'function')
            showTransientToast('🛒 התשלום עוד לא הוגדר — נסה שוב מאוחר יותר');
        return;
    }
    try {
        window.open(p.paymentUrl, '_blank', 'noopener');
        if (typeof showTransientToast === 'function')
            showTransientToast('💳 ההקוויןה לתשלום נפתחה בלשונית חדשה');
    } catch (e) {
        if (typeof showTransientToast === 'function')
            showTransientToast('❌ לא הצלחנו לפתוח את עמוד התשלום');
    }
}
window.openPurchaseFlow = openPurchaseFlow;

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
