// Main Application Logic

// Global state
let molecule = new Molecule();
let renderer;
let currentElement = 'C';
let currentBondOrder = 1;
let drawingBond = false;
let bondStartAtom = null;
let mousePos = { x: 0, y: 0 };
let autoConnectCarbon = true; // Auto-connect carbon atoms

// History management for undo/redo
let history = [];
let historyIndex = -1;
const MAX_HISTORY = 50;

// Clipboard for copy/paste
let clipboard = null;

// Reaction system
let currentReaction = new Reaction();
let reactionMode = null; // 'reactant1', 'reactant2', 'product', or null

// Initialize the application
function init() {
    const canvas = document.getElementById('molecule-canvas');
    renderer = new Renderer(canvas);
    
    setupEventListeners();
    saveToHistory(); // Save initial empty state
    updateUI();
    render();
}

// Setup all event listeners
function setupEventListeners() {
    const canvas = document.getElementById('molecule-canvas');
    
    // Canvas events
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);
    
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
    
    // Action buttons
    document.getElementById('clear-canvas').addEventListener('click', () => {
        if (confirm('Clear all atoms and bonds?')) {
            molecule.clear();
            saveToHistory();
            updateUI();
            render();
        }
    });
    
    // Auto-organize button
    document.getElementById('auto-organize').addEventListener('click', () => {
        autoOrganizeMolecule();
        saveToHistory();
        render();
    });
    
    // Add benzene ring button
    document.getElementById('add-benzene').addEventListener('click', () => {
        addBenzeneRing();
        saveToHistory();
        updateUI();
        render();
    });
    
    // Add cyclohexane button
    document.getElementById('add-cyclohexane').addEventListener('click', () => {
        addCyclohexane();
        saveToHistory();
        updateUI();
        render();
    });
    
    // Add cyclopentane button
    document.getElementById('add-cyclopentane').addEventListener('click', () => {
        addCyclopentane();
        saveToHistory();
        updateUI();
        render();
    });
    
    // View options
    document.getElementById('show-lone-pairs').addEventListener('change', (e) => {
        renderer.showLonePairs = e.target.checked;
        render();
    });
    
    document.getElementById('show-charges').addEventListener('change', (e) => {
        renderer.showCharges = e.target.checked;
        render();
    });
    
    document.getElementById('show-hybridization').addEventListener('change', (e) => {
        renderer.showHybridization = e.target.checked;
        render();
    });
    
    // Save/Load functionality
    document.getElementById('save-molecule').addEventListener('click', saveMolecule);
    document.getElementById('load-molecule').addEventListener('click', loadMolecule);
    document.getElementById('export-image').addEventListener('click', exportImage);
    
    // Reaction simulator
    document.getElementById('start-reactant1').addEventListener('click', () => {
        reactionMode = 'reactant1';
        molecule.clear();
        updateReactionStatus('Drawing Reactant 1... Click "View Reaction" when done.');
        updateUI();
        render();
    });
    
    document.getElementById('start-reactant2').addEventListener('click', () => {
        if (currentReaction.reactants.length === 0) {
            alert('Please draw Reactant 1 first!');
            return;
        }
        reactionMode = 'reactant2';
        molecule.clear();
        updateReactionStatus('Drawing Reactant 2... Click "View Reaction" when done.');
        updateUI();
        render();
    });
    
    document.getElementById('start-product').addEventListener('click', () => {
        if (currentReaction.reactants.length === 0) {
            alert('Please draw reactants first!');
            return;
        }
        reactionMode = 'product';
        molecule.clear();
        updateReactionStatus('Drawing Product... Click "View Reaction" when done.');
        updateUI();
        render();
    });
    
    document.getElementById('view-reaction').addEventListener('click', () => {
        // Save current drawing based on mode
        if (reactionMode && molecule.atoms.length > 0) {
            if (reactionMode === 'reactant1') {
                currentReaction.reactants[0] = molecule.toJSON();
            } else if (reactionMode === 'reactant2') {
                currentReaction.reactants[1] = molecule.toJSON();
            } else if (reactionMode === 'product') {
                currentReaction.products[0] = molecule.toJSON();
            }
        }
        reactionMode = null;
        updateReactionStatus('');
        openReactionModal();
    });
    
    document.getElementById('clear-reaction').addEventListener('click', () => {
        if (confirm('Clear current reaction?')) {
            currentReaction.clear();
            reactionMode = null;
            updateReactionStatus('');
            alert('Reaction cleared!');
        }
    });
    
    // Modal controls
    const modal = document.getElementById('reaction-modal');
    const closeBtn = document.querySelector('.close');
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    document.getElementById('add-reagent-btn').addEventListener('click', () => {
        const select = document.getElementById('reagent-select');
        const reagent = select.value;
        if (reagent) {
            currentReaction.addReagent(reagent);
            updateReactionDisplay();
        }
    });
    
    document.getElementById('add-condition-btn').addEventListener('click', () => {
        const select = document.getElementById('condition-select');
        const condition = select.value;
        if (condition) {
            currentReaction.addCondition(CONDITIONS[condition]);
            updateReactionDisplay();
        }
    });
    
    document.getElementById('export-reaction').addEventListener('click', exportReaction);
}

