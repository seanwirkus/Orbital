// Smart Chain Tool - COMPLETELY REDESIGNED
// Professional chain drawing with real-time preview

class SmartChainTool {
    constructor(molecule, renderer, undoRedoManager) {
        this.molecule = molecule;
        this.renderer = renderer;
        this.undoRedoManager = undoRedoManager;
        this.isChainMode = false;
        this.isDrawing = false;
        
        // Chain state
        this.startAtom = null;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        
        // Preview atoms (not committed yet)
        this.previewAtoms = [];
        this.previewBonds = [];
        
        // Settings
        this.BOND_LENGTH = 50;
        this.BOND_ANGLE = 120; // degrees for zigzag
        this.MIN_DRAG_DISTANCE = 20;
        this.CARBONS_PER_50PX = 1; // How many carbons per 50px of drag
        this.currentElement = 'C'; // Default element
        
        // UI
        this.popup = null;
        this.canvas = renderer.canvas;
    }

    /**
     * Set element for chain drawing (e.g., 'C', 'N', 'O')
     */
    setElement(element) {
        this.currentElement = element || 'C';
    }

    /**
     * Activate chain drawing mode
     */
    startChainMode() {
        this.isChainMode = true;
        this.isDrawing = false;
        this.clearPreview();
        console.log('⛓️ Chain mode activated');
    }

    /**
     * Deactivate chain drawing mode
     */
    stopChainMode() {
        this.isChainMode = false;
        this.isDrawing = false;
        this.clearPreview();
        this.hidePopup();
        console.log('⛓️ Chain mode deactivated');
    }

    /**
     * Handle mouse press - start chain drawing
     */
    onMouseDown(canvasX, canvasY) {
        if (!this.isChainMode) return false;

        this.isDrawing = true;
        this.startX = canvasX;
        this.startY = canvasY;
        this.currentX = canvasX;
        this.currentY = canvasY;

        // Check if starting from existing atom
        this.startAtom = this.molecule.getAtomAtPosition(canvasX, canvasY, 25);

        this.showPopup(canvasX, canvasY, 1);
        return true;
    }

    /**
     * Handle mouse move - update preview
     */
    onMouseMove(canvasX, canvasY) {
        if (!this.isChainMode || !this.isDrawing) return false;

        this.currentX = canvasX;
        this.currentY = canvasY;

        // Calculate number of carbons based on drag distance
        const distance = Math.hypot(canvasX - this.startX, canvasY - this.startY);
        const numCarbons = Math.max(1, Math.floor(distance / 50));

        // Update preview
        this.updatePreview(numCarbons);
        
        // Update popup
        this.updatePopup(canvasX, canvasY, numCarbons);
        
        // Set preview state in renderer (it will draw the preview)
        if (this.renderer && this.previewAtoms.length > 0) {
            const startAtomPos = this.startAtom 
                ? { x: this.startAtom.position.x, y: this.startAtom.position.y }
                : { x: this.startX, y: this.startY };
            
            // Convert preview atoms to renderer format
            const previewAtoms = this.previewAtoms.map(atom => ({
                id: `preview_${atom.x}_${atom.y}`,
                element: atom.element,
                position: { x: atom.x, y: atom.y }
            }));
            
            // Create preview bonds
            const previewBonds = [];
            let lastAtom = this.startAtom || { id: 'start', position: startAtomPos };
            for (const atom of previewAtoms) {
                previewBonds.push({
                    atom1: lastAtom.id,
                    atom2: atom.id,
                    order: 1
                });
                lastAtom = atom;
            }
            
            this.renderer.setPreviewState({
                chainPreview: {
                    atoms: previewAtoms,
                    bonds: previewBonds,
                    startAtom: this.startAtom,
                    startX: this.startX,
                    startY: this.startY
                }
            });
        }
        
        // Trigger redraw (renderer will draw preview)
        this.renderer.render(this.molecule);

        return true;
    }

    /**
     * Handle mouse release - commit chain
     */
    onMouseUp(canvasX, canvasY) {
        if (!this.isChainMode || !this.isDrawing) return false;

        this.isDrawing = false;
        this.hidePopup();

        // Calculate final chain length
        const distance = Math.hypot(canvasX - this.startX, canvasY - this.startY);
        
        if (distance < this.MIN_DRAG_DISTANCE) {
            // Just add one carbon
            this.commitChain(1);
        } else {
            const numCarbons = Math.max(1, Math.floor(distance / 50));
            this.commitChain(numCarbons);
        }

        this.clearPreview();
        this.renderer.render(this.molecule);
        
        return true;
    }

