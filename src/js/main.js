// Unified Main Application Logic

// Global state
let molecule = new Molecule();
let reactantMolecule = new Molecule();
let productMolecule = new Molecule();
let renderer;
let reactantRenderer;
let productRenderer;
let mechanismRenderer = null;

let currentElement = 'C';
let currentBondOrder = 1;
let currentTab = 'draw';
let savedReactants = [];
let currentReagent = null;
let currentCondition = null;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    console.log('🚀 Initializing Orbital App...');
    
    try {
        // Initialize canvases
        const mainCanvas = document.getElementById('molecule-canvas');
        const reactantCanvas = document.getElementById('reactant-canvas');
        const productCanvas = document.getElementById('product-canvas');
        
        console.log('Canvas elements:', {
            mainCanvas: !!mainCanvas,
            reactantCanvas: !!reactantCanvas,
            productCanvas: !!productCanvas
        });
        
        if (mainCanvas) {
            renderer = new Renderer(mainCanvas);
            console.log('✓ Main renderer initialized');
        }
        if (reactantCanvas) {
            reactantRenderer = new Renderer(reactantCanvas);
            console.log('✓ Reactant renderer initialized');
        }
        if (productCanvas) {
            productRenderer = new Renderer(productCanvas);
            console.log('✓ Product renderer initialized');
        }
        
        // Setup event listeners
        setupDrawingTools();
        setupCanvasEvents();
        setupReagentDropdowns();
        setupMechanismsList();
        
        console.log('✓ Event listeners attached');
        
        // Initial render
        if (renderer) {
            updateMoleculeProperties();
            renderer.render(molecule);
            console.log('✓ Initial render complete');
        }
        
        console.log('✅ Orbital App ready!');
    } catch (error) {
        console.error('💥 Initialization error:', error);
        console.error('Stack:', error.stack);
    }
}

// ==================== TAB SWITCHING ====================
function switchTab(tabName) {
    currentTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Handle tab-specific initialization
    if (tabName === 'simulate') {
        reactantRenderer.render(reactantMolecule);
    } else if (tabName === 'mechanisms' && !mechanismRenderer) {
        mechanismRenderer = new MechanismRenderer('mechanism-canvas-container');
    }
}

// ==================== DRAWING TOOLS ====================
function setupDrawingTools() {
    // Element selection
    document.querySelectorAll('.element-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.element-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentElement = e.target.dataset.element;
        });
    });
    
    // Bond type selection
    document.querySelectorAll('.bond-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.bond-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentBondOrder = parseInt(e.target.dataset.bond);
        });
    });
    
    // Ring templates
    document.getElementById('add-benzene')?.addEventListener('click', () => addBenzeneRing());
    document.getElementById('add-cyclohexane')?.addEventListener('click', () => addCyclohexane());
    document.getElementById('add-cyclopentane')?.addEventListener('click', () => addCyclopentane());
    
    // Clear button
    document.getElementById('clear-canvas')?.addEventListener('click', () => {
        molecule.clear();
        updateMoleculeProperties();
        renderer.render(molecule);
    });
    
    // Auto-organize
    document.getElementById('auto-organize')?.addEventListener('click', () => autoOrganize());
}

function setupCanvasEvents() {
    // Main canvas
    const mainCanvas = document.getElementById('molecule-canvas');
    if (mainCanvas) {
        mainCanvas.addEventListener('click', (e) => handleCanvasClick(e, molecule, renderer));
        mainCanvas.addEventListener('mousedown', (e) => handleMouseDown(e, molecule));
        mainCanvas.addEventListener('mousemove', (e) => handleMouseMove(e, molecule, renderer));
        mainCanvas.addEventListener('mouseup', (e) => handleMouseUp(e, molecule, renderer));
    }
    
    // Reactant canvas
    const reactantCanvas = document.getElementById('reactant-canvas');
    if (reactantCanvas) {
        reactantCanvas.addEventListener('click', (e) => handleCanvasClick(e, reactantMolecule, reactantRenderer));
        reactantCanvas.addEventListener('mousedown', (e) => handleMouseDown(e, reactantMolecule));
        reactantCanvas.addEventListener('mousemove', (e) => handleMouseMove(e, reactantMolecule, reactantRenderer));
        reactantCanvas.addEventListener('mouseup', (e) => handleMouseUp(e, reactantMolecule, reactantRenderer));
    }
    
    // Product canvas
    const productCanvas = document.getElementById('product-canvas');
    if (productCanvas) {
        productCanvas.addEventListener('click', (e) => handleCanvasClick(e, productMolecule, productRenderer));
        productCanvas.addEventListener('mousedown', (e) => handleMouseDown(e, productMolecule));
        productCanvas.addEventListener('mousemove', (e) => handleMouseMove(e, productMolecule, productRenderer));
        productCanvas.addEventListener('mouseup', (e) => handleMouseUp(e, productMolecule, productRenderer));
    }
}

// Canvas interaction handlers
let drawingBond = false;
let bondStartAtom = null;

