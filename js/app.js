// app.js

const State = {
    unit: 'kg', // kg, lb, mixed
    barWeight: 20,
    targetWeight: 0,
    mode: 'calculate', // calculate, reverse, warmup
    reversePlates: {}, // e.g. { '25': 2, '20': 0 }
    theme: localStorage.getItem('ssg_theme') || 'red',
    prs: JSON.parse(localStorage.getItem('ssg_prs')) || {
        "Squat": { weight: 0, unit: "LB", date: "" },
        "Bench Press": { weight: 0, unit: "LB", date: "" },
        "Deadlift": { weight: 0, unit: "LB", date: "" }
    }
};

// Available plates in KG (default standard powerlifting set)
const availablePlatesKG = [25, 20, 15, 10, 5, 2.5, 2, 1.5, 1.25, 1, 0.5, 0.25, 0.125];
const plateColors = {
    25: 'p-25',
    20: 'p-20',
    15: 'p-15',
    10: 'p-10',
    5: 'p-5',
    2.5: 'p-2-5',
    2: 'p-2',
    1.5: 'p-1-5',
    1.25: 'p-1-25',
    1: 'p-1',
    0.5: 'p-0-5',
    0.25: 'p-0-25',
    0.125: 'p-0-125'
};

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

function initApp() {
    // Initialize reverse plates count
    availablePlatesKG.forEach(weight => {
        State.reversePlates[weight] = 0;
    });

    renderReversePlateGrid();
    if (window.initInventory) initInventory();
    if (window.initBarbells) initBarbells();
    if (window.initRPE) initRPE();
    
    applyTheme(State.theme);
    updateUI();

    // Loader Screen Logic
    setTimeout(() => {
        const loader = document.getElementById('loader-screen');
        const appContainer = document.getElementById('app-container');
        if (loader && appContainer) {
            loader.style.opacity = '0';
            appContainer.style.opacity = '1';
            appContainer.style.transition = 'opacity 0.5s ease-in';
            setTimeout(() => loader.remove(), 500); // Remove from DOM after fade
        }
    }, 2500); // Spin for 2.5 seconds
}