    /**
     * Update preview atoms and bonds
     */
    updatePreview(numCarbons) {
        this.previewAtoms = [];
        this.previewBonds = [];

        if (numCarbons < 1) return;

        // Calculate direction vector
        const dx = this.currentX - this.startX;
        const dy = this.currentY - this.startY;
        const baseAngle = Math.atan2(dy, dx);

        // Starting position
        let x = this.startAtom ? this.startAtom.position.x : this.startX;
        let y = this.startAtom ? this.startAtom.position.y : this.startY;

        // Generate preview atoms in proper zigzag pattern /\/\/\/\
        for (let i = 0; i < numCarbons; i++) {
            // Alternate angles: +30° and -30° from base direction
            const angleOffset = (i % 2 === 0) ? Math.PI / 6 : -Math.PI / 6; // ±30 degrees
            const bondAngle = baseAngle + angleOffset;

            x += this.BOND_LENGTH * Math.cos(bondAngle);
            y += this.BOND_LENGTH * Math.sin(bondAngle);

            this.previewAtoms.push({ 
                x, 
                y, 
                element: this.currentElement,
                position: { x, y }
            });
        }
    }

    /**
     * Draw preview on canvas
     * NOTE: Preview is now handled by renderer via setPreviewState
     * This method is kept for compatibility but does nothing
     */
    drawPreview() {
        // Preview is now drawn by renderer via previewState.chainPreview
        // No need to draw directly here
    }

    /**
     * Commit preview to actual molecule
     */
    commitChain(numCarbons) {
        if (numCarbons < 1) return;

        // Calculate direction
        const dx = this.currentX - this.startX;
        const dy = this.currentY - this.startY;
        const baseAngle = Math.atan2(dy, dx);

        let x = this.startAtom ? this.startAtom.position.x : this.startX;
        let y = this.startAtom ? this.startAtom.position.y : this.startY;

        let lastAtomId = this.startAtom ? this.startAtom.id : null;
        
        // If no start atom, create first atom
        if (!lastAtomId) {
            const firstAtom = this.molecule.addAtom(this.currentElement, x, y);
            lastAtomId = firstAtom.id;
        }

        // Add atoms with proper zigzag pattern /\/\/\/\
        for (let i = 0; i < numCarbons; i++) {
            // Alternate angles: +30° and -30° from base direction
            const angleOffset = (i % 2 === 0) ? Math.PI / 6 : -Math.PI / 6;
            const bondAngle = baseAngle + angleOffset;

            x += this.BOND_LENGTH * Math.cos(bondAngle);
            y += this.BOND_LENGTH * Math.sin(bondAngle);

            const newAtom = this.molecule.addAtom(this.currentElement, x, y);
            this.molecule.addBond(lastAtomId, newAtom.id, 1);
            
            lastAtomId = newAtom.id;
        }

        // Save state AFTER adding chain (consistent with other operations)
        // This allows undo to revert back to state before chain was added
        if (this.undoRedoManager) {
            this.undoRedoManager.saveState(this.molecule);
        }
    }

    /**
     * Clear preview state
     */
    clearPreview() {
        this.previewAtoms = [];
        this.previewBonds = [];
        this.startAtom = null;
    }

    /**
     * Show visual popup with carbon count
     */
    showPopup(x, y, count) {
        if (!this.popup) {
            this.popup = document.createElement('div');
            this.popup.className = 'chain-popup';
            this.popup.style.cssText = `
                position: fixed;
                padding: 8px 12px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: 2px solid white;
                border-radius: 6px;
                font-size: 14px;
                font-weight: bold;
                font-family: 'Monaco', 'Menlo', monospace;
                pointer-events: none;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            document.body.appendChild(this.popup);
        }

        this.popup.textContent = `${this.currentElement}: ${count}`;
        this.popup.style.left = (x + 20) + 'px';
        this.popup.style.top = (y - 40) + 'px';
        this.popup.style.display = 'block';
    }

    /**
     * Update popup position and count
     */
    updatePopup(x, y, count) {
        if (this.popup) {
            this.popup.textContent = `${this.currentElement}: ${count}`;
            this.popup.style.left = (x + 20) + 'px';
            this.popup.style.top = (y - 40) + 'px';
        }
    }

    /**
     * Hide popup
     */
    hidePopup() {
        if (this.popup) {
            this.popup.style.display = 'none';
        }
    }

    /**
     * Destroy popup element
     */
    destroy() {
        this.hidePopup();
        if (this.popup && this.popup.parentNode) {
            this.popup.parentNode.removeChild(this.popup);
            this.popup = null;
        }
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartChainTool;
}

