// Molecule Class - Graph-based representation of molecular structures

class Molecule {
    constructor() {
        this.atoms = [];
        this.bonds = [];
        this.selectedAtom = null;
        this.selectedBond = null;
        this.nextAtomId = 0;
        this.nextBondId = 0;
    }

    // Add an atom to the molecule
    addAtom(element, x, y) {
        const atom = {
            id: `atom_${this.nextAtomId++}`,
            element: element,
            position: { x, y },
            charge: 0,
            bonds: [],
            hybridization: null
        };
        
        this.atoms.push(atom);
        this.updateAtomProperties(atom);
        return atom;
    }

    // Remove an atom and its associated bonds
    removeAtom(atomId) {
        // Remove all bonds connected to this atom
        this.bonds = this.bonds.filter(bond => {
            return bond.atom1 !== atomId && bond.atom2 !== atomId;
        });
        
        // Remove the atom
        this.atoms = this.atoms.filter(atom => atom.id !== atomId);
        
        // Update remaining atoms
        this.atoms.forEach(atom => this.updateAtomProperties(atom));
    }

    // Add a bond between two atoms
    addBond(atom1Id, atom2Id, order = 1) {
        // Check if bond already exists
        const existingBond = this.bonds.find(bond => 
            (bond.atom1 === atom1Id && bond.atom2 === atom2Id) ||
            (bond.atom1 === atom2Id && bond.atom2 === atom1Id)
        );
        
        if (existingBond) {
            // Update existing bond order
            existingBond.order = order;
            return existingBond;
        }
        
        const atom1 = this.getAtomById(atom1Id);
        const atom2 = this.getAtomById(atom2Id);
        
        if (!atom1 || !atom2) return null;
        
        // Check valence constraints
        if (!this.canAddBond(atom1, order) || !this.canAddBond(atom2, order)) {
            console.warn('Valence exceeded!');
            return null;
        }
        
        const bond = {
            id: `bond_${this.nextBondId++}`,
            atom1: atom1Id,
            atom2: atom2Id,
            order: order,
            length: this.calculateBondLength(atom1, atom2),
            polarity: calculateBondPolarity(atom1.element, atom2.element)
        };
        
        this.bonds.push(bond);
        atom1.bonds.push(bond.id);
        atom2.bonds.push(bond.id);
        
        // Update properties for both atoms
        this.updateAtomProperties(atom1);
        this.updateAtomProperties(atom2);
        
        return bond;
    }

    // Remove a bond
    removeBond(bondId) {
        const bond = this.bonds.find(b => b.id === bondId);
        if (!bond) return;
        
        // Remove bond from atoms
        const atom1 = this.getAtomById(bond.atom1);
        const atom2 = this.getAtomById(bond.atom2);
        
        if (atom1) {
            atom1.bonds = atom1.bonds.filter(id => id !== bondId);
            this.updateAtomProperties(atom1);
        }
        
        if (atom2) {
            atom2.bonds = atom2.bonds.filter(id => id !== bondId);
            this.updateAtomProperties(atom2);
        }
        
        // Remove bond from list
        this.bonds = this.bonds.filter(b => b.id !== bondId);
    }

    // Change bond order
    changeBondOrder(bondId, newOrder) {
        const bond = this.bonds.find(b => b.id === bondId);
        if (!bond) return;
        
        bond.order = newOrder;
        
        // Update affected atoms
        const atom1 = this.getAtomById(bond.atom1);
        const atom2 = this.getAtomById(bond.atom2);
        
        if (atom1) this.updateAtomProperties(atom1);
        if (atom2) this.updateAtomProperties(atom2);
    }

    // Update atom properties (hybridization, charge, etc.)
    updateAtomProperties(atom) {
        const bondCount = this.getAtomBondCount(atom.id);
        const bonds = this.getAtomBonds(atom.id);
        
        // Determine hybridization based on bond types and geometry
        atom.hybridization = this.determineHybridization(atom, bonds);
        
        // Calculate partial charge
        const bondInfo = bonds.map(bond => {
            const otherAtomId = bond.atom1 === atom.id ? bond.atom2 : bond.atom1;
            const otherAtom = this.getAtomById(otherAtomId);
            return { otherElement: otherAtom.element, order: bond.order };
        });
        
        atom.charge = calculatePartialCharge(atom.element, bondInfo);
        
        // Validate valence
        atom.valenceValid = this.validateAtomValence(atom);
    }

