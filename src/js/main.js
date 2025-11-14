// Unified Main Application Logic

// Global state
let molecule = new Molecule();
let reactantMolecule = new Molecule();
let productMolecule = new Molecule();
let renderer;
let reactantRenderer;
let productRenderer;
let mechanismRenderer = null;

// Smart drawing system
let smartDrawing = null;
let chemIntelligence = null;
let smartChemistryLogic = null; // NEW: Smart chemistry logic for intelligent atom/bond addition
let ghostPreviewActive = false;
let ghostX = 0;
let ghostY = 0;
let ghostElement = 'C';
let selectedAtom = null;
let hoverAtom = null;

// Display options
let showImplicitHydrogens = true;
let showAromaticCircles = true;
let showLonePairs = false;
let showValenceErrors = true;
let showChiralCenters = false;

// Advanced drawing state
let chainDrawingState = null;
let chainPopupEl = null;
let chainPopupCountEl = null;
let autoBondStart = false;

// Learning system
let learningManager = null;

// New managers for keyboard shortcuts, selection, undo/redo, chain tool, clipboard
let keyboardManager = null;
let selectionManager = null;
let undoRedoManager = null;
let chainToolManager = null;
let clipboardManager = null;
let reactionUI = null;

let currentElement = 'C';
let currentBondOrder = 1;
let currentTab = 'draw';
let currentTool = 'atom'; // 'atom', 'bond', 'chain', 'erase', 'template'
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
        // Load periodic table data (enhanced element database)
        const periodicTableLoader = new PeriodicTableLoader();
        periodicTableLoader.loadPeriodicTable().then(loaded => {
            if (loaded) {
                periodicTableLoader.mergeIntoElements();
                console.log('✓ Periodic table data loaded and merged');
            } else {
                console.log('⚠️ Using existing element data');
            }
        }).catch(err => {
            console.warn('Periodic table load failed, using existing data:', err);
        });
        
        // Initialize smart drawing system
        smartDrawing = new SmartDrawingTool();
        console.log('✓ Smart drawing system initialized');
        
        // Initialize chemistry intelligence
        chemIntelligence = new ChemistryIntelligence();
        console.log('✓ Chemistry intelligence initialized');
        
        // Initialize smart chemistry logic
        smartChemistryLogic = new SmartChemistryLogic(chemIntelligence, molecule);
        console.log('✓ Smart chemistry logic initialized');

        // Initialize learning manager
        learningManager = new LearningManager();
        console.log('✓ Learning manager ready');
        
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
        
        // Initialize undo/redo system
        undoRedoManager = new UndoRedoManager(50);
        console.log('✓ Undo/redo system initialized');
        
        // Initialize selection manager
        selectionManager = new SelectionManager(molecule, renderer);
        console.log('✓ Selection manager initialized');
        
        // Initialize chain tool (with undo manager for single-operation undo)
        chainToolManager = new SmartChainTool(molecule, renderer, undoRedoManager);
        console.log('✓ Chain tool initialized');
        
        // Initialize clipboard manager
        clipboardManager = new ClipboardManager();
        console.log('✓ Clipboard manager initialized');
        
        // Initialize reaction manager UI
        if (typeof ReactionUI !== 'undefined') {
            reactionUI = new ReactionUI('reaction-ui-container');
            // Make molecule accessible to ReactionUI
            if (reactionUI && reactionUI.setReaction) {
                // Will be updated when molecule changes
            }
            console.log('✓ Reaction UI initialized');
        } else {
            console.warn('⚠️ ReactionUI not available');
        }
        
        // Initialize keyboard shortcuts (with safety check)
        if (typeof KeyboardShortcutManager !== 'undefined') {
            keyboardManager = new KeyboardShortcutManager(
                molecule, 
                renderer, 
                undoRedoManager, 
                selectionManager, 
                chainToolManager, 
                clipboardManager
            );
            console.log('✓ Keyboard shortcuts initialized');
        } else {
            console.warn('⚠️ KeyboardShortcutManager not available');
        }
        
        // Setup event listeners
        setupDrawingTools();
        setupCanvasEvents();
        setupReagentDropdowns();
        setupMechanismsList();
        setupChainPopup();
        setupLearningNotebook();

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
        // Update reaction UI when switching to simulate tab
        if (molecule && molecule.atoms.length > 0) {
            updateReactionUI();
        }
        // Only render if reactantRenderer exists (legacy support)
        if (reactantRenderer && reactantMolecule) {
            reactantRenderer.render(reactantMolecule);
        }
    } else if (tabName === 'mechanisms' && !mechanismRenderer) {
        mechanismRenderer = new MechanismRenderer('mechanism-canvas-container');
    }
}