function handleCanvasClick(e, mol, rend) {
    console.log('🖱️ Canvas clicked!', { element: currentElement, bondOrder: currentBondOrder });
    
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    console.log('Click position:', { x, y });
    
    // Check if clicking on existing atom
    const clickedAtom = mol.getAtomAtPosition(x, y, 20);
    
    if (!clickedAtom) {
        // Place new atom FIRST - this ensures it always appears
        console.log('Placing new atom:', currentElement);
        const atom = mol.addAtom(currentElement, x, y);
        console.log('Atom added:', atom);
        
        // Immediately render so atom appears
        if (mol.updateAtomProperties) {
            try {
                mol.updateAtomProperties(atom);
            } catch (e) {
                console.warn('Could not update atom properties:', e);
            }
        }
        
        // Render immediately to show the atom
        updateMoleculeProperties();
        rend.render(mol);
        
        // THEN try to auto-connect (but don't let errors block rendering)
        if (currentElement === 'C') {
            try {
                const nearby = mol.getNearbyAtoms(x, y, 80);
                let bonded = 0;
                nearby.forEach(nearAtom => {
                    if (nearAtom.element === 'C' && bonded < 2) {
                        const existingBonds = mol.getAtomBonds(nearAtom.id);
                        if (existingBonds.length < 4) {
                            mol.addBond(atom.id, nearAtom.id, 1);
                            bonded++;
                        }
                    }
                });
                
                // Re-render if bonds were added
                if (bonded > 0) {
                    rend.render(mol);
                }
            } catch (autoConnectError) {
                console.warn('Auto-connect failed (atom still placed):', autoConnectError);
            }
        }
    }
}

function handleMouseDown(e, mol) {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const atom = mol.getAtomAtPosition(x, y, 20);
    if (atom) {
        drawingBond = true;
        bondStartAtom = atom;
    }
}

function handleMouseMove(e, mol, rend) {
    if (!drawingBond) return;
    
    // Visual feedback could be added here
}

function handleMouseUp(e, mol, rend) {
    if (!drawingBond) return;
    
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const endAtom = mol.getAtomAtPosition(x, y, 20);
    if (endAtom && endAtom !== bondStartAtom) {
        mol.addBond(bondStartAtom.id, endAtom.id, currentBondOrder);
        mol.updateAtomProperties(bondStartAtom);
        mol.updateAtomProperties(endAtom);
    }
    
    drawingBond = false;
    bondStartAtom = null;
    updateMoleculeProperties();
    rend.render(mol);
}

// ==================== MOLECULE PROPERTIES ====================
function updateMoleculeProperties() {
    const formula = molecule.getMolecularFormula();
    const mw = molecule.getMolecularWeight();
    const name = getIUPACName ? getIUPACName(molecule) : 'N/A';
    
    document.getElementById('mol-name').textContent = name;
    document.getElementById('mol-formula').textContent = formula || '-';
    
    // Ensure mw is a number before calling toFixed
    const mwValue = typeof mw === 'number' ? mw : parseFloat(mw);
    document.getElementById('mol-mw').textContent = !isNaN(mwValue) ? mwValue.toFixed(2) + ' g/mol' : '-';
    document.getElementById('mol-atoms').textContent = molecule.atoms.length;
}

// ==================== RING TEMPLATES ====================
function addBenzeneRing() {
    const centerX = 400;
    const centerY = 300;
    const radius = 60;
    
    const atoms = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        atoms.push(molecule.addAtom('C', x, y));
    }
    
    for (let i = 0; i < 6; i++) {
        const order = i % 2 === 0 ? 2 : 1;
        molecule.addBond(atoms[i].id, atoms[(i + 1) % 6].id, order);
    }
    
    atoms.forEach(atom => molecule.updateAtomProperties(atom));
    updateMoleculeProperties();
    renderer.render(molecule);
}

function addCyclohexane() {
    const centerX = 400;
    const centerY = 300;
    const radius = 60;
    
    const atoms = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        atoms.push(molecule.addAtom('C', x, y));
    }
    
    for (let i = 0; i < 6; i++) {
        molecule.addBond(atoms[i].id, atoms[(i + 1) % 6].id, 1);
    }
    
    atoms.forEach(atom => molecule.updateAtomProperties(atom));
    updateMoleculeProperties();
    renderer.render(molecule);
}

function addCyclopentane() {
    const centerX = 400;
    const centerY = 300;
    const radius = 55;
    
    const atoms = [];
    for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        atoms.push(molecule.addAtom('C', x, y));
    }
    
    for (let i = 0; i < 5; i++) {
        molecule.addBond(atoms[i].id, atoms[(i + 1) % 5].id, 1);
    }
    
    atoms.forEach(atom => molecule.updateAtomProperties(atom));
    updateMoleculeProperties();
    renderer.render(molecule);
}

function autoOrganize() {
    // Simple force-directed layout
    const iterations = 50;
    const springLength = 60;
    
    for (let iter = 0; iter < iterations; iter++) {
        molecule.atoms.forEach(atom => {
            let fx = 0, fy = 0;
            
            // Spring forces from bonds
            const bonds = molecule.getAtomBonds(atom.id);
            bonds.forEach(bond => {
                const otherId = bond.atom1 === atom.id ? bond.atom2 : bond.atom1;
                const other = molecule.getAtomById(otherId);
                const dx = other.position.x - atom.position.x;
                const dy = other.position.y - atom.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const force = (dist - springLength) * 0.1;
                fx += (dx / dist) * force;
                fy += (dy / dist) * force;
            });
            
            // Repulsion from other atoms
            molecule.atoms.forEach(other => {
                if (other.id !== atom.id) {
                    const dx = other.position.x - atom.position.x;
                    const dy = other.position.y - atom.position.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 0) {
                        const force = 1000 / (dist * dist);
                        fx -= (dx / dist) * force;
                        fy -= (dy / dist) * force;
                    }
                }
            });
            
            atom.position.x += fx * 0.1;
            atom.position.y += fy * 0.1;
        });
    }
    
    renderer.render(molecule);
}

