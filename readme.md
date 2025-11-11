# Orbital - Organic Chemistry Visualizer and Simulator

## Project Overview

This is a **fully functional** interactive web-based application for visualizing and simulating organic chemistry molecules with **real reaction mechanisms**. The tool allows users to draw molecular structures, explore chemical properties, run reaction simulations, and view detailed **step-by-step mechanism animations** with electron flow arrows.

## 🚀 Orbital Engine Framework

The core chemistry engine has been extracted into a standalone framework located in `orbital-engine/`. This framework can be used independently in other projects.

### Framework Structure
- **core/** - Core chemistry engine (molecule, renderer, intelligence)
- **services/** - External integrations (PubChem API)
- **utils/** - Utility classes (undo/redo, selection, clipboard)

### Key Features
- ✨ Enhanced atom drawing with VSEPR theory
- 🔬 PubChem integration for all atoms
- 🧪 Chemistry intelligence (valence, hybridization, aromaticity)
- 📐 Intelligent bond angle prediction
- ✅ Real-time validation

See `orbital-engine/README.md` and `orbital-engine/INTEGRATION.md` for details.

## ✨ Key Features

### 🎨 Interactive Molecular Drawing
- Place atoms (C, N, O, H, halogens, S, P) on a canvas
- Draw bonds between atoms (single, double, triple)
- Auto-connect carbon atoms intelligently
- Ring templates: Benzene, Cyclohexane, Cyclopentane
- Auto-organize with force-directed layout algorithm

### 🔬 Chemistry Calculations
- **Electronegativity** visualization and calculations
- **Lone pair** representation with VSEPR theory positioning
- **Hybridization** detection (sp, sp2, sp3)
- **Bond angles** and geometry analysis
- **Aromaticity** detection using Hückel's rule
- **Functional group** identification
- **IUPAC nomenclature** - automatic chemical naming

### 🧪 Real Reaction Simulator
- **30+ Detailed Reagents** with descriptions:
  - Strong Bases: t-BuOK, NaOEt, KOH → E2 elimination
  - Oxidizers: KMnO₄, K₂Cr₂O₇, PCC → Alcohol oxidation
  - Reducers: NaBH₄, LiAlH₄ → Carbonyl reduction
  - Nucleophiles: NaCN, NaN₃ → SN2 substitution
  - And many more!
- **Sequential Drawing Workflow**: Reactant 1 → Reactant 2 → Product
- **Reagent Information Display**: Shows what each reagent does, conditions needed, and mechanism type
- **Atom Balance Checking**: Validates if reactions are balanced

### 📊 Mechanism Viewer (NEW!)
- **11 Reaction Mechanisms** with full details:
  - E2 Elimination
  - E1 Elimination
  - SN2 Substitution
  - SN1 Substitution
  - Electrophilic Addition
  - Alcohol Oxidation (1° and 2°)
  - Carbonyl Reduction
  - Aldol Condensation
  - Grob Fragmentation
  - Ester Hydrolysis (Saponification)
  
- **SVG-Based Visualization**:
  - Step-by-step mechanism display
  - Color-coded electron flow arrows:
    - 🔵 Blue: Nucleophilic attack
    - 🔴 Red: Electrophilic attack
    - 🟢 Green: Bond formation
    - 🟣 Purple: Resonance
  - Intermediate structures with charges
  - Energy level annotations
  - Reagent and condition information

- **Interactive Features**:
  - ▶️ Animated playback of mechanism steps
  - 💾 Export mechanisms as SVG files
  - Click to view any mechanism instantly

### 🤖 Reaction Predictor
- Detects functional groups in drawn molecules
- Matches reagents to possible reactions
- Suggests mechanism based on substrate and reagent
- Links directly to mechanism viewer

### ⌨️ Keyboard Shortcuts
- `Cmd/Ctrl + Z`: Undo
- `Cmd/Ctrl + Shift + Z`: Redo
- `Cmd/Ctrl + C`: Copy
- `Cmd/Ctrl + V`: Paste
- `Cmd/Ctrl + X`: Cut
- `Delete`: Delete selected atom

## 🗄️ Custom Reaction Database

Instead of relying on external libraries, we built a **comprehensive reaction database** (`reactions-database.js`) with:

- **Complete Mechanism Data**:
  - Each step with electron flow patterns
  - Intermediate structures and energy levels
  - Stereochemistry and regioselectivity rules
  - Product prediction algorithms

- **Functional Group Recognition**:
  - Pattern matching for substrate identification
  - Reactivity comparisons
  - Classification systems

- **Condition Effects**:
  - Temperature (Δ, cold, room temp)
  - Pressure effects
  - Light (hν) for radical reactions
  - Solvent effects

## 🎯 How It Works

1. **Draw Your Molecule**:
   - Click to place atoms
   - Drag between atoms to create bonds
   - Use ring templates for cyclic structures

2. **Explore Chemistry**:
   - View real-time IUPAC name
   - Check hybridization and geometry
   - See lone pairs positioned correctly

3. **Run Reactions**:
   - Click "🧪 Simulate Reaction"
   - Draw reactants sequentially
   - Select reagent (with detailed info about what it does)
   - Draw expected product
   - Export reaction equation with names

4. **Learn Mechanisms**:
   - Click "📊 View Mechanisms"
   - Select any of 11 reaction types
   - Watch animated electron flow
   - Understand each step visually
   - Export for study materials

## 🏗️ Technical Architecture

### Phase 1: Project Setup and Basic Structure
1. **Technology Stack Selection**:
   - Frontend: HTML5, CSS3, JavaScript (ES6+)
   - Canvas/SVG library: Consider D3.js, Fabric.js, or native Canvas API for drawing
   - Framework: React.js for component-based architecture (optional but recommended)
   - Build tools: Webpack or Vite for bundling

2. **Project Structure**:
   - Set up basic folder structure (src/, public/, assets/)
   - Initialize Git repository (already done)
   - Create package.json and install dependencies

3. **Basic UI Layout**:
   - Design main interface with toolbar, canvas area, and property panel
   - Implement responsive design principles

### Phase 2: Core Drawing Functionality
1. **Atom Placement System**:
   - Implement drag-and-drop or click-to-place atoms
   - Display atomic symbols clearly
   - Handle atom positioning and overlapping prevention

2. **Bond Drawing System**:
   - Enable drawing lines between atoms to represent bonds
   - Implement bond type selection (single, double, triple)
   - Allow bond adjustment and deletion

3. **Interaction Handling**:
   - Mouse event listeners for drawing and editing
   - Keyboard shortcuts for common actions
   - Undo/redo functionality

### Phase 3: Advanced Features
1. **Element Management**:
   - Create element palette/toolbar
   - Implement element selection and properties
   - Add validation for chemical bonding rules

2. **Visualization Enhancements**:
   - Improve graphics quality and styling
   - Add animations for better user experience
   - Implement save/load functionality for molecules

3. **Simulation Integration**:
   - Research and integrate chemistry libraries (e.g., Open Babel, ChemDoodle)
   - Add basic property calculations
   - Implement structural analysis tools
   - Develop atomic physics simulations (electronegativity, orbital overlap, lone pairs)
   - Create interactive demonstrations of molecular orbital theory

### Phase 4: Testing and Refinement
1. **Unit Testing**:
   - Test individual components and functions
   - Use Jest or similar testing framework

2. **User Testing**:
   - Gather feedback on usability
   - Refine interface based on user input

3. **Performance Optimization**:
   - Optimize rendering for large molecules
   - Ensure smooth interactions

### Phase 5: Deployment and Documentation
1. **Deployment**:
   - Set up hosting (GitHub Pages, Netlify, etc.)
   - Configure build process for production

2. **Documentation**:
   - Complete README with usage instructions
   - Add code comments and API documentation
   - Create user guide or tutorial

## Technical Architecture

### 🧠 1. Core Chemistry Engine (Molecular Logic Layer)

The application requires a robust backend (or client-side) system that understands chemistry beyond simple graphics. This engine will interpret drawn molecules as real chemical graphs with proper molecular logic.

#### 🔹 Molecule Representation

**Graph Data Model**:
Represent molecules as nodes (atoms) and edges (bonds) with comprehensive attributes:

```javascript
{
  atoms: [
    {
      id: "atom1",
      element: "C",
      charge: 0,
      position: { x: 100, y: 200 },
      valence: 4,
      hybridization: "sp3"
    }
  ],
  bonds: [
    {
      a1: "atom1",
      a2: "atom2",
      order: 1,
      length: 1.54
    }
  ]
}
```

**Valence Validation**:
- Implement checks for valence rules (Carbon ≤ 4, Oxygen ≤ 2, Nitrogen ≤ 3, etc.)
- Display real-time warnings for valence violations
- Prevent invalid bond formations

#### 🔹 Bonding Rules & Hybridization

- Logic to predict hybridization (sp, sp², sp³) based on bond count and geometry
- Basic bond angle estimation using VSEPR theory
- Automatic bond type correction when atoms approach valence limits
- Dynamic geometry updates based on hybridization state

#### 🔹 Structural Recognition

- Functional group detection (–OH, –COOH, –NH₂, –C=O, etc.)
- Cyclic structure identification (rings, aromatic systems)
- Resonance structure analysis and visualization
- Canonical SMILES or InChI generation using chemistry libraries (RDKit, OpenBabel, or ChemDoodle)

### ⚛️ 2. Physics Simulation Logic

A lightweight simulation core to drive the physics-based visualizations and calculations.

#### 🔹 Electronegativity & Charge

- Implement Pauling or Mulliken electronegativity scales for all supported elements
- Calculate partial charges using bond polarity formulas: δ = χ_A - χ_B
- Color-code bonds and atoms based on charge intensity (red for negative, blue for positive)
- Visual polarity arrows on bonds

#### 🔹 Lone Pairs & Electron Density

- Estimate lone pairs from valence electron counting and bonding patterns
- Dynamic rendering of lone pairs as electron dots or orbital lobes
- Electron density visualization with gradient coloring

#### 🔹 Orbital Overlap

- Geometric representation of σ and π orbital overlap:
  - σ: End-to-end overlap of hybridized orbitals (sp/sp²/sp³)
  - π: Side-on overlap of unhybridized p orbitals
- Animated translucent orbital lobes using WebGL or canvas shaders
- Interactive orbital visualization with rotation and zoom

#### 🔹 Hybridization Engine

- Automatic hybridization detection:
  - 2 electron domains → sp (linear)
  - 3 electron domains → sp² (trigonal planar)
  - 4 electron domains → sp³ (tetrahedral)
- Real-time geometry updates based on bonding changes
- Visual indicators for hybridization state

### 🧬 3. Computational Chemistry Integration

#### 🔹 Chemistry Library Integration

Implement a robust chemistry library for molecular operations:

**JavaScript Options**:
- ChemDoodle Web Components
- 3Dmol.js
- NGL Viewer

**Python Backend (FastAPI)**:
- RDKit for molecular manipulation
- Open Babel for format conversion

**Core Capabilities**:
- Molecular weight and formula calculations
- Rotatable bond analysis
- Conformer generation and 3D coordinate optimization
- Export to molecular file formats (XYZ, SDF, MOL)

#### 🔹 Simulation APIs

```
/analyze → Return molecular properties (MW, formula, functional groups)
/simulate → Compute orbital overlays and charge distributions
/validate → Check molecular validity and suggest corrections
/generate-3d → Create 3D coordinates from 2D drawings
```

### 🧩 4. Reaction Logic (Dynamic Behavior)

Implement dynamic reaction simulation and mechanistic visualization.

#### 🔹 Reaction Templates

Define transformation templates for common organic reactions:

```javascript
{
  "name": "E1 Elimination",
  "pattern": "C-C(Br) → C=C + HBr",
  "conditions": ["heat", "base"],
  "mechanism": ["carbocation", "elimination"]
}
```

#### 🔹 Mechanistic Animation

- Stepwise visualization with electron movement arrows
- Intermediate state snapshots stored in molecule graph
- Qualitative kinetics engine for reaction rate concepts
- Animation controls (play, pause, step-through)

### 💻 5. Rendering Logic (3D + Visual Fidelity)

Advanced rendering capabilities for realistic molecular visualization.

- **3D Coordinate Generation**: Simple geometry engine or backend computation for 3D structures
- **Bond Angle Constraints**: Snap-to-grid for expected molecular geometries
- **3D Rendering**: Three.js or 3Dmol.js integration for orbital visualizations
- **GPU Acceleration**: Shader-based rendering for orbital clouds and charge density maps
- **Real-time Updates**: Smooth transitions during molecular modifications

### 🔗 6. Data Persistence & User Interaction Logic

Comprehensive data management and interaction features.

#### 🔹 Data Persistence

- Save/Load molecules in multiple formats (JSON, MOL, SMILES)
- Export to standard chemical formats (.mol, .sdf, .xyz)
- Session persistence using localStorage or database
- Version history and molecule library management

#### 🔹 User Interaction Logic

- Undo/Redo stack with immutable state updates
- Collaborative editing capabilities (future multi-user support)
- Keyboard shortcuts and gesture support
- Accessibility features for screen readers and keyboard navigation

## Technologies and Dependencies

- **Core Technologies**:
  - HTML5 Canvas or SVG
  - JavaScript (ES6+)
  - CSS3 for styling

- **Libraries**:
  - React.js (for UI components)
  - D3.js (for advanced visualizations)
  - Potentially: Paper.js or Konva.js for canvas manipulation

- **Development Tools**:
  - Node.js and npm
  - Git for version control
  - ESLint for code quality

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm start`
4. Open browser and begin drawing molecules

## Contributing

Contributions are welcome! Please read the contributing guidelines and submit pull requests for new features or bug fixes.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Roadmap

- [ ] Basic atom and bond drawing
- [ ] Bond type adjustments
- [ ] Element library expansion
- [ ] Molecular property calculations
- [ ] Electronegativity and bond polarity visualization
- [ ] Lone pair representation
- [ ] Orbital overlap demonstrations
- [ ] Hybridization state visualization
- [ ] 3D visualization
- [ ] Reaction simulation
- [ ] Mobile responsiveness
- [ ] Export functionality (PNG, SVG, etc.)

This plan provides a structured approach to building a functional and educational organic chemistry tool. Regular updates and iterations will ensure the project meets user needs and incorporates the latest web technologies.