// ==================== DRAWING TOOLS ====================
function setupDrawingTools() {
    // Tool selection (atom, bond, chain, erase)
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentTool = e.currentTarget.id.replace('tool-', '');
            console.log('Tool changed to:', currentTool);
            
            // Handle chain tool activation
            if (currentTool === 'chain' && chainToolManager) {
                chainToolManager.startChainMode();
                // Sync element selection with chain tool
                if (currentElement) {
                    chainToolManager.setElement(currentElement);
                }
            } else if (chainToolManager) {
                chainToolManager.stopChainMode();
            }
        });
    });
    
    // Element selection (sidebar) - works with all tools including chain
    document.querySelectorAll('.element-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.element-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentElement = e.target.dataset.element;
            ghostElement = currentElement;
            
            // Update chain tool if active
            if (chainToolManager) {
                chainToolManager.setElement(currentElement);
            }
            
            console.log('Element changed to:', currentElement, '(applies to all tools)');
        });
    });
    
    // Bond type selection (both sidebar and toolbar)
    document.querySelectorAll('.bond-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update all bond buttons (sidebar and toolbar)
            document.querySelectorAll('.bond-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            // Determine bond order from button
            const bondId = e.currentTarget.id;
            const bondData = e.currentTarget.dataset.bond;
            
            if (bondId === 'bond-single' || bondId === 'sidebar-bond-single' || bondData === '1') {
                currentBondOrder = 1;
            } else if (bondId === 'bond-double' || bondId === 'sidebar-bond-double' || bondData === '2') {
                currentBondOrder = 2;
            } else if (bondId === 'bond-triple' || bondId === 'sidebar-bond-triple' || bondData === '3') {
                currentBondOrder = 3;
            }
            
            if (smartDrawing) {
                smartDrawing.currentBondOrder = currentBondOrder;
            }
            console.log('Bond order changed to:', currentBondOrder);
        });
    });
    
    // Template buttons
    document.getElementById('template-benzene')?.addEventListener('click', () => {
        currentTool = 'template';
        currentTemplate = 'benzene';
        console.log('Benzene template selected - click canvas to place');
    });
    
    document.getElementById('template-cyclohexane')?.addEventListener('click', () => {
        currentTool = 'template';
        currentTemplate = 'cyclohexane';
        console.log('Cyclohexane template selected - click canvas to place');
    });
    
    document.getElementById('template-cyclopentane')?.addEventListener('click', () => {
        currentTool = 'template';
        currentTemplate = 'cyclopentane';
        console.log('Cyclopentane template selected - click canvas to place');
    });
    
    // Functional group buttons
    document.getElementById('group-oh')?.addEventListener('click', () => {
        currentTool = 'group';
        currentGroup = 'OH';
        console.log('OH group selected - click on atom to attach');
    });
    
    document.getElementById('group-nh2')?.addEventListener('click', () => {
        currentTool = 'group';
        currentGroup = 'NH2';
        console.log('NH2 group selected - click on atom to attach');
    });
    
    document.getElementById('group-cooh')?.addEventListener('click', () => {
        currentTool = 'group';
        currentGroup = 'COOH';
        console.log('COOH group selected - click on atom to attach');
    });
    
    document.getElementById('group-cho')?.addEventListener('click', () => {
        currentTool = 'group';
        currentGroup = 'CHO';
        console.log('CHO group selected - click on atom to attach');
    });
    
    // Option toggles
    document.getElementById('option-snap')?.addEventListener('click', (e) => {
        smartDrawing.snapAngles = !smartDrawing.snapAngles;
        e.currentTarget.classList.toggle('active');
        console.log('Angle snapping:', smartDrawing.snapAngles);
    });
    
    document.getElementById('option-preview')?.addEventListener('click', (e) => {
        smartDrawing.showGhostPreview = !smartDrawing.showGhostPreview;
        e.currentTarget.classList.toggle('active');
        console.log('Ghost preview:', smartDrawing.showGhostPreview);
    });
    
    // Display option toggles
    document.getElementById('show-implicit-h')?.addEventListener('change', (e) => {
        if (renderer) {
            renderer.showImplicitHydrogens = e.target.checked;
            renderer.render(molecule);
            console.log('Implicit H display:', renderer.showImplicitHydrogens);
        }
    });
    
    document.getElementById('show-lone-pairs')?.addEventListener('change', (e) => {
        if (renderer) {
            renderer.showLonePairs = e.target.checked;
            renderer.render(molecule);
            console.log('Lone pairs display:', renderer.showLonePairs);
        }
    });
    
    document.getElementById('show-charges')?.addEventListener('change', (e) => {
        if (renderer) {
            renderer.showCharges = e.target.checked;
            renderer.render(molecule);
            console.log('Charges display:', renderer.showCharges);
        }
    });
    
    document.getElementById('show-hybridization')?.addEventListener('change', (e) => {
        if (renderer) {
            renderer.showHybridization = e.target.checked;
            renderer.render(molecule);
            console.log('Hybridization display:', renderer.showHybridization);
        }
    });
    
    // Legacy ring templates (old buttons)
    document.getElementById('add-benzene')?.addEventListener('click', () => {
        const centerX = 400;
        const centerY = 300;
        smartDrawing.insertTemplate(smartDrawing.templates.benzene, centerX, centerY, molecule);
        updateMoleculeProperties();
        renderer.render(molecule);
    });
    
    document.getElementById('add-cyclohexane')?.addEventListener('click', () => {
        const centerX = 400;
        const centerY = 300;
        smartDrawing.insertTemplate(smartDrawing.templates.cyclohexane, centerX, centerY, molecule);
        updateMoleculeProperties();
        renderer.render(molecule);
    });
    
    document.getElementById('add-cyclopentane')?.addEventListener('click', () => {
        const centerX = 400;
        const centerY = 300;
        smartDrawing.insertTemplate(smartDrawing.templates.cyclopentane, centerX, centerY, molecule);
        updateMoleculeProperties();
        renderer.render(molecule);
    });
    
    // Clear button
    document.getElementById('clear-canvas')?.addEventListener('click', () => {
        molecule.clear();
        updateMoleculeProperties();
        renderer.render(molecule);
    });
    
    // Auto-organize
    document.getElementById('auto-organize')?.addEventListener('click', () => autoOrganize());
    
    // Display toggles
    document.getElementById('toggle-implicit-h')?.addEventListener('change', (e) => {
        showImplicitHydrogens = e.target.checked;
        renderer.render(molecule);
    });
    
    document.getElementById('toggle-aromatic')?.addEventListener('change', (e) => {
        showAromaticCircles = e.target.checked;
        renderer.render(molecule);
    });
    
    document.getElementById('toggle-valence-errors')?.addEventListener('change', (e) => {
        showValenceErrors = e.target.checked;
        renderer.render(molecule);
    });
    
    document.getElementById('toggle-chiral')?.addEventListener('change', (e) => {
        showChiralCenters = e.target.checked;
        renderer.render(molecule);
    });
    
    document.getElementById('toggle-smart-layout')?.addEventListener('change', (e) => {
        if (renderer && renderer.layoutEngine) {
            renderer.layoutEngine.setEnabled(e.target.checked);
            if (e.target.checked) {
                console.log('✨ Smart layout enabled');
            } else {
                console.log('⚪ Smart layout disabled');
            }
            renderer.render(molecule);
        }
    });
    
    document.getElementById('add-explicit-h')?.addEventListener('click', () => {
        chemIntelligence.addExplicitHydrogens(molecule);
        updateMoleculeProperties();
        renderer.render(molecule);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (currentTab !== 'draw') return;
        
        switch(e.key.toLowerCase()) {
            case 'a': // Atom tool
                document.getElementById('tool-atom')?.click();
                break;
            case 'b': // Bond tool
                document.getElementById('tool-bond')?.click();
                break;
            case 'c': // Chain tool
                document.getElementById('tool-chain')?.click();
                break;
            case 'e': // Erase tool
                document.getElementById('tool-erase')?.click();
                break;
            case 'delete':
            case 'backspace':
                if (selectedAtom) {
                    molecule.removeAtom(selectedAtom.id);
                    selectedAtom = null;
                    updateMoleculeProperties();
                    renderer.render(molecule);
                }
                break;
        }
    });
}

