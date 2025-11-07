// Renderer - Canvas drawing and visualization

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        
        // Rendering options
        this.showLonePairs = true;
        this.showCharges = true;
        this.showHybridization = false;
        
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight - 40; // Account for info bar
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Draw aromatic ring indicators
    drawAromaticRings(molecule) {
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
                this.ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
                this.ctx.strokeStyle = '#FF6B6B';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        });
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
                        this.drawAtom(atom, molecule.selectedAtom === atom);
                        
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
            
            console.log('✓ Render complete');
        } catch (error) {
            console.error('🔥 Critical render error:', error);
            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = '16px Arial';
            this.ctx.fillText('Rendering error - check console', 10, 30);
        }
    }

    // Draw an atom
    drawAtom(atom, isSelected) {
        const element = getElement(atom.element);
        const x = atom.position.x;
        const y = atom.position.y;
        const radius = element.radius;

        // Draw atom circle
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = element.color;
        this.ctx.fill();
        
        // Draw border - red if valence exceeded, gold if selected, black otherwise
        if (atom.valenceValid === false) {
            this.ctx.strokeStyle = '#FF0000';
            this.ctx.lineWidth = 3;
        } else if (isSelected) {
            this.ctx.strokeStyle = '#FFD700';
            this.ctx.lineWidth = 3;
        } else {
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
        }
        this.ctx.stroke();

        // Draw element symbol
        this.ctx.fillStyle = this.getTextColor(element.color);
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(element.symbol, x, y);
        
        // Draw warning icon if valence exceeded
        if (atom.valenceValid === false) {
            this.ctx.fillStyle = '#FF0000';
            this.ctx.font = 'bold 10px Arial';
            this.ctx.fillText('!', x + radius - 3, y - radius + 5);
        }
    }

    // Draw a bond between two atoms
    drawBond(bond, molecule) {
        const atom1 = molecule.getAtomById(bond.atom1);
        const atom2 = molecule.getAtomById(bond.atom2);
        
        if (!atom1 || !atom2) return;
        
        const x1 = atom1.position.x;
        const y1 = atom1.position.y;
        const x2 = atom2.position.x;
        const y2 = atom2.position.y;
        
        // Calculate bond angle
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const perpAngle = angle + Math.PI / 2;
        
        // Draw based on bond order
        if (bond.order === 1) {
            this.drawSingleBond(x1, y1, x2, y2, bond);
        } else if (bond.order === 2) {
            this.drawDoubleBond(x1, y1, x2, y2, perpAngle, bond);
        } else if (bond.order === 3) {
            this.drawTripleBond(x1, y1, x2, y2, perpAngle, bond);
        }
    }

    drawSingleBond(x1, y1, x2, y2, bond) {
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.strokeStyle = this.getBondColor(bond);
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
    }

    drawDoubleBond(x1, y1, x2, y2, perpAngle, bond) {
        const offset = 3;
        const dx = Math.cos(perpAngle) * offset;
        const dy = Math.sin(perpAngle) * offset;
        
        this.ctx.strokeStyle = this.getBondColor(bond);
        this.ctx.lineWidth = 2;
        
        // First line
        this.ctx.beginPath();
        this.ctx.moveTo(x1 + dx, y1 + dy);
        this.ctx.lineTo(x2 + dx, y2 + dy);
        this.ctx.stroke();
        
        // Second line
        this.ctx.beginPath();
        this.ctx.moveTo(x1 - dx, y1 - dy);
        this.ctx.lineTo(x2 - dx, y2 - dy);
        this.ctx.stroke();
    }

    drawTripleBond(x1, y1, x2, y2, perpAngle, bond) {
        const offset = 4;
        const dx = Math.cos(perpAngle) * offset;
        const dy = Math.sin(perpAngle) * offset;
        
        this.ctx.strokeStyle = this.getBondColor(bond);
        this.ctx.lineWidth = 2;
        
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
    }

    // Get bond color based on polarity
    getBondColor(bond) {
        if (!bond.polarity) return '#333';
        
        const delta = bond.polarity.delta;
        if (delta < 0.5) return '#333'; // Nonpolar - dark gray
        if (delta < 1.7) return '#666'; // Polar - medium gray
        return '#999'; // Ionic - light gray
    }

    // Draw lone pairs on an atom
    drawLonePairs(atom, molecule) {
        const element = getElement(atom.element);
        const bondCount = molecule.getAtomBondCount(atom.id);
        const lonePairCount = element.lonePairs;
        
        if (lonePairCount === 0) return;
        
        // Calculate positions for lone pairs
        const bonds = molecule.getAtomBonds(atom.id);
        const baseRadius = element.radius + 10;
        
        // Get bond angles with proper sorting
        const bondAngles = bonds.map(bond => {
            const otherAtomId = bond.atom1 === atom.id ? bond.atom2 : bond.atom1;
            const otherAtom = molecule.getAtomById(otherAtomId);
            return Math.atan2(
                otherAtom.position.y - atom.position.y,
                otherAtom.position.x - atom.position.x
            );
        }).sort((a, b) => a - b);
        
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
            this.ctx.fillStyle = '#FF4444';
            this.ctx.beginPath();
            this.ctx.arc(x - 2, y, 2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(x + 2, y, 2, 0, Math.PI * 2);
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
            const wrapGapSize = (Math.PI * 2) - (lastAngle - firstAngle);
            
            if (wrapGapSize > 0.1) { // Only add if significant
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
        const x = atom.position.x + 20;
        const y = atom.position.y - 20;
        
        this.ctx.fillStyle = atom.charge > 0 ? '#0066FF' : '#FF0000';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(sign, x, y);
    }

    // Draw hybridization label
    drawHybridization(atom, molecule) {
        const x = atom.position.x;
        const y = atom.position.y + 25;
        
        // Draw hybridization type
        this.ctx.fillStyle = '#666';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(atom.hybridization, x, y);
        
        // Draw bond angles if atom has multiple bonds
        const angles = molecule.getAtomBondAngles(atom.id);
        if (angles.length > 0) {
            const element = getElement(atom.element);
            const idealAngle = getIdealBondAngle(atom.hybridization);
            
            // Draw ideal angle reference
            this.ctx.fillStyle = '#999';
            this.ctx.font = '8px Arial';
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
                this.ctx.font = 'bold 9px Arial';
                this.ctx.fillText(angleData.angle.toFixed(1) + '°', midX + dx, midY + dy);
            });
        }
    }

    // Get contrasting text color
    getTextColor(bgColor) {
        // Simple brightness calculation
        const color = bgColor.replace('#', '');
        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        return brightness > 128 ? '#000' : '#FFF';
    }

    // Draw temporary bond during creation
    drawTempBond(x1, y1, x2, y2) {
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.strokeStyle = '#999';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
}
