# 🧪 Orbital Framework - Organic Chemistry Visualization & Analysis

## Overview
Orbital is a comprehensive JavaScript framework for visualizing and analyzing organic chemistry reactions. Built with vanilla JavaScript, HTML5 Canvas, and SVG, it provides a complete toolkit for drawing molecules, predicting reactions, and animating mechanisms.

---

## 🏗️ Architecture

### Core Components

#### 1. **Molecule System** (`molecule.js`)
- **Purpose**: Data structure for representing organic molecules
- **Key Features**:
  - Atom management (add, remove, update)
  - Bond creation and analysis
  - Functional group detection
  - Molecular formula & weight calculation
  - Ring detection algorithms
  - Stereochemistry support

#### 2. **Renderer** (`renderer.js`)
- **Purpose**: Canvas-based molecule visualization
- **Key Features**:
  - Real-time drawing on HTML5 Canvas
  - Customizable atom colors and sizes
  - Bond rendering (single, double, triple)
  - Aromatic ring indicators
  - Lone pair visualization
  - Charge display
  - Responsive canvas resizing

#### 3. **Reaction Database** (`reactions-database.js`)
- **Purpose**: Comprehensive reaction mechanism library
- **Key Features**:
  - 11+ common reaction types
  - Step-by-step mechanisms
  - Electron flow patterns
  - Intermediate structures
  - Product prediction rules
  - Regioselectivity & stereochemistry

#### 4. **Mechanism Renderer** (`mechanism-renderer.js`)
- **Purpose**: SVG-based mechanism animation
- **Key Features**:
  - Curved electron flow arrows
  - Color-coded arrow types:
    - 🔵 Blue: Nucleophilic attack
    - 🔴 Red: Electrophilic attack
    - 🟢 Green: Bond formation
    - 🟣 Purple: Resonance
  - Step-by-step animation
  - Atom pulsing effects
  - Bond breaking/forming animations
  - SVG export capability

#### 5. **Reagent System** (`reactions.js`)
- **Purpose**: Reagent database and conditions
- **Key Features**:
  - 30+ common reagents
  - Detailed reagent information
  - Reaction conditions (heat, pressure)
  - Mechanistic explanations
  - Grouped by function (bases, acids, oxidizers, etc.)

---

## 🎯 Key Features

### Drawing Tools
- **Elements**: C, H, N, O, F, Cl, Br, I, S, P
- **Bonds**: Single, double, triple
- **Templates**: Benzene, cyclohexane, cyclopentane
- **Auto-connect**: Smart carbon chain building
- **Auto-organize**: Molecular structure optimization

### Reaction Simulation
1. **Draw Reactants**: Interactive canvas drawing
2. **Select Reagent**: Dropdown with live info display
3. **Predict Product**: Automatic or manual
4. **View Mechanism**: Animated electron flow

### Mechanism Visualization
- **Categories**:
  - Elimination (E2, E1)
  - Substitution (SN2, SN1)
  - Addition (Electrophilic)
  - Oxidation (Primary/Secondary alcohol)
  - Reduction (Carbonyl)
  - Condensation (Aldol)
  - Fragmentation (Grob)
  - Hydrolysis (Ester base)

---

## 🔧 API Reference

### Molecule Class

```javascript
// Create new molecule
const mol = new Molecule();

// Add atoms
const atom = mol.addAtom('C', x, y);
mol.addAtom('O', x+50, y);

// Add bonds
mol.addBond(atom1.id, atom2.id, bondOrder);

// Analysis
const formula = mol.getMolecularFormula();  // "C2H6O"
const weight = mol.getMolecularWeight();     // 46.07
const rings = mol.detectRings();            // Array of ring atoms
const groups = mol.detectFunctionalGroups(); // Array of functional groups

// Properties
mol.atoms;          // Array of atom objects
mol.bonds;          // Array of bond objects
mol.selectedAtom;   // Currently selected atom
```

### Renderer Class

```javascript
// Initialize renderer
const canvas = document.getElementById('canvas');
const renderer = new Renderer(canvas);

// Render molecule
renderer.render(molecule);

// Toggle display options
renderer.showLonePairs = true;
renderer.showCharges = true;
renderer.showHybridization = false;

// Clear canvas
renderer.clear();
```

### MechanismRenderer Class

```javascript
// Initialize
const mechRenderer = new MechanismRenderer('container-id');

// Render mechanism
mechRenderer.renderMechanism(reactionData, moleculeData);

// Animate
mechRenderer.playAnimation();

// Export
mechRenderer.exportSVG();

// Control animation speed
mechRenderer.animationSpeed = 1000; // ms per step
```

---

## 📊 Data Structures

