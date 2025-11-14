// Renderer - Canvas drawing and visualization

/**
 * Style adapter that emulates MolView's visual language while allowing us to
 * drive the drawing pipeline with analytics from the current molecule.
 *
 * The adapter inspects the molecule to derive a scale-aware set of metrics
 * (font sizes, line weights, offsets) so that the renderer can focus purely on
 * geometry. This gives us MolView-like visuals without duplicating their
 * implementation details and keeps the rendering code adaptable as molecules
 * grow in size.
 */
class MolViewStyleAdapter {
    constructor() {
        this.defaults = {
            bondLength: 60,
            bondWidth: 2,
            doubleBondOffset: 4,
            tripleBondOuterOffset: 6,
            fontSize: 18,
            fontWeight: '600',
            fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
            labelPadding: 4,
            minimumBondCap: 6,
            selectionRadius: 18,
            chargeOffsetMultiplier: 0.75,
            lonePairDistance: 26,
            lonePairDotRadius: 2,
            guidelineWidth: 1,
            aromaticCircleRatio: 0.32,
            maxScale: 1.7,
            minScale: 0.55
        };
    }

    compute(molecule, canvas) {
        const metrics = { ...this.defaults };

        if (!molecule || !molecule.bonds || molecule.bonds.length === 0) {
            metrics.canvasCenter = this.getCanvasCenter(canvas);
            metrics.scale = 1;
            metrics.chargeOffset = metrics.fontSize * this.defaults.chargeOffsetMultiplier;
            metrics.chargeFontSize = Math.max(10, Math.round(metrics.fontSize * 0.7));
            metrics.aromaticCircleRadius = metrics.bondLength * this.defaults.aromaticCircleRatio;
            return metrics;
        }

        const averageBond = this.getAverageBondLength(molecule);
        const scale = this.clamp(
            averageBond / this.defaults.bondLength,
            this.defaults.minScale,
            this.defaults.maxScale
        );

        metrics.bondLength = averageBond;
        metrics.scale = scale;
        metrics.bondWidth = Math.max(1.5, this.defaults.bondWidth * scale);
        metrics.doubleBondOffset = Math.max(3, this.defaults.doubleBondOffset * scale);
        metrics.tripleBondOuterOffset = Math.max(
            metrics.doubleBondOffset + 1,
            this.defaults.tripleBondOuterOffset * scale
        );
        metrics.fontSize = Math.max(12, Math.round(this.defaults.fontSize * scale));
        metrics.fontWeight = this.defaults.fontWeight;
        metrics.fontFamily = this.defaults.fontFamily;
        metrics.labelPadding = Math.max(3, this.defaults.labelPadding * scale);
        metrics.minimumBondCap = Math.max(5, this.defaults.minimumBondCap * scale);
        metrics.selectionRadius = Math.max(16, this.defaults.selectionRadius * scale);
        metrics.chargeOffset = metrics.fontSize * this.defaults.chargeOffsetMultiplier;
        metrics.chargeFontSize = Math.max(10, Math.round(metrics.fontSize * 0.7));
        metrics.lonePairDistance = Math.max(18, this.defaults.lonePairDistance * scale);
        metrics.lonePairDotRadius = Math.max(1.5, this.defaults.lonePairDotRadius * scale);
        metrics.guidelineWidth = Math.max(0.75, this.defaults.guidelineWidth * scale);
        metrics.aromaticCircleRadius = averageBond * this.defaults.aromaticCircleRatio;
        metrics.canvasCenter = this.getCanvasCenter(canvas);

        return metrics;
    }

    getCanvasCenter(canvas) {
        return {
            x: canvas.width / 2,
            y: canvas.height / 2
        };
    }

    getAverageBondLength(molecule) {
        let total = 0;
        let count = 0;

        molecule.bonds.forEach(bond => {
            const atom1 = molecule.getAtomById(bond.atom1);
            const atom2 = molecule.getAtomById(bond.atom2);

            if (!atom1 || !atom2 || !atom1.x || !atom2.x || !atom1.y || !atom2.y) {
                return;
            }

            const dx = atom2.x - atom1.x;
            const dy = atom2.y - atom1.y;
            total += Math.hypot(dx, dy);
            count += 1;
        });

        if (count === 0) {
            return this.defaults.bondLength;
        }

        return total / count;
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
}

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();

        // Rendering options
        this.showImplicitHydrogens = true; // Show implicit H by default
        this.showLonePairs = false;
        this.showCharges = false;
        this.showHybridization = false;

        this.styleAdapter = new MolViewStyleAdapter();
        this.layoutEngine = new MoleculeLayoutEngine();
        this.currentStyle = this.styleAdapter.compute(null, this.canvas);
        this.atomLabelFont = `${this.currentStyle.fontWeight} ${this.currentStyle.fontSize}px ${this.currentStyle.fontFamily}`;

        // Preview/temporary drawing state (to avoid redundant drawing)
        this.previewState = {
            ghostAtom: null,
            tempBond: null,
            chainPreview: null,
            angleGuides: null
        };