function setupCanvasEvents() {
    // Main canvas
    const mainCanvas = document.getElementById('molecule-canvas');
    if (mainCanvas) {
        mainCanvas.addEventListener('click', (e) => handleCanvasClick(e, molecule, renderer));
        mainCanvas.addEventListener('mousedown', (e) => handleMouseDown(e, molecule, renderer));
        mainCanvas.addEventListener('mousemove', (e) => handleMouseMove(e, molecule, renderer));
        mainCanvas.addEventListener('mouseup', (e) => handleMouseUp(e, molecule, renderer));
    }

    // Reactant canvas
    const reactantCanvas = document.getElementById('reactant-canvas');
    if (reactantCanvas) {
        reactantCanvas.addEventListener('click', (e) => handleCanvasClick(e, reactantMolecule, reactantRenderer));
        reactantCanvas.addEventListener('mousedown', (e) => handleMouseDown(e, reactantMolecule, reactantRenderer));
        reactantCanvas.addEventListener('mousemove', (e) => handleMouseMove(e, reactantMolecule, reactantRenderer));
        reactantCanvas.addEventListener('mouseup', (e) => handleMouseUp(e, reactantMolecule, reactantRenderer));
    }

    // Product canvas
    const productCanvas = document.getElementById('product-canvas');
    if (productCanvas) {
        productCanvas.addEventListener('click', (e) => handleCanvasClick(e, productMolecule, productRenderer));
        productCanvas.addEventListener('mousedown', (e) => handleMouseDown(e, productMolecule, productRenderer));
        productCanvas.addEventListener('mousemove', (e) => handleMouseMove(e, productMolecule, productRenderer));
        productCanvas.addEventListener('mouseup', (e) => handleMouseUp(e, productMolecule, productRenderer));
    }
}