### Atom Object
```javascript
{
  id: "atom_1",
  element: "C",
  position: { x: 100, y: 100 },
  charge: 0,
  bonds: 4,
  lonePairs: 0,
  hybridization: "sp3"
}
```

### Bond Object
```javascript
{
  id: "bond_1",
  atom1: "atom_1",
  atom2: "atom_2",
  order: 1,  // 1=single, 2=double, 3=triple
  stereo: null  // 'wedge' or 'dash' for 3D
}
```

### Reaction Object
```javascript
{
  name: "E2 Elimination",
  type: "elimination",
  reagents: ["t-BuOK", "NaOEt"],
  conditions: { heat: true, temperature: "reflux" },
  mechanism: [
    {
      title: "Base attacks β-hydrogen",
      description: "Strong base abstracts proton...",
      electronFlow: [
        { from: 'base', to: 'H', type: 'nucleophilic' },
        { from: 'C-H', to: 'C=C', type: 'bond-formation' }
      ]
    }
  ],
  rules: {
    regioselectivity: "Zaitsev",
    stereochemistry: "anti"
  }
}
```

---

## 🎨 Customization

### Adding New Reactions

1. **Define in `reactions-database.js`**:
```javascript
REACTION_DATABASE.my_reaction = {
  name: "My Custom Reaction",
  type: "custom",
  reagents: ["MyReagent"],
  mechanism: [
    {
      title: "Step 1",
      description: "Describe what happens",
      electronFlow: [
        { from: 'atom1', to: 'atom2', type: 'nucleophilic' }
      ]
    }
  ]
};
```

2. **Add reagent in `reactions.js`**:
```javascript
REAGENTS.MyReagent = {
  name: "My Reagent Name",
  type: "custom",
  use: "What it does",
  conditions: "Heat",
  mechanism: "How it works"
};
```

3. **Register in main.js**:
```javascript
// Add to appropriate group in setupReagentDropdowns()
'Custom': ['MyReagent']
```

### Styling

Edit `styles.css` to customize:
- Color schemes
- Animation timings
- Layout dimensions
- Font styles

---

## 🚀 Performance Optimizations

### Canvas Rendering
- Efficient redraw only when needed
- Minimize `clearRect()` calls
- Use `requestAnimationFrame()` for smooth animations

### SVG Generation
- Path optimization for complex structures
- Lazy loading of mechanism data
- Efficient arrow calculation algorithms

### Memory Management
- Deep cloning for molecule copies
- Proper event listener cleanup
- Selective DOM updates

---

## 🔬 Advanced Features

### Functional Group Detection
```javascript
const groups = molecule.detectFunctionalGroups();
// Returns: ['alcohol', 'carboxylic_acid', 'ester']
```

### Ring Analysis
```javascript
const rings = molecule.detectRings();
const isAromatic = isAromatic(rings[0], molecule);
```

### Product Prediction
```javascript
const product = applyReactionRules(reactant, reactionData);
// Automatically applies transformation rules
```

---

## 🐛 Debugging

### Enable Console Logging
All major functions include console logs:
- 🚀 Initialization
- 🖱️ User interactions
- 🎨 Rendering operations
- ✓ Success confirmations
- ⚠️ Warnings
- 🔥 Errors

### Common Issues

**Problem**: Molecules not rendering
**Solution**: Check browser console for errors, verify canvas size

**Problem**: Animations not playing
**Solution**: Ensure mechanism data is loaded, check `mechanismRenderer.currentMechanism`

**Problem**: Reagent info not showing
**Solution**: Verify `REAGENTS` object is loaded, check event listener attachment

---

## 📈 Future Enhancements

- [ ] 3D molecular viewer (WebGL)
- [ ] NMR spectrum prediction
- [ ] IR spectrum visualization
- [ ] Machine learning for product prediction
- [ ] Collaborative drawing (WebRTC)
- [ ] Database of 1000+ reactions
- [ ] SMILES import/export
- [ ] ChemDraw file compatibility
- [ ] Mobile touch support
- [ ] Undo/redo functionality

---

## 🤝 Contributing

To extend this framework:

1. **Add new element**: Update `elements.js` with atomic data
2. **Add new reaction**: Update `reactions-database.js`
3. **Customize rendering**: Modify `renderer.js` or `mechanism-renderer.js`
4. **Improve prediction**: Enhance `applyReactionRules()` logic
5. **Add animations**: Update CSS keyframes in `styles.css`

---

## 📝 License

This framework is open for educational and research purposes.

---

## 🎓 Educational Use

Perfect for:
- Teaching organic chemistry mechanisms
- Interactive problem sets
- Exam preparation
- Research presentations
- Chemistry education software
- Online learning platforms

---

**Built with ❤️ for chemistry education**