// Handle canvas click - place atoms
function handleCanvasClick(e) {
    if (drawingBond) return; // Don't place atoms while drawing bonds
    
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicking on existing atom
    const clickedAtom = molecule.getAtomAtPosition(x, y);
    
    if (clickedAtom) {
        // Select the atom
        molecule.selectedAtom = clickedAtom;
        updateSelectedAtomInfo();
    } else {
        // Place new atom with automatic bonding
        const newAtom = molecule.addAtom(currentElement, x, y);
        
        // For carbon atoms, always try to connect to nearby carbons
        const searchRadius = currentElement === 'C' ? 100 : 80;
        const nearbyAtoms = findNearbyAtoms(newAtom, searchRadius);
        
        if (nearbyAtoms.length > 0) {
            // Sort by distance
            nearbyAtoms.sort((a, b) => a.distance - b.distance);
            
            // For carbon, try to connect to multiple nearby carbons
            if (currentElement === 'C' && autoConnectCarbon) {
                let bondsCreated = 0;
                for (let nearby of nearbyAtoms) {
                    // Prefer connecting to other carbons
                    if (nearby.atom.element === 'C' || nearbyAtoms.length === 1) {
                        if (molecule.canAddBond(newAtom, currentBondOrder) && 
                            molecule.canAddBond(nearby.atom, currentBondOrder)) {
                            molecule.addBond(newAtom.id, nearby.atom.id, currentBondOrder);
                            
                            // Position the new atom at proper bond length
                            if (bondsCreated === 0) {
                                positionAtomAtBondLength(newAtom, nearby.atom);
                            }
                            
                            bondsCreated++;
                            
                            // Stop after creating enough bonds based on valence
                            if (bondsCreated >= 2) break;
                        }
                    }
                }
            } else {
                // For other elements, connect to closest valid atom
                for (let nearby of nearbyAtoms) {
                    if (molecule.canAddBond(newAtom, currentBondOrder) && 
                        molecule.canAddBond(nearby.atom, currentBondOrder)) {
                        molecule.addBond(newAtom.id, nearby.atom.id, currentBondOrder);
                        
                        // Position the new atom at proper bond length
                        positionAtomAtBondLength(newAtom, nearby.atom);
                        break;
                    }
                }
            }
        }
        
        saveToHistory();
        updateUI();
    }
    
    render();
}

// Handle mouse down - start bond drawing
function handleMouseDown(e) {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const clickedAtom = molecule.getAtomAtPosition(x, y);
    
    if (clickedAtom) {
        drawingBond = true;
        bondStartAtom = clickedAtom;
    }
}

// Handle mouse move - show temporary bond
function handleMouseMove(e) {
    const rect = e.target.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;
    
    if (drawingBond && bondStartAtom) {
        render();
        renderer.drawTempBond(
            bondStartAtom.position.x,
            bondStartAtom.position.y,
            mousePos.x,
            mousePos.y
        );
    }
}

// Handle mouse up - complete bond drawing
function handleMouseUp(e) {
    if (!drawingBond || !bondStartAtom) return;
    
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const targetAtom = molecule.getAtomAtPosition(x, y);
    
    if (targetAtom && targetAtom.id !== bondStartAtom.id) {
        // Create bond
        const bond = molecule.addBond(bondStartAtom.id, targetAtom.id, currentBondOrder);
        
        if (!bond) {
            alert('Cannot create bond: valence exceeded!');
        } else {
            saveToHistory();
        }
        
        updateUI();
    }
    
    drawingBond = false;
    bondStartAtom = null;
    render();
}

// Find nearby atoms within threshold distance
function findNearbyAtoms(atom, threshold) {
    const nearby = [];
    
    molecule.atoms.forEach(otherAtom => {
        if (otherAtom.id === atom.id) return;
        
        const dx = otherAtom.position.x - atom.position.x;
        const dy = otherAtom.position.y - atom.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= threshold) {
            nearby.push({ atom: otherAtom, distance });
        }
    });
    
    return nearby;
}

// Position atom at ideal bond length from another atom
function positionAtomAtBondLength(newAtom, existingAtom) {
    const idealBondLength = getIdealBondLength(newAtom.element, existingAtom.element);
    
    // Calculate angle from existing atom to new atom
    const dx = newAtom.position.x - existingAtom.position.x;
    const dy = newAtom.position.y - existingAtom.position.y;
    const currentDistance = Math.sqrt(dx * dx + dy * dy);
    
    if (currentDistance === 0) return;
    
    // Scale to ideal bond length
    const scale = idealBondLength / currentDistance;
    newAtom.position.x = existingAtom.position.x + dx * scale;
    newAtom.position.y = existingAtom.position.y + dy * scale;
}

// Get ideal bond length between two elements (in pixels)
function getIdealBondLength(element1, element2) {
    const baseLength = 60; // Base length in pixels
    
    // Adjust based on bond type and elements
    const bondLengths = {
        'C-C': 60,
        'C-H': 50,
        'C-N': 58,
        'C-O': 56,
        'C=C': 55,
        'C=O': 52,
        'N-H': 48,
        'O-H': 46
    };
    
    const key1 = `${element1}-${element2}`;
    const key2 = `${element2}-${element1}`;
    
    return bondLengths[key1] || bondLengths[key2] || baseLength;
}