    // Enhanced hybridization determination
    determineHybridization(atom, bonds) {
        const element = getElement(atom.element);
        if (!element) return 'unknown';
        
        // Count single, double, and triple bonds
        let singleBonds = 0;
        let doubleBonds = 0;
        let tripleBonds = 0;
        
        bonds.forEach(bond => {
            if (bond.order === 1) singleBonds++;
            else if (bond.order === 2) doubleBonds++;
            else if (bond.order === 3) tripleBonds++;
        });
        
        // Calculate electron domains (regions of electron density)
        const lonePairs = element.lonePairs;
        const bondRegions = bonds.length; // Each bond is one region regardless of order
        const totalRegions = bondRegions + lonePairs;
        
        // Determine hybridization based on regions
        if (tripleBonds > 0) {
            return 'sp'; // Triple bond requires sp hybridization
        } else if (doubleBonds > 0) {
            return 'sp2'; // Double bond requires sp2 hybridization
        } else {
            // Based on total electron domains
            switch(totalRegions) {
                case 2:
                    return 'sp';
                case 3:
                    return 'sp2';
                case 4:
                    return 'sp3';
                default:
                    return 'sp3';
            }
        }
    }

    // Validate atom valence
    validateAtomValence(atom) {
        const element = getElement(atom.element);
        if (!element) return false;
        
        const currentBondOrder = this.getAtomBondCount(atom.id);
        return currentBondOrder <= element.valence;
    }

    // Get atom by ID
    getAtomById(id) {
        return this.atoms.find(atom => atom.id === id);
    }

    // Get atom at position (for click detection)
    getAtomAtPosition(x, y, threshold = 20) {
        return this.atoms.find(atom => {
            const dx = atom.position.x - x;
            const dy = atom.position.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= threshold;
        });
    }

    // Get bonds connected to an atom
    getAtomBonds(atomId) {
        return this.bonds.filter(bond => 
            bond.atom1 === atomId || bond.atom2 === atomId
        );
    }

    // Get total bond order for an atom
    getAtomBondCount(atomId) {
        const bonds = this.getAtomBonds(atomId);
        return bonds.reduce((sum, bond) => sum + bond.order, 0);
    }

    // Check if an atom can form more bonds
    canAddBond(atom, bondOrder = 1) {
        const currentBonds = this.getAtomBondCount(atom.id);
        const element = getElement(atom.element);
        return currentBonds + bondOrder <= element.valence;
    }

