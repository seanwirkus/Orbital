// Clipboard and SMILES Export System
// Handles copy/paste operations with SMILES format for AI/ChatGPT compatibility

class ClipboardManager {
    constructor() {
        this.copiedMolecule = null;
    }
    
    // Generate SMILES string from molecule (simplified - basic implementation)
    generateSMILES(molecule) {
        if (!molecule || molecule.atoms.length === 0) {
            return '';
        }
        
        try {
            // Simple SMILES generation for common structures
            const visited = new Set();
            const smiles = [];
            
            // Start with first carbon or any atom
            const startAtom = molecule.atoms[0];
            this.buildSMILES(startAtom, molecule, visited, smiles, null);
            
            return smiles.join('');
        } catch (error) {
            console.error('SMILES generation error:', error);
            return this.fallbackToJSON(molecule);
        }
    }
    
    buildSMILES(atom, molecule, visited, smiles, fromBond) {
        if (visited.has(atom.id)) return;
        visited.add(atom.id);
        
        // Add element (skip C in organic style)
        if (atom.element !== 'C' && atom.element !== 'H') {
            smiles.push(atom.element);
        } else if (atom.element === 'C') {
            const bonds = molecule.getAtomBonds(atom.id);
            const carbons = bonds.filter(b => {
                const other = molecule.getAtomById(b.atom1 === atom.id ? b.atom2 : b.atom1);
                return other && other.element === 'C';
            });
            
            // Explicitly write C if: charged, has double/triple bonds, or branches
            if (atom.charge !== 0 || bonds.some(b => b.order > 1) || carbons.length > 2) {
                smiles.push('C');
            }
        }
        
        // Add charge if present
        if (atom.charge > 0) {
            smiles.push(`+${atom.charge > 1 ? atom.charge : ''}`);
        } else if (atom.charge < 0) {
            smiles.push(`${atom.charge < -1 ? atom.charge : '-'}`);
        }
        
        // Get bonds
        const bonds = molecule.getAtomBonds(atom.id).filter(b => b !== fromBond);
        
        // Sort bonds: single first, then double, then triple
        bonds.sort((a, b) => a.order - b.order);
        
        // Process bonds
        bonds.forEach((bond, index) => {
            const otherAtomId = bond.atom1 === atom.id ? bond.atom2 : bond.atom1;
            const otherAtom = molecule.getAtomById(otherAtomId);
            
            if (!otherAtom || visited.has(otherAtom.id)) return;
            
            // Add bond symbol
            if (bond.order === 2) {
                smiles.push('=');
            } else if (bond.order === 3) {
                smiles.push('#');
            }
            
            // Branch notation
            if (index > 0) {
                smiles.push('(');
            }
            
            this.buildSMILES(otherAtom, molecule, visited, smiles, bond);
            
            if (index > 0) {
                smiles.push(')');
            }
        });
    }
    
    fallbackToJSON(molecule) {
        // Fallback: return JSON representation
        return JSON.stringify({
            atoms: molecule.atoms.map(a => ({
                element: a.element,
                x: Math.round(a.x),
                y: Math.round(a.y),
                charge: a.charge || 0
            })),
            bonds: molecule.bonds.map(b => ({
                atom1: b.atom1,
                atom2: b.atom2,
                order: b.order
            }))
        });
    }
    