// ==================== SIMULATION TAB ====================
function moveToSimulation() {
    if (molecule.atoms.length === 0) {
        alert('Please draw a molecule first!');
        return;
    }
    
    // Copy molecule to reactant
    reactantMolecule = JSON.parse(JSON.stringify(molecule));
    reactantMolecule = Object.assign(new Molecule(), reactantMolecule);
    
    // Switch to simulate tab
    switchTab('simulate');
    setTimeout(() => reactantRenderer.render(reactantMolecule), 100);
}

function setupReagentDropdowns() {
    const reagentSelect = document.getElementById('reagent-select');
    if (!reagentSelect || !REAGENTS) return;
    
    // Group reagents
    const groups = {
        'Strong Bases': ['t-BuOK', 'NaOEt', 'KOH', 'NaOH'],
        'Acids': ['H2SO4', 'H3PO4', 'HCl', 'HBr'],
        'Oxidizers': ['KMnO4', 'K2Cr2O7', 'PCC', 'H2O2', 'O3', 'OsO4', 'mCPBA'],
        'Reducers': ['NaBH4', 'LiAlH4', 'H2/Pd', 'H2/Pt'],
        'Halogens': ['Br2', 'Cl2', 'NBS'],
        'Nucleophiles': ['NaCN', 'NaN3']
    };
    
    for (const [groupName, reagents] of Object.entries(groups)) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = groupName;
        
        reagents.forEach(key => {
            if (REAGENTS[key]) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = key;
                optgroup.appendChild(option);
            }
        });
        
        reagentSelect.appendChild(optgroup);
    }
    
    // Add event listener for reagent selection
    reagentSelect.addEventListener('change', showReagentInfo);
    
    // Conditions dropdown
    const conditionSelect = document.getElementById('condition-select');
    if (conditionSelect && CONDITIONS) {
        for (const [key, value] of Object.entries(CONDITIONS)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = `${key} (${value.name})`;
            conditionSelect.appendChild(option);
        }
    }
    
    // Setup button event listeners
    const predictBtn = document.getElementById('predict-btn');
    if (predictBtn) {
        predictBtn.addEventListener('click', predictProduct);
    }
    
    const saveReactantBtn = document.getElementById('save-reactant-btn');
    if (saveReactantBtn) {
        saveReactantBtn.addEventListener('click', saveReactant);
    }
    
    const useInReactionBtn = document.getElementById('use-in-reaction');
    if (useInReactionBtn) {
        useInReactionBtn.addEventListener('click', () => {
            switchTab('simulate');
            // Copy drawn molecule to reactant canvas
            if (molecule.atoms.length > 0) {
                reactantMolecule = JSON.parse(JSON.stringify(molecule));
                reactantMolecule = Object.assign(new Molecule(), reactantMolecule);
                reactantRenderer.render(reactantMolecule);
            }
        });
    }
}

function showReagentInfo() {
    const reagentKey = document.getElementById('reagent-select').value;
    const infoCard = document.getElementById('reagent-info-card');
    const arrowLabel = document.getElementById('arrow-reagent-label');
    const predictBtn = document.getElementById('predict-btn');
    
    if (!reagentKey || !REAGENTS[reagentKey]) {
        infoCard.style.display = 'none';
        arrowLabel.textContent = 'Add reagent';
        predictBtn.disabled = true;
        return;
    }
    
    const reagent = REAGENTS[reagentKey];
    currentReagent = reagentKey;
    
    // Update info card
    document.getElementById('reagent-name-display').textContent = `${reagentKey} (${reagent.name})`;
    document.getElementById('reagent-type-badge').textContent = reagent.type;
    document.getElementById('reagent-use-display').textContent = reagent.use;
    document.getElementById('reagent-conditions-display').textContent = reagent.conditions;
    document.getElementById('reagent-mechanism-display').textContent = reagent.mechanism;
    
    infoCard.style.display = 'block';
    arrowLabel.textContent = reagentKey;
    
    if (savedReactants.length > 0) {
        predictBtn.disabled = false;
    }
}

function saveReactant() {
    if (reactantMolecule.atoms.length === 0) {
        alert('Please draw a reactant molecule first!');
        return;
    }
    
    const formula = reactantMolecule.getMolecularFormula();
    const name = getIUPACName ? getIUPACName(reactantMolecule) : formula;
    
    savedReactants.push({
        molecule: JSON.parse(JSON.stringify(reactantMolecule)),
        formula: formula,
        name: name
    });
    
    updateReactantsList();
    reactantMolecule.clear();
    reactantRenderer.render(reactantMolecule);
}

function updateReactantsList() {
    const list = document.getElementById('reactants-list');
    if (!list) return;
    
    if (savedReactants.length === 0) {
        list.innerHTML = '<span class="empty-state">No reactants yet</span>';
    } else {
        list.innerHTML = savedReactants.map((r, i) => 
            `<div class="mol-chip">${r.formula} <small>(${r.name})</small></div>`
        ).join('');
    }
}

function clearReactantCanvas() {
    reactantMolecule.clear();
    reactantRenderer.render(reactantMolecule);
}