    // Calculate distance between two atoms
    calculateBondLength(atom1, atom2) {
        const dx = atom2.position.x - atom1.position.x;
        const dy = atom2.position.y - atom1.position.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Calculate molecular formula
    getMolecularFormula() {
        const elementCounts = {};
        
        this.atoms.forEach(atom => {
            elementCounts[atom.element] = (elementCounts[atom.element] || 0) + 1;
        });
        
        // Sort by conventional order: C, H, then alphabetically
        const order = ['C', 'H'];
        const sortedElements = Object.keys(elementCounts).sort((a, b) => {
            const aIndex = order.indexOf(a);
            const bIndex = order.indexOf(b);
            
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            return a.localeCompare(b);
        });
        
        let formula = '';
        sortedElements.forEach(element => {
            formula += element;
            if (elementCounts[element] > 1) {
                formula += elementCounts[element];
            }
        });
        
        return formula || '-';
    }

    // Calculate molecular weight
    getMolecularWeight() {
        let weight = 0;
        this.atoms.forEach(atom => {
            const element = getElement(atom.element);
            weight += element.atomicMass;
        });
        return weight; // Return number instead of string
    }

    // Calculate bond angle between three atoms
    calculateBondAngle(atom1Id, centerAtomId, atom2Id) {
        const atom1 = this.getAtomById(atom1Id);
        const center = this.getAtomById(centerAtomId);
        const atom2 = this.getAtomById(atom2Id);
        
        if (!atom1 || !center || !atom2) return null;
        
        // Calculate vectors from center to each atom
        const v1x = atom1.position.x - center.position.x;
        const v1y = atom1.position.y - center.position.y;
        const v2x = atom2.position.x - center.position.x;
        const v2y = atom2.position.y - center.position.y;
        
        // Calculate angle using dot product
        const dot = v1x * v2x + v1y * v2y;
        const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
        const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
        
        if (mag1 === 0 || mag2 === 0) return null;
        
        const cosAngle = dot / (mag1 * mag2);
        const angleRad = Math.acos(Math.max(-1, Math.min(1, cosAngle))); // Clamp to [-1, 1]
        const angleDeg = angleRad * (180 / Math.PI);
        
        return angleDeg;
    }

    // Get all bond angles for an atom
    getAtomBondAngles(atomId) {
        const bonds = this.getAtomBonds(atomId);
        if (bonds.length < 2) return [];
        
        const angles = [];
        
        // Calculate angle between each pair of bonds
        for (let i = 0; i < bonds.length; i++) {
            for (let j = i + 1; j < bonds.length; j++) {
                const atom1Id = bonds[i].atom1 === atomId ? bonds[i].atom2 : bonds[i].atom1;
                const atom2Id = bonds[j].atom1 === atomId ? bonds[j].atom2 : bonds[j].atom1;
                
                const angle = this.calculateBondAngle(atom1Id, atomId, atom2Id);
                if (angle !== null) {
                    angles.push({
                        atom1: atom1Id,
                        center: atomId,
                        atom2: atom2Id,
                        angle: angle
                    });
                }
            }
        }
        
        return angles;
    }

    // Detect rings in the molecule
    detectRings() {
        const visited = new Set();
        const rings = [];
        
        const dfs = (atomId, parent, path) => {
            if (visited.has(atomId)) {
                // Found a cycle
                const cycleStart = path.indexOf(atomId);
                if (cycleStart !== -1) {
                    const ring = path.slice(cycleStart);
                    if (ring.length >= 3 && ring.length <= 10) {
                        rings.push(ring);
                    }
                }
                return;
            }
            
            visited.add(atomId);
            path.push(atomId);
            
            const bonds = this.getAtomBonds(atomId);
            bonds.forEach(bond => {
                const nextId = bond.atom1 === atomId ? bond.atom2 : bond.atom1;
                if (nextId !== parent) {
                    dfs(nextId, atomId, [...path]);
                }
            });
        };
        
        this.atoms.forEach(atom => {
            if (!visited.has(atom.id)) {
                dfs(atom.id, null, []);
            }
        });
        
        return rings;
    }

    // Check for functional groups
    detectFunctionalGroups() {
        const groups = [];
        
        this.atoms.forEach(atom => {
            const bonds = this.getAtomBonds(atom.id);
            const element = atom.element;
            
            // Alcohol (-OH)
            if (element === 'O') {
                const connectedAtoms = bonds.map(b => 
                    this.getAtomById(b.atom1 === atom.id ? b.atom2 : b.atom1)
                );
                const hasH = connectedAtoms.some(a => a.element === 'H');
                const hasC = connectedAtoms.some(a => a.element === 'C');
                if (hasH && hasC && bonds.length === 2) {
                    groups.push({ type: 'Alcohol', atomId: atom.id });
                }
            }
            
            // Carbonyl (C=O)
            if (element === 'C') {
                const doubleBondO = bonds.find(b => {
                    const otherAtom = this.getAtomById(b.atom1 === atom.id ? b.atom2 : b.atom1);
                    return b.order === 2 && otherAtom.element === 'O';
                });
                if (doubleBondO) {
                    groups.push({ type: 'Carbonyl', atomId: atom.id });
                }
            }
            
            // Amine (-NH2, -NH-, -N<)
            if (element === 'N') {
                const hCount = bonds.filter(b => {
                    const otherAtom = this.getAtomById(b.atom1 === atom.id ? b.atom2 : b.atom1);
                    return otherAtom.element === 'H';
                }).length;
                
                if (hCount === 2) groups.push({ type: 'Primary Amine', atomId: atom.id });
                else if (hCount === 1) groups.push({ type: 'Secondary Amine', atomId: atom.id });
                else if (hCount === 0 && bonds.length === 3) groups.push({ type: 'Tertiary Amine', atomId: atom.id });
            }
        });
        
        return groups;
    }

    // Clear the molecule
    clear() {
        this.atoms = [];
        this.bonds = [];
        this.selectedAtom = null;
        this.selectedBond = null;
    }

    // Export molecule as JSON
    toJSON() {
        return {
            atoms: this.atoms,
            bonds: this.bonds
        };
    }

    // Import molecule from JSON
    fromJSON(data) {
        this.clear();
        this.atoms = data.atoms || [];
        this.bonds = data.bonds || [];
        
        // Update atom properties
        this.atoms.forEach(atom => this.updateAtomProperties(atom));
    }
}