function setupChainPopup() {
    if (chainPopupEl) return;
    const canvasSection = document.querySelector('.canvas-section');
    if (!canvasSection) return;

    chainPopupEl = document.createElement('div');
    chainPopupEl.id = 'chain-popup';
    chainPopupEl.className = 'chain-popup';
    chainPopupEl.innerHTML = `
        <strong>Chain length:</strong>
        <span class="chain-count">1</span>
        carbons
    `;

    chainPopupCountEl = chainPopupEl.querySelector('.chain-count');
    canvasSection.appendChild(chainPopupEl);
    hideChainPopup();
}

function showChainPopup(count = 1) {
    if (!chainPopupEl) return;
    updateChainPopup(count);
    chainPopupEl.classList.add('visible');
}

function hideChainPopup() {
    if (!chainPopupEl) return;
    chainPopupEl.classList.remove('visible');
}

function updateChainPopup(count) {
    if (!chainPopupCountEl) return;
    chainPopupCountEl.textContent = count;
}

function setupLearningNotebook() {
    if (!learningManager) return;

    const form = document.getElementById('learning-form');
    const problemInput = document.getElementById('learning-problem');
    const solutionInput = document.getElementById('learning-solution');

    if (!form || !problemInput || !solutionInput) return;

    renderLearningEntries();
    updateLearningSuggestions(currentReagent);

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const problem = problemInput.value.trim();
        const reagent = document.getElementById('learning-reagent')?.value.trim() || '';
        const insight = document.getElementById('learning-insight')?.value.trim() || '';
        const solution = solutionInput.value.trim();

        if (!problem || !solution) {
            return;
        }

        learningManager.addEntry({ problem, reagent, solution, insight });
        form.reset();
        renderLearningEntries();
        updateLearningSuggestions(currentReagent);
    });
}

function renderLearningEntries() {
    const container = document.getElementById('learning-entries');
    if (!container || !learningManager) return;

    const entries = learningManager.getEntries();

    if (!entries.length) {
        container.innerHTML = '<p class="empty-state">No saved problems yet. Log your first reaction to start training Orbital.</p>';
        return;
    }

    const recentEntries = entries.slice(0, 5);
    container.innerHTML = recentEntries.map(entry => `
        <div class="learning-entry">
            <div class="learning-entry-header">
                <span class="learning-entry-time">${formatTimestamp(entry.createdAt)}</span>
                ${entry.reagentLabel ? `<span class="learning-entry-tag">${entry.reagentLabel}</span>` : ''}
            </div>
            <p class="learning-entry-problem">${entry.problem}</p>
            <p class="learning-entry-solution"><strong>Outcome:</strong> ${entry.solution}</p>
            ${entry.insight ? `<p class="learning-entry-insight"><strong>Insight:</strong> ${entry.insight}</p>` : ''}
        </div>
    `).join('');
}

function updateLearningSuggestions(reagentKey) {
    const container = document.getElementById('learning-suggestions');
    if (!container || !learningManager) return;

    if (!reagentKey) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    const suggestions = learningManager.findSuggestions({ reagent: reagentKey });

    if (!suggestions.length) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    container.style.display = 'flex';
    container.innerHTML = `
        <h4>Guided insights for ${reagentKey}</h4>
        ${suggestions.map(entry => `
            <div class="learning-suggestion">
                <p class="suggestion-problem">${entry.problem}</p>
                <p class="suggestion-outcome"><strong>Expected:</strong> ${entry.solution}</p>
                ${entry.insight ? `<p class="suggestion-insight">${entry.insight}</p>` : ''}
            </div>
        `).join('')}
    `;
}

function formatTimestamp(isoDate) {
    if (!isoDate) return '';
    try {
        const date = new Date(isoDate);
        return date.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return '';
    }
}

// Canvas interaction handlers
let drawingBond = false;
let bondStartAtom = null;