function predictProduct() {
    if (!currentReagent) {
        alert('Please select a reagent first!');
        return;
    }
    
    if (reactantMolecule.atoms.length === 0 && savedReactants.length === 0) {
        alert('Please draw or save a reactant molecule first!');
        return;
    }
    
    // Use the drawn reactant or the first saved reactant
    const reactant = reactantMolecule.atoms.length > 0 ? reactantMolecule : 
                     (savedReactants.length > 0 ? savedReactants[0].molecule : null);
    
    if (!reactant) {
        alert('No reactant molecule found!');
        return;
    }
    
    // Find matching reaction in database
    const reagentData = REAGENTS[currentReagent];
    let predictedProduct = null;
    
    // Try to match with reaction database
    if (REACTION_DATABASE) {
        for (const [key, reaction] of Object.entries(REACTION_DATABASE)) {
            if (reaction.reagents.includes(currentReagent)) {
                // Apply reaction rules to predict product
                predictedProduct = applyReactionRules(reactant, reaction);
                
                // Show mechanism link
                const viewMechBtn = document.createElement('button');
                viewMechBtn.textContent = '🔬 View Mechanism';
                viewMechBtn.className = 'btn btn-secondary';
                viewMechBtn.style.marginTop = '10px';
                viewMechBtn.onclick = () => {
                    switchTab('mechanisms');
                    setTimeout(() => loadMechanism(key), 300);
                };
                
                const infoCard = document.getElementById('reagent-info-card');
                if (infoCard && !infoCard.querySelector('.btn-secondary')) {
                    infoCard.appendChild(viewMechBtn);
                }
                
                break;
            }
        }
    }
    
    // If we have a predicted product, display it
    if (predictedProduct) {
        productMolecule = Object.assign(new Molecule(), predictedProduct);
        productRenderer.render(productMolecule);
        alert('Product predicted! Check the right panel.');
    } else {
        // Fallback: let user draw manually
        alert(`Automatic prediction not available for ${currentReagent}. Please draw the product manually on the right canvas.`);
    }
}

function applyReactionRules(reactant, reaction) {
    // Simplified product prediction - in a full implementation, this would:
    // 1. Analyze functional groups in reactant
    // 2. Apply transformation rules from reaction.rules
    // 3. Handle stereochemistry
    // 4. Return modified molecule
    
    // For now, return a copy of reactant with modifications
    const product = JSON.parse(JSON.stringify(reactant));
    
    // Basic transformation based on reaction type
    if (reaction.type === 'oxidation') {
        // Example: Convert alcohol to carbonyl
        product.atoms.forEach(atom => {
            if (atom.element === 'O' && atom.bonds === 1) {
                atom.bonds = 2; // Single to double bond
            }
        });
    } else if (reaction.type === 'reduction') {
        // Example: Convert carbonyl to alcohol
        product.atoms.forEach(atom => {
            if (atom.element === 'O' && atom.bonds === 2) {
                atom.bonds = 1; // Double to single bond
            }
        });
    }
    
    return product;
}

function autoPredict() {
    predictProduct();
}

function manualProduct() {
    alert('Draw your predicted product on the canvas to the right.');
}

function resetReaction() {
    savedReactants = [];
    reactantMolecule.clear();
    productMolecule.clear();
    currentReagent = null;
    
    updateReactantsList();
    reactantRenderer.render(reactantMolecule);
    productRenderer.render(productMolecule);
    
    document.getElementById('reagent-select').value = '';
    document.getElementById('reagent-info-card').style.display = 'none';
    document.getElementById('export-section').style.display = 'none';
}

// ==================== MECHANISMS TAB ====================
function setupMechanismsList() {
    // Setup mechanism browser with comprehensive Organic Chemistry II reactions
    const mechanismCategories = {
        'Elimination': ['e2_elimination', 'e1_elimination', 'hofmann_elimination', 'cope_elimination'],
        'Substitution': ['sn2_substitution', 'sn1_substitution'],
        'Addition': ['electrophilic_addition', 'grignard_reaction', 'michael_addition'],
        'Cycloaddition': ['diels_alder'],
        'Condensation': ['aldol_condensation', 'claisen_condensation', 'robinson_annulation'],
        'Oxidation': ['alcohol_oxidation_primary', 'alcohol_oxidation_secondary', 'baeyer_villiger', 'ozonolysis'],
        'Reduction': ['carbonyl_reduction'],
        'Rearrangement': ['grob_fragmentation', 'pinacol_rearrangement', 'beckmann_rearrangement'],
        'Hydrolysis': ['ester_hydrolysis_base'],
        'Esterification': ['fischer_esterification'],
        'Olefination': ['wittig_reaction']
    };
    
    // Populate mechanism sidebar
    const categoriesContainer = document.querySelector('.mechanisms-sidebar');
    if (categoriesContainer && REACTION_DATABASE) {
        categoriesContainer.innerHTML = ''; // Clear existing
        
        for (const [categoryName, mechanismKeys] of Object.entries(mechanismCategories)) {
            // Create category section
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'mechanism-category';
            
            const categoryTitle = document.createElement('h3');
            categoryTitle.textContent = categoryName;
            categoryDiv.appendChild(categoryTitle);
            
            const list = document.createElement('ul');
            list.className = 'mechanism-list';
            
            mechanismKeys.forEach(key => {
                const reaction = REACTION_DATABASE[key];
                if (reaction) {
                    const li = document.createElement('li');
                    li.textContent = reaction.name;
                    li.setAttribute('data-mechanism', key);
                    li.classList.add('mech-btn');
                    li.addEventListener('click', () => loadMechanism(key));
                    list.appendChild(li);
                }
            });
            
            categoryDiv.appendChild(list);
            categoriesContainer.appendChild(categoryDiv);
        }
    }
    
    // Setup control buttons
    const playBtn = document.getElementById('play-animation');
    if (playBtn) {
        playBtn.addEventListener('click', playAnimation);
    }
    
    const exportBtn = document.getElementById('export-svg');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportMechanism);
    }
}