// Render the molecule
function render() {
    renderer.render(molecule);
}

// Update UI with current molecule information
function updateUI() {
    const moleculeName = molecule.atoms.length > 0 ? getIUPACName(molecule.toJSON()) : '-';
    document.getElementById('molecule-name').textContent = moleculeName;
    document.getElementById('formula').textContent = molecule.getMolecularFormula();
    document.getElementById('molecular-weight').textContent = molecule.getMolecularWeight();
    document.getElementById('atom-count').textContent = molecule.atoms.length;
    document.getElementById('bond-count').textContent = molecule.bonds.length;
}

// Update selected atom information
function updateSelectedAtomInfo() {
    if (!molecule.selectedAtom) {
        document.getElementById('selected-element').textContent = '-';
        document.getElementById('selected-hybrid').textContent = '-';
        document.getElementById('selected-charge').textContent = '-';
        document.getElementById('selected-bonds').textContent = '-';
        return;
    }
    
    const atom = molecule.selectedAtom;
    const bondCount = molecule.getAtomBondCount(atom.id);
    const bonds = molecule.getAtomBonds(atom.id);
    const element = getElement(atom.element);
    
    // Count bond types
    let singleBonds = 0, doubleBonds = 0, tripleBonds = 0;
    bonds.forEach(bond => {
        if (bond.order === 1) singleBonds++;
        else if (bond.order === 2) doubleBonds++;
        else if (bond.order === 3) tripleBonds++;
    });
    
    const bondText = `${bondCount} (${singleBonds}s, ${doubleBonds}d, ${tripleBonds}t)`;
    const geometry = getGeometry(atom.hybridization, element.lonePairs);
    
    document.getElementById('selected-element').textContent = `${atom.element} (${element.name})`;
    document.getElementById('selected-hybrid').textContent = `${atom.hybridization} (${geometry})`;
    document.getElementById('selected-charge').textContent = atom.charge.toFixed(3);
    document.getElementById('selected-bonds').textContent = bondText;
}

// Update reaction status message
function updateReactionStatus(message) {
    const statusDiv = document.getElementById('reaction-status');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.style.color = message ? '#667eea' : '#666';
        statusDiv.style.fontWeight = message ? 'bold' : 'normal';
    }
}

// Save molecule to JSON
function saveMolecule() {
    const data = JSON.stringify(molecule.toJSON(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'molecule.json';
    a.click();
    URL.revokeObjectURL(url);
}

// Load molecule from JSON
function loadMolecule() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                molecule.fromJSON(data);
                updateUI();
                render();
            } catch (error) {
                alert('Error loading molecule: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// Keyboard shortcuts handler
function handleKeyDown(e) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
    
    // Cmd/Ctrl + Z - Undo
    if (cmdOrCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
    }
    
    // Cmd/Ctrl + Shift + Z - Redo
    if (cmdOrCtrl && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
    }
    
    // Cmd/Ctrl + C - Copy
    if (cmdOrCtrl && e.key === 'c') {
        e.preventDefault();
        copySelection();
    }
    
    // Cmd/Ctrl + V - Paste
    if (cmdOrCtrl && e.key === 'v') {
        e.preventDefault();
        pasteSelection();
    }
    
    // Cmd/Ctrl + X - Cut
    if (cmdOrCtrl && e.key === 'x') {
        e.preventDefault();
        cutSelection();
    }
    
    // Delete or Backspace - Delete selected atom
    if ((e.key === 'Delete' || e.key === 'Backspace') && molecule.selectedAtom) {
        e.preventDefault();
        molecule.removeAtom(molecule.selectedAtom.id);
        molecule.selectedAtom = null;
        saveToHistory();
        updateUI();
        render();
    }
}

// Save current state to history
function saveToHistory() {
    // Remove any states after current index
    history = history.slice(0, historyIndex + 1);
    
    // Add new state
    history.push(JSON.stringify(molecule.toJSON()));
    
    // Limit history size
    if (history.length > MAX_HISTORY) {
        history.shift();
    } else {
        historyIndex++;
    }
}

// Undo last action
function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        const state = JSON.parse(history[historyIndex]);
        molecule.fromJSON(state);
        updateUI();
        render();
    }
}

// Redo last undone action
function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        const state = JSON.parse(history[historyIndex]);
        molecule.fromJSON(state);
        updateUI();
        render();
    }
}

// Copy selected atom or entire molecule
function copySelection() {
    if (molecule.selectedAtom) {
        clipboard = {
            type: 'atom',
            data: JSON.parse(JSON.stringify(molecule.selectedAtom))
        };
    } else if (molecule.atoms.length > 0) {
        clipboard = {
            type: 'molecule',
            data: molecule.toJSON()
        };
    }
}