function handleCanvasClick(e, mol, rend) {
    console.log('🖱️ Canvas clicked!', { tool: currentTool, element: currentElement });
    
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const clickedAtom = mol.getAtomAtPosition(x, y, 20);
    const clickedBond = mol.getBondAtPosition(x, y, 10);
    
    // SMART: Handle clicking on bond with atom tool - insert atom into bond intelligently
    if (clickedBond && currentTool === 'atom' && smartChemistryLogic) {
        const elementToPlace = currentElement || 'C';
        const newAtom = smartChemistryLogic.smartAddAtom(
            elementToPlace, 
            clickedBond, 
            mol, 
            x, 
            y, 
            currentBondOrder
        );
        
        if (newAtom) {
            updateMoleculeProperties();
            rend.render(mol);
            if (undoRedoManager) {
                undoRedoManager.saveState(mol);
            }
            console.log(`✨ Smart atom insertion: ${elementToPlace} added to bond`);
            return;
        }
    }
    
    // Handle bond clicking to cycle bond order (works in bond tool or when not inserting)
    if (clickedBond && currentTool !== 'erase' && currentTool !== 'atom') {
        // Cycle bond order: 1 → 2 → 3 → 1
        const newOrder = clickedBond.order >= 3 ? 1 : clickedBond.order + 1;
        mol.changeBondOrder(clickedBond.id, newOrder);
        
        // Update affected atoms
        const atom1 = mol.getAtomById(clickedBond.atom1);
        const atom2 = mol.getAtomById(clickedBond.atom2);
        if (atom1) mol.updateAtomProperties(atom1);
        if (atom2) mol.updateAtomProperties(atom2);
        
        updateMoleculeProperties();
        rend.render(mol);
        
        // Save undo state
        if (undoRedoManager) {
            undoRedoManager.saveState(mol);
        }
        
        console.log(`Bond order changed to ${newOrder}`);
        return;
    }
    
    // Handle selection with Ctrl+click
    if (e.ctrlKey || e.metaKey) {
        if (selectionManager) {
            selectionManager.selectAtomAtPosition(x, y, true);
        }
        return;
    }
    
    // Clear selection on normal click
    if (selectionManager) {
        selectionManager.clearSelection();
    }
    
    // Handle different tools
    switch(currentTool) {
        case 'atom':
            handleAtomTool(x, y, clickedAtom, mol, rend);
            break;
            
        case 'bond':
            if (clickedAtom) {
                if (!bondStartAtom) {
                    bondStartAtom = clickedAtom;
                    console.log('Bond start:', bondStartAtom.id);
                } else if (bondStartAtom !== clickedAtom) {
                    // SMART: Use selected element if not carbon (e.g., O, N, etc.)
                    // If bond tool is active and we have a selected element, use it
                    const elementToUse = currentElement && currentElement !== 'C' ? currentElement : null;
                    
                    if (elementToUse && smartChemistryLogic) {
                        // Insert element between atoms intelligently
                        const newAtom = smartChemistryLogic.addAtomToAtom(
                            elementToUse,
                            bondStartAtom,
                            mol,
                            x,
                            y,
                            currentBondOrder
                        );
                        if (newAtom) {
                            // Also connect to clicked atom
                            mol.addBond(newAtom.id, clickedAtom.id, currentBondOrder);
                            mol.updateAtomProperties(newAtom);
                            mol.updateAtomProperties(clickedAtom);
                        }
                    } else {
                        // Standard bond creation
                        mol.addBond(bondStartAtom.id, clickedAtom.id, currentBondOrder);
                    }
                    
                    bondStartAtom = null;
                    updateMoleculeProperties();
                    rend.render(mol);
                    console.log('Bond created');
                    // Save undo state
                    if (undoRedoManager) {
                        undoRedoManager.saveState(mol);
                    }
                }
            }
            break;
            
        case 'chain':
            // Chain tool handles its own clicks through mouse events
            break;
            
        case 'erase':
            if (clickedAtom) {
                mol.removeAtom(clickedAtom.id);
                updateMoleculeProperties();
                rend.render(mol);
                console.log('Atom removed');
                // Save undo state
                if (undoRedoManager) {
                    undoRedoManager.saveState(mol);
                }
            }
            break;
            
        case 'template':
            if (typeof currentTemplate !== 'undefined') {
                const template = smartDrawing.templates[currentTemplate];
                if (template) {
                    smartDrawing.insertTemplate(template, x, y, mol);
                    updateMoleculeProperties();
                    rend.render(mol);
                    console.log('Template inserted:', currentTemplate);
                    // Save undo state
                    if (undoRedoManager) {
                        undoRedoManager.saveState(mol);
                    }
                }
                currentTool = 'atom'; // Reset to atom tool
                document.getElementById('tool-atom')?.click();
            }
            break;
            
        case 'group':
            if (clickedAtom && typeof currentGroup !== 'undefined') {
                attachFunctionalGroup(clickedAtom, currentGroup, mol);
                updateMoleculeProperties();
                rend.render(mol);
                console.log('Group attached:', currentGroup);
                // Save undo state
                if (undoRedoManager) {
                    undoRedoManager.saveState(mol);
                }
                currentTool = 'atom'; // Reset to atom tool
                document.getElementById('tool-atom')?.click();
            }
            break;
    }
}

