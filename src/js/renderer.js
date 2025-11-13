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
        this.showLonePairs = true;
        this.showCharges = true;
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

    // Render the entire molecule
    render(molecule) {
        try {
            console.log('🎨 Rendering molecule:', {
                atoms: molecule.atoms.length,
                bonds: molecule.bonds.length,
                canvasSize: { width: this.canvas.width, height: this.canvas.height }
            });

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

            console.log('✓ Render complete');
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

        // Draw implicit hydrogens for carbons in skeletal notation
        if (atom.element === 'C' && !shouldShowLabel) {
            this.drawImplicitHydrogens(atom, molecule);
        }
        
        // Draw implicit hydrogens for heteroatoms (O, N, etc.)
        if (atom.element !== 'C' && atom.element !== 'H' && shouldShowLabel) {
            this.drawHeteroatomImplicitHydrogens(atom, molecule);
        }
    }
    
    // Draw implicit hydrogens for heteroatoms (O, N, S, P, etc.)
    drawHeteroatomImplicitHydrogens(atom, molecule) {
        const bonds = molecule.getAtomBonds ? molecule.getAtomBonds(atom.id) : [];
        const element = atom.element;
        
        // Calculate implicit hydrogens based on element and bond orders
        let implicitH = 0;
        let bondSum = 0;
        
        bonds.forEach(bond => {
            bondSum += bond.order;
        });
        
        // Standard valences
        const valences = {
            'O': 2, 'N': 3, 'S': 2, 'P': 3, 'F': 1, 'Cl': 1, 'Br': 1, 'I': 1
        };
        
        const valence = valences[element] || 0;
        if (valence === 0) return;
        
        implicitH = Math.max(0, valence - bondSum - (atom.charge || 0));
        
        // Special cases:
        // - O with single bond to C should show as OH (implicit H = 1)
        // - O with double bond to C should show as O (implicit H = 0)
        // - N with appropriate bonds
        
        if (implicitH <= 0) return;
        
        // Get bond angles to place H
        const bondAngles = bonds.map(bond => {
            const otherId = bond.atom1 === atom.id ? bond.atom2 : bond.atom1;
            const otherAtom = molecule.getAtomById(otherId);
            if (!otherAtom) return null;
            return Math.atan2(
                otherAtom.position.y - atom.position.y,
                otherAtom.position.x - atom.position.x
            );
        }).filter(angle => angle !== null).sort((a, b) => a - b);
        
        // For heteroatoms, typically show H opposite to the main bond
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

    // Determine if atom label should be shown (skeletal notation rules)
    shouldShowAtomLabel(atom, molecule) {
        // Always show non-carbon atoms
        if (atom.element !== 'C') {
            return true;
        }

        // Show carbon if it has a charge
        if (Math.abs(atom.charge) > 0.1) {
            return true;
        }

        // Get bonds to this atom
        const bonds = molecule.getAtomBonds ? molecule.getAtomBonds(atom.id) : [];
        
        // Show carbon if it has explicit hydrogens (H atoms connected)
        const hasExplicitHydrogens = bonds.some(bond => {
            const otherId = bond.atom1 === atom.id ? bond.atom2 : bond.atom1;
            const otherAtom = molecule.getAtomById(otherId);
            return otherAtom && otherAtom.element === 'H';
        });
        
        if (hasExplicitHydrogens) {
            return true;
        }

        // Show carbon if it's terminal (only one bond)
        if (bonds.length <= 1) {
            return true;
        }

        // Show carbon if it has double or triple bonds (not purely skeletal)
        const hasMultipleBonds = bonds.some(bond => bond.order > 1);
        if (hasMultipleBonds) {
            return true;
        }

        // Show carbon if it's connected to non-carbon atoms (heteroatoms)
        const hasHeteroatoms = bonds.some(bond => {
            const otherId = bond.atom1 === atom.id ? bond.atom2 : bond.atom1;
            const otherAtom = molecule.getAtomById(otherId);
            return otherAtom && otherAtom.element !== 'C' && otherAtom.element !== 'H';
        });
        
        if (hasHeteroatoms) {
            return true;
        }

        // Otherwise, hide carbon label (skeletal notation)
        return false;
    }

    // Draw implicit hydrogens (CH4, CH3, CH2, CH) for skeletal carbons
    drawImplicitHydrogens(atom, molecule) {
        // Calculate implicit hydrogens
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

    // Calculate implicit hydrogens for an atom
    calculateImplicitHydrogens(atom, molecule) {
        if (atom.element !== 'C') return 0;
        
        const bonds = molecule.getAtomBonds ? molecule.getAtomBonds(atom.id) : [];
        let bondSum = 0;
        
        bonds.forEach(bond => {
            bondSum += bond.order;
        });
        
        // Carbon has valence 4
        const implicitH = 4 - bondSum;
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

        const { start, end } = this.getTrimmedBondCoordinates(atom1, atom2, molecule);
        const x1 = start.x;
        const y1 = start.y;
        const x2 = end.x;
        const y2 = end.y;

        // Calculate bond angle
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const perpAngle = angle + Math.PI / 2;

        // Check if both atoms are carbons and should use skeletal notation
        const isSkeletal = atom1.element === 'C' && atom2.element === 'C' &&
            !this.shouldShowAtomLabel(atom1, molecule) && 
            !this.shouldShowAtomLabel(atom2, molecule);

        // Draw based on bond order
        if (bond.order === 1) {
            this.drawSingleBond(x1, y1, x2, y2, bond, isSkeletal);
        } else if (bond.order === 2) {
            this.drawDoubleBond(x1, y1, x2, y2, perpAngle, bond, molecule, atom1, atom2);
        } else if (bond.order === 3) {
            this.drawTripleBond(x1, y1, x2, y2, perpAngle, bond);
        }
    }

    drawSingleBond(x1, y1, x2, y2, bond, isSkeletal = false) {
        const color = this.getBondColor(bond);
        
        // For skeletal notation, draw with consistent line style
        if (isSkeletal) {
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
        } else {
            this.drawStyledLine(x1, y1, x2, y2, this.currentStyle.bondWidth, color);
        }
    }

    drawDoubleBond(x1, y1, x2, y2, perpAngle, bond, molecule, atom1, atom2) {
        const offset = this.currentStyle.doubleBondOffset;
        const dx = Math.cos(perpAngle) * offset;
        const dy = Math.sin(perpAngle) * offset;
        const color = this.getBondColor(bond);

        const orientation = this.getDoubleBondOrientation(atom1, atom2, molecule, perpAngle);

        if (orientation === 0) {
            this.drawStyledLine(x1 + dx, y1 + dy, x2 + dx, y2 + dy, this.currentStyle.bondWidth, color);
            this.drawStyledLine(x1 - dx, y1 - dy, x2 - dx, y2 - dy, this.currentStyle.bondWidth, color);
        } else {
            const skewX = dx * orientation;
            const skewY = dy * orientation;
            this.drawStyledLine(x1, y1, x2, y2, this.currentStyle.bondWidth, color);
            this.drawStyledLine(
                x1 + skewX,
                y1 + skewY,
                x2 + skewX,
                y2 + skewY,
                this.currentStyle.bondWidth,
                color
            );
        }
    }

    drawTripleBond(x1, y1, x2, y2, perpAngle, bond) {
        const offset = this.currentStyle.tripleBondOuterOffset;
        const dx = Math.cos(perpAngle) * offset;
        const dy = Math.sin(perpAngle) * offset;
        const color = this.getBondColor(bond);

        this.drawStyledLine(x1, y1, x2, y2, this.currentStyle.bondWidth, color);
        this.drawStyledLine(x1 + dx, y1 + dy, x2 + dx, y2 + dy, this.currentStyle.bondWidth, color);
        this.drawStyledLine(x1 - dx, y1 - dy, x2 - dx, y2 - dy, this.currentStyle.bondWidth, color);
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

        // For skeletal C-C bonds, trim less (bonds should connect at vertices)
        const isSkeletalBond = atom1.element === 'C' && atom2.element === 'C' && molecule;
        const trim1 = isSkeletalBond && !this.shouldShowAtomLabel(atom1, molecule)
            ? this.currentStyle.minimumBondCap * 0.5
            : this.getAtomTrimDistance(atom1, molecule);
        const trim2 = isSkeletalBond && !this.shouldShowAtomLabel(atom2, molecule)
            ? this.currentStyle.minimumBondCap * 0.5
            : this.getAtomTrimDistance(atom2, molecule);

        const ratio1 = trim1 / distance;
        const ratio2 = trim2 / distance;

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

        // Draw chain preview
        if (this.previewState.chainPreview) {
            const { atoms, startAtom, startX, startY } = this.previewState.chainPreview;
            
            this.ctx.save();
            this.ctx.strokeStyle = '#667eea';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            
            let prevX = startAtom ? (startAtom.position?.x || startAtom.x) : startX;
            let prevY = startAtom ? (startAtom.position?.y || startAtom.y) : startY;
            
            atoms.forEach(atom => {
                const atomX = atom.position?.x || atom.x;
                const atomY = atom.position?.y || atom.y;
                
                this.ctx.beginPath();
                this.ctx.moveTo(prevX, prevY);
                this.ctx.lineTo(atomX, atomY);
                this.ctx.stroke();
                
                prevX = atomX;
                prevY = atomY;
            });
            
            // Draw preview atoms
            this.ctx.fillStyle = '#667eea';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            atoms.forEach(atom => {
                const atomX = atom.position?.x || atom.x;
                const atomY = atom.position?.y || atom.y;
                
                this.ctx.beginPath();
                this.ctx.arc(atomX, atomY, 15, 0, Math.PI * 2);
                this.ctx.strokeStyle = '#667eea';
                this.ctx.stroke();
                this.ctx.fillStyle = 'rgba(102, 126, 234, 0.1)';
                this.ctx.fill();
                
                this.ctx.fillStyle = '#667eea';
                this.ctx.fillText('C', atomX, atomY);
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