// Paste from clipboard
function pasteSelection() {
    if (!clipboard) return;
    
    if (clipboard.type === 'atom') {
        // Paste atom at offset position
        const newAtom = molecule.addAtom(
            clipboard.data.element,
            clipboard.data.position.x + 50,
            clipboard.data.position.y + 50
        );
        molecule.selectedAtom = newAtom;
        saveToHistory();
    } else if (clipboard.type === 'molecule') {
        // Paste entire molecule at offset
        const offsetX = 100;
        const offsetY = 100;
        
        const data = JSON.parse(JSON.stringify(clipboard.data));
        data.atoms.forEach(atom => {
            atom.position.x += offsetX;
            atom.position.y += offsetY;
        });
        
        // Add all atoms and bonds
        const atomIdMap = {};
        data.atoms.forEach(atom => {
            const oldId = atom.id;
            const newAtom = molecule.addAtom(atom.element, atom.position.x, atom.position.y);
            atomIdMap[oldId] = newAtom.id;
        });
        
        data.bonds.forEach(bond => {
            molecule.addBond(atomIdMap[bond.atom1], atomIdMap[bond.atom2], bond.order);
        });
        
        saveToHistory();
    }
    
    updateUI();
    render();
}

// Cut selected atom
function cutSelection() {
    copySelection();
    if (molecule.selectedAtom) {
        molecule.removeAtom(molecule.selectedAtom.id);
        molecule.selectedAtom = null;
        saveToHistory();
        updateUI();
        render();
    }
}

// Export canvas as image
function exportImage() {
    const canvas = document.getElementById('molecule-canvas');
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'molecule.png';
    a.click();
}

// Open reaction modal
function openReactionModal() {
    // Populate dropdowns
    populateReagentDropdown();
    populateConditionDropdown();
    
    const modal = document.getElementById('reactionModal');
    modal.style.display = 'block';
    updateReactionDisplay();
}

// Close reaction modal
function closeReactionModal() {
    const modal = document.getElementById('reactionModal');
    modal.style.display = 'none';
}

// Start drawing a reactant
function startDrawingReactant(reactantNum) {
    reactionMode = `reactant${reactantNum}`;
    molecule.clear();
    
    // Update UI
    if (reactantNum === 1) {
        document.getElementById('startReactant1Btn').style.display = 'none';
        document.getElementById('saveReactant1Btn').style.display = 'inline-block';
    } else {
        document.getElementById('startReactant2Btn').style.display = 'none';
        document.getElementById('saveReactant2Btn').style.display = 'inline-block';
    }
    
    closeReactionModal();
    render();
}

// Save a reactant
function saveReactant(reactantNum) {
    if (molecule.atoms.length === 0) {
        alert('Please draw a molecule first!');
        return;
    }
    
    // Save to reaction
    const moleculeCopy = JSON.parse(JSON.stringify({
        atoms: molecule.atoms,
        bonds: molecule.bonds
    }));
    
    if (reactantNum === 1) {
        currentReaction.reactants[0] = moleculeCopy;
        document.getElementById('saveReactant1Btn').style.display = 'none';
        document.getElementById('startReactant1Btn').style.display = 'inline-block';
        document.getElementById('startReactant2Btn').disabled = false;
        document.getElementById('skipReactant2Btn').disabled = false;
    } else {
        currentReaction.reactants[1] = moleculeCopy;
        document.getElementById('saveReactant2Btn').style.display = 'none';
        document.getElementById('startReactant2Btn').style.display = 'inline-block';
        document.getElementById('reagentSelect').disabled = false;
        document.getElementById('conditionSelect').disabled = false;
        document.getElementById('startProductBtn').disabled = false;
    }
    
    reactionMode = null;
    openReactionModal();
    updateReactionDisplay();
}

// Skip reactant 2 (single reactant reaction)
function skipReactant2() {
    document.getElementById('skipReactant2Btn').disabled = true;
    document.getElementById('startReactant2Btn').disabled = true;
    document.getElementById('reagentSelect').disabled = false;
    document.getElementById('conditionSelect').disabled = false;
    document.getElementById('startProductBtn').disabled = false;
}

// Start drawing product
function startDrawingProduct() {
    reactionMode = 'product';
    molecule.clear();
    
    // Get selected reagent and add to reaction
    const reagentKey = document.getElementById('reagentSelect').value;
    if (reagentKey) {
        currentReaction.reagents = [reagentKey];
    }
    
    // Get selected condition and add to reaction
    const conditionKey = document.getElementById('conditionSelect').value;
    if (conditionKey) {
        currentReaction.conditions = [conditionKey];
    }
    
    document.getElementById('startProductBtn').style.display = 'none';
    document.getElementById('saveProductBtn').style.display = 'inline-block';
    
    closeReactionModal();
    render();
}

// Save product
function saveProduct() {
    if (molecule.atoms.length === 0) {
        alert('Please draw a product molecule!');
        return;
    }
    
    // Save to reaction
    const moleculeCopy = JSON.parse(JSON.stringify({
        atoms: molecule.atoms,
        bonds: molecule.bonds
    }));
    
    currentReaction.products[0] = moleculeCopy;
    
    document.getElementById('saveProductBtn').style.display = 'none';
    document.getElementById('startProductBtn').style.display = 'inline-block';
    document.getElementById('exportReactionBtn').disabled = false;
    
    reactionMode = null;
    openReactionModal();
    updateReactionDisplay();
}