    // Copy molecule to clipboard (SMILES + JSON)
    async copyMolecule(molecule) {
        if (!molecule || molecule.atoms.length === 0) {
            console.log('Nothing to copy');
            return false;
        }
        
        const smiles = this.generateSMILES(molecule);
        const json = this.fallbackToJSON(molecule);
        const formula = molecule.getMolecularFormula();
        const mw = molecule.getMolecularWeight();
        
        // Create comprehensive text for ChatGPT/AI
        const aiText = `Chemical Structure:
SMILES: ${smiles}
Molecular Formula: ${formula}
Molecular Weight: ${typeof mw === 'number' ? mw.toFixed(2) : mw} g/mol
Atoms: ${molecule.atoms.length}
Bonds: ${molecule.bonds.length}

Structure Data (JSON):
${json}

Note: This structure can be analyzed, modified, or used for reaction predictions.`;
        
        try {
            // Copy to clipboard
            await navigator.clipboard.writeText(aiText);
            
            // Store for internal paste
            this.copiedMolecule = {
                atoms: JSON.parse(JSON.stringify(molecule.atoms)),
                bonds: JSON.parse(JSON.stringify(molecule.bonds))
            };
            
            console.log('✓ Copied to clipboard (SMILES + JSON format)');
            this.showNotification('Copied to clipboard!', 'success');
            return true;
        } catch (error) {
            console.error('Copy failed:', error);
            this.showNotification('Copy failed', 'error');
            return false;
        }
    }
    
    // Paste molecule from clipboard
    pasteMolecule(targetMolecule, offsetX = 50, offsetY = 50) {
        if (!this.copiedMolecule) {
            console.log('Nothing to paste');
            return false;
        }
        
        try {
            const atomIdMap = {};
            
            // Add atoms with offset
            this.copiedMolecule.atoms.forEach(atom => {
                const newAtom = targetMolecule.addAtom(
                    atom.element,
                    atom.x + offsetX,
                    atom.y + offsetY
                );
                atomIdMap[atom.id] = newAtom.id;
                
                if (atom.charge) {
                    newAtom.charge = atom.charge;
                }
            });
            
            // Add bonds
            this.copiedMolecule.bonds.forEach(bond => {
                const newAtom1 = atomIdMap[bond.atom1];
                const newAtom2 = atomIdMap[bond.atom2];
                
                if (newAtom1 && newAtom2) {
                    targetMolecule.addBond(newAtom1, newAtom2, bond.order);
                }
            });
            
            console.log('✓ Pasted molecule');
            this.showNotification('Pasted from clipboard!', 'success');
            return true;
        } catch (error) {
            console.error('Paste failed:', error);
            this.showNotification('Paste failed', 'error');
            return false;
        }
    }
    
    // Cut molecule (copy + clear)
    async cutMolecule(molecule) {
        const copied = await this.copyMolecule(molecule);
        if (copied) {
            molecule.clear();
            this.showNotification('Cut to clipboard!', 'success');
            return true;
        }
        return false;
    }
    
    // Export as various formats
    exportAsSMILES(molecule) {
        return this.generateSMILES(molecule);
    }
    
    exportAsJSON(molecule) {
        return this.fallbackToJSON(molecule);
    }
    
    exportAsMolFile(molecule) {
        // Generate MOL file format (V2000)
        let molFile = `
  Orbital Chemistry Tool

  0  0  0  0  0  0  0  0  0  0999 V2000
`;
        
        // Atom block
        molecule.atoms.forEach(atom => {
            const x = (atom.x / 50).toFixed(4).padStart(10);
            const y = (atom.y / 50).toFixed(4).padStart(10);
            const z = '0.0000'.padStart(10);
            const element = atom.element.padEnd(3);
            
            molFile += `${x}${y}${z} ${element} 0  ${atom.charge}  0  0  0  0  0  0  0  0  0\n`;
        });
        
        // Bond block
        molecule.bonds.forEach(bond => {
            const atom1Idx = molecule.atoms.findIndex(a => a.id === bond.atom1) + 1;
            const atom2Idx = molecule.atoms.findIndex(a => a.id === bond.atom2) + 1;
            
            molFile += `${atom1Idx.toString().padStart(3)}${atom2Idx.toString().padStart(3)}${bond.order.toString().padStart(3)}  0  0  0  0\n`;
        });
        
        molFile += 'M  END\n';
        return molFile;
    }
    
    // Show notification
    showNotification(message, type = 'info') {
        const notif = document.createElement('div');
        notif.className = `clipboard-notification ${type}`;
        notif.textContent = message;
        notif.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notif);
        
        setTimeout(() => {
            notif.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notif.remove(), 300);
        }, 2000);
    }
}

// Add CSS for notification animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClipboardManager;
}