function handleAtomTool(x, y, clickedAtom, mol, rend) {
    // Use selected element (currentElement) - defaults to 'C' if not set
    const elementToPlace = currentElement || 'C';
    
    // SMART: Use smart chemistry logic for intelligent atom placement
    if (smartChemistryLogic) {
        let newAtom;
        
        if (clickedAtom) {
            // Clicked on existing atom (including chain atoms) - use smart chemistry logic
            // This works great for adding O, N, etc. to carbon chains!
            newAtom = smartChemistryLogic.addAtomToAtom(
                elementToPlace,
                clickedAtom,
                mol,
                x,
                y,
                currentBondOrder
            );
            
            if (newAtom) {
                console.log(`✨ Smart ${elementToPlace} atom placed and connected to ${clickedAtom.element}`);
                
                // Auto-calculate formal charges for both atoms
                if (chemIntelligence) {
                    clickedAtom.charge = chemIntelligence.calculateFormalCharge(clickedAtom, mol);
                    newAtom.charge = chemIntelligence.calculateFormalCharge(newAtom, mol);
                }
            } else {
                console.warn(`⚠️ Could not add ${elementToPlace} to ${clickedAtom.element} - valence exceeded?`);
            }
        } else {
            // Empty space - place atom with selected element
            newAtom = mol.addAtom(elementToPlace, x, y);
            console.log(`${elementToPlace} atom placed:`, newAtom.id);
        }
        
        // Validate molecule and show errors
        if (showValenceErrors && newAtom) {
            const errors = chemIntelligence.validateMolecule(mol);
            if (errors.length > 0) {
                console.warn('Valence errors detected:', errors);
            }
        }
    } else {
        // Fallback to old method if smart logic not available
        if (clickedAtom) {
            const predicted = smartDrawing.predictNextPosition(clickedAtom, mol, x, y);
            const newAtom = mol.addAtom(elementToPlace, predicted.x, predicted.y);
            mol.addBond(clickedAtom.id, newAtom.id, currentBondOrder);
            console.log(`Smart ${elementToPlace} atom placed and connected`);
            
            // Auto-calculate formal charges
            clickedAtom.charge = chemIntelligence.calculateFormalCharge(clickedAtom, mol);
            newAtom.charge = chemIntelligence.calculateFormalCharge(newAtom, mol);
        } else {
            const newAtom = mol.addAtom(elementToPlace, x, y);
            console.log(`${elementToPlace} atom placed:`, newAtom.id);
        }
    }
    
    updateMoleculeProperties();
    rend.render(mol);
    
    // Save undo state
    if (undoRedoManager) {
        undoRedoManager.saveState(mol);
    }
}

function attachFunctionalGroup(atom, groupType, mol) {
    switch(groupType) {
        case 'OH':
            const oh = mol.addAtom('O', atom.x + 40, atom.y - 30);
            mol.addBond(atom.id, oh.id, 1);
            break;
            
        case 'NH2':
            const nh = mol.addAtom('N', atom.x + 40, atom.y - 30);
            mol.addBond(atom.id, nh.id, 1);
            break;
            
        case 'COOH':
            const c = mol.addAtom('C', atom.x + 40, atom.y);
            mol.addBond(atom.id, c.id, 1);
            const o1 = mol.addAtom('O', atom.x + 60, atom.y - 30);
            mol.addBond(c.id, o1.id, 2);
            const o2 = mol.addAtom('O', atom.x + 60, atom.y + 30);
            mol.addBond(c.id, o2.id, 1);
            break;
            
        case 'CHO':
            const cald = mol.addAtom('C', atom.x + 40, atom.y);
            mol.addBond(atom.id, cald.id, 1);
            const oald = mol.addAtom('O', atom.x + 60, atom.y - 30);
            mol.addBond(cald.id, oald.id, 2);
            break;
    }
}

function handleMouseDown(e, mol, rend) {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedAtom = mol.getAtomAtPosition(x, y, 20);

    // Handle new SmartChainTool
    if (currentTool === 'chain' && chainToolManager) {
        chainToolManager.onMouseDown(x, y);
        return;
    }

    // Fall back to old chain drawing for backward compatibility
    if (currentTool === 'chain') {
        chainDrawingState = smartDrawing.startChainDrawing(x, y, mol);
        showChainPopup(chainDrawingState.totalCarbons);
        updateMoleculeProperties();
        rend?.render(mol);
        return;
    }

    if (currentTool === 'bond') {
        if (clickedAtom) {
            drawingBond = true;
            bondStartAtom = clickedAtom;
            autoBondStart = false;
        } else {
            const startAtom = mol.addAtom('C', x, y);
            drawingBond = true;
            bondStartAtom = startAtom;
            autoBondStart = true;
            updateMoleculeProperties();
            rend?.render(mol);
        }
        return;
    }

    if (clickedAtom) {
        drawingBond = true;
        bondStartAtom = clickedAtom;
        autoBondStart = false;
    }
}