// Clear reaction and reset workflow
function clearReaction() {
    if (confirm('Clear the entire reaction?')) {
        currentReaction = new Reaction();
        reactionMode = null;
        
        // Reset all buttons
        document.getElementById('startReactant1Btn').style.display = 'inline-block';
        document.getElementById('saveReactant1Btn').style.display = 'none';
        document.getElementById('startReactant2Btn').style.display = 'inline-block';
        document.getElementById('startReactant2Btn').disabled = true;
        document.getElementById('saveReactant2Btn').style.display = 'none';
        document.getElementById('skipReactant2Btn').disabled = true;
        document.getElementById('reagentSelect').disabled = true;
        document.getElementById('conditionSelect').disabled = true;
        document.getElementById('reagentSelect').value = '';
        document.getElementById('conditionSelect').value = '';
        document.getElementById('startProductBtn').style.display = 'inline-block';
        document.getElementById('startProductBtn').disabled = true;
        document.getElementById('saveProductBtn').style.display = 'none';
        document.getElementById('exportReactionBtn').disabled = true;
        
        // Hide reagent info
        document.getElementById('reagentInfo').style.display = 'none';
        
        updateReactionDisplay();
    }
}

// Update reaction display in modal
function updateReactionDisplay() {
    const displayDiv = document.getElementById('reactionDisplay');
    
    // Check if we have any reactants
    const validReactants = currentReaction.reactants.filter(r => r && r.atoms && r.atoms.length > 0);
    const validProducts = currentReaction.products.filter(p => p && p.atoms && p.atoms.length > 0);
    
    if (validReactants.length === 0) {
        displayDiv.innerHTML = '<div class="empty-state">Draw reactants to begin</div>';
        return;
    }
    
    // Build reaction display
    let html = '<div class="reaction-equation-display">';
    
    // Reactants
    validReactants.forEach((r, i) => {
        if (i > 0) html += ' + ';
        const formula = getMolecularFormula(r);
        const name = getIUPACName(r);
        html += `<div class="molecule-card">
            <div style="font-weight: bold; color: #667eea;">${formula}</div>
            <div style="font-size: 0.8rem; color: #666; margin-top: 0.25rem;">${name}</div>
        </div>`;
    });
    
    // Arrow with reagents and conditions
    html += '<div class="reaction-arrow">';
    html += '<div style="font-size: 1.5rem; margin: 0 15px;">→</div>';
    
    if (currentReaction.reagents.length > 0 || currentReaction.conditions.length > 0) {
        html += '<div class="reaction-conditions-display">';
        if (currentReaction.reagents.length > 0) {
            html += `<div>${currentReaction.reagents.join(', ')}</div>`;
        }
        if (currentReaction.conditions.length > 0) {
            html += `<div>${currentReaction.conditions.join(', ')}</div>`;
        }
        html += '</div>';
    }
    html += '</div>';
    
    // Products
    if (validProducts.length > 0) {
        validProducts.forEach((p, i) => {
            if (i > 0) html += ' + ';
            const formula = getMolecularFormula(p);
            const name = getIUPACName(p);
            html += `<div class="molecule-card">
                <div style="font-weight: bold; color: #667eea;">${formula}</div>
                <div style="font-size: 0.8rem; color: #666; margin-top: 0.25rem;">${name}</div>
            </div>`;
        });
    } else {
        html += '<div class="empty-state">Draw product</div>';
    }
    
    html += '</div>';
    
    displayDiv.innerHTML = html;
    
    // Update reaction info with atom balance
    const infoDiv = document.getElementById('reactionInfo');
    if (validReactants.length > 0 && validProducts.length > 0) {
        const balance = checkAtomBalance(validReactants, validProducts);
        
        if (balance.balanced) {
            infoDiv.innerHTML = '<div style="color: green; font-weight: bold;">✓ Reaction is balanced</div>';
        } else {
            let html = '<div style="color: red; font-weight: bold;">✗ Reaction is not balanced</div>';
            html += '<div style="font-size: 0.85rem; margin-top: 5px;">';
            for (let element in balance.differences) {
                const diff = balance.differences[element];
                html += `${element}: ${diff.reactants} → ${diff.products}<br>`;
            }
            html += '</div>';
            infoDiv.innerHTML = html;
        }
    } else {
        infoDiv.innerHTML = '';
    }
}

// Export reaction as text
function exportReaction() {
    const text = reactionToText(currentReaction);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reaction.txt';
    a.click();
    URL.revokeObjectURL(url);
}

