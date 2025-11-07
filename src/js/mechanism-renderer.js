// SVG-based Mechanism Renderer
// Generates interactive mechanism diagrams with electron flow arrows

class MechanismRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.svg = null;
        this.currentStep = 0;
        this.animationSpeed = 1000; // ms per step
        this.scaleFactor = 1.0;
    }
    
    // Create SVG canvas for mechanism
    initializeSVG(width = 1400, height = 800) {
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', '100%');
        this.svg.style.background = '#ffffff';
        this.svg.style.border = '2px solid #ddd';
        this.svg.style.borderRadius = '8px';
        
        // Add defs for arrow markers
        this.createArrowMarkers();
        
        this.container.innerHTML = '';
        this.container.appendChild(this.svg);
    }
    
    // Create reusable arrow markers for electron flow
    createArrowMarkers() {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        // Blue arrow for nucleophilic attack
        const blueMarker = this.createMarker('arrow-blue', '#0066cc');
        defs.appendChild(blueMarker);
        
        // Red arrow for electrophilic attack
        const redMarker = this.createMarker('arrow-red', '#cc0066');
        defs.appendChild(redMarker);
        
        // Green arrow for bond formation
        const greenMarker = this.createMarker('arrow-green', '#009900');
        defs.appendChild(greenMarker);
        
        // Purple arrow for resonance
        const purpleMarker = this.createMarker('arrow-purple', '#9900cc');
        defs.appendChild(purpleMarker);
        
        this.svg.appendChild(defs);
    }
    
    createMarker(id, color) {
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', id);
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '10');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3');
        marker.setAttribute('orient', 'auto');
        
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3, 0 6');
        polygon.setAttribute('fill', color);
        
        marker.appendChild(polygon);
        return marker;
    }
    
    // Render full mechanism from database
    renderMechanism(reactionData, moleculeData) {
        this.initializeSVG();
        
        const { mechanism, name } = reactionData;
        
        // Add title
        this.addTitle(name, 700, 30);
        
        let xOffset = 100;
        const yCenter = 400;
        const stepWidth = 350;
        
        // Draw starting material
        this.drawMoleculeStructure(moleculeData.reactant, xOffset, yCenter, 'Starting Material');
        
        // Draw each mechanism step
        mechanism.forEach((step, index) => {
            xOffset += stepWidth;
            
            // Draw arrow with step info
            this.drawMechanismArrow(
                xOffset - stepWidth + 200,
                yCenter,
                xOffset - 150,
                yCenter,
                step,
                index
            );
            
            // Draw intermediate or product
            const isProduct = index === mechanism.length - 1;
            const label = isProduct ? 'Product' : `Intermediate ${index + 1}`;
            
            this.drawMoleculeStructure(
                moleculeData.intermediates?.[index] || moleculeData.product,
                xOffset,
                yCenter,
                label
            );
        });
        
        // Add mechanism description at bottom
        this.addMechanismSummary(reactionData, 700, 750);
    }
    
    // Draw molecule structure from atom/bond data
    drawMoleculeStructure(molecule, centerX, centerY, label) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'molecule-structure');
        
        // Label with better styling
        const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        labelBg.setAttribute('x', centerX - 60);
        labelBg.setAttribute('y', centerY - 135);
        labelBg.setAttribute('width', '120');
        labelBg.setAttribute('height', '25');
        labelBg.setAttribute('fill', '#f0f4ff');
        labelBg.setAttribute('stroke', '#667eea');
        labelBg.setAttribute('stroke-width', '2');
        labelBg.setAttribute('rx', '6');
        group.appendChild(labelBg);
        
        const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        labelText.setAttribute('x', centerX);
        labelText.setAttribute('y', centerY - 115);
        labelText.setAttribute('text-anchor', 'middle');
        labelText.setAttribute('font-size', '14');
        labelText.setAttribute('font-weight', '600');
        labelText.setAttribute('fill', '#667eea');
        labelText.textContent = label;
        group.appendChild(labelText);
        
        // Convert molecule data to SVG paths
        if (molecule && molecule.atoms) {
            // Draw bonds first (so they appear behind atoms)
            molecule.bonds.forEach(bond => {
                const atom1 = molecule.atoms.find(a => a.id === bond.atom1);
                const atom2 = molecule.atoms.find(a => a.id === bond.atom2);
                
                if (atom1 && atom2) {
                    this.drawBond(
                        group,
                        atom1.position.x + centerX - 100,
                        atom1.position.y + centerY - 100,
                        atom2.position.x + centerX - 100,
                        atom2.position.y + centerY - 100,
                        bond.order
                    );
                }
            });
            
            // Draw atoms with animation capability
            molecule.atoms.forEach((atom, index) => {
                const atomGroup = this.drawAtom(
                    group,
                    atom.element,
                    atom.position.x + centerX - 100,
                    atom.position.y + centerY - 100,
                    atom.charge || 0
                );
                
                // Add subtle entrance animation
                if (atomGroup) {
                    atomGroup.style.opacity = '0';
                    atomGroup.style.transform = 'scale(0.8)';
                    setTimeout(() => {
                        atomGroup.style.transition = 'all 0.3s ease-out';
                        atomGroup.style.opacity = '1';
                        atomGroup.style.transform = 'scale(1)';
                    }, 50 + index * 50);
                }
            });
        } else {
            // Placeholder for empty structure with better design
            const placeholder = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            placeholder.setAttribute('x', centerX - 80);
            placeholder.setAttribute('y', centerY - 80);
            placeholder.setAttribute('width', '160');
            placeholder.setAttribute('height', '160');
            placeholder.setAttribute('fill', '#fafbfc');
            placeholder.setAttribute('stroke', '#e0e0e0');
            placeholder.setAttribute('stroke-width', '2');
            placeholder.setAttribute('stroke-dasharray', '5,5');
            placeholder.setAttribute('rx', '8');
            group.appendChild(placeholder);
            
            const placeholderText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            placeholderText.setAttribute('x', centerX);
            placeholderText.setAttribute('y', centerY);
            placeholderText.setAttribute('text-anchor', 'middle');
            placeholderText.setAttribute('font-size', '12');
            placeholderText.setAttribute('fill', '#999');
            placeholderText.textContent = 'No structure';
            group.appendChild(placeholderText);
        }
        
        this.svg.appendChild(group);
    }
    
    // Draw bonds with proper order (single, double, triple)
    drawBond(parent, x1, y1, x2, y2, order) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const perpX = -dy / length;
        const perpY = dx / length;
        const offset = 4;
        
        if (order === 1) {
            // Single bond
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            line.setAttribute('stroke', '#000');
            line.setAttribute('stroke-width', '2');
            parent.appendChild(line);
        } else if (order === 2) {
            // Double bond
            for (let i = -1; i <= 1; i += 2) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x1 + perpX * offset * i);
                line.setAttribute('y1', y1 + perpY * offset * i);
                line.setAttribute('x2', x2 + perpX * offset * i);
                line.setAttribute('y2', y2 + perpY * offset * i);
                line.setAttribute('stroke', '#000');
                line.setAttribute('stroke-width', '2');
                parent.appendChild(line);
            }
        } else if (order === 3) {
            // Triple bond
            for (let i = -1; i <= 1; i++) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x1 + perpX * offset * i);
                line.setAttribute('y1', y1 + perpY * offset * i);
                line.setAttribute('x2', x2 + perpX * offset * i);
                line.setAttribute('y2', y2 + perpY * offset * i);
                line.setAttribute('stroke', '#000');
                line.setAttribute('stroke-width', '2');
                parent.appendChild(line);
            }
        }
    }
    
    // Draw atom with element symbol and charge
    drawAtom(parent, element, x, y, charge) {
        // Don't draw carbon unless it's charged or special
        if (element === 'C' && charge === 0) return;
        
        const colors = {
            'C': '#000', 'H': '#000', 'O': '#d00', 'N': '#00d',
            'S': '#cc0', 'P': '#f90', 'F': '#0c0', 'Cl': '#0c0',
            'Br': '#a52a2a', 'I': '#800080'
        };
        
        // Background circle for non-carbon atoms
        if (element !== 'C') {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', '12');
            circle.setAttribute('fill', '#fff');
            circle.setAttribute('stroke', 'none');
            parent.appendChild(circle);
        }
        
        // Element symbol
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y + 5);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '18');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('fill', colors[element] || '#000');
        text.textContent = element;
        parent.appendChild(text);
        
        // Charge
        if (charge !== 0) {
            const chargeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            chargeText.setAttribute('x', x + 15);
            chargeText.setAttribute('y', y - 8);
            chargeText.setAttribute('font-size', '14');
            chargeText.setAttribute('fill', '#0066cc');
            chargeText.setAttribute('font-weight', 'bold');
            chargeText.textContent = charge > 0 ? `+${charge > 1 ? charge : ''}` : `-${Math.abs(charge) > 1 ? Math.abs(charge) : ''}`;
            parent.appendChild(chargeText);
        }
    }
    
    // Draw curved arrow showing electron flow
    drawMechanismArrow(x1, y1, x2, y2, step, stepIndex) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', `mechanism-arrow step-${stepIndex}`);
        group.setAttribute('opacity', '0'); // Start invisible for animation
        
        // Choose color based on step type
        const color = this.getArrowColor(step.electronFlow[0]?.type);
        
        // Draw each electron flow arrow
        step.electronFlow.forEach((flow, flowIndex) => {
            const flowColor = this.getArrowColor(flow.type);
            
            // Create curved path for arrow with unique curve
            const controlY = y1 - 60 - (flowIndex * 20);
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const d = `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${controlY} ${x2} ${y2}`;
            path.setAttribute('d', d);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', flowColor);
            path.setAttribute('stroke-width', '3');
            path.setAttribute('class', 'electron-flow-arrow');
            
            // Add animated arrow marker
            const markerId = `arrow-${flowColor.replace('#', '')}`;
            path.setAttribute('marker-end', `url(#${markerId})`);
            
            // Add animation attributes
            const pathLength = path.getTotalLength ? path.getTotalLength() : 200;
            path.style.strokeDasharray = pathLength;
            path.style.strokeDashoffset = pathLength;
            
            group.appendChild(path);
        });
        
        // Step label with background
        const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        labelBg.setAttribute('x', (x1 + x2) / 2 - 80);
        labelBg.setAttribute('y', y1 - 85);
        labelBg.setAttribute('width', '160');
        labelBg.setAttribute('height', '25');
        labelBg.setAttribute('fill', '#fff');
        labelBg.setAttribute('stroke', color);
        labelBg.setAttribute('stroke-width', '2');
        labelBg.setAttribute('rx', '6');
        labelBg.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))';
        group.appendChild(labelBg);
        
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', (x1 + x2) / 2);
        label.setAttribute('y', y1 - 65);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-size', '13');
        label.setAttribute('font-weight', 'bold');
        label.setAttribute('fill', color);
        label.textContent = `${stepIndex + 1}. ${step.title}`;
        group.appendChild(label);
        
        // Description below with better styling
        const desc = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        desc.setAttribute('x', (x1 + x2) / 2);
        desc.setAttribute('y', y1 - 45);
        desc.setAttribute('text-anchor', 'middle');
        desc.setAttribute('font-size', '11');
        desc.setAttribute('fill', '#666');
        desc.setAttribute('font-style', 'italic');
        
        // Word wrap description
        const words = step.description.split(' ');
        let line = '';
        const maxWidth = 35;
        
        for (let i = 0; i < words.length; i++) {
            if ((line + words[i]).length > maxWidth && line.length > 0) {
                break;
            }
            line += words[i] + ' ';
        }
        desc.textContent = line.trim() + (words.length > line.split(' ').length ? '...' : '');
        group.appendChild(desc);
        
        this.svg.appendChild(group);
    }
    
    // Get arrow color based on electron flow type
    getArrowColor(flowType) {
        const colorMap = {
            'nucleophilic_attack': '#0066cc',
            'deprotonation': '#0066cc',
            'electrophilic_attack': '#cc0066',
            'bond_formation': '#009900',
            'bond_cleavage': '#cc0066',
            'pi_bond_formation': '#009900',
            'resonance_delocalization': '#9900cc',
            'heterolytic_cleavage': '#cc0066',
            'hydride_transfer': '#0066cc',
            'electron_push': '#9900cc'
        };
        return colorMap[flowType] || '#333';
    }
    
    // Add title text
    addTitle(text, x, y) {
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        title.setAttribute('x', x);
        title.setAttribute('y', y);
        title.setAttribute('text-anchor', 'middle');
        title.setAttribute('font-size', '24');
        title.setAttribute('font-weight', 'bold');
        title.setAttribute('fill', '#333');
        title.textContent = text;
        this.svg.appendChild(title);
    }
    
    // Add mechanism summary at bottom
    addMechanismSummary(reactionData, x, y) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        // Reagents
        const reagentText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        reagentText.setAttribute('x', x);
        reagentText.setAttribute('y', y);
        reagentText.setAttribute('text-anchor', 'middle');
        reagentText.setAttribute('font-size', '14');
        reagentText.setAttribute('fill', '#666');
        reagentText.textContent = `Reagents: ${reactionData.reagents.join(', ')}`;
        group.appendChild(reagentText);
        
        // Conditions
        const condText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        condText.setAttribute('x', x);
        condText.setAttribute('y', y + 20);
        condText.setAttribute('text-anchor', 'middle');
        condText.setAttribute('font-size', '14');
        condText.setAttribute('fill', '#666');
        condText.textContent = `Conditions: ${reactionData.conditions}`;
        group.appendChild(condText);
        
        this.svg.appendChild(group);
    }
    
    // Truncate long text
    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }
    
    // Animate mechanism step by step with enhanced visual effects
    animateStep(stepIndex) {
        const arrows = this.svg.querySelectorAll('.mechanism-arrow');
        if (!arrows[stepIndex]) return;
        
        const arrow = arrows[stepIndex];
        const electronFlows = arrow.querySelectorAll('.electron-flow-arrow');
        
        // Get the current step data for atom highlighting
        if (this.currentMechanism && this.currentMechanism.mechanism[stepIndex]) {
            const step = this.currentMechanism.mechanism[stepIndex];
            this.highlightReactingAtoms(step);
        }
        
        // Fade in the step group
        arrow.style.transition = 'opacity 0.5s ease-in';
        arrow.setAttribute('opacity', '1');
        
        // Animate each electron flow arrow
        electronFlows.forEach((path, index) => {
            setTimeout(() => {
                const pathLength = path.getTotalLength ? path.getTotalLength() : 200;
                path.style.transition = `stroke-dashoffset 0.8s ease-in-out`;
                path.style.strokeDashoffset = '0';
            }, index * 300);
        });
    }
    
    // Highlight atoms involved in the reaction step
    highlightReactingAtoms(step) {
        // Get all atom groups in the SVG
        const atomGroups = this.svg.querySelectorAll('.atom-group');
        
        // Remove previous highlights
        atomGroups.forEach(group => {
            group.classList.remove('atom-active');
            const circle = group.querySelector('.atom-circle');
            if (circle) circle.classList.remove('reacting');
        });
        
        // Add pulsing effect to atoms involved in this step
        // This is a simplified version - in a full implementation, you'd track
        // atom indices from the electron flow data
        step.electronFlow.forEach((flow, index) => {
            // Highlight a few atoms based on the electron flow
            if (index < atomGroups.length) {
                const atomGroup = atomGroups[index];
                atomGroup.classList.add('atom-active');
                const circle = atomGroup.querySelector('.atom-circle');
                if (circle) {
                    circle.classList.add('reacting');
                }
                
                // Remove highlight after animation
                setTimeout(() => {
                    atomGroup.classList.remove('atom-active');
                    if (circle) circle.classList.remove('reacting');
                }, 1500);
            }
        });
    }
    
    // Play full animation
    playAnimation() {
        const arrows = this.svg.querySelectorAll('.mechanism-arrow');
        
        // Reset all arrows first
        arrows.forEach(arrow => {
            arrow.setAttribute('opacity', '0');
            const electronFlows = arrow.querySelectorAll('.electron-flow-arrow');
            electronFlows.forEach(path => {
                const pathLength = path.getTotalLength ? path.getTotalLength() : 200;
                path.style.strokeDasharray = pathLength;
                path.style.strokeDashoffset = pathLength;
            });
        });
        
        // Animate each step in sequence
        arrows.forEach((arrow, index) => {
            setTimeout(() => this.animateStep(index), index * this.animationSpeed);
        });
    }
    
    // Export SVG as downloadable file
    exportSVG(filename = 'mechanism.svg') {
        const svgData = new XMLSerializer().serializeToString(this.svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MechanismRenderer;
}