function loadMechanism(mechanismKey) {
    if (!REACTION_DATABASE || !REACTION_DATABASE[mechanismKey]) {
        alert('Mechanism not found!');
        return;
    }
    
    const reaction = REACTION_DATABASE[mechanismKey];
    
    // Update title
    const mechTitle = document.getElementById('mech-title');
    if (mechTitle) {
        mechTitle.textContent = reaction.name;
    }
    
    // Generate example molecule data
    const moleculeData = generateExampleMolecule(mechanismKey);
    
    // Render mechanism
    if (!mechanismRenderer) {
        mechanismRenderer = new MechanismRenderer('mechanism-canvas-container');
    }
    mechanismRenderer.renderMechanism(reaction, moleculeData);
    
    // Highlight active button
    document.querySelectorAll('.mech-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-mechanism="${mechanismKey}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Show description
    const descDiv = document.getElementById('mech-description');
    const stepsList = document.getElementById('mech-steps-list');
    if (descDiv) descDiv.style.display = 'block';
    
    if (stepsList) {
        stepsList.innerHTML = reaction.mechanism.map((step, i) => `
            <div style="margin-bottom: 1rem;">
                <strong>Step ${i + 1}: ${step.title}</strong><br>
                <span style="color: #666;">${step.description}</span>
            </div>
        `).join('');
    }
    
    // Auto-play animation after a short delay for learning
    try {
        setTimeout(() => {
            if (mechanismRenderer && mechanismRenderer.playAnimation) {
                mechanismRenderer.playAnimation();
            }
        }, 1000);
    } catch (e) {
        console.error('Animation playback error:', e);
    }
}

function playAnimation() {
    if (mechanismRenderer) {
        mechanismRenderer.playAnimation();
    }
}

function exportSVG() {
    if (mechanismRenderer) {
        mechanismRenderer.exportSVG();
    }
}

function jumpToMechanism() {
    const reagentKey = document.getElementById('reagent-select').value;
    if (!reagentKey) return;
    
    // Find matching mechanism
    for (const [key, reaction] of Object.entries(REACTION_DATABASE)) {
        if (reaction.reagents.includes(reagentKey)) {
            switchTab('mechanisms');
            setTimeout(() => loadMechanism(key), 300);
            break;
        }
    }
}

// Helper function to generate real molecular structures for mechanisms
function generateExampleMolecule(reactionKey) {
    const structures = {};
    
    // E2 Elimination: 2-bromopropane → propene
    structures['e2_elimination'] = {
        reactant: (() => {
            const chain = MoleculeGeometry.createLinearChain(3, 40, 100, 0);
            MoleculeGeometry.addSubstituent(chain.atoms, chain.bonds, 'C2', 'Br', -90);
            return chain;
        })(),
        product: MoleculeGeometry.createAlkene(40, 100),
        intermediates: []
    };
    
    // SN2: CH3Br + CN- → CH3CN + Br-
    structures['sn2_substitution'] = {
        reactant: (() => {
            const chain = MoleculeGeometry.createLinearChain(1, 60, 100, 0);
            MoleculeGeometry.addSubstituent(chain.atoms, chain.bonds, 'C1', 'Br', -90);
            chain.atoms.push({ id: 'CN', element: 'N', position: { x: 20, y: 100 }, charge: -1 });
            return chain;
        })(),
        product: (() => {
            const chain = MoleculeGeometry.createLinearChain(1, 60, 100, 0);
            MoleculeGeometry.addSubstituent(chain.atoms, chain.bonds, 'C1', 'CN', -90);
            chain.atoms.push({ id: 'Br_leaving', element: 'Br', position: { x: 130, y: 100 }, charge: -1 });
            return chain;
        })(),
        intermediates: []
    };
    
    // Aldol Condensation: 2 acetaldehyde → aldol product
    structures['aldol_condensation'] = {
        reactant: MoleculeGeometry.createCarbonyl(60, 100),
        product: (() => {
            const chain = MoleculeGeometry.createLinearChain(4, 30, 100, 0);
            MoleculeGeometry.addSubstituent(chain.atoms, chain.bonds, 'C3', 'OH', -90);
            // Add carbonyl at C4
            chain.atoms.push({ id: 'O_final', element: 'O', position: { x: 152, y: 65 }, charge: 0 });
            chain.bonds.push({ atom1: 'C4', atom2: 'O_final', order: 2 });
            return chain;
        })(),
        intermediates: []
    };
    
    // Grignard: Formaldehyde + MeMgBr → Ethanol
    structures['grignard_reaction'] = {
        reactant: MoleculeGeometry.createCarbonyl(60, 100),
        product: MoleculeGeometry.createAlcohol(60, 100),
        intermediates: []
    };
    
    // Diels-Alder: Butadiene + Ethylene → Cyclohexene
    structures['diels_alder'] = {
        reactant: (() => {
            const atoms = [
                { id: 'C1', element: 'C', position: { x: 30, y: 90 }, charge: 0 },
                { id: 'C2', element: 'C', position: { x: 60, y: 90 }, charge: 0 },
                { id: 'C3', element: 'C', position: { x: 90, y: 90 }, charge: 0 },
                { id: 'C4', element: 'C', position: { x: 120, y: 90 }, charge: 0 },
                { id: 'C5', element: 'C', position: { x: 60, y: 130 }, charge: 0 },
                { id: 'C6', element: 'C', position: { x: 90, y: 130 }, charge: 0 }
            ];
            const bonds = [
                { atom1: 'C1', atom2: 'C2', order: 2 },
                { atom1: 'C2', atom2: 'C3', order: 1 },
                { atom1: 'C3', atom2: 'C4', order: 2 },
                { atom1: 'C5', atom2: 'C6', order: 2 }
            ];
            return { atoms, bonds };
        })(),
        product: MoleculeGeometry.createCyclohexane(85, 110),
        intermediates: []
    };
    
    // Alcohol Oxidation: Ethanol → Acetaldehyde
    structures['alcohol_oxidation_primary'] = {
        reactant: MoleculeGeometry.createAlcohol(60, 100),
        product: MoleculeGeometry.createCarbonyl(60, 100),
        intermediates: []
    };
    
    // Alcohol Oxidation Secondary: Isopropanol → Acetone
    structures['alcohol_oxidation_secondary'] = {
        reactant: (() => {
            const chain = MoleculeGeometry.createLinearChain(3, 40, 100, 0);
            MoleculeGeometry.addSubstituent(chain.atoms, chain.bonds, 'C2', 'OH', -90);
            return chain;
        })(),
        product: (() => {
            const atoms = [
                { id: 'C1', element: 'C', position: { x: 40, y: 100 }, charge: 0 },
                { id: 'C2', element: 'C', position: { x: 85, y: 100 }, charge: 0 },
                { id: 'C3', element: 'C', position: { x: 130, y: 100 }, charge: 0 },
                { id: 'O', element: 'O', position: { x: 85, y: 65 }, charge: 0 }
            ];
            const bonds = [
                { atom1: 'C1', atom2: 'C2', order: 1 },
                { atom1: 'C2', atom2: 'C3', order: 1 },
                { atom1: 'C2', atom2: 'O', order: 2 }
            ];
            return { atoms, bonds };
        })(),
        intermediates: []
    };
    
    // Wittig: Aldehyde + ylide → Alkene
    structures['wittig_reaction'] = {
        reactant: MoleculeGeometry.createCarbonyl(60, 100),
        product: MoleculeGeometry.createAlkene(40, 100),
        intermediates: []
    };
    
    // Baeyer-Villiger: Cyclohexanone → ε-Caprolactone
    structures['baeyer_villiger'] = {
        reactant: MoleculeGeometry.createCyclohexane(100, 110),
        product: MoleculeGeometry.createCyclohexane(100, 110), // Simplified - actual is lactone
        intermediates: []
    };
    
    // Claisen Condensation: 2 Ethyl Acetate → β-Ketoester
    structures['claisen_condensation'] = {
        reactant: MoleculeGeometry.createCarbonyl(60, 100),
        product: (() => {
            const chain = MoleculeGeometry.createLinearChain(4, 30, 100, 0);
            MoleculeGeometry.addSubstituent(chain.atoms, chain.bonds, 'C3', 'OH', -90);
            chain.atoms.push({ id: 'O_final', element: 'O', position: { x: 152, y: 65 }, charge: 0 });
            chain.bonds.push({ atom1: 'C4', atom2: 'O_final', order: 2 });
            return chain;
        })(),
        intermediates: []
    };
    
    // Hofmann Elimination: Quaternary ammonium salt → alkene
    structures['hofmann_elimination'] = {
        reactant: (() => {
            const chain = MoleculeGeometry.createLinearChain(3, 40, 100, 0);
            chain.atoms.push({ id: 'N', element: 'N', position: { x: 100, y: 65 }, charge: 1 });
            chain.bonds.push({ atom1: 'C2', atom2: 'N', order: 1 });
            return chain;
        })(),
        product: MoleculeGeometry.createAlkene(40, 100),
        intermediates: []
    };
    
    // Cope Elimination: Amine N-oxide → alkene
    structures['cope_elimination'] = {
        reactant: (() => {
            const chain = MoleculeGeometry.createLinearChain(3, 40, 100, 0);
            chain.atoms.push({ id: 'N', element: 'N', position: { x: 100, y: 65 }, charge: 0 });
            chain.atoms.push({ id: 'O', element: 'O', position: { x: 100, y: 35 }, charge: 0 });
            chain.bonds.push({ atom1: 'C2', atom2: 'N', order: 1 });
            chain.bonds.push({ atom1: 'N', atom2: 'O', order: 1 });
            return chain;
        })(),
        product: MoleculeGeometry.createAlkene(40, 100),
        intermediates: []
    };
    
    // Pinacol Rearrangement: Pinacol diol → ketone
    structures['pinacol_rearrangement'] = {
        reactant: (() => {
            const atoms = [
                { id: 'C1', element: 'C', position: { x: 40, y: 100 }, charge: 0 },
                { id: 'C2', element: 'C', position: { x: 85, y: 100 }, charge: 0 },
                { id: 'C3', element: 'C', position: { x: 130, y: 100 }, charge: 0 },
                { id: 'C4', element: 'C', position: { x: 85, y: 145 }, charge: 0 },
                { id: 'O1', element: 'O', position: { x: 40, y: 65 }, charge: 0 },
                { id: 'O2', element: 'O', position: { x: 130, y: 65 }, charge: 0 }
            ];
            const bonds = [
                { atom1: 'C1', atom2: 'C2', order: 1 },
                { atom1: 'C2', atom2: 'C3', order: 1 },
                { atom1: 'C2', atom2: 'C4', order: 1 },
                { atom1: 'C1', atom2: 'O1', order: 1 },
                { atom1: 'C3', atom2: 'O2', order: 1 }
            ];
            return { atoms, bonds };
        })(),
        product: (() => {
            const atoms = [
                { id: 'C1', element: 'C', position: { x: 40, y: 100 }, charge: 0 },
                { id: 'C2', element: 'C', position: { x: 85, y: 100 }, charge: 0 },
                { id: 'C3', element: 'C', position: { x: 130, y: 100 }, charge: 0 },
                { id: 'C4', element: 'C', position: { x: 85, y: 145 }, charge: 0 },
                { id: 'O', element: 'O', position: { x: 85, y: 65 }, charge: 0 }
            ];
            const bonds = [
                { atom1: 'C1', atom2: 'C2', order: 1 },
                { atom1: 'C2', atom2: 'C3', order: 1 },
                { atom1: 'C2', atom2: 'C4', order: 1 },
                { atom1: 'C2', atom2: 'O', order: 2 }
            ];
            return { atoms, bonds };
        })(),
        intermediates: []
    };
    
    // Beckmann Rearrangement: Oxime → Amide
    structures['beckmann_rearrangement'] = {
        reactant: (() => {
            const atoms = [
                { id: 'C1', element: 'C', position: { x: 40, y: 100 }, charge: 0 },
                { id: 'C2', element: 'C', position: { x: 85, y: 100 }, charge: 0 },
                { id: 'N', element: 'N', position: { x: 130, y: 100 }, charge: 0 },
                { id: 'O', element: 'O', position: { x: 130, y: 65 }, charge: 0 }
            ];
            const bonds = [
                { atom1: 'C1', atom2: 'C2', order: 1 },
                { atom1: 'C2', atom2: 'N', order: 2 },
                { atom1: 'N', atom2: 'O', order: 1 }
            ];
            return { atoms, bonds };
        })(),
        product: (() => {
            const atoms = [
                { id: 'C1', element: 'C', position: { x: 40, y: 100 }, charge: 0 },
                { id: 'C2', element: 'C', position: { x: 85, y: 100 }, charge: 0 },
                { id: 'N', element: 'N', position: { x: 130, y: 100 }, charge: 0 },
                { id: 'O', element: 'O', position: { x: 130, y: 65 }, charge: 0 }
            ];
            const bonds = [
                { atom1: 'C1', atom2: 'C2', order: 1 },
                { atom1: 'C2', atom2: 'N', order: 1 },
                { atom1: 'N', atom2: 'O', order: 2 }
            ];
            return { atoms, bonds };
        })(),
        intermediates: []
    };
    
    // Fischer Esterification: Carboxylic acid + alcohol → ester
    structures['fischer_esterification'] = {
        reactant: MoleculeGeometry.createCarbonyl(60, 100),
        product: (() => {
            const chain = MoleculeGeometry.createLinearChain(2, 40, 100, 0);
            chain.atoms.push({ id: 'O1', element: 'O', position: { x: 85, y: 65 }, charge: 0 });
            chain.atoms.push({ id: 'O2', element: 'O', position: { x: 130, y: 100 }, charge: 0 });
            chain.atoms.push({ id: 'C3', element: 'C', position: { x: 130, y: 135 }, charge: 0 });
            chain.bonds.push({ atom1: 'C2', atom2: 'O1', order: 2 });
            chain.bonds.push({ atom1: 'C2', atom2: 'O2', order: 1 });
            chain.bonds.push({ atom1: 'O2', atom2: 'C3', order: 1 });
            return chain;
        })(),
        intermediates: []
    };
    
    // Ozonolysis: Alkene → two carbonyls
    structures['ozonolysis'] = {
        reactant: MoleculeGeometry.createAlkene(40, 100),
        product: (() => {
            const atoms = [
                { id: 'C1', element: 'C', position: { x: 40, y: 100 }, charge: 0 },
                { id: 'O1', element: 'O', position: { x: 40, y: 65 }, charge: 0 },
                { id: 'C2', element: 'C', position: { x: 120, y: 100 }, charge: 0 },
                { id: 'O2', element: 'O', position: { x: 120, y: 65 }, charge: 0 }
            ];
            const bonds = [
                { atom1: 'C1', atom2: 'O1', order: 2 },
                { atom1: 'C2', atom2: 'O2', order: 2 }
            ];
            return { atoms, bonds };
        })(),
        intermediates: []
    };
    
    // Michael Addition: Enolate + α,β-unsaturated carbonyl
    structures['michael_addition'] = {
        reactant: MoleculeGeometry.createAlkene(40, 100),
        product: (() => {
            const chain = MoleculeGeometry.createLinearChain(4, 30, 100, 0);
            chain.atoms.push({ id: 'O', element: 'O', position: { x: 152, y: 65 }, charge: 0 });
            chain.bonds.push({ atom1: 'C4', atom2: 'O', order: 2 });
            return chain;
        })(),
        intermediates: []
    };
    
    // Robinson Annulation: Michael + Aldol → cyclohexenone
    structures['robinson_annulation'] = {
        reactant: MoleculeGeometry.createAlkene(40, 100),
        product: (() => {
            const ring = MoleculeGeometry.createCyclohexane(85, 110);
            ring.atoms.push({ id: 'O', element: 'O', position: { x: 115, y: 80 }, charge: 0 });
            ring.bonds.push({ atom1: 'C1', atom2: 'O', order: 2 });
            return ring;
        })(),
        intermediates: []
    };
    
    // E1 Elimination: Tertiary alkyl halide → alkene (two-step)
    structures['e1_elimination'] = {
        reactant: (() => {
            const chain = MoleculeGeometry.createLinearChain(3, 40, 100, 0);
            MoleculeGeometry.addSubstituent(chain.atoms, chain.bonds, 'C3', 'Br', -90);
            return chain;
        })(),
        product: MoleculeGeometry.createAlkene(40, 100),
        intermediates: []
    };
    
    // SN1 Substitution: Tertiary alkyl halide → substitution product
    structures['sn1_substitution'] = {
        reactant: (() => {
            const chain = MoleculeGeometry.createLinearChain(3, 40, 100, 0);
            MoleculeGeometry.addSubstituent(chain.atoms, chain.bonds, 'C3', 'Br', -90);
            return chain;
        })(),
        product: MoleculeGeometry.createAlcohol(40, 100),
        intermediates: []
    };
    
    // Carbonyl Reduction: Ketone → secondary alcohol
    structures['carbonyl_reduction'] = {
        reactant: MoleculeGeometry.createCarbonyl(60, 100),
        product: MoleculeGeometry.createAlcohol(60, 100),
        intermediates: []
    };
    
    // Electrophilic Addition: Alkene + HX → alkyl halide
    structures['electrophilic_addition'] = {
        reactant: MoleculeGeometry.createAlkene(40, 100),
        product: (() => {
            const chain = MoleculeGeometry.createLinearChain(3, 40, 100, 0);
            MoleculeGeometry.addSubstituent(chain.atoms, chain.bonds, 'C2', 'Br', -90);
            return chain;
        })(),
        intermediates: []
    };
    
    // Grob Fragmentation: 1,2-diol derivative → aldehyde/ketone + alkene
    structures['grob_fragmentation'] = {
        reactant: (() => {
            const atoms = [
                { id: 'C1', element: 'C', position: { x: 40, y: 100 }, charge: 0 },
                { id: 'C2', element: 'C', position: { x: 85, y: 100 }, charge: 0 },
                { id: 'C3', element: 'C', position: { x: 130, y: 100 }, charge: 0 },
                { id: 'O1', element: 'O', position: { x: 40, y: 65 }, charge: 0 },
                { id: 'O2', element: 'O', position: { x: 130, y: 65 }, charge: 0 }
            ];
            const bonds = [
                { atom1: 'C1', atom2: 'C2', order: 1 },
                { atom1: 'C2', atom2: 'C3', order: 1 },
                { atom1: 'C1', atom2: 'O1', order: 1 },
                { atom1: 'C3', atom2: 'O2', order: 1 }
            ];
            return { atoms, bonds };
        })(),
        product: (() => {
            const atoms = [
                { id: 'C1', element: 'C', position: { x: 40, y: 100 }, charge: 0 },
                { id: 'C2', element: 'C', position: { x: 85, y: 100 }, charge: 0 },
                { id: 'O', element: 'O', position: { x: 40, y: 65 }, charge: 0 }
            ];
            const bonds = [
                { atom1: 'C1', atom2: 'C2', order: 2 },
                { atom1: 'C1', atom2: 'O', order: 2 }
            ];
            return { atoms, bonds };
        })(),
        intermediates: []
    };
    
    // Ester Hydrolysis (Base): Ester → carboxylate + alcohol
    structures['ester_hydrolysis_base'] = {
        reactant: (() => {
            const chain = MoleculeGeometry.createLinearChain(2, 40, 100, 0);
            chain.atoms.push({ id: 'O1', element: 'O', position: { x: 85, y: 65 }, charge: 0 });
            chain.atoms.push({ id: 'O2', element: 'O', position: { x: 130, y: 100 }, charge: 0 });
            chain.atoms.push({ id: 'C3', element: 'C', position: { x: 130, y: 135 }, charge: 0 });
            chain.bonds.push({ atom1: 'C2', atom2: 'O1', order: 2 });
            chain.bonds.push({ atom1: 'C2', atom2: 'O2', order: 1 });
            chain.bonds.push({ atom1: 'O2', atom2: 'C3', order: 1 });
            return chain;
        })(),
        product: (() => {
            const atoms = [
                { id: 'C1', element: 'C', position: { x: 40, y: 100 }, charge: 0 },
                { id: 'C2', element: 'C', position: { x: 85, y: 100 }, charge: -1 },
                { id: 'O1', element: 'O', position: { x: 85, y: 65 }, charge: 0 },
                { id: 'O2', element: 'O', position: { x: 100, y: 135 }, charge: 0 }
            ];
            const bonds = [
                { atom1: 'C1', atom2: 'C2', order: 1 },
                { atom1: 'C2', atom2: 'O1', order: 2 },
                { atom1: 'C2', atom2: 'O2', order: 1 }
            ];
            return { atoms, bonds };
        })(),
        intermediates: []
    };
    
    // Return the structure or a default empty structure
    return structures[reactionKey] || {
        reactant: { atoms: [], bonds: [] },
        product: { atoms: [], bonds: [] },
        intermediates: []
    };
}