function handleMouseMove(e, mol, rend) {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle new SmartChainTool
    if (currentTool === 'chain' && chainToolManager) {
        chainToolManager.onMouseMove(x, y);
        // Preview is handled by chainToolManager via renderer preview state
        updateMoleculeProperties();
        return;
    }

    // Fall back to old chain drawing
    if (chainDrawingState) {
        const result = smartDrawing.continueChainDrawing(chainDrawingState, x, y, mol);
        chainDrawingState = result.state;
        showChainPopup(chainDrawingState.totalCarbons);
        updateChainPopup(chainDrawingState.totalCarbons);

        if (result.addedAtom) {
            updateMoleculeProperties();
            rend?.render(mol);
        }

        return;
    }

    // Update ghost preview position
    if (currentTool === 'atom' && smartDrawing.showGhostPreview && rend) {
        ghostX = x;
        ghostY = y;

        // Check if hovering over an atom
        hoverAtom = mol.getAtomAtPosition(x, y, 20);
        
        let angleGuides = null;
        if (hoverAtom) {
            // Predict smart position
            const predicted = smartDrawing.predictNextPosition(hoverAtom, mol, x, y);
            ghostX = predicted.x;
            ghostY = predicted.y;
            ghostPreviewActive = true;
            
            // Calculate angle guides
            const bonds = mol.getAtomBonds(hoverAtom.id);
            const existingAngles = bonds.map(bond => {
                const otherAtom = mol.getAtomById(
                    bond.atom1 === hoverAtom.id ? bond.atom2 : bond.atom1
                );
                return Math.atan2(otherAtom.y - hoverAtom.y, otherAtom.x - hoverAtom.x);
            });
            
            const bondCount = bonds.length;
            const hybridization = bondCount === 0 ? 'sp3' : bondCount === 1 ? 'sp3' : 'sp2';
            angleGuides = {
                fromAtom: hoverAtom,
                existingAngles,
                hybridization,
                bondLength: 60
            };
        } else {
            ghostPreviewActive = false;
        }
        
        // Set preview state and render (all drawing happens in renderer)
        rend.setPreviewState({
            ghostAtom: ghostPreviewActive ? { x: ghostX, y: ghostY, element: ghostElement } : null,
            angleGuides: angleGuides
        });
        rend.render(mol);
    } else if (rend) {
        // Clear preview when not in atom tool
        rend.clearPreviewState();
    }
    
    // Handle bond drawing
    if (drawingBond && bondStartAtom && rend) {
        // Set temp bond preview state and render (all drawing happens in renderer)
        rend.setPreviewState({
            tempBond: {
                x1: bondStartAtom.x,
                y1: bondStartAtom.y,
                x2: x,
                y2: y
            }
        });
        rend.render(mol);
    }
}

function handleMouseUp(e, mol, rend) {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle new SmartChainTool
    if (currentTool === 'chain' && chainToolManager) {
        chainToolManager.onMouseUp(x, y);
        // Clear preview state
        if (rend) {
            rend.clearPreviewState();
        }
        updateMoleculeProperties();
        rend?.render(mol);
        // Save undo state
        if (undoRedoManager) {
            undoRedoManager.saveState(mol);
        }
        return;
    }

    // Fall back to old chain drawing
    if (chainDrawingState) {
        hideChainPopup();
        chainDrawingState = null;
        updateMoleculeProperties();
        rend?.render(mol);
        // Save undo state
        if (undoRedoManager) {
            undoRedoManager.saveState(mol);
        }
        return;
    }

    if (!drawingBond || !bondStartAtom) {
        drawingBond = false;
        autoBondStart = false;
        return;
    }

    let endAtom = mol.getAtomAtPosition(x, y, 20);
    if (!endAtom && currentTool === 'bond') {
        // SMART: Use selected element if not carbon (respects element selection)
        const elementToUse = currentElement || 'C';
        
        if (smartChemistryLogic) {
            const predicted = smartDrawing.predictNextPosition(bondStartAtom, mol, x, y);
            endAtom = smartChemistryLogic.addAtomToAtom(
                elementToUse,
                bondStartAtom,
                mol,
                predicted.x,
                predicted.y,
                currentBondOrder
            );
        } else {
            // Fallback
            const predicted = smartDrawing.predictNextPosition(bondStartAtom, mol, x, y);
            endAtom = mol.addAtom(elementToUse, predicted.x, predicted.y);
        }
    }

    if (endAtom && endAtom !== bondStartAtom) {
        // Only add bond if it wasn't already added by smart logic
        const existingBond = mol.bonds.find(b => 
            (b.atom1 === bondStartAtom.id && b.atom2 === endAtom.id) ||
            (b.atom1 === endAtom.id && b.atom2 === bondStartAtom.id)
        );
        
        if (!existingBond) {
            mol.addBond(bondStartAtom.id, endAtom.id, currentBondOrder);
        }
        
        mol.updateAtomProperties(bondStartAtom);
        mol.updateAtomProperties(endAtom);
    } else if (autoBondStart) {
        mol.removeAtom(bondStartAtom.id);
    }

    drawingBond = false;
    bondStartAtom = null;
    autoBondStart = false;
    updateMoleculeProperties();
    rend?.render(mol);
    
    // Save undo state
    if (undoRedoManager) {
        undoRedoManager.saveState(mol);
    }
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
    
    // Update reaction UI if available
    updateReactionUI();
}

