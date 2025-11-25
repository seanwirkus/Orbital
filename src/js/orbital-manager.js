/**
 * OrbitalManager - Core Coordinator
 * Manages lifecycle, tools, and state coordination.
 */
class OrbitalManager {
    constructor() {
        this.molpad = null;
        this.renderer = null; // OrbitalRenderer instance
        this.ui = null;       // OrbitalUI instance
        this.chemIntelligence = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        // 1. Initialize Chemistry Intelligence
        if (typeof ChemistryIntelligence !== 'undefined') {
            this.chemIntelligence = new ChemistryIntelligence();
            console.log('✅ Chemistry Intelligence loaded');
        }

        // 2. Initialize MolPad
        const container = document.getElementById('molpad-container');
        if (!container) throw new Error('MolPad container missing');
        
        container.innerHTML = '';
        this.molpad = new MolPad(container, window.devicePixelRatio || 1, {
            undo: null, redo: null
        });
        this.molpad.setSkeletalDisplay(true);

        // 3. Initialize Subsystems
        this.renderer = new OrbitalRenderer(this.molpad, this.chemIntelligence);
        
        // Initialize Chain Tool
        if (typeof SmartChainTool !== 'undefined') {
            this.chainTool = new SmartChainTool(this.molpad.mol, this.renderer, {
                saveState: (mol) => {
                    if (this.molpad.mol && typeof this.molpad.mol.updateCopy === 'function') {
                        this.molpad.mol.updateCopy();
                    }
                }
            });
        } else {
            console.warn('⚠️ SmartChainTool not found');
        }

        this.ui = new OrbitalUI(this);

        // 4. Hook Lifecycle
        this.molpad.onChange(() => this.handleMoleculeChange());
        
        this.initialized = true;
        console.log('🚀 Orbital Manager initialized');
    }

    handleMoleculeChange() {
        // Ensure Chain Tool has latest molecule reference
        if (this.chainTool && this.molpad.mol) {
            this.chainTool.molecule = this.molpad.mol;
        }

        // Update Undo Stack
        if (this.molpad.mol && typeof this.molpad.mol.updateCopy === 'function') {
            this.molpad.mol.updateCopy();
        }
        
        // Update UI Stats
        this.ui.updateMoleculeStats(this.molpad.mol);
        
        // Trigger Re-render (Charges, Lone Pairs)
        this.renderer.render();
    }
}

// Export global instance
window.orbital = new OrbitalManager();
document.addEventListener('DOMContentLoaded', () => window.orbital.initialize());
