// Molecule Model v2 - Clean, Immutable, Pure Data Structure
// No rendering, no UI, just chemistry data

// Use IIFE to avoid global scope conflicts
(function() {
'use strict';

class AtomV2 {
    constructor(id, element, x, y, options = {}) {
        this.id = id;
        this.element = element;
        this.position = { x, y };
        this.charge = options.charge || 0;
        this.radicals = options.radicals || 0;
        this.isotope = options.isotope || null;
        this.stereo = options.stereo || null; // R, S, E, Z
        this.hybridization = null; // Calculated
        this.bonds = []; // Bond IDs
    }

    clone() {
        return new AtomV2(
            this.id,
            this.element,
            this.position.x,
            this.position.y,
            {
                charge: this.charge,
                radicals: this.radicals,
                isotope: this.isotope,
                stereo: this.stereo
            }
        );
    }

    move(x, y) {
        const cloned = this.clone();
        cloned.position = { x, y };
        return cloned;
    }
}

class BondV2 {
    constructor(id, atom1Id, atom2Id, order, options = {}) {
        this.id = id;
        this.atom1 = atom1Id;
        this.atom2 = atom2Id;
        this.order = Math.max(1, Math.min(3, order)); // Clamp 1-3
        this.stereo = options.stereo || null; // E, Z, up, down
        this.type = options.type || 'covalent'; // covalent, ionic, etc.
    }

    clone() {
        return new BondV2(
            this.id,
            this.atom1,
            this.atom2,
            this.order,
            {
                stereo: this.stereo,
                type: this.type
            }
        );
    }

    changeOrder(newOrder) {
        const cloned = this.clone();
        cloned.order = Math.max(1, Math.min(3, newOrder));
        return cloned;
    }
}

class MoleculeV2Class {
    constructor() {
        this.atoms = new Map(); // id -> AtomV2
        this.bonds = new Map(); // id -> BondV2
        this.nextAtomId = 0;
        this.nextBondId = 0;
        this.metadata = {
            name: '',
            formula: '',
            molecularWeight: 0
        };
    }

    // Immutable operations - return new molecule
    addAtom(element, x, y, options = {}) {
        const cloned = this.clone();
        const id = `atom_${cloned.nextAtomId++}`;
        const atom = new AtomV2(id, element, x, y, options);
        cloned.atoms.set(id, atom);
        cloned.updateMetadata();
        return { molecule: cloned, atom };
    }

    removeAtom(atomId) {
        const cloned = this.clone();
        cloned.atoms.delete(atomId);
        
        // Remove all bonds connected to this atom
        const bondsToRemove = [];
        cloned.bonds.forEach((bond, bondId) => {
            if (bond.atom1 === atomId || bond.atom2 === atomId) {
                bondsToRemove.push(bondId);
            }
        });
        bondsToRemove.forEach(bondId => cloned.bonds.delete(bondId));
        
        cloned.updateMetadata();
        return cloned;
    }

    addBond(atom1Id, atom2Id, order = 1, options = {}) {
        // Check if bond already exists
        for (const bond of this.bonds.values()) {
            if ((bond.atom1 === atom1Id && bond.atom2 === atom2Id) ||
                (bond.atom1 === atom2Id && bond.atom2 === atom1Id)) {
                // Update existing bond
                const cloned = this.clone();
                const existingBond = cloned.bonds.get(bond.id);
                cloned.bonds.set(bond.id, existingBond.changeOrder(order));
                cloned.updateMetadata();
                return { molecule: cloned, bond: cloned.bonds.get(bond.id) };
            }
        }

        const cloned = this.clone();
        const id = `bond_${cloned.nextBondId++}`;
        const bond = new BondV2(id, atom1Id, atom2Id, order, options);
        cloned.bonds.set(id, bond);
        
        // Update atom bond references
        cloned.atoms.get(atom1Id)?.bonds.push(id);
        cloned.atoms.get(atom2Id)?.bonds.push(id);
        
        cloned.updateMetadata();
        return { molecule: cloned, bond };
    }

    removeBond(bondId) {
        const cloned = this.clone();
        const bond = cloned.bonds.get(bondId);
        if (!bond) return cloned;
        
        cloned.bonds.delete(bondId);
        
        // Remove bond references from atoms
        const atom1 = cloned.atoms.get(bond.atom1);
        const atom2 = cloned.atoms.get(bond.atom2);
        if (atom1) atom1.bonds = atom1.bonds.filter(id => id !== bondId);
        if (atom2) atom2.bonds = atom2.bonds.filter(id => id !== bondId);
        
        cloned.updateMetadata();
        return cloned;
    }

    getAtom(id) {
        return this.atoms.get(id);
    }

    getBond(id) {
        return this.bonds.get(id);
    }

    getAtomBonds(atomId) {
        const atom = this.atoms.get(atomId);
        if (!atom) return [];
        return atom.bonds.map(bondId => this.bonds.get(bondId)).filter(Boolean);
    }

    getBondOrder(atomId) {
        const bonds = this.getAtomBonds(atomId);
        return bonds.reduce((sum, bond) => sum + bond.order, 0);
    }

    changeBondOrder(bondId, newOrder) {
        const cloned = this.clone();
        const bond = cloned.bonds.get(bondId);
        if (!bond) return cloned;
        
        const updatedBond = bond.changeOrder(newOrder);
        cloned.bonds.set(bondId, updatedBond);
        cloned.updateMetadata();
        return cloned;
    }

    clone() {
        const cloned = new MoleculeV2Class();
        cloned.nextAtomId = this.nextAtomId;
        cloned.nextBondId = this.nextBondId;
        
        this.atoms.forEach((atom, id) => {
            cloned.atoms.set(id, atom.clone());
        });
        
        this.bonds.forEach((bond, id) => {
            cloned.bonds.set(id, bond.clone());
        });
        
        cloned.metadata = { ...this.metadata };
        return cloned;
    }

    updateMetadata() {
        // Calculate formula
        const elementCounts = {};
        this.atoms.forEach(atom => {
            elementCounts[atom.element] = (elementCounts[atom.element] || 0) + 1;
        });
        
        const order = ['C', 'H'];
        const sorted = Object.keys(elementCounts).sort((a, b) => {
            const aIdx = order.indexOf(a);
            const bIdx = order.indexOf(b);
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
            if (aIdx !== -1) return -1;
            if (bIdx !== -1) return 1;
            return a.localeCompare(b);
        });
        
        this.metadata.formula = sorted.map(el => {
            const count = elementCounts[el];
            return count > 1 ? `${el}${count}` : el;
        }).join('');
        
        // Calculate molecular weight (simplified)
        let weight = 0;
        this.atoms.forEach(atom => {
            const element = getElement(atom.element);
            if (element) weight += element.atomicMass || 0;
        });
        this.metadata.molecularWeight = weight;
    }

    // Convert to array format for compatibility
    toArray() {
        return {
            atoms: Array.from(this.atoms.values()),
            bonds: Array.from(this.bonds.values())
        };
    }

    // Create from array format
    static fromArray(data) {
        const mol = new MoleculeV2Class();
        if (data.atoms) {
            data.atoms.forEach(atomData => {
                const atom = new AtomV2(
                    atomData.id,
                    atomData.element,
                    atomData.position?.x || atomData.x || 0,
                    atomData.position?.y || atomData.y || 0,
                    {
                        charge: atomData.charge,
                        radicals: atomData.radicals,
                        isotope: atomData.isotope,
                        stereo: atomData.stereo
                    }
                );
                mol.atoms.set(atom.id, atom);
                mol.nextAtomId = Math.max(mol.nextAtomId, parseInt(atom.id.split('_')[1] || '0') + 1);
            });
        }
        if (data.bonds) {
            data.bonds.forEach(bondData => {
                const bond = new BondV2(
                    bondData.id,
                    bondData.atom1,
                    bondData.atom2,
                    bondData.order || 1,
                    {
                        stereo: bondData.stereo,
                        type: bondData.type
                    }
                );
                mol.bonds.set(bond.id, bond);
                
                // Update atom bond references
                mol.atoms.get(bond.atom1)?.bonds.push(bond.id);
                mol.atoms.get(bond.atom2)?.bonds.push(bond.id);
                
                mol.nextBondId = Math.max(mol.nextBondId, parseInt(bond.id.split('_')[1] || '0') + 1);
            });
        }
        mol.updateMetadata();
        return mol;
    }
}

// Export with unique names to avoid conflicts
window.MoleculeV2 = MoleculeV2Class;
window.AtomV2 = AtomV2;
window.BondV2 = BondV2;

})(); // End IIFE