/**
 * Update reaction UI with current molecule
 */
function updateReactionUI() {
    if (reactionUI && currentTab === 'simulate') {
        // Only update if we're in the simulate tab
        try {
            if (molecule && molecule.atoms && molecule.atoms.length > 0) {
                // ReactionUI expects a reaction object with reactant property
                if (typeof reactionUI.setReaction === 'function') {
                    reactionUI.setReaction(molecule);
                } else if (typeof reactionUI.setMolecule === 'function') {
                    reactionUI.setMolecule(molecule);
                } else if (reactionUI.currentReaction) {
                    // Update existing reaction
                    reactionUI.currentReaction.reactant = molecule;
                    reactionUI.updateReactionDisplay();
                }
            }
        } catch (e) {
            console.warn('Could not update reaction UI:', e);
        }
    }
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

    // Update ReactionUI with current molecule
    if (reactionUI && typeof reactionUI.setReaction === 'function') {
        reactionUI.setReaction(molecule);
        console.log('✓ Molecule sent to ReactionUI');
    }

    // Switch to simulate tab
    switchTab('simulate');
    
    // Ensure ReactionUI is updated
    setTimeout(() => {
        updateReactionUI();
    }, 100);
}

function setupReagentDropdowns() {
    // Old reagent dropdown - now handled by ReactionUI
    // Keep for backward compatibility but ReactionUI handles it
    const reagentSelect = document.getElementById('reagent-select');
    if (!reagentSelect || !REAGENTS) {
        // ReactionUI handles reagent selection now
        return;
    }
    
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
        useInReactionBtn.addEventListener('click', moveToSimulation);
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
        updateLearningSuggestions(null);
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
    updateLearningSuggestions(reagentKey);
    
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
    
    const storedMolecule = reactantMolecule.clone();
    savedReactants.push({
        molecule: storedMolecule,
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
        productMolecule = predictedProduct;
        if (productRenderer) {
            productMolecule.fitToCanvas(productRenderer.canvas.width, productRenderer.canvas.height);
            productRenderer.render(productMolecule);
        }
        alert('Product predicted! Check the right panel.');
    } else {
        // Fallback: let user draw manually
        alert(`Automatic prediction not available for ${currentReagent}. Please draw the product manually on the right canvas.`);
    }
}

function applyReactionRules(reactant, reaction) {
    if (!reactant || !reaction) {
        return null;
    }

    const product = reactant instanceof Molecule
        ? reactant.clone()
        : (() => {
            const mol = new Molecule();
            mol.fromJSON(reactant);
            return mol;
        })();

    switch (reaction.type) {
        case 'oxidation':
            product.bonds.forEach(bond => {
                const atom1 = product.getAtomById(bond.atom1);
                const atom2 = product.getAtomById(bond.atom2);
                if (!atom1 || !atom2) return;

                const isCO = (atom1.element === 'C' && atom2.element === 'O') ||
                             (atom1.element === 'O' && atom2.element === 'C');

                if (isCO && bond.order === 1) {
                    bond.order = 2;
                }
            });
            break;

        case 'reduction':
            product.bonds.forEach(bond => {
                const atom1 = product.getAtomById(bond.atom1);
                const atom2 = product.getAtomById(bond.atom2);
                if (!atom1 || !atom2) return;

                const isCO = (atom1.element === 'C' && atom2.element === 'O') ||
                             (atom1.element === 'O' && atom2.element === 'C');

                if (isCO && bond.order === 2) {
                    bond.order = 1;
                }
            });
            break;
        default:
            break;
    }

    product.atoms.forEach(atom => product.updateAtomProperties(atom));
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
    updateLearningSuggestions(null);
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