function setupEventListeners() {
    // Tab navigation (Sub-nav for Load Bar)
    document.querySelectorAll('.sub-nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.sub-nav-btn').forEach(b => b.classList.remove('active'));
            // Only remove active from sub-tabs, not main app views
            document.getElementById('load-bar-view').querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            const targetTab = e.target.dataset.tab;
            e.target.classList.add('active');
            
            const content = document.getElementById(`${targetTab}-mode-content`);
            if (content) content.classList.add('active');
            
            State.mode = targetTab;
            updateUI();
        });
    });

    // Header Inventory Button
    const btnInventory = document.getElementById('btn-inventory');
    if (btnInventory) {
        btnInventory.addEventListener('click', () => {
            document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
            document.querySelectorAll('.bottom-nav .nav-item').forEach(b => b.classList.remove('active'));
            const inventoryView = document.getElementById('inventory-view');
            if (inventoryView) inventoryView.classList.add('active');
            
            const headerTitle = document.getElementById('main-header-title');
            if (headerTitle) headerTitle.innerHTML = 'Inventory';
        });
    }

    // Header Barbells Button
    const btnBarbells = document.getElementById('btn-barbells');
    if (btnBarbells) {
        btnBarbells.addEventListener('click', () => {
            document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
            document.querySelectorAll('.bottom-nav .nav-item').forEach(b => b.classList.remove('active'));
            const barbellsView = document.getElementById('barbells-view');
            if (barbellsView) barbellsView.classList.add('active');
            
            const headerTitle = document.getElementById('main-header-title');
            if (headerTitle) headerTitle.innerHTML = 'Bars';
        });
    }

    // Settings Customize Theme Button
    const btnThemeSettings = document.getElementById('btn-theme-settings');
    if (btnThemeSettings) {
        btnThemeSettings.addEventListener('click', () => {
            document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
            document.querySelectorAll('.bottom-nav .nav-item').forEach(b => b.classList.remove('active'));
            const themeView = document.getElementById('theme-view');
            if (themeView) themeView.classList.add('active');
            
            const headerTitle = document.getElementById('main-header-title');
            if (headerTitle) headerTitle.innerHTML = 'Customize Theme';
        });
    }

    // Theme Picker
    document.querySelectorAll('.theme-circle').forEach(circle => {
        circle.addEventListener('click', (e) => {
            const theme = e.currentTarget.dataset.theme;
            State.theme = theme;
            localStorage.setItem('ssg_theme', theme);
            applyTheme(theme);
        });
    });

    // Bottom Navigation (Main App Views)
    const viewTitles = {
        'load-bar': '<i class="ph-fill ph-barbell text-red"></i> <span class="gradient-text">Load the Bar</span>',
        'prep': 'Meet Prep',
        'records': 'Personal Records',
        'calculators': 'Calculators',
        'settings': 'Settings'
    };

    document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const btnEl = e.currentTarget;
            document.querySelectorAll('.bottom-nav .nav-item').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
            
            btnEl.classList.add('active');
            const viewId = btnEl.dataset.view;
            const viewEl = document.getElementById(`${viewId}-view`);
            if (viewEl) viewEl.classList.add('active');

            const headerTitle = document.getElementById('main-header-title');
            if (headerTitle) {
                headerTitle.innerHTML = viewTitles[viewId] || 'SSG Barbell Calc';
            }
        });
    });

    // --- Personal Records Logic ---
    const prModal = document.getElementById('pr-modal');
    const prList = document.getElementById('pr-list');
    
    function renderPRs() {
        if (!prList) return;
        prList.innerHTML = '';
        
        for (const [liftName, data] of Object.entries(State.prs)) {
            const card = document.createElement('div');
            card.className = 'pr-card';
            
            let dateStr = data.date ? new Date(data.date).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'}) : 'No date set';
            
            card.innerHTML = `
                <div class="pr-card-info">
                    <span class="pr-card-title">${liftName}</span>
                    <span class="pr-card-date">${dateStr}</span>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
                    <div class="pr-card-weight">${data.weight > 0 ? data.weight : '-'} <span style="font-size:0.9rem; font-weight:600;">${data.unit}</span></div>
                    <div class="pr-actions">
                        <button class="icon-btn text-gray btn-edit-pr" data-lift="${liftName}" style="padding:4px;"><i class="ph ph-pencil"></i></button>
                        ${data.weight > 0 ? `<button class="btn-outline btn-load-pr" data-lift="${liftName}">Load</button>` : ''}
                    </div>
                </div>
            `;
            prList.appendChild(card);
        }

        // Attach listeners to dynamically created buttons
        document.querySelectorAll('.btn-edit-pr').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lift = e.currentTarget.dataset.lift;
                openPRModal(lift);
            });
        });

        document.querySelectorAll('.btn-load-pr').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lift = e.currentTarget.dataset.lift;
                const pr = State.prs[lift];
                
                // Switch to Load Bar View
                document.querySelectorAll('.app-view, .nav-item').forEach(el => el.classList.remove('active'));
                document.getElementById('load-bar-view').classList.add('active');
                document.querySelector('[data-view="load-bar"]').classList.add('active');
                document.getElementById('main-header-title').innerHTML = viewTitles['load-bar'];
                
                // Update State and Calculate
                State.unit = pr.unit.toLowerCase();
                State.targetWeight = parseFloat(pr.weight);
                
                document.querySelectorAll('.toggle-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.unit === State.unit);
                });
                
                const weightInput = document.getElementById('target-weight-input');
                if (weightInput) weightInput.value = State.targetWeight;
                
                updateUI();
                if (window.calculatePlatesNeeded) window.calculatePlatesNeeded();
            });
        });
    }

    function openPRModal(liftName = '') {
        const inputName = document.getElementById('pr-input-name');
        const inputWeight = document.getElementById('pr-input-weight');
        const inputUnit = document.getElementById('pr-input-unit');
        const inputDate = document.getElementById('pr-input-date');
        
        if (liftName && State.prs[liftName]) {
            inputName.value = liftName;
            inputName.disabled = true; // Don't allow changing name of existing
            inputWeight.value = State.prs[liftName].weight || '';
            inputUnit.value = State.prs[liftName].unit || 'LB';
            inputDate.value = State.prs[liftName].date || '';
        } else {
            inputName.value = '';
            inputName.disabled = false;
            inputWeight.value = '';
            inputUnit.value = State.unit.toUpperCase();
            inputDate.value = new Date().toISOString().split('T')[0];
        }
        
        prModal.classList.remove('hidden');
    }

    if (document.getElementById('btn-open-pr-modal')) {
        document.getElementById('btn-open-pr-modal').addEventListener('click', () => openPRModal());
    }
    if (document.getElementById('btn-close-pr-modal')) {
        document.getElementById('btn-close-pr-modal').addEventListener('click', () => prModal.classList.add('hidden'));
    }
    
    if (document.getElementById('btn-save-pr')) {
        document.getElementById('btn-save-pr').addEventListener('click', () => {
            const name = document.getElementById('pr-input-name').value.trim();
            if (!name) return alert("Please enter a lift name");
            
            const weight = parseFloat(document.getElementById('pr-input-weight').value) || 0;
            const unit = document.getElementById('pr-input-unit').value;
            const date = document.getElementById('pr-input-date').value;
            
            State.prs[name] = { weight, unit, date };
            localStorage.setItem('ssg_prs', JSON.stringify(State.prs));
            
            prModal.classList.add('hidden');
            renderPRs();
        });
    }

    // Initialize PRs
    renderPRs();

    // Unit toggle
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            State.unit = e.target.dataset.unit;
            updateUI();
        });
    });

    // Reset button
    document.getElementById('reset-btn').addEventListener('click', () => {
        if (State.mode === 'reverse') {
            Object.keys(State.reversePlates).forEach(k => State.reversePlates[k] = 0);
            updateUI();
        } else if (State.mode === 'calculate') {
            State.targetWeight = 0;
            document.getElementById('target-weight-input').value = '';
            updateUI();
        }
    });

    // Target weight input
    const weightInput = document.getElementById('target-weight-input');
    if (weightInput) {
        weightInput.addEventListener('input', (e) => {
            State.targetWeight = parseFloat(e.target.value) || 0;
            updateUI();
            if (window.calculatePlatesNeeded) window.calculatePlatesNeeded();
        });
    }

    // Undo Target Weight
    const undoTargetWeightBtn = document.getElementById('undo-target-weight');
    if (undoTargetWeightBtn) {
        undoTargetWeightBtn.addEventListener('click', () => {
            State.targetWeight = 0;
            if (weightInput) weightInput.value = '';
            updateUI();
            if (window.calculatePlatesNeeded) window.calculatePlatesNeeded();
        });
    }
}