// Auto-organize molecule using force-directed layout
function autoOrganizeMolecule() {
    if (molecule.atoms.length === 0) return;
    
    const canvas = document.getElementById('molecule-canvas');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // If only one atom, center it
    if (molecule.atoms.length === 1) {
        molecule.atoms[0].position.x = centerX;
        molecule.atoms[0].position.y = centerY;
        return;
    }
    
    // Force-directed layout parameters
    const iterations = 100;
    const springLength = 60; // Ideal bond length
    const springStrength = 0.1;
    const repulsionStrength = 5000;
    const damping = 0.8;
    
    // Initialize velocities
    molecule.atoms.forEach(atom => {
        atom.vx = 0;
        atom.vy = 0;
    });
    
    // Run simulation
    for (let iter = 0; iter < iterations; iter++) {
        // Calculate forces
        molecule.atoms.forEach(atom => {
            let fx = 0;
            let fy = 0;
            
            // Spring forces (attraction along bonds)
            const bonds = molecule.getAtomBonds(atom.id);
            bonds.forEach(bond => {
                const otherId = bond.atom1 === atom.id ? bond.atom2 : bond.atom1;
                const other = molecule.getAtomById(otherId);
                
                const dx = other.position.x - atom.position.x;
                const dy = other.position.y - atom.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    const idealLength = getIdealBondLength(atom.element, other.element);
                    const force = springStrength * (distance - idealLength);
                    fx += (dx / distance) * force;
                    fy += (dy / distance) * force;
                }
            });
            
            // Repulsion forces (push apart non-bonded atoms)
            molecule.atoms.forEach(other => {
                if (other.id === atom.id) return;
                
                const dx = other.position.x - atom.position.x;
                const dy = other.position.y - atom.position.y;
                const distSq = dx * dx + dy * dy;
                
                if (distSq > 0) {
                    const force = repulsionStrength / distSq;
                    fx -= (dx / Math.sqrt(distSq)) * force;
                    fy -= (dy / Math.sqrt(distSq)) * force;
                }
            });
            
            // Apply forces
            atom.vx = (atom.vx + fx) * damping;
            atom.vy = (atom.vy + fy) * damping;
        });
        
        // Update positions
        molecule.atoms.forEach(atom => {
            atom.position.x += atom.vx;
            atom.position.y += atom.vy;
        });
    }
    
    // Center the molecule
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    molecule.atoms.forEach(atom => {
        minX = Math.min(minX, atom.position.x);
        maxX = Math.max(maxX, atom.position.x);
        minY = Math.min(minY, atom.position.y);
        maxY = Math.max(maxY, atom.position.y);
    });
    
    const molCenterX = (minX + maxX) / 2;
    const molCenterY = (minY + maxY) / 2;
    const offsetX = centerX - molCenterX;
    const offsetY = centerY - molCenterY;
    
    molecule.atoms.forEach(atom => {
        atom.position.x += offsetX;
        atom.position.y += offsetY;
        delete atom.vx;
        delete atom.vy;
    });
    
    // Update all atom properties
    molecule.atoms.forEach(atom => molecule.updateAtomProperties(atom));
}

// Add a benzene ring to the canvas
function addBenzeneRing() {
    const canvas = document.getElementById('molecule-canvas');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 50;
    
    // Create 6 carbon atoms in a hexagon
    const atoms = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2; // Start at top
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        const atom = molecule.addAtom('C', x, y);
        atoms.push(atom);
    }
    
    // Create alternating single and double bonds
    for (let i = 0; i < 6; i++) {
        const nextIndex = (i + 1) % 6;
        const bondOrder = i % 2 === 0 ? 2 : 1; // Alternating double and single bonds
        molecule.addBond(atoms[i].id, atoms[nextIndex].id, bondOrder);
    }
    
    // Update properties
    atoms.forEach(atom => molecule.updateAtomProperties(atom));
}

// Add a cyclohexane ring (all single bonds)
function addCyclohexane() {
    const canvas = document.getElementById('molecule-canvas');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 50;
    
    // Create 6 carbon atoms in a hexagon
    const atoms = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        const atom = molecule.addAtom('C', x, y);
        atoms.push(atom);
    }
    
    // Create all single bonds
    for (let i = 0; i < 6; i++) {
        const nextIndex = (i + 1) % 6;
        molecule.addBond(atoms[i].id, atoms[nextIndex].id, 1);
    }
    
    // Update properties
    atoms.forEach(atom => molecule.updateAtomProperties(atom));
}