        window.addEventListener('resize', () => this.resize());
    }

    // Set preview state for temporary drawing
    setPreviewState(state) {
        this.previewState = { ...this.previewState, ...state };
    }

    // Clear preview state
    clearPreviewState() {
        this.previewState = {
            ghostAtom: null,
            tempBond: null,
            chainPreview: null,
            angleGuides: null
        };
    }

    resize() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight - 40; // Account for info bar
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Render the entire molecule (with debouncing to prevent excessive renders)
    render(molecule) {
        // Debounce rendering to prevent excessive calls
        if (this._renderTimeout) {
            clearTimeout(this._renderTimeout);
        }
        
        this._renderTimeout = setTimeout(() => {
            this._doRender(molecule);
        }, 16); // ~60fps max
    }
    
    _doRender(molecule) {
        try {
            // Only log occasionally to reduce console spam
            if (!this._lastLogTime || Date.now() - this._lastLogTime > 1000) {
                console.log('🎨 Rendering molecule:', {
                    atoms: molecule.atoms.length,
                    bonds: molecule.bonds.length,
                    canvasSize: { width: this.canvas.width, height: this.canvas.height }
                });
                this._lastLogTime = Date.now();
            }

            this.clear();

            if (!molecule || !molecule.atoms) {
                console.warn('⚠️ Invalid molecule data');
                return;
            }

            // Auto-layout is now optional - disabled by default
            // Enable with: renderer.layoutEngine.setEnabled(true)
            if (this.layoutEngine && this.layoutEngine.enabled) {
                this.layoutEngine.layout(molecule, this.canvas);
            }

            this.currentStyle = this.styleAdapter.compute(molecule, this.canvas);
            this.atomLabelFont = `${this.currentStyle.fontWeight} ${this.currentStyle.fontSize}px ${this.currentStyle.fontFamily}`;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.font = this.atomLabelFont;

            // Detect and draw aromatic rings
            if (molecule.detectRings) {
                this.drawAromaticRings(molecule);
            }

            // Draw bonds first (so they appear behind atoms)
            if (molecule.bonds && Array.isArray(molecule.bonds)) {
                molecule.bonds.forEach(bond => {
                    try {
                        this.drawBond(bond, molecule);
                    } catch (e) {
                        console.error('Error drawing bond:', e);
                    }
                });
            }

            // Draw atoms
            if (molecule.atoms && Array.isArray(molecule.atoms)) {
                molecule.atoms.forEach(atom => {
                    try {
                        this.drawAtom(atom, molecule, molecule.selectedAtom === atom);

                        if (this.showLonePairs && molecule.getAtomBonds) {
                            this.drawLonePairs(atom, molecule);
                        }

                        if (this.showCharges && Math.abs(atom.charge) > 0.1) {
                            this.drawCharge(atom);
                        }

                        if (this.showHybridization && atom.hybridization) {
                            this.drawHybridization(atom, molecule);
                        }
                    } catch (e) {
                        console.error('Error drawing atom:', e);
                    }
                });
            }

            // Draw preview/temporary elements (ghost atoms, temp bonds, etc.)
            this.drawPreviewElements();

            // Only log completion occasionally
            if (!this._lastCompleteLog || Date.now() - this._lastCompleteLog > 1000) {
                console.log('✓ Render complete');
                this._lastCompleteLog = Date.now();
            }
        } catch (error) {
            console.error('🔥 Critical render error:', error);
            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = '16px Arial';
            this.ctx.fillText('Rendering error - check console', 10, 30);
        }
    }

    // Draw aromatic ring indicators
    drawAromaticRings(molecule) {
        if (!molecule.detectRings) return;

        const rings = molecule.detectRings();

        rings.forEach(ring => {
            // Check if ring is aromatic
            if (ring.length === 6 && isAromatic(ring, molecule)) {
                // Calculate center of ring
                let centerX = 0, centerY = 0;
                ring.forEach(atomId => {
                    const atom = molecule.getAtomById(atomId);
                    centerX += atom.position.x;
                    centerY += atom.position.y;
                });
                centerX /= ring.length;
                centerY /= ring.length;

                // Draw circle in the center to indicate aromaticity
                this.ctx.beginPath();
                const radius = this.currentStyle.aromaticCircleRadius || 18;
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                this.ctx.strokeStyle = 'rgba(255, 107, 107, 0.75)';
                this.ctx.lineWidth = this.currentStyle.bondWidth;
                this.ctx.setLineDash([6, 6]);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        });
    }

    // Draw an atom with proper skeletal notation
    drawAtom(atom, molecule, isSelected) {
        const element = getElement(atom.element) || { symbol: atom.element, color: '#222' };
        const x = atom.position.x;
        const y = atom.position.y;
        const label = element.symbol || atom.element;

        // Determine if we should show the atom label (skeletal notation for carbons)
        const shouldShowLabel = this.shouldShowAtomLabel(atom, molecule);
        
        // For skeletal carbons, use minimal radius for selection/trimming
        const radius = shouldShowLabel 
            ? this.getAtomLabelRadius(label)
            : this.currentStyle.minimumBondCap;

        // Draw selection halo if needed
        if (atom.valenceValid === false) {
            this.drawSelectionHalo(x, y, radius, 'rgba(230, 57, 70, 0.18)', '#E63946');
        } else if (isSelected) {
            this.drawSelectionHalo(x, y, radius, 'rgba(255, 215, 0, 0.2)', '#FFB400');
        }

        // Only draw label if needed (skeletal notation hides carbon labels)
        if (shouldShowLabel) {
        const previousFont = this.ctx.font;
        this.ctx.font = this.atomLabelFont;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = element.color || '#222';
        this.ctx.fillText(label, x, y);
        this.ctx.font = previousFont;
        }

        // Draw implicit hydrogens if enabled
        if (this.showImplicitHydrogens) {
            // Draw implicit hydrogens for carbons in skeletal notation
            if (atom.element === 'C' && !shouldShowLabel) {
                this.drawImplicitHydrogens(atom, molecule);
            }
            
            // Draw implicit hydrogens for heteroatoms (O, N, etc.)
            if (atom.element !== 'C' && atom.element !== 'H' && shouldShowLabel) {
                this.drawHeteroatomImplicitHydrogens(atom, molecule);
            }
        }
    }
    
    // Draw implicit hydrogens for heteroatoms (O, N, S, P, etc.)
    // COMPLETELY REVAMPED: Uses periodic table physics correctly
    drawHeteroatomImplicitHydrogens(atom, molecule) {
        if (!this.showImplicitHydrogens) return;
        
        const bonds = molecule.getAtomBonds ? molecule.getAtomBonds(atom.id) : [];
        const elementSymbol = atom.element;
        
        // Get element data from periodic table (use getElement helper)
        const elementData = getElement(elementSymbol);
        if (!elementData) {
            console.warn(`No element data for ${elementSymbol}`);
            return;
        }
        
        // CRITICAL FIX: Get standard valence - periodic table JSON has wrong values!
        // Override with correct chemistry valences
        const correctValences = {
            'O': 2,   // Oxygen: 2 (NOT 6!)
            'N': 3,   // Nitrogen: 3
            'S': 2,   // Sulfur: 2 (can expand to 4, 6)
            'P': 3,   // Phosphorus: 3 (can expand to 5)
            'F': 1,   // Fluorine: 1
            'Cl': 1,  // Chlorine: 1
            'Br': 1,  // Bromine: 1
            'I': 1,   // Iodine: 1
            'C': 4,   // Carbon: 4
            'H': 1,   // Hydrogen: 1
            'B': 3,   // Boron: 3
            'Si': 4   // Silicon: 4
        };
        
        // Use correct valence if available, otherwise use periodic table data
        let valence = correctValences[elementSymbol] || elementData.valence || 0;
        
        // Safety check: if valence is still wrong (>= 6 for common elements), use correct value
        if (correctValences[elementSymbol] && valence !== correctValences[elementSymbol]) {
            valence = correctValences[elementSymbol];
        }
        
        if (valence === 0) return; // Noble gases, etc.
        
        // CRITICAL FIX: Calculate bond sum correctly, ensuring bond.order is read properly
        let bondSum = 0;
        bonds.forEach(bond => {
            // CRITICAL: Ensure bond.order is a number, default to 1 if missing
            const bondOrder = bond.order || 1;
            if (bondOrder < 1 || bondOrder > 3) {
                console.warn(`Invalid bond order: ${bondOrder}, defaulting to 1`);
                bondSum += 1;
            } else {
                bondSum += bondOrder;
            }
        });
        
        // Account for formal charge
        const charge = atom.charge || 0;
        
        // Calculate implicit hydrogens using proper chemistry:
        // implicitH = valence - bondSum - charge
        // For O: valence = 2
        //   - Single bond (bondSum = 1): implicitH = 2 - 1 - 0 = 1 → shows OH
        //   - Double bond (bondSum = 2): implicitH = 2 - 2 - 0 = 0 → shows O (no H)
        let implicitH = valence - bondSum - charge;
        
        // Can't have negative hydrogens
        implicitH = Math.max(0, implicitH);
        
        // DEBUG: Log calculation for troubleshooting (only once per render, not every time)
        if (elementSymbol === 'O' && bonds.length > 0 && Math.random() < 0.01) { // Only log 1% of the time
            console.log(`🔬 O implicit H calc: valence=${valence}, bondSum=${bondSum}, charge=${charge}, implicitH=${implicitH}`, 
                bonds.map(b => `bond order=${b.order || 1}`));
        }
        
        // If no implicit hydrogens, don't draw anything
        if (implicitH <= 0) {
            return; // This should fix C=OH showing as C=O
        }
        
        // Get bond angles to place H labels
        const bondAngles = bonds.map(bond => {
            const otherId = bond.atom1 === atom.id ? bond.atom2 : bond.atom1;
            const otherAtom = molecule.getAtomById(otherId);
            if (!otherAtom) return null;
            return Math.atan2(
                otherAtom.position.y - atom.position.y,
                otherAtom.position.x - atom.position.x
            );
        }).filter(angle => angle !== null).sort((a, b) => a - b);
        
        // Calculate optimal positions for H labels
        const hAngles = this.calculateHydrogenAngles(bondAngles, implicitH);
        
        // Draw H labels
        const hDistance = this.currentStyle.fontSize * 0.7;
        const hFontSize = Math.max(9, Math.round(this.currentStyle.fontSize * 0.65));
        
        hAngles.forEach(angle => {
            const hX = atom.position.x + Math.cos(angle) * hDistance;
            const hY = atom.position.y + Math.sin(angle) * hDistance;
            
            const previousFont = this.ctx.font;
            this.ctx.font = `${this.currentStyle.fontWeight} ${hFontSize}px ${this.currentStyle.fontFamily}`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = '#666';
            this.ctx.fillText('H', hX, hY);
            this.ctx.font = previousFont;
        });
    }

    // Determine if atom label should be shown (COMPREHENSIVE skeletal notation rules)
    // FIXED: Now properly detects double/triple bonds and shows more carbons
    shouldShowAtomLabel(atom, molecule) {
        // Always show non-carbon atoms
        if (atom.element !== 'C') {
            return true;
        }

        // Get all bonds to this atom
        const bonds = molecule.getAtomBonds ? molecule.getAtomBonds(atom.id) : [];
        if (bonds.length === 0) {
            return true; // Isolated atom, show it
        }

        // RULE 1: Show if charged
        if (Math.abs(atom.charge || 0) > 0.1) {
            return true;
        }

        // RULE 2: Show if terminal (only 1 bond)
        if (bonds.length === 1) {
            return true;
        }

        // RULE 3: Show if has double or triple bonds (CRITICAL FIX - check bond.order explicitly)
        const hasMultipleBonds = bonds.some(bond => {
            const bondOrder = bond.order || 1; // Default to 1 if not set
            return bondOrder === 2 || bondOrder === 3;
        });
        if (hasMultipleBonds) {
            return true;
        }

        // RULE 4: Show if connected to heteroatoms (non-C, non-H)
        const hasHeteroatoms = bonds.some(bond => {
            const otherId = bond.atom1 === atom.id ? bond.atom2 : bond.atom1;
            const otherAtom = molecule.getAtomById(otherId);
            return otherAtom && otherAtom.element !== 'C' && otherAtom.element !== 'H';
        });
        if (hasHeteroatoms) {
            return true;
        }

        // RULE 5: Show if has explicit hydrogens
        const hasExplicitHydrogens = bonds.some(bond => {
            const otherId = bond.atom1 === atom.id ? bond.atom2 : bond.atom1;
            const otherAtom = molecule.getAtomById(otherId);
            return otherAtom && otherAtom.element === 'H';
        });
        if (hasExplicitHydrogens) {
            return true;
        }

        // RULE 6: Show if branch point (3+ bonds to carbons) - SHOW MORE CARBONS
        const carbonBonds = bonds.filter(bond => {
            const otherId = bond.atom1 === atom.id ? bond.atom2 : bond.atom1;
            const otherAtom = molecule.getAtomById(otherId);
            return otherAtom && otherAtom.element === 'C';
        });
        if (carbonBonds.length >= 3) {
            return true; // Branch point - always show
        }

        // RULE 7: Show if in ring with special properties
        if (molecule.detectRings) {
            try {
                const rings = molecule.detectRings();
                const isInRing = rings.some(ring => Array.isArray(ring) && ring.includes(atom.id));
                if (isInRing) {
                    // Show if ring has double bonds or is small (3-5 membered)
                    const ringWithAtom = rings.find(ring => Array.isArray(ring) && ring.includes(atom.id));
                    if (ringWithAtom) {
                        // Check if any bond in ring is double/triple
                        const ringHasMultipleBonds = ringWithAtom.some(ringAtomId => {
                            const ringAtom = molecule.getAtomById(ringAtomId);
                            if (!ringAtom) return false;
                            const ringAtomBonds = molecule.getAtomBonds(ringAtomId);
                            return ringAtomBonds.some(b => {
                                const order = b.order || 1;
                                return order === 2 || order === 3;
                            });
                        });
                        if (ringHasMultipleBonds || ringWithAtom.length <= 5) {
                            return true; // Small ring or ring with multiple bonds
                        }
                    }
                }
            } catch (e) {
                // If ring detection fails, continue with other rules
                console.warn('Ring detection failed:', e);
            }
        }

        // RULE 8: Show if valence is unusual (not standard 4)
        const bondSum = bonds.reduce((sum, bond) => sum + (bond.order || 1), 0);
        if (bondSum !== 4 && bondSum > 0) {
            // Not standard tetravalent carbon - show it
            return true;
        }

        // RULE 9: Show if 4+ bonds (quaternary carbon or unusual)
        if (bonds.length >= 4) {
            return true;
        }

        // RULE 10: Only hide if: 2 single bonds, both to C, no special properties
        // This is the ONLY case where we hide (simple chain carbon)
        if (bonds.length === 2 && 
            carbonBonds.length === 2 && 
            bonds.every(b => (b.order || 1) === 1) &&
            bondSum === 2) {
            // Simple internal chain carbon with 2 single bonds to C - can hide (skeletal)
            return false;
        }

        // DEFAULT: Show carbon if we're not sure (be conservative - show more carbons)
        return true;
    }

    // Draw implicit hydrogens (CH4, CH3, CH2, CH) for skeletal carbons
    // REVAMPED: Uses periodic table physics
    drawImplicitHydrogens(atom, molecule) {
        if (!this.showImplicitHydrogens) return;
        
        // Calculate implicit hydrogens using periodic table data
        const implicitH = this.calculateImplicitHydrogens(atom, molecule);
        
        if (implicitH <= 0) return;

        // Get bonds to determine where to place H labels
        const bonds = molecule.getAtomBonds ? molecule.getAtomBonds(atom.id) : [];
        
        // Calculate bond angles
        const bondAngles = bonds.map(bond => {
            const otherId = bond.atom1 === atom.id ? bond.atom2 : bond.atom1;
            const otherAtom = molecule.getAtomById(otherId);
            if (!otherAtom) return null;
            return Math.atan2(
                otherAtom.position.y - atom.position.y,
                otherAtom.position.x - atom.position.x
            );
        }).filter(angle => angle !== null).sort((a, b) => a - b);

        // Find angles for hydrogen placement (opposite to bonds)
        const hAngles = this.calculateHydrogenAngles(bondAngles, implicitH);
        
        // Draw H labels
        const hDistance = this.currentStyle.fontSize * 0.8;
        const hFontSize = Math.max(10, Math.round(this.currentStyle.fontSize * 0.7));
        
        hAngles.forEach((angle, index) => {
            const hX = atom.position.x + Math.cos(angle) * hDistance;
            const hY = atom.position.y + Math.sin(angle) * hDistance;
            
            // Draw H label
            const previousFont = this.ctx.font;
            this.ctx.font = `${this.currentStyle.fontWeight} ${hFontSize}px ${this.currentStyle.fontFamily}`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = '#666';
            this.ctx.fillText('H', hX, hY);
            this.ctx.font = previousFont;
        });
    }

    // Calculate angles for placing implicit hydrogens
    calculateHydrogenAngles(bondAngles, hCount) {
        if (hCount === 0) return [];
        
        // If no bonds, distribute evenly
        if (bondAngles.length === 0) {
            const angles = [];
            for (let i = 0; i < hCount; i++) {
                angles.push((Math.PI * 2 * i) / hCount);
            }
            return angles;
        }

        // Find gaps between bonds to place hydrogens
        const gaps = [];
        const sortedAngles = [...bondAngles].sort((a, b) => a - b);
        
        // Calculate gaps between consecutive bonds
        for (let i = 0; i < sortedAngles.length; i++) {
            const nextIndex = (i + 1) % sortedAngles.length;
            let startAngle = sortedAngles[i];
            let endAngle = sortedAngles[nextIndex];
            
            if (endAngle <= startAngle) {
                endAngle += Math.PI * 2;
            }
            
            const gapSize = endAngle - startAngle;
            const midpoint = startAngle + gapSize / 2;
            
            gaps.push({
                startAngle,
                endAngle,
                size: gapSize,
                midpoint
            });
        }
        
        // Sort gaps by size (largest first)
        gaps.sort((a, b) => b.size - a.size);
        
        // Place hydrogens in largest gaps
        const hAngles = [];
        for (let i = 0; i < hCount && i < gaps.length; i++) {
            let angle = gaps[i].midpoint;
            // Normalize to 0-2π
            while (angle >= Math.PI * 2) angle -= Math.PI * 2;
            while (angle < 0) angle += Math.PI * 2;
            hAngles.push(angle);
        }
        
        return hAngles;
    }

    // Calculate implicit hydrogens for an atom (REVAMPED: Uses periodic table data)
    calculateImplicitHydrogens(atom, molecule) {
        const elementSymbol = atom.element;
        
        // Get element data from periodic table
        const elementData = getElement(elementSymbol);
        if (!elementData) return 0;
        
        // Get standard valence from periodic table
        const valence = elementData.valence || 0;
        if (valence === 0) return 0; // Noble gases, etc.
        
        const bonds = molecule.getAtomBonds ? molecule.getAtomBonds(atom.id) : [];
        let bondSum = 0;
        
        // CRITICAL FIX: Ensure bond.order is properly read
        bonds.forEach(bond => {
            const bondOrder = bond.order || 1; // Default to 1 if missing
            bondSum += bondOrder;
        });
        
        // Account for formal charge
        const charge = atom.charge || 0;
        
        // Calculate: implicitH = valence - bondSum - charge
        const implicitH = valence - bondSum - charge;
        
        // Can't have negative hydrogens
        return Math.max(0, implicitH);
    }

    drawSelectionHalo(x, y, radius, fillStyle, strokeStyle) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, Math.max(radius, this.currentStyle.selectionRadius), 0, Math.PI * 2);
        this.ctx.fillStyle = fillStyle;
        this.ctx.fill();
        this.ctx.lineWidth = this.currentStyle.guidelineWidth;
        this.ctx.strokeStyle = strokeStyle;
        this.ctx.stroke();
    }

    // Draw a bond between two atoms
    drawBond(bond, molecule) {
        const atom1 = molecule.getAtomById(bond.atom1);
        const atom2 = molecule.getAtomById(bond.atom2);

        if (!atom1 || !atom2) return;

        // CRITICAL: Get bond order explicitly (default to 1 if missing)
        // FIXED: Update bond object if order is missing or invalid
        if (!bond.order || bond.order < 1 || bond.order > 3) {
            if (bond.order !== 1) { // Only warn if it was set to something invalid
                console.warn(`Invalid bond order: ${bond.order}, fixing to 1`);
            }
            bond.order = 1;
        }
        const bondOrder = bond.order;

        const { start, end } = this.getTrimmedBondCoordinates(atom1, atom2, molecule);
        const x1 = start.x;
        const y1 = start.y;
        const x2 = end.x;
        const y2 = end.y;

        // Calculate bond angle
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const perpAngle = angle + Math.PI / 2;

        // Check if both atoms are carbons and should use skeletal notation
        // NOTE: Double/triple bonds should NOT be skeletal (they show atoms)
        const isSkeletal = bondOrder === 1 && 
            atom1.element === 'C' && atom2.element === 'C' &&
            !this.shouldShowAtomLabel(atom1, molecule) && 
            !this.shouldShowAtomLabel(atom2, molecule);

        // Draw based on bond order (use explicit bondOrder variable)
        if (bondOrder === 1) {
            this.drawSingleBond(x1, y1, x2, y2, bond, isSkeletal);
        } else if (bondOrder === 2) {
            this.drawDoubleBond(x1, y1, x2, y2, perpAngle, bond, molecule, atom1, atom2);
        } else if (bondOrder === 3) {
            this.drawTripleBond(x1, y1, x2, y2, perpAngle, bond);
        } else {
            // Fallback to single bond
            console.warn(`Unknown bond order ${bondOrder}, drawing as single`);
            this.drawSingleBond(x1, y1, x2, y2, bond, isSkeletal);
        }
    }

    drawSingleBond(x1, y1, x2, y2, bond, isSkeletal = false) {
        const color = this.getBondColor(bond);
        
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = this.currentStyle.bondWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawDoubleBond(x1, y1, x2, y2, perpAngle, bond, molecule, atom1, atom2) {
        const offset = this.currentStyle.doubleBondOffset;
        const dx = Math.cos(perpAngle) * offset;
        const dy = Math.sin(perpAngle) * offset;
        const color = this.getBondColor(bond);

        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = this.currentStyle.bondWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        const orientation = this.getDoubleBondOrientation(atom1, atom2, molecule, perpAngle);

        if (orientation === 0) {
            // Symmetric double bond (parallel lines)
            this.ctx.beginPath();
            this.ctx.moveTo(x1 + dx, y1 + dy);
            this.ctx.lineTo(x2 + dx, y2 + dy);
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.moveTo(x1 - dx, y1 - dy);
            this.ctx.lineTo(x2 - dx, y2 - dy);
            this.ctx.stroke();
        } else {
            // Skewed double bond (one centered, one offset)
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.moveTo(x1 + dx * orientation, y1 + dy * orientation);
            this.ctx.lineTo(x2 + dx * orientation, y2 + dy * orientation);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    drawTripleBond(x1, y1, x2, y2, perpAngle, bond) {
        const offset = this.currentStyle.tripleBondOuterOffset;
        const dx = Math.cos(perpAngle) * offset;
        const dy = Math.sin(perpAngle) * offset;
        const color = this.getBondColor(bond);

        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = this.currentStyle.bondWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // Center line
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();

        // Top line
        this.ctx.beginPath();
        this.ctx.moveTo(x1 + dx, y1 + dy);
        this.ctx.lineTo(x2 + dx, y2 + dy);
        this.ctx.stroke();

        // Bottom line
        this.ctx.beginPath();
        this.ctx.moveTo(x1 - dx, y1 - dy);
        this.ctx.lineTo(x2 - dx, y2 - dy);
        this.ctx.stroke();
        
        this.ctx.restore();
    }

    drawStyledLine(x1, y1, x2, y2, width, color) {
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.lineWidth = width;
        this.ctx.strokeStyle = color;
        this.ctx.stroke();
    }

    // Get bond color based on polarity
    getBondColor(bond) {
        if (!bond.polarity) return '#222';

        const delta = bond.polarity.delta;
        if (delta < 0.5) return '#222'; // Nonpolar - near-black
        if (delta < 1.7) return '#444'; // Polar - medium gray
        return '#666'; // Ionic - lighter gray
    }

    getTrimmedBondCoordinates(atom1, atom2, molecule) {
        const x1 = atom1.position.x;
        const y1 = atom1.position.y;
        const x2 = atom2.position.x;
        const y2 = atom2.position.y;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.hypot(dx, dy);

        if (distance === 0) {
            return { start: { x: x1, y: y1 }, end: { x: x2, y: y2 } };
        }

        // For skeletal C-C bonds (both carbons hidden), bonds should meet at vertices
        const isSkeletalBond = atom1.element === 'C' && atom2.element === 'C' && molecule &&
            !this.shouldShowAtomLabel(atom1, molecule) && 
            !this.shouldShowAtomLabel(atom2, molecule);
        
        let trim1, trim2;
        if (isSkeletalBond) {
            // Skeletal bonds: minimal trim, bonds connect at vertices
            trim1 = this.currentStyle.minimumBondCap * 0.3;
            trim2 = this.currentStyle.minimumBondCap * 0.3;
        } else {
            // Regular bonds: trim to avoid overlapping with atom labels
            trim1 = this.getAtomTrimDistance(atom1, molecule);
            trim2 = this.getAtomTrimDistance(atom2, molecule);
        }

        const ratio1 = Math.min(0.45, trim1 / distance); // Cap at 45% to prevent over-trimming
        const ratio2 = Math.min(0.45, trim2 / distance);

        return {
            start: {
                x: x1 + dx * ratio1,
                y: y1 + dy * ratio1
            },
            end: {
                x: x2 - dx * ratio2,
                y: y2 - dy * ratio2
            }
        };
    }

    getAtomTrimDistance(atom, molecule) {
        // For skeletal carbons, use minimal trim distance
        if (atom.element === 'C' && molecule) {
            const shouldShowLabel = this.shouldShowAtomLabel(atom, molecule);
            if (!shouldShowLabel) {
                return this.currentStyle.minimumBondCap + this.currentStyle.labelPadding;
            }
        }
        
        const element = getElement(atom.element) || { symbol: atom.element };
        return this.getAtomLabelRadius(element.symbol || atom.element) + this.currentStyle.labelPadding;
    }

    getAtomLabelRadius(label) {
        const previousFont = this.ctx.font;
        this.ctx.font = this.atomLabelFont;
        const metrics = this.ctx.measureText(label);
        const width = metrics.width;
        const height = this.currentStyle.fontSize;
        this.ctx.font = previousFont;

        const halfWidth = width / 2;
        const halfHeight = height * 0.6; // approximate visual height for uppercase glyphs
        const radius = Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight);
        return Math.max(this.currentStyle.minimumBondCap, radius);
    }

    getDoubleBondOrientation(atom1, atom2, molecule, perpAngle) {
        const bonds1 = molecule
            .getAtomBonds(atom1.id)
            .filter(b => !(b.atom1 === atom2.id || b.atom2 === atom2.id));
        const bonds2 = molecule
            .getAtomBonds(atom2.id)
            .filter(b => !(b.atom1 === atom1.id || b.atom2 === atom1.id));

        if (bonds1.length === 0 && bonds2.length === 0) {
            return 0;
        }

        const normal = { x: Math.cos(perpAngle), y: Math.sin(perpAngle) };
        const occupancy =
            this.getSideOccupancy(atom1, bonds1, molecule, normal) +
            this.getSideOccupancy(atom2, bonds2, molecule, normal);

        if (Math.abs(occupancy) < 0.01) {
            return 0;
        }

        return occupancy > 0 ? -1 : 1;
    }

    getSideOccupancy(atom, bonds, molecule, normal) {
        if (!bonds || bonds.length === 0) {
            return 0;
        }

        let total = 0;
        bonds.forEach(bond => {
            const otherId = bond.atom1 === atom.id ? bond.atom2 : bond.atom1;
            const other = molecule.getAtomById(otherId);
            if (!other) return;

            const dx = other.position.x - atom.position.x;
            const dy = other.position.y - atom.position.y;
            total += dx * normal.x + dy * normal.y;
        });

        return total / bonds.length;
    }

    // Draw lone pairs on an atom
    drawLonePairs(atom, molecule) {
        const element = getElement(atom.element);
        if (!element) return;

        const lonePairCount = element.lonePairs;

        if (lonePairCount === 0) return;

        // Calculate positions for lone pairs
        const bonds = molecule.getAtomBonds(atom.id);
        const baseRadius = this.currentStyle.lonePairDistance;

        // Get bond angles with proper sorting
        const bondAngles = bonds
            .map(bond => {
                const otherAtomId = bond.atom1 === atom.id ? bond.atom2 : bond.atom1;
                const otherAtom = molecule.getAtomById(otherAtomId);
                return Math.atan2(
                    otherAtom.position.y - atom.position.y,
                    otherAtom.position.x - atom.position.x
                );
            })
            .sort((a, b) => a - b);

        // Calculate ideal positions based on hybridization
        const hybridization = atom.hybridization;
        const totalElectronDomains = bondAngles.length + lonePairCount;

        // Find optimal angles for lone pairs (avoid bond angles)
        const lonePairAngles = this.calculateLonePairAngles(
            bondAngles,
            lonePairCount,
            hybridization,
            totalElectronDomains
        );

        // Draw lone pairs at calculated positions
        lonePairAngles.forEach(angle => {
            const x = atom.position.x + Math.cos(angle) * baseRadius;
            const y = atom.position.y + Math.sin(angle) * baseRadius;

            // Draw two dots for each lone pair
            const offset = this.currentStyle.lonePairDotRadius * 1.8;
            this.ctx.fillStyle = '#A61F24';
            this.ctx.beginPath();
            this.ctx.arc(x - offset, y, this.currentStyle.lonePairDotRadius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(x + offset, y, this.currentStyle.lonePairDotRadius, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    // Calculate optimal angles for lone pairs based on VSEPR theory
    calculateLonePairAngles(bondAngles, lonePairCount, hybridization, totalDomains) {
        const lonePairAngles = [];

        if (bondAngles.length === 0) {
            // No bonds - distribute lone pairs evenly
            for (let i = 0; i < lonePairCount; i++) {
                lonePairAngles.push((Math.PI * 2 * i) / lonePairCount);
            }
            return lonePairAngles;
        }

        // Calculate angular gaps between consecutive bonds
        const sortedAngles = [...bondAngles].sort((a, b) => a - b);
        const gaps = [];

        for (let i = 0; i < sortedAngles.length; i++) {
            const nextIndex = (i + 1) % sortedAngles.length;
            const startAngle = sortedAngles[i];
            let endAngle = sortedAngles[nextIndex];

            // Handle wrap-around
            if (endAngle <= startAngle) {
                endAngle += Math.PI * 2;
            }

            const gapSize = endAngle - startAngle;
            const midpoint = startAngle + gapSize / 2;

            gaps.push({
                startAngle: startAngle,
                endAngle: endAngle,
                size: gapSize,
                midpoint: midpoint
            });
        }

        // Add the wrap-around gap if needed
        if (sortedAngles.length > 0) {
            const lastAngle = sortedAngles[sortedAngles.length - 1];
            const firstAngle = sortedAngles[0];
            const wrapGapSize = Math.PI * 2 - (lastAngle - firstAngle);

            if (wrapGapSize > 0.1) {
                const wrapMidpoint = lastAngle + wrapGapSize / 2;
                gaps.push({
                    startAngle: lastAngle,
                    endAngle: firstAngle + Math.PI * 2,
                    size: wrapGapSize,
                    midpoint: wrapMidpoint
                });
            }
        }

        // Sort gaps by size (largest first) to place lone pairs optimally
        gaps.sort((a, b) => b.size - a.size);

        // Distribute lone pairs in the largest gaps
        for (let i = 0; i < lonePairCount && i < gaps.length; i++) {
            let angle = gaps[i].midpoint;

            // Normalize angle to 0-2π range
            while (angle >= Math.PI * 2) angle -= Math.PI * 2;
            while (angle < 0) angle += Math.PI * 2;

            lonePairAngles.push(angle);
        }

        return lonePairAngles;
    }

    // Draw partial charge
    drawCharge(atom) {
        const sign = atom.charge > 0 ? 'δ+' : 'δ-';
        const x = atom.position.x + this.currentStyle.chargeOffset;
        const y = atom.position.y - this.currentStyle.chargeOffset;

        this.ctx.fillStyle = atom.charge > 0 ? '#0066FF' : '#A61F24';
        const previousFont = this.ctx.font;
        this.ctx.font = `italic ${this.currentStyle.chargeFontSize}px ${this.currentStyle.fontFamily}`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(sign, x, y);
        this.ctx.font = previousFont;
    }

    // Draw hybridization label
    drawHybridization(atom, molecule) {
        const x = atom.position.x;
        const y = atom.position.y + 25;

        // Draw hybridization type
        this.ctx.fillStyle = '#666';
        const previousFont = this.ctx.font;
        this.ctx.font = `normal ${Math.max(10, Math.round(this.currentStyle.fontSize * 0.6))}px ${this.currentStyle.fontFamily}`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(atom.hybridization, x, y);

        // Draw bond angles if atom has multiple bonds
        const angles = molecule.getAtomBondAngles(atom.id);
        if (angles.length > 0) {
            const idealAngle = getIdealBondAngle(atom.hybridization);

            // Draw ideal angle reference
            this.ctx.fillStyle = '#999';
            this.ctx.font = `normal ${Math.max(8, Math.round(this.currentStyle.fontSize * 0.45))}px ${this.currentStyle.fontFamily}`;
            this.ctx.fillText(`(${idealAngle.toFixed(1)}°)`, x, y + 10);

            // Optionally draw actual angles on bonds
            angles.forEach(angleData => {
                const atom1 = molecule.getAtomById(angleData.atom1);
                const atom2 = molecule.getAtomById(angleData.atom2);

                // Calculate midpoint between the two bonds
                const midX = (atom1.position.x + atom2.position.x) / 2;
                const midY = (atom1.position.y + atom2.position.y) / 2;

                // Offset slightly towards center
                const dx = (x - midX) * 0.7;
                const dy = (y - midY) * 0.7;

                this.ctx.fillStyle = '#007bff';
                this.ctx.font = `bold ${Math.max(9, Math.round(this.currentStyle.fontSize * 0.55))}px ${this.currentStyle.fontFamily}`;
                this.ctx.fillText(`${angleData.angle.toFixed(1)}°`, midX + dx, midY + dy);
            });
        }

        this.ctx.font = previousFont;
    }

    // Get contrasting text color (retained for potential future use)
    getTextColor(bgColor) {
        const color = bgColor.replace('#', '');
        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;

        return brightness > 128 ? '#000' : '#FFF';
    }

    // Draw preview/temporary elements (ghost atoms, temp bonds, chain preview, etc.)
    drawPreviewElements() {
        // Draw temporary bond (for bond drawing tool)
        if (this.previewState.tempBond) {
            const { x1, y1, x2, y2 } = this.previewState.tempBond;
            this.ctx.save();
            this.ctx.strokeStyle = '#667eea';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
            this.ctx.restore();
        }

        // Draw ghost atom preview
        if (this.previewState.ghostAtom) {
            const { x, y, element } = this.previewState.ghostAtom;
            this.ctx.save();
            this.ctx.globalAlpha = 0.4;
            this.ctx.strokeStyle = '#667eea';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.arc(x, y, 15, 0, 2 * Math.PI);
            this.ctx.stroke();
            
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillStyle = '#667eea';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(element, x, y);
            this.ctx.restore();
        }

        // Draw angle guides
        if (this.previewState.angleGuides) {
            const { fromAtom, existingAngles, hybridization, bondLength = 60 } = this.previewState.angleGuides;
            const idealAngles = this.getIdealAnglesForHybridization(existingAngles[0] || 0, hybridization);
            
            this.ctx.save();
            this.ctx.globalAlpha = 0.2;
            this.ctx.strokeStyle = '#667eea';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([3, 3]);
            
            idealAngles.forEach(angle => {
                const used = existingAngles.some(existing => 
                    Math.abs(this.normalizeAngle(angle - existing)) < 0.2
                );
                
                if (!used) {
                    const endX = fromAtom.position.x + bondLength * 1.5 * Math.cos(angle);
                    const endY = fromAtom.position.y + bondLength * 1.5 * Math.sin(angle);
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(fromAtom.position.x, fromAtom.position.y);
                    this.ctx.lineTo(endX, endY);
                    this.ctx.stroke();
                }
            });
            
            this.ctx.restore();
        }

        // Draw chain preview - show ALL carbons with labels
        if (this.previewState.chainPreview) {
            const { atoms, bonds, startAtom, startX, startY } = this.previewState.chainPreview;
            
            this.ctx.save();
            this.ctx.globalAlpha = 0.7;
            
            // Draw preview bonds first
            if (bonds && bonds.length > 0) {
                this.ctx.strokeStyle = '#667eea';
                this.ctx.lineWidth = this.currentStyle.bondWidth;
                this.ctx.setLineDash([5, 5]);
                this.ctx.lineCap = 'round';
                
                bonds.forEach(bond => {
                    const atom1 = atoms.find(a => a.id === bond.atom1) || startAtom;
                    const atom2 = atoms.find(a => a.id === bond.atom2);
                    
                    if (!atom1 || !atom2) return;
                    
                    const x1 = atom1.position?.x || atom1.x || startX;
                    const y1 = atom1.position?.y || atom1.y || startY;
                    const x2 = atom2.position?.x || atom2.x;
                    const y2 = atom2.position?.y || atom2.y;
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(x1, y1);
                    this.ctx.lineTo(x2, y2);
                    this.ctx.stroke();
                });
            }
            
            // Draw preview atoms with labels (show ALL carbons, not skeletal)
            this.ctx.font = `${this.currentStyle.fontWeight} ${this.currentStyle.fontSize}px ${this.currentStyle.fontFamily}`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            atoms.forEach(atom => {
                const atomX = atom.position?.x || atom.x;
                const atomY = atom.position?.y || atom.y;
                const element = atom.element || 'C';
                
                // Draw atom circle
                this.ctx.beginPath();
                this.ctx.arc(atomX, atomY, 18, 0, Math.PI * 2);
                this.ctx.strokeStyle = '#667eea';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                this.ctx.fillStyle = 'rgba(102, 126, 234, 0.15)';
                this.ctx.fill();
                
                // Draw element label (always show for preview)
                const elem = getElement(element) || { symbol: element, color: '#667eea' };
                this.ctx.fillStyle = elem.color || '#667eea';
                this.ctx.fillText(element, atomX, atomY);
            });
            
            this.ctx.restore();
        }
    }

    // Helper for angle normalization
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }

    // Get ideal angles for hybridization
    getIdealAnglesForHybridization(baseAngle, hybridization) {
        const angles = [];
        
        if (hybridization === 'sp3') {
            // Tetrahedral: 109.5° angles
            angles.push(baseAngle);
            angles.push(baseAngle + 1.91); // ~109.5° in radians
            angles.push(baseAngle - 1.91);
            angles.push(baseAngle + Math.PI);
        } else if (hybridization === 'sp2') {
            // Trigonal planar: 120° angles
            angles.push(baseAngle);
            angles.push(baseAngle + 2.094); // ~120° in radians
            angles.push(baseAngle - 2.094);
        } else if (hybridization === 'sp') {
            // Linear: 180° angle
            angles.push(baseAngle);
            angles.push(baseAngle + Math.PI);
        }
        
        return angles;
    }

    // Draw temporary bond during creation (legacy support)
    drawTempBond(x1, y1, x2, y2) {
        this.setPreviewState({ tempBond: { x1, y1, x2, y2 } });
    }
}