function applyTheme(theme) {
    document.documentElement.className = 'theme-' + theme;
    document.querySelectorAll('.theme-circle').forEach(circle => {
        circle.classList.toggle('active', circle.dataset.theme === theme);
    });
}

function updateUI() {
    // Update reset button visibility
    const resetBtn = document.getElementById('reset-btn');
    if (State.mode === 'reverse') {
        const hasPlates = Object.values(State.reversePlates).some(v => v > 0);
        resetBtn.classList.toggle('hidden', !hasPlates);
    } else {
        resetBtn.classList.add('hidden'); // Simplified for now
    }

    // Update Weights Display
    let totalKG = State.barWeight;
    let totalLB = State.barWeight * 2.20462;

    if (State.mode === 'reverse') {
        let platesWeightKG = 0;
        Object.keys(State.reversePlates).forEach(weight => {
            platesWeightKG += (parseFloat(weight) * State.reversePlates[weight] * 2); // both sides
        });
        totalKG = State.barWeight + platesWeightKG;
        totalLB = totalKG * 2.20462;
    } else if (State.mode === 'calculate') {
        if (State.targetWeight > 0) {
            if (State.unit === 'kg' || State.unit === 'mixed') {
                totalKG = State.targetWeight;
                totalLB = State.targetWeight * 2.20462;
            } else {
                totalLB = State.targetWeight;
                totalKG = State.targetWeight / 2.20462;
            }
        }
    }

    // Format weights
    const primaryDisplay = document.getElementById('weight-primary');
    const secondaryDisplay = document.getElementById('weight-secondary');

    if (State.unit === 'kg' || State.unit === 'mixed') {
        primaryDisplay.innerHTML = `${totalKG.toFixed(2).replace(/\.00$/, '')} <span class="unit">KG</span>`;
        secondaryDisplay.innerHTML = `${totalLB.toFixed(2).replace(/\.00$/, '')} <span class="unit">LB</span>`;
    } else {
        primaryDisplay.innerHTML = `${totalLB.toFixed(2).replace(/\.00$/, '')} <span class="unit">LB</span>`;
        secondaryDisplay.innerHTML = `${totalKG.toFixed(2).replace(/\.00$/, '')} <span class="unit">KG</span>`;
    }

    // Call external render functions
    if (window.renderVisualBarbell) {
        window.renderVisualBarbell();
    }
    if (window.calculatePlatesNeeded && State.mode === 'calculate') {
        window.calculatePlatesNeeded();
    }
    
    // Sync input unit label
    const targetUnitLabel = document.getElementById('target-weight-unit');
    if (targetUnitLabel) {
        targetUnitLabel.textContent = State.unit.toUpperCase();
    }
}