// Add a cyclopentane ring
function addCyclopentane() {
    const canvas = document.getElementById('molecule-canvas');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 45;
    
    // Create 5 carbon atoms in a pentagon
    const atoms = [];
    for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        const atom = molecule.addAtom('C', x, y);
        atoms.push(atom);
    }
    
    // Create all single bonds
    for (let i = 0; i < 5; i++) {
        const nextIndex = (i + 1) % 5;
        molecule.addBond(atoms[i].id, atoms[nextIndex].id, 1);
    }
    
    // Update properties
    atoms.forEach(atom => molecule.updateAtomProperties(atom));
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Populate reagent dropdown with grouped options
function populateReagentDropdown() {
    const reagentSelect = document.getElementById('reagentSelect');
    reagentSelect.innerHTML = '<option value="">Select a reagent...</option>';
    
    // Group reagents by type
    const groups = {
        'Strong Bases (Elimination)': ['t-BuOK', 'NaOEt', 'KOH', 'NaOH'],
        'Acids (Addition/Dehydration)': ['H2SO4', 'H3PO4', 'HCl', 'HBr'],
        'Oxidizing Agents': ['KMnO4', 'K2Cr2O7', 'PCC', 'H2O2', 'O3', 'OsO4', 'mCPBA'],
        'Reducing Agents': ['NaBH4', 'LiAlH4', 'H2/Pd', 'H2/Pt'],
        'Halogenating Agents': ['Br2', 'Cl2', 'NBS'],
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
}

// Update reagent information display when selection changes
function updateReagentInfo() {
    const reagentKey = document.getElementById('reagentSelect').value;
    const reagentInfo = document.getElementById('reagentInfo');
    
    if (!reagentKey || !REAGENTS[reagentKey]) {
        reagentInfo.style.display = 'none';
        return;
    }
    
    const reagent = REAGENTS[reagentKey];
    reagentInfo.style.display = 'block';
    
    reagentInfo.querySelector('.reagent-name').textContent = 
        `${reagentKey} (${reagent.name})`;
    reagentInfo.querySelector('.reagent-use').textContent = reagent.use;
    reagentInfo.querySelector('.reagent-conditions').textContent = reagent.conditions;
    reagentInfo.querySelector('.reagent-mechanism').textContent = reagent.mechanism;
}

// Populate condition dropdown
function populateConditionDropdown() {
    const conditionSelect = document.getElementById('conditionSelect');
    conditionSelect.innerHTML = '<option value="">None</option>';
    
    for (const [key, value] of Object.entries(CONDITIONS)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = `${key} (${value.name})`;
        conditionSelect.appendChild(option);
    }
}

// ==================== MECHANISM VIEWER FUNCTIONS ====================

// Global mechanism renderer instance
let mechanismRenderer = null;

// Open mechanism viewer modal
function openMechanismViewer() {
    const modal = document.getElementById('mechanismModal');
    modal.style.display = 'block';
    
    // Initialize renderer if not already done
    if (!mechanismRenderer) {
        mechanismRenderer = new MechanismRenderer('mechanismDisplay');
    }
}

// Close mechanism viewer modal
function closeMechanismModal() {
    const modal = document.getElementById('mechanismModal');
    modal.style.display = 'none';
}

// View specific mechanism
function viewMechanism(reactionKey) {
    const reactionData = REACTION_DATABASE[reactionKey];
    
    if (!reactionData) {
        alert('Reaction mechanism not found!');
        return;
    }
    
    // Create example molecule data for the mechanism
    const moleculeData = generateExampleMolecule(reactionKey);
    
    // Show the mechanism
    mechanismRenderer.renderMechanism(reactionData, moleculeData);
    
    // Show controls
    document.getElementById('mechanismControls').style.display = 'block';
    
    // Auto-play animation after a brief delay
    setTimeout(() => {
        mechanismRenderer.playAnimation();
    }, 500);
}

// Generate example molecule data for mechanisms
function generateExampleMolecule(reactionKey) {
    // This creates simplified example structures for demonstration
    // In a full implementation, this would use the actual drawn molecule
    
    const examples = {
        'e2_elimination': {
            reactant: {
                atoms: [
                    { id: 1, element: 'C', position: { x: 50, y: 100 }, charge: 0 },
                    { id: 2, element: 'C', position: { x: 100, y: 100 }, charge: 0 },
                    { id: 3, element: 'Br', position: { x: 130, y: 80 }, charge: 0 },
                    { id: 4, element: 'H', position: { x: 20, y: 80 }, charge: 0 }
                ],
                bonds: [
                    { atom1: 1, atom2: 2, order: 1 },
                    { atom1: 2, atom2: 3, order: 1 },
                    { atom1: 1, atom2: 4, order: 1 }
                ]
            },
            product: {
                atoms: [
                    { id: 1, element: 'C', position: { x: 50, y: 100 }, charge: 0 },
                    { id: 2, element: 'C', position: { x: 100, y: 100 }, charge: 0 }
                ],
                bonds: [
                    { atom1: 1, atom2: 2, order: 2 }
                ]
            }
        },
        'sn2_substitution': {
            reactant: {
                atoms: [
                    { id: 1, element: 'C', position: { x: 100, y: 100 }, charge: 0 },
                    { id: 2, element: 'Br', position: { x: 140, y: 100 }, charge: 0 }
                ],
                bonds: [
                    { atom1: 1, atom2: 2, order: 1 }
                ]
            },
            product: {
                atoms: [
                    { id: 1, element: 'C', position: { x: 100, y: 100 }, charge: 0 },
                    { id: 2, element: 'N', position: { x: 60, y: 100 }, charge: 0 }
                ],
                bonds: [
                    { atom1: 1, atom2: 2, order: 1 }
                ]
            }
        },
        'aldol_condensation': {
            reactant: {
                atoms: [
                    { id: 1, element: 'C', position: { x: 80, y: 100 }, charge: 0 },
                    { id: 2, element: 'C', position: { x: 110, y: 100 }, charge: 0 },
                    { id: 3, element: 'O', position: { x: 110, y: 70 }, charge: 0 }
                ],
                bonds: [
                    { atom1: 1, atom2: 2, order: 1 },
                    { atom1: 2, atom2: 3, order: 2 }
                ]
            },
            intermediates: [
                {
                    atoms: [
                        { id: 1, element: 'C', position: { x: 80, y: 100 }, charge: -1 },
                        { id: 2, element: 'C', position: { x: 110, y: 100 }, charge: 0 },
                        { id: 3, element: 'O', position: { x: 110, y: 70 }, charge: -1 }
                    ],
                    bonds: [
                        { atom1: 1, atom2: 2, order: 1.5 }
                    ]
                }
            ],
            product: {
                atoms: [
                    { id: 1, element: 'C', position: { x: 70, y: 100 }, charge: 0 },
                    { id: 2, element: 'C', position: { x: 100, y: 100 }, charge: 0 },
                    { id: 3, element: 'C', position: { x: 130, y: 100 }, charge: 0 },
                    { id: 4, element: 'O', position: { x: 150, y: 80 }, charge: 0 }
                ],
                bonds: [
                    { atom1: 1, atom2: 2, order: 2 },
                    { atom1: 2, atom2: 3, order: 1 },
                    { atom1: 3, atom2: 4, order: 2 }
                ]
            }
        }
    };
    
    // Return example or generic structure
    return examples[reactionKey] || {
        reactant: { atoms: [], bonds: [] },
        product: { atoms: [], bonds: [] }
    };
}

// ==================== REACTION PREDICTOR ====================

// Predict reaction product based on drawn molecule and selected reagent
function predictReactionProduct() {
    if (molecule.atoms.length === 0) {
        alert('Please draw a molecule first!');
        return;
    }
    
    const reagentKey = document.getElementById('reagentSelect').value;
    if (!reagentKey) {
        alert('Please select a reagent!');
        return;
    }
    
    // Detect functional groups in the molecule
    const functionalGroups = detectAllFunctionalGroups(molecule);
    
    // Find matching reactions based on functional groups and reagent
    const matchingReactions = findMatchingReactions(functionalGroups, reagentKey);
    
    if (matchingReactions.length === 0) {
        alert('No matching reaction found for this substrate and reagent combination.');
        return;
    }
    
    // Show prediction to user
    displayReactionPrediction(matchingReactions[0]);
}

// Detect all functional groups in molecule
function detectAllFunctionalGroups(mol) {
    const groups = [];
    
    // Check for alkyl halides
    mol.atoms.forEach(atom => {
        if (['Cl', 'Br', 'I'].includes(atom.element)) {
            const bonds = mol.getAtomBonds(atom.id);
            if (bonds.length === 1) {
                const carbons = bonds.filter(b => {
                    const otherId = b.atom1 === atom.id ? b.atom2 : b.atom1;
                    const other = mol.getAtomById(otherId);
                    return other.element === 'C';
                });
                if (carbons.length > 0) {
                    groups.push({ type: 'alkyl_halide', halogen: atom.element });
                }
            }
        }
    });
    
    // Check for alcohols
    mol.atoms.forEach(atom => {
        if (atom.element === 'O') {
            const bonds = mol.getAtomBonds(atom.id);
            const carbonBonds = bonds.filter(b => b.order === 1);
            if (carbonBonds.length === 1) {
                groups.push({ type: 'alcohol' });
            }
        }
    });
    
    // Check for carbonyl groups (C=O)
    mol.bonds.forEach(bond => {
        if (bond.order === 2) {
            const atom1 = mol.getAtomById(bond.atom1);
            const atom2 = mol.getAtomById(bond.atom2);
            if ((atom1.element === 'C' && atom2.element === 'O') ||
                (atom1.element === 'O' && atom2.element === 'C')) {
                groups.push({ type: 'carbonyl' });
            }
        }
    });
    
    // Check for alkenes (C=C)
    mol.bonds.forEach(bond => {
        if (bond.order === 2) {
            const atom1 = mol.getAtomById(bond.atom1);
            const atom2 = mol.getAtomById(bond.atom2);
            if (atom1.element === 'C' && atom2.element === 'C') {
                groups.push({ type: 'alkene' });
            }
        }
    });
    
    return groups;
}

// Find matching reactions from database
function findMatchingReactions(functionalGroups, reagentKey) {
    const matches = [];
    
    for (const [key, reaction] of Object.entries(REACTION_DATABASE)) {
        // Check if reagent matches
        if (reaction.reagents.includes(reagentKey)) {
            // Check if functional groups match
            const hasRequiredGroups = functionalGroups.some(group => {
                if (reaction.recognitionPattern) {
                    return group.type === reaction.recognitionPattern.substrate;
                }
                return false;
            });
            
            if (hasRequiredGroups) {
                matches.push({ key, reaction });
            }
        }
    }
    
    return matches;
}

// Display reaction prediction
function displayReactionPrediction(reactionMatch) {
    const { key, reaction } = reactionMatch;
    
    const message = `
Predicted Reaction: ${reaction.name}

Type: ${reaction.type}
Mechanism: ${reaction.mechanism.length} step(s)

${reaction.mechanism.map((step, i) => `Step ${i + 1}: ${step.title}`).join('\n')}

Major Product: ${reaction.productRules.majorProduct || reaction.productRules.finalProduct || 'See mechanism'}

Would you like to view the detailed mechanism?
    `;
    
    if (confirm(message)) {
        openMechanismViewer();
        setTimeout(() => viewMechanism(key), 300);
    }
}
