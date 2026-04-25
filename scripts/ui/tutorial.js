// tutorial.js - First-time-user walkthrough
//
// One-shot interactive tutorial that fires the very first time a user logs
// into a brand-new account. It walks them through:
//   1. The objective (destroy the opponent's safe).
//   2. Forces them into a vs-bot match with the bot disabled and ALL 12
//      brawlers preloaded into the deck so we can teach each one in turn.
//   3. For each brawler, locks every other deck card so the player can only
//      pick THIS one, then surfaces a per-brawler explanation when they pick
//      it up. They place it once and we move on.
//   4. Quitting back to the lobby and a guided tour of every sidebar button.
//   5. A persistent "click here to restart tutorial" chip pointing at the
//      📖 guide button so the user can replay any time.
//
// Marker: localStorage 'brawlclash_tutorial_done' = '1' once complete.
// Replay: window.startTutorial(true) wipes the marker and re-runs.

(function () {
    const STORAGE_KEY = 'brawlclash_tutorial_done';
    const ALL_BRAWLERS = ['bruce', 'leon', 'bull', 'penny', 'scrappy', 'pam',
                          'max', '8bit', 'emz', 'tara', 'spike', 'mr-p'];

    // Per-brawler explanation text shown when the player picks the card.
    const BRAWLER_TIPS = {
        bruce:    'ברוס — לוחם כבד עם נזק גבוה ו-1860 חיים. זוז קדימה לאט וקח מכות. **לחץ על המסך כדי להניח את ברוס. טיפ: החזק לחיצה ארוכה (או shift+לחיצה) כדי להניח עוד וברצף!**',
        leon:     'ליאון — מתנקש בלתי-נראה. הוא מתחיל בלי להיראות, חודר לעמדות אויב ועושה נזק. עולה 5 אליקסיר.',
        bull:     'בול — דמות לוחמה עוצמתית עם דאש מיוחד (כפתור 💨 בקרב). השתמש בו כדי להסתער על האויב.',
        penny:    'פני — טורט (מבנה) עם תותח-מטווח ארוך שיורה אוטומטית. הניחו אותה בחצי שלך כדי להגן על הכספת.',
        scrappy:  'ספארקי (Scrappy) — טורט מהיר. תוקף קרוב אבל עם קצב ירי גבוה. מצוין לבלום אויבים שמגיעים אליך.',
        pam:      'פאם — אורת ריפוי. כל הדמויות שלך בתוך הטווח שלה מקבלות חיים כל שנייה. שימושי מאוד!',
        max:      'מקס — אורת מהירות. כל הדמויות שלך בטווח רצות פי 1.5 ותוקפות מהר יותר.',
        '8bit':   '8-ביט — אורת חיזוק נזק. הדמויות שלך בטווח עושות יותר נזק.',
        emz:      'אמז — אורת רעל. אויבים שעוברים דרכה מואטים. שימושי לבלום הסתערות.',
        tara:     'טארה — אורת משיכה. שואבת אויבים אליה. שימושי כדי לרכז אותם בטווח של דמויות אחרות.',
        spike:    'ספייק — אורת קוצים. מאט אויבים בטווח. שילוב נהדר עם אבוטות דמיוניות.',
        'mr-p':   'מיסטר-פי — מבנה שמייצר פורטרים (חיילים קטנים) באופן אוטומטי.'
    };

    // ---- State ----
    let _state = {
        active: false,
        step: 0,
        clickGuard: null,
        savedDeck: null,
        savedDifficulty: null,
        savedAdminHacks: null,
        currentBrawler: null
    };

    // ---- Persistence helpers ----
    function isComplete() {
        try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { return false; }
    }
    function markComplete() {
        try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
    }
    function clearMarker() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }

    // ---- Overlay infrastructure ----
    function ensureOverlay() {
        let ov = document.getElementById('tutorial-overlay');
        if (ov) return ov;
        ov = document.createElement('div');
        ov.id = 'tutorial-overlay';
        ov.innerHTML = `
            <div id="tutorial-backdrop"></div>
            <div id="tutorial-spotlight"></div>
            <div id="tutorial-tooltip">
                <div id="tutorial-title"></div>
                <div id="tutorial-text"></div>
                <div class="tutorial-actions">
                    <button class="tutorial-btn" id="tutorial-next-btn">המשך</button>
                </div>
            </div>
        `;
        document.body.appendChild(ov);
        return ov;
    }

    function show() {
        ensureOverlay().classList.add('active');
    }
    function hide() {
        const ov = document.getElementById('tutorial-overlay');
        if (ov) ov.classList.remove('active');
    }

    // Position the spotlight cutout over a target element. Toggles the
    // separate backdrop too so we don't double-dim — when the spotlight is
    // active its own huge box-shadow handles the darken-outside effect, so
    // the backdrop hides. On modal-only steps (no target), backdrop shows
    // for the dim and spotlight hides.
    function spotlight(selector) {
        const sp = document.getElementById('tutorial-spotlight');
        const bd = document.getElementById('tutorial-backdrop');
        if (!sp) return null;
        if (!selector) {
            sp.classList.remove('active');
            sp.style.display = 'none';
            if (bd) bd.style.display = '';
            return null;
        }
        const el = document.querySelector(selector);
        if (!el) {
            sp.classList.remove('active');
            sp.style.display = 'none';
            if (bd) bd.style.display = '';
            return null;
        }
        const rect = el.getBoundingClientRect();
        // Add a little padding around the spotlight so the highlight ring
        // doesn't sit flush against the element.
        const pad = 6;
        sp.style.left   = (rect.left   - pad) + 'px';
        sp.style.top    = (rect.top    - pad) + 'px';
        sp.style.width  = (rect.width  + pad * 2) + 'px';
        sp.style.height = (rect.height + pad * 2) + 'px';
        sp.style.display = '';
        sp.classList.add('active');
        if (bd) bd.style.display = 'none';
        return el;
    }

    // Position the tooltip near the spotlight, or centred when no target.
    function positionTooltip(targetEl) {
        const tip = document.getElementById('tutorial-tooltip');
        if (!tip) return;
        const tipRect = tip.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (!targetEl) {
            // Centre
            tip.style.left = ((vw - tipRect.width) / 2) + 'px';
            tip.style.top  = ((vh - tipRect.height) / 2) + 'px';
            return;
        }
        const tRect = targetEl.getBoundingClientRect();
        // Prefer below the target. If no room, try above. Else side.
        let top  = tRect.bottom + 16;
        let left = Math.max(10, Math.min(tRect.left, vw - tipRect.width - 10));
        if (top + tipRect.height > vh - 10) {
            top = Math.max(10, tRect.top - tipRect.height - 16);
        }
        if (top < 10) top = 10;
        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
    }

    function setText(title, html) {
        const t = document.getElementById('tutorial-title');
        const tx = document.getElementById('tutorial-text');
        if (t) t.innerText = title || '';
        if (tx) tx.innerHTML = html || '';
    }

    function setButton(label, onClick) {
        const btn = document.getElementById('tutorial-next-btn');
        if (!btn) return;
        btn.style.display = 'inline-block';
        btn.innerText = label || 'הבנתי';
        btn.onclick = (e) => { e.stopPropagation(); onClick && onClick(); };
    }

    // Hide ONLY the explanation bubble (title/text/הבנתי button) when the
    // user clicks "הבנתי" on an action-required step. The spotlight ring
    // around the highlighted element AND the darkened backdrop both STAY
    // visible so the user can clearly see which button they're allowed to
    // click. The click-guard also stays active in the background.
    function hideExplanation() {
        const tip = document.getElementById('tutorial-tooltip');
        if (tip) tip.style.display = 'none';
    }
    function showExplanation() {
        const tip = document.getElementById('tutorial-tooltip');
        if (tip) tip.style.display = '';
    }

    // ---- Click guard: swallow every click that isn't on the spotlight ----
    function installClickGuard(allowedSelector) {
        removeClickGuard();
        const handler = (ev) => {
            // Always allow our own tooltip / overlay clicks.
            if (ev.target.closest('#tutorial-tooltip')) return;
            // If we have a whitelisted selector, check whether the click is
            // inside the matching element OR our tooltip.
            if (allowedSelector) {
                const el = document.querySelector(allowedSelector);
                if (el && (el === ev.target || el.contains(ev.target))) return;
            }
            // Block everything else.
            ev.preventDefault();
            ev.stopPropagation();
            ev.stopImmediatePropagation();
            return false;
        };
        document.addEventListener('click', handler, true);
        document.addEventListener('pointerdown', handler, true);
        document.addEventListener('touchstart', handler, { capture: true, passive: false });
        _state.clickGuard = handler;
    }
    function removeClickGuard() {
        if (!_state.clickGuard) return;
        document.removeEventListener('click', _state.clickGuard, true);
        document.removeEventListener('pointerdown', _state.clickGuard, true);
        document.removeEventListener('touchstart', _state.clickGuard, { capture: true });
        _state.clickGuard = null;
    }

    // ---- Step renderers ----
    // Every step gets a "הבנתי" button. For pure modal steps (no `target`,
    // OR explicit onNext) the button advances to the next step. For
    // action-required steps the default action is to JUST hide the
    // explanation (tooltip + spotlight + backdrop) while keeping the
    // click-guard active in the background — the user dismisses the help
    // bubble but can still only click the spotlighted element.
    function showStep(opts) {
        show();
        showExplanation(); // ensure tooltip is visible if previous step hid it
        const targetEl = spotlight(opts.target);
        installClickGuard(opts.allowClick || opts.target);
        setText(opts.title, opts.text);

        const buttonLabel = opts.button || 'הבנתי';
        const buttonAction = opts.onNext || hideExplanation;
        setButton(buttonLabel, buttonAction);

        // Force layout for tooltip positioning.
        setTimeout(() => positionTooltip(targetEl), 0);
        // Re-position on resize / scroll for safety.
        const reposition = () => {
            const newTarget = spotlight(opts.target);
            positionTooltip(newTarget);
        };
        window.addEventListener('resize', reposition);
        _state._cleanup = () => window.removeEventListener('resize', reposition);
    }

    function endStep() {
        if (_state._cleanup) _state._cleanup();
        _state._cleanup = null;
    }

    function dismissOverlay() {
        endStep();
        removeClickGuard();
        hide();
    }

    // ---- Game-state plumbing ----
    function snapshotGameState() {
        try {
            _state.savedDeck = (window.playerDeck) ? [...playerDeck] : null;
            _state.savedDifficulty = (typeof difficulty !== 'undefined') ? difficulty : null;
            _state.savedAdminHacks = (typeof adminHacks !== 'undefined')
                ? JSON.parse(JSON.stringify(adminHacks))
                : null;
        } catch (e) {}
    }
    function restoreGameState() {
        try {
            if (_state.savedDeck) {
                window.playerDeck = _state.savedDeck;
                if (typeof savePlayerDeck === 'function') savePlayerDeck();
            }
            if (_state.savedDifficulty !== null && typeof difficulty !== 'undefined') {
                difficulty = _state.savedDifficulty;
            }
            if (_state.savedAdminHacks && typeof adminHacks !== 'undefined') {
                Object.assign(adminHacks, _state.savedAdminHacks);
                if (typeof saveAdminHacks === 'function') saveAdminHacks();
            }
        } catch (e) {}
    }

    function setUpTutorialMatch() {
        // 12 brawlers in the deck (game uses up to 8 normally; we cram all 12
        // so each one is reachable in the deck).
        if (typeof window.playerDeck !== 'undefined') {
            window.playerDeck = ALL_BRAWLERS.slice();
            if (typeof savePlayerDeck === 'function') savePlayerDeck();
        }
        // Disable the bot for the tutorial — the user shouldn't be pressured.
        if (typeof adminHacks !== 'undefined') {
            adminHacks.disableBot = true;
            adminHacks.infiniteElixir = true; // make every card free to pick
            if (typeof saveAdminHacks === 'function') saveAdminHacks();
        }
    }

    // ---- Step definitions ----
    // Each function ends by calling the next one (or showStep for the next
    // step). This keeps the flow linear and easy to follow.

    function step1_welcome() {
        showStep({
            title: 'ברוך הבא ל-BrawlClash! 🎮',
            text: 'המטרה במשחק: <b>להרוס את הכספת האדומה של היריב</b> שנמצאת בחלק העליון של המפה, לפני שהיריב מצליח להרוס את <b>הכספת הכחולה שלך</b> שבתחתית. ' +
                  'הניח דמויות מהקלפים כדי לתקוף ולהגן. כל קלף עולה אליקסיר 🧪.',
            button: 'בוא נתחיל!',
            onNext: step2_clickPlay
        });
    }

    function step2_clickPlay() {
        snapshotGameState();
        setUpTutorialMatch();
        showStep({
            title: 'התחל קרב ראשון',
            text: 'לחץ על כפתור <b>PLAY</b> כדי להיכנס לקרב הדרכה. אל תדאג — הבוט מושבת ויש לך אליקסיר אינסופי.',
            target: '#lobby-start-btn',
            button: false
        });
        const btn = document.querySelector('#lobby-start-btn');
        if (btn) {
            const handler = () => {
                btn.removeEventListener('click', handler);
                // Wait for the game to actually be playing.
                setTimeout(step3_inMatchIntro, 800);
            };
            btn.addEventListener('click', handler);
        }
    }

    function step3_inMatchIntro() {
        showStep({
            title: 'אתה במשחק! 🎯',
            text: 'אלו הקלפים שלך בתחתית המסך. הניח דמויות בחצי <b>הכחול</b> שלך (תחתית המפה). הדמויות יזחלו לכיוון הכספת האדומה ויתקפו אותה.',
            button: 'הבנתי, הראה לי דמויות!',
            onNext: () => teachBrawler(0)
        });
    }

    // Iteratively teach each brawler. Locks every deck card except the one
    // we want them to pick, then waits for them to actually pick + place it.
    function teachBrawler(idx) {
        if (idx >= ALL_BRAWLERS.length) {
            return step4_quit;
        }
        const brawler = ALL_BRAWLERS[idx];
        _state.currentBrawler = brawler;
        const targetSel = `#card-${brawler}`;

        // Disable every other card visually + via clickGuard.
        document.querySelectorAll('.card').forEach(c => {
            const isThis = c.id === `card-${brawler}`;
            c.style.pointerEvents = isThis ? 'auto' : 'none';
            c.style.opacity = isThis ? '1' : '0.35';
        });

        showStep({
            title: 'הדמות הבאה',
            text: 'לחץ על הקלף המודגש בלבד כדי להמשיך.',
            target: targetSel,
            button: false,
            allowClick: targetSel
        });

        // Wait for them to PICK the card (selectedCardId === brawler).
        const tickHandle = setInterval(() => {
            if (typeof selectedCardId !== 'undefined' && selectedCardId === brawler) {
                clearInterval(tickHandle);
                onBrawlerPicked(brawler, idx);
            }
        }, 200);
    }

    function onBrawlerPicked(brawler, idx) {
        const tip = BRAWLER_TIPS[brawler] || 'דמות חדשה.';
        // Spotlight the canvas now — they're going to place the unit on the map.
        showStep({
            title: 'מידע על הדמות',
            text: tip + '<br><br>הניח את הדמות בחצי הכחול שלך כדי להמשיך.',
            target: '#game-canvas',
            button: false,
            allowClick: '#game-canvas'
        });

        // Watch for placement: a new player-team unit/building/aura with
        // matching type appears in the right array. units/buildings/auras
        // are declared with `let` in globals.js so they DON'T attach to
        // `window` — we have to reference them by bare name and let the
        // script-scope binding resolve at call time.
        const tickHandle = setInterval(() => {
            try {
                const allArrays = []
                    .concat(typeof units     !== 'undefined' ? units     : [])
                    .concat(typeof buildings !== 'undefined' ? buildings : [])
                    .concat(typeof auras     !== 'undefined' ? auras     : []);
                const placed = allArrays.some(e => e && e.team === 'player' && e.type === brawler);
                if (placed) {
                    clearInterval(tickHandle);
                    document.querySelectorAll('.card').forEach(c => {
                        c.style.pointerEvents = '';
                        c.style.opacity = '';
                    });
                    setTimeout(() => teachBrawler(idx + 1), 600);
                }
            } catch (e) { /* keep polling */ }
        }, 200);
    }

    function step4_quit() {
        document.querySelectorAll('.card').forEach(c => {
            c.style.pointerEvents = ''; c.style.opacity = '';
        });
        showStep({
            title: 'איך לצאת מהמשחק',
            text: 'מצוין! עכשיו לחץ על <b>⏸️ עצור</b> בפינה הימנית-עליונה ואז על <b>"יציאה"</b> כדי לחזור ללובי.',
            target: '#pause-btn',
            button: false,
            allowClick: '#pause-btn, #quit-btn, #resume-btn'
        });
        // Wait until we're back on the lobby screen.
        const tickHandle = setInterval(() => {
            const lobby = document.getElementById('lobby-screen');
            if (lobby && lobby.classList.contains('active')) {
                clearInterval(tickHandle);
                // Restore the original state before lobby tour.
                restoreGameState();
                setTimeout(step5_charactersBtn, 600);
            }
        }, 250);
    }

    function step5_charactersBtn() {
        showStep({
            title: 'תפריט הדמויות',
            text: 'בלובי יש כפתורים. לחץ על <b>הדמויות</b> כדי לראות איך לבחור איזה קלפים לקחת לקרב.',
            target: '#lobby-char-btn',
            button: false,
            allowClick: '#lobby-char-btn'
        });
        const tickHandle = setInterval(() => {
            const charScreen = document.getElementById('char-selection-menu');
            if (charScreen && charScreen.classList.contains('active')) {
                clearInterval(tickHandle);
                setTimeout(step5b_charactersExplain, 400);
            }
        }, 250);
    }

    function step5b_charactersExplain() {
        showStep({
            title: 'בחירת דמויות',
            text: 'כאן אתה יכול לראות את כל הדמויות שלך, להעלות אותם רמה במטבעות 🪙 ולבחור 8 קלפים שיהיו ב-deck שלך לקרב הבא.',
            button: 'הבנתי',
            onNext: step5c_quitCharacters
        });
    }

    function step5c_quitCharacters() {
        // The char screen has a "אישור" button that returns to lobby.
        showStep({
            title: 'יציאה ממסך הדמויות',
            text: 'לחץ על <b>"אישור"</b> כדי לחזור ללובי.',
            target: '#confirm-char-btn',
            button: false,
            allowClick: '#confirm-char-btn'
        });
        const tickHandle = setInterval(() => {
            const lobby = document.getElementById('lobby-screen');
            if (lobby && lobby.classList.contains('active')) {
                clearInterval(tickHandle);
                setTimeout(step6_powersBtn, 400);
            }
        }, 250);
    }

    function step6_powersBtn() {
        showStep({
            title: 'תפריט הכוחות',
            text: 'עכשיו לחץ על <b>"כוחות"</b> — שם בוחרים סטאר-פאוורס לכל דמות.',
            target: '#lobby-sp-btn',
            button: false,
            allowClick: '#lobby-sp-btn'
        });
        const tickHandle = setInterval(() => {
            const spScreen = document.getElementById('sp-selection-menu');
            if (spScreen && spScreen.classList.contains('active')) {
                clearInterval(tickHandle);
                setTimeout(step6b_powersExplain, 400);
            }
        }, 250);
    }

    function step6b_powersExplain() {
        showStep({
            title: 'סטאר-פאוורס ⭐',
            text: 'לכל דמות יש 2 סטאר-פאוורס שאפשר לבחור (SP1 או SP2). כל אחד נותן יכולת מיוחדת — לדוגמה: ברוס SP2 מקפיא את האויב לשנייה אחרי כל מכה.',
            button: 'הבנתי',
            onNext: step6c_quitPowers
        });
    }

    function step6c_quitPowers() {
        showStep({
            title: 'יציאה ממסך הכוחות',
            text: 'לחץ על <b>"אישור"</b> כדי לחזור ללובי.',
            target: '#confirm-sp-btn',
            button: false,
            allowClick: '#confirm-sp-btn'
        });
        const tickHandle = setInterval(() => {
            const lobby = document.getElementById('lobby-screen');
            if (lobby && lobby.classList.contains('active')) {
                clearInterval(tickHandle);
                setTimeout(step7_settingsBtn, 400);
            }
        }, 250);
    }

    function step7_settingsBtn() {
        showStep({
            title: 'תפריט ההגדרות ☰',
            text: 'הכפתור עם 3 הקווים פותח את הגדרות המשחק (קצב, אודיו, מסך וכו\'). לחץ עליו עכשיו.',
            target: '#home-settings-btn',
            button: false,
            allowClick: '#home-settings-btn'
        });
        const tickHandle = setInterval(() => {
            const sidebar = document.getElementById('right-sidebar');
            if (sidebar && !sidebar.classList.contains('hidden')) {
                clearInterval(tickHandle);
                setTimeout(step7b_settingsClose, 400);
            }
        }, 250);
    }

    function step7b_settingsClose() {
        showStep({
            title: 'סגירת ההגדרות',
            text: 'לחץ שוב על אותו כפתור כדי לסגור את ההגדרות.',
            target: '#home-settings-btn',
            button: false,
            allowClick: '#home-settings-btn'
        });
        const tickHandle = setInterval(() => {
            const sidebar = document.getElementById('right-sidebar');
            if (sidebar && sidebar.classList.contains('hidden')) {
                clearInterval(tickHandle);
                setTimeout(step8_friendsBtn, 400);
            }
        }, 250);
    }

    function step8_friendsBtn() {
        showStep({
            title: 'תפריט החברים 👥',
            text: 'הכפתור הירוק 👥 פותח את מסך החברים שם אתה רואה את הקוד שלך (3 ספרות) ויכול להזמין חברים לקרב P2P. לחץ עליו עכשיו.',
            target: '.social-btn',
            button: false,
            allowClick: '.social-btn'
        });
        const tickHandle = setInterval(() => {
            const social = document.getElementById('social-overlay');
            if (social && social.classList.contains('active')) {
                clearInterval(tickHandle);
                setTimeout(step8b_friendsExplain, 400);
            }
        }, 250);
    }

    function step8b_friendsExplain() {
        showStep({
            title: 'איך משחקים נגד חברים',
            text: 'הקוד שלך הוא 3 ספרות שמופיע למעלה. תן את הקוד לחבר, או הזן את הקוד שלו ולחץ "שחק!" כדי לשלוח לו הזמנה לקרב.',
            button: 'הבנתי',
            onNext: step8c_friendsClose
        });
    }

    function step8c_friendsClose() {
        showStep({
            title: 'יציאה ממסך החברים',
            text: 'לחץ על <b>"סגור"</b> כדי לחזור ללובי.',
            target: '#social-overlay .bs-btn-danger',
            button: false,
            allowClick: '#social-overlay .bs-btn-danger'
        });
        const tickHandle = setInterval(() => {
            const social = document.getElementById('social-overlay');
            if (social && !social.classList.contains('active')) {
                clearInterval(tickHandle);
                setTimeout(step9_replayHint, 400);
            }
        }, 250);
    }

    function step9_replayHint() {
        // Find the guide button to highlight + show the replay hint.
        const guide = document.querySelector('.guide-btn');
        showStep({
            title: 'סיימת! 🎉',
            text: 'יופי! עכשיו אתה יודע איך לשחק. בכל רגע אם תרצה לראות את ההסבר מחדש — לחץ על כפתור <b>📖 המדריך</b>. תראה אותו מודגש עכשיו.',
            target: '.guide-btn',
            button: 'סיים את ההדרכה',
            onNext: completeTutorial
        });
    }

    function completeTutorial() {
        markComplete();
        dismissOverlay();
        showReplayHint();
    }

    // Persistent floating chip pointing at the 📖 guide button.
    function showReplayHint() {
        if (document.getElementById('tutorial-replay-hint')) return;
        const guide = document.querySelector('.guide-btn');
        if (!guide) return;
        const chip = document.createElement('div');
        chip.id = 'tutorial-replay-hint';
        chip.innerText = 'להסבר מחדש לחץ כאן';
        document.body.appendChild(chip);
        const reposition = () => {
            const r = guide.getBoundingClientRect();
            chip.style.top  = (r.top + r.height / 2 - 18) + 'px';
            chip.style.left = (r.left - chip.offsetWidth - 12) + 'px';
        };
        setTimeout(reposition, 50);
        window.addEventListener('resize', reposition);
        chip.addEventListener('click', () => {
            chip.remove();
            startTutorial(true);
        });
    }

    // ---- Public API ----
    function startTutorial(force) {
        if (force) clearMarker();
        if (isComplete()) return;
        if (_state.active) return;
        _state.active = true;
        _state.step = 0;
        // Wait until the lobby is visible before kicking off.
        const tryStart = () => {
            const lobby = document.getElementById('lobby-screen');
            if (lobby && lobby.classList.contains('active')) {
                step1_welcome();
            } else {
                setTimeout(tryStart, 400);
            }
        };
        tryStart();
    }
    window.startTutorial = startTutorial;
    window.isTutorialComplete = isComplete;

    // We DO NOT auto-start the tutorial on DOMContentLoaded any more — the
    // user wanted it to fire only after the new player picks a name and
    // presses 'התחל לשחק' on the username overlay. claimUsername() in
    // network-logic.js calls window.startTutorial(false) once the name is
    // accepted; it's a no-op for returning users who already completed it.
    //
    // After page load we just stamp the persistent 'replay tutorial' chip
    // next to the 📖 guide button so anyone who already finished can re-run
    // the walkthrough at will.
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (isComplete()) showReplayHint();
        }, 2500);
    });
})();
