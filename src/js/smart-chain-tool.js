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
        
        // Element to use (can be changed by user selection)
        this.selectedElement = 'C'; // Default to carbon
        
        // UI
        this.popup = null;
        this.canvas = renderer.canvas;
    }
    
    /**
     * Set the element to use for chain drawing
     */
    setElement(element) {
        this.selectedElement = element || 'C';
        console.log(`⛓️ Chain tool element set to: ${this.selectedElement}`);
    }

    /**
     * Activate chain drawing mode
     */
    startChainMode() {
        this.isChainMode = true;
        this.isDrawing = false;
        this.clearPreview();
        // Sync with current element selection
        if (typeof currentElement !== 'undefined') {
            this.setElement(currentElement);
        }
        console.log('⛓️ Chain mode activated with element:', this.selectedElement);
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
        
        if (this.startAtom) {
            console.log(`⛓️ Starting chain from atom ${this.startAtom.id}`);
        } else {
            console.log('⛓️ Starting new chain');
        }

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
        
        // Set preview state in renderer instead of drawing directly
        if (this.renderer) {
            this.renderer.setPreviewState({
                chainPreview: {
                    atoms: this.previewAtoms,
                    bonds: this.previewBonds,
                    startAtom: this.startAtom,
                    startX: this.startX,
                    startY: this.startY
                }
            });
            this.renderer.render(this.molecule);
        }

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
     * IMPROVED: Better positioning and supports adding to existing chains
     */
    updatePreview(numCarbons) {
        this.previewAtoms = [];
        this.previewBonds = [];

        if (numCarbons < 1) return;

        // Calculate direction vector
        const dx = this.currentX - this.startX;
        const dy = this.currentY - this.startY;
        let baseAngle = Math.atan2(dy, dx);

        // Starting position - use existing atom if available
        let prevX = this.startAtom ? (this.startAtom.position?.x || this.startAtom.x) : this.startX;
        let prevY = this.startAtom ? (this.startAtom.position?.y || this.startAtom.y) : this.startY;

        // If starting from existing atom, check existing bonds to avoid overlap
        if (this.startAtom) {
            const existingBonds = this.molecule.getAtomBonds(this.startAtom.id);
            if (existingBonds.length > 0) {
                // Find angle that avoids existing bonds
                const bondAngles = existingBonds.map(bond => {
                    const otherId = bond.atom1 === this.startAtom.id ? bond.atom2 : bond.atom1;
                    const otherAtom = this.molecule.getAtomById(otherId);
                    if (!otherAtom) return null;
                    return Math.atan2(
                        (otherAtom.position?.y || otherAtom.y) - prevY,
                        (otherAtom.position?.x || otherAtom.x) - prevX
                    );
                }).filter(a => a !== null);
                
                // Use angle perpendicular to existing bonds
                if (bondAngles.length > 0) {
                    const avgAngle = bondAngles.reduce((sum, a) => sum + a, 0) / bondAngles.length;
                    baseAngle = avgAngle + Math.PI / 2; // Perpendicular
                }
            }
        }

        // Generate preview atoms in proper zigzag pattern /\/\/\/\
        for (let i = 0; i < numCarbons; i++) {
            // Alternate angles: +30° and -30° from base direction for zigzag
            const zigzagOffset = (i % 2 === 0) ? Math.PI / 6 : -Math.PI / 6; // ±30 degrees
            const bondAngle = baseAngle + zigzagOffset;

            const x = prevX + this.BOND_LENGTH * Math.cos(bondAngle);
            const y = prevY + this.BOND_LENGTH * Math.sin(bondAngle);

            const atomId = `preview_${i}`;
            this.previewAtoms.push({ 
                id: atomId,
                element: this.selectedElement, // Use selected element (C, O, N, etc.)
                position: { x, y }
            });
            
            // Create bond from previous atom
            if (i > 0 || this.startAtom) {
                const prevAtomId = i > 0 ? `preview_${i-1}` : this.startAtom?.id;
                this.previewBonds.push({
                    atom1: prevAtomId,
                    atom2: atomId,
                    order: 1
                });
            }

            prevX = x;
            prevY = y;
        }
    }

    /**
     * Draw preview on canvas
     */
    drawPreview() {
        if (this.previewAtoms.length === 0) return;

        const ctx = this.renderer.ctx;
        ctx.save();

        // Draw preview bonds
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        let startX = this.startAtom ? this.startAtom.x : this.startX;
        let startY = this.startAtom ? this.startAtom.y : this.startY;

        for (let i = 0; i < this.previewAtoms.length; i++) {
            const atom = this.previewAtoms[i];
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(atom.x, atom.y);
            ctx.stroke();

            startX = atom.x;
            startY = atom.y;
        }

        // Draw preview atoms
        ctx.fillStyle = '#667eea';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        this.previewAtoms.forEach((atom, idx) => {
            // Draw circle
            ctx.beginPath();
            ctx.arc(atom.x, atom.y, 15, 0, Math.PI * 2);
            ctx.strokeStyle = '#667eea';
            ctx.stroke();
            ctx.fillStyle = 'rgba(102, 126, 234, 0.1)';
            ctx.fill();

            // Draw C label
            ctx.fillStyle = '#667eea';
            ctx.fillText('C', atom.x, atom.y);
        });

        ctx.restore();
    }

    /**
     * Commit preview to actual molecule
     * IMPROVED: Better integration with existing chains and atoms
     */
    commitChain(numCarbons) {
        if (numCarbons < 1) return;

        // Save state BEFORE adding chain (for undo as one operation)
        if (this.undoRedoManager) {
            this.undoRedoManager.saveState(this.molecule);
        }

        // Calculate direction
        const dx = this.currentX - this.startX;
        const dy = this.currentY - this.startY;
        let baseAngle = Math.atan2(dy, dx);

        // Starting position - use existing atom if available
        let x = this.startAtom ? (this.startAtom.position?.x || this.startAtom.x) : this.startX;
        let y = this.startAtom ? (this.startAtom.position?.y || this.startAtom.y) : this.startY;

        let lastAtomId = this.startAtom ? this.startAtom.id : null;
        
        // If starting from existing atom, optimize angle to avoid existing bonds
        if (this.startAtom) {
            const existingBonds = this.molecule.getAtomBonds(this.startAtom.id);
            if (existingBonds.length > 0) {
                // Find optimal angle that avoids existing bonds
                const bondAngles = existingBonds.map(bond => {
                    const otherId = bond.atom1 === this.startAtom.id ? bond.atom2 : bond.atom1;
                    const otherAtom = this.molecule.getAtomById(otherId);
                    if (!otherAtom) return null;
                    return Math.atan2(
                        (otherAtom.position?.y || otherAtom.y) - y,
                        (otherAtom.position?.x || otherAtom.x) - x
                    );
                }).filter(a => a !== null);
                
                // Use angle perpendicular to existing bonds for better placement
                if (bondAngles.length > 0) {
                    const avgAngle = bondAngles.reduce((sum, a) => sum + a, 0) / bondAngles.length;
                    baseAngle = avgAngle + Math.PI / 2; // Perpendicular
                }
            }
        }
        
        // If no start atom, create first atom with selected element
        if (!lastAtomId) {
            const firstAtom = this.molecule.addAtom(this.selectedElement, x, y);
            lastAtomId = firstAtom.id;
        }

        // Add atoms with proper zigzag pattern /\/\/\/\
        for (let i = 0; i < numCarbons; i++) {
            // Alternate angles: +30° and -30° from base direction for zigzag
            const angleOffset = (i % 2 === 0) ? Math.PI / 6 : -Math.PI / 6;
            const bondAngle = baseAngle + angleOffset;

            x += this.BOND_LENGTH * Math.cos(bondAngle);
            y += this.BOND_LENGTH * Math.sin(bondAngle);

            const newAtom = this.molecule.addAtom(this.selectedElement, x, y);
            const bond = this.molecule.addBond(lastAtomId, newAtom.id, 1);
            
            // Update atom properties after each addition
            if (this.molecule.updateAtomProperties) {
                this.molecule.updateAtomProperties(this.molecule.getAtomById(lastAtomId));
                this.molecule.updateAtomProperties(newAtom);
            }
            
            lastAtomId = newAtom.id;
        }

        console.log(`✅ Added chain of ${numCarbons} ${this.selectedElement} atoms (undo as one operation)`);
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

        this.popup.textContent = `C: ${count}`;
        this.popup.style.left = (x + 20) + 'px';
        this.popup.style.top = (y - 40) + 'px';
        this.popup.style.display = 'block';
    }

    /**
     * Update popup position and count
     */
    updatePopup(x, y, count) {
        if (this.popup) {
            this.popup.textContent = `C: ${count}`;
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
