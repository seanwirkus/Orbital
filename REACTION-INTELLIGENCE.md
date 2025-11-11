# 🧠 Intelligent Reaction System

## Overview
Orbital now features a comprehensive **criteria-based reaction validation system** that ensures only chemically valid reactions can proceed. The system provides real-time feedback, warnings, and suggestions to help users perform accurate chemical transformations.

---

## 🎯 Core Features

### 1. **Mandatory Criteria Validation**
Every reaction MUST meet specific criteria before it can proceed:

#### ✅ **Required Elements:**
- **Valid Molecule**: Must have at least 2 atoms
- **Appropriate Reagents**: Must include reagents matching the desired reaction type
- **Functional Groups**: Molecule must contain groups that can react with the chosen reagents
- **Compatible Conditions**: Temperature, solvent, and catalysts must be appropriate

#### ❌ **Blocking Conditions:**
- Missing required reagents → Reaction blocked
- No reactive functional groups → Reaction blocked  
- Incompatible reagent combinations → Reaction blocked
- Dangerous conditions (e.g., LiAlH₄ + H₂O) → Reaction blocked

---

## 🔬 Reaction Types & Validation Rules

### **1. Oxidation Reactions**
**Required Reagents:** KMnO₄, CrO₃, PCC, H₂O₂, Na₂Cr₂O₇  
**Required Functional Groups:** Alcohols, Aldehydes, Alkenes

**Validation Logic:**
```
✓ Primary alcohol + KMnO₄ → Valid (→ Carboxylic acid)
✓ Secondary alcohol + PCC → Valid (→ Ketone)
✗ Tertiary alcohol + KMnO₄ → BLOCKED (Tertiary alcohols don't oxidize)
✗ Alkane + KMnO₄ → BLOCKED (No functional group to oxidize)
```

**Warnings:**
- ⚠️ Strong oxidizers may over-oxidize aldehydes to carboxylic acids
- ⚠️ Tertiary alcohols resist oxidation

---

### **2. Reduction Reactions**
**Required Reagents:** LiAlH₄, NaBH₄, H₂, BH₃, DIBAL-H  
**Required Functional Groups:** Carbonyls, Carboxylic acids, Esters, Alkenes

**Validation Logic:**
```
✓ Ketone + NaBH₄ → Valid (→ Alcohol)
✓ Ester + LiAlH₄ → Valid (→ Primary alcohol)
✗ Ketone + LiAlH₄ + H₂O → BLOCKED (LiAlH₄ reacts violently with water!)
✗ Alkane + NaBH₄ → BLOCKED (Nothing to reduce)
```

**Critical Safety Check:**
```javascript
if (reagents.includes('LiAlH4') && conditions.includes('H2O')) {
    return ERROR: "DANGER: LiAlH4 reacts violently with water!"
}
```

**Warnings:**
- ⚠️ LiAlH₄ must be used in anhydrous (dry) conditions
- 💡 NaBH₄ is selective for aldehydes/ketones; LiAlH₄ reduces everything

---

### **3. Halogenation Reactions**
**Required Reagents:** Br₂, Cl₂, I₂, NBS, NCS  
**Required Functional Groups:** Alkenes, Alkynes, Aromatic rings, Alkanes

**Validation Logic:**
```
✓ Alkene + Br₂ → Valid (→ Dibromide, no special conditions needed)
✓ Alkane + Br₂ + hν → Valid (→ Brominated alkane via radical)
✗ Alkane + Br₂ (no light) → BLOCKED (Radical halogenation requires UV light)
✗ Aromatic + Br₂ (no catalyst) → BLOCKED (Needs FeBr₃ Lewis acid catalyst)
```

**Conditional Requirements:**
- **Alkane halogenation:** REQUIRES `hν` (UV light) or `heat`
- **Aromatic halogenation:** REQUIRES Lewis acid catalyst (FeBr₃, AlCl₃)

**Warnings:**
- ⚠️ Halogenation of alkanes requires UV light (hν) for radical initiation
- ⚠️ Multiple halogenations may occur (polyhalogenation)

---

### **4. Addition Reactions**
**Required Reagents:** HBr, HCl, H₂SO₄ + H₂O, Br₂, Cl₂  
**Required Functional Groups:** Alkenes, Alkynes

**Validation Logic:**
```
✓ Alkene + HBr → Valid (→ Markovnikov addition)
✓ Alkene + HBr + peroxide → Valid (→ Anti-Markovnikov addition)
✓ Alkene + H₂SO₄ + H₂O → Valid (→ Alcohol via hydration)
✗ Alkene + H₂SO₄ (no H₂O) → Warning (Need water for hydration)
✗ Alkane + HBr → BLOCKED (No double bond to add to)
```

**Mechanism Warnings:**
- 💡 Markovnikov rule: H adds to less substituted carbon (unless peroxide present)
- 💡 Peroxides cause anti-Markovnikov addition (radical pathway)
- ⚠️ Watch for carbocation rearrangements

---

### **5. Elimination Reactions**
**Required Reagents:** NaOH, KOH, t-BuOK, H₂SO₄  
**Required Functional Groups:** Haloalkanes, Alcohols  
**Required Conditions:** Heat (for E1), Strong base (for E2)

**Validation Logic:**
```
✓ Chloroalkane + NaOH + heat → Valid (→ Alkene via E2)
✓ Alcohol + H₂SO₄ + heat → Valid (→ Alkene via dehydration)
✗ Chloroalkane + NaOH (no heat) → Warning (Works but slower)
✗ Alcohol + H₂SO₄ (no heat) → BLOCKED (Dehydration requires heat)
```

**Conditional Requirements:**
- **E2 mechanism:** Strong base (NaOH, KOH, t-BuOK)
- **E1 mechanism:** Heat + weak base/acid
- **Alcohol dehydration:** H₂SO₄ + heat

**Warnings:**
- 💡 Strong bases favor E2; weak bases + heat favor E1
- 💡 Major product follows Zaitsev rule (most substituted alkene)
- ⚠️ Elimination competes with substitution

---

### **6. Substitution Reactions**
**Required Reagents:** NaOH, KOH, NaCN, NH₃, CH₃OH  
**Required Functional Groups:** Haloalkanes, Alcohols

**Validation Logic:**
```
✓ Primary haloalkane + NaCN → Valid (→ SN2 substitution)
✓ Tertiary haloalkane + H₂O → Valid (→ SN1 substitution)
✗ Tertiary haloalkane + strong base + heat → Warning (E2 dominates over SN2)
```

**Warnings:**
- 💡 Primary carbons favor SN2; tertiary favor SN1
- 💡 SN2 causes inversion of stereochemistry (Walden inversion)
- ⚠️ Substitution competes with elimination at elevated temperatures

---

## 🎨 Real-Time Validation UI

### **Visual Feedback System:**

#### **1. No Reagents:**
```
ℹ️ Add reagents to begin
[Gray background]
```

#### **2. Invalid Reaction:**
```
❌ Invalid - Missing required reagent for oxidation
[Red background with error details]
💡 Suggestions appear below
```

#### **3. Valid Reaction:**
```
✅ Valid - Success: 85%
[Green background, score-based color]
⚠️ First warning appears if any
```

### **Color-Coded Success Probability:**
- 🟢 **Green (80-100%)**: Highly likely to work, optimal conditions
- 🟡 **Orange (60-79%)**: Should work, but watch for side reactions
- 🔴 **Red (0-59%)**: Low probability, check conditions

---

## 📊 Functional Group Detection

### **Automatic Detection Algorithm:**
The system automatically scans your molecule for:

1. **Alcohols (C-OH)**: Single bond between C and O
2. **Carbonyls (C=O)**: Double bond between C and O
   - **Aldehydes**: Carbonyl at terminal position
   - **Ketones**: Carbonyl in middle of chain
3. **Carboxylic Acids**: C(=O)-OH pattern
4. **Alkenes (C=C)**: Carbon-carbon double bond
5. **Alkynes (C≡C)**: Carbon-carbon triple bond
6. **Haloalkanes (C-X)**: Carbon bonded to F, Cl, Br, or I
7. **Amines (C-NH₂)**: Carbon bonded to nitrogen

### **Example Detection:**
```
Molecule: CH₃-CH₂-OH
Detected: 
  ✓ 1 alcohol (C-OH)
  ✓ 0 carbonyls
  ✓ 0 alkenes
  
→ Can undergo: Oxidation, Elimination (dehydration)
→ Cannot undergo: Reduction (no carbonyl), Halogenation (no C=C)
```

---

## 🧪 Validation Scoring System

### **Base Score: 70 points**

### **Bonuses (+):**
- ✅ Perfect functional group match: **+15**
- ✅ Appropriate conditions present: **+10**
- ✅ Mild, selective reagent (NaBH₄, PCC): **+5**
- ✅ Common, reliable reaction: **+5**

### **Penalties (-):**
- ❌ Incompatible conditions: **Score = 0**
- ❌ Missing required conditions: **-10**
- ❌ Overly aggressive reagent: **-5**

### **Final Score Interpretation:**
```
90-100: Excellent reaction conditions
80-89:  Very good, high success rate
70-79:  Good, should work reliably
60-69:  Acceptable, but optimize if possible
50-59:  Risky, expect side products
0-49:   Poor conditions, likely to fail
```

---

## 💡 Intelligent Suggestions

### **The system provides context-aware suggestions:**

#### **Example 1: Over-oxidation Risk**
```
Reaction: Aldehyde + KMnO₄
Suggestion: "Consider PCC instead of KMnO₄ to stop at aldehyde"
```

#### **Example 2: Safer Alternative**
```
Reaction: Ketone + LiAlH₄
Suggestion: "NaBH₄ is milder and safer for simple ketone reduction"
```

#### **Example 3: Missing Condition**
```
Reaction: Alkene + H₂SO₄
Suggestion: "Add H₂O for acid-catalyzed hydration of alkene"
```

#### **Example 4: Mechanism Insight**
```
Reaction: Alkene + HBr
Suggestion: "Markovnikov addition: hydrogen adds to less substituted carbon"
```

---

## ⚠️ Safety Warnings

### **Critical Safety Checks:**

#### **1. Water-Sensitive Reagents**
```javascript
❌ DANGER: LiAlH₄ reacts violently with water!
Action: Reaction blocked, cannot proceed
```

#### **2. Oxidizer + Flammable Solvent**
```javascript
⚠️ Strong oxidizers with flammable solvents - use caution
Action: Warning shown, but reaction allowed
```

#### **3. UV Light Required**
```javascript
⚠️ Halogenation of alkanes requires UV light (hν)
Action: Reminder to add condition
```

---

## 📚 Chemistry Intelligence Database

### **Reagent Classification:**
- **Oxidizing Agents**: KMnO₄, CrO₃, PCC, H₂O₂, Na₂Cr₂O₇
- **Reducing Agents**: LiAlH₄, NaBH₄, H₂, BH₃, DIBAL-H
- **Halogens**: Br₂, Cl₂, I₂, NBS, NCS
- **Strong Bases**: NaOH, KOH, t-BuOK, NaOEt, LDA
- **Acids**: H₂SO₄, HBr, HCl, HI

### **Condition Recognition:**
- **Temperature**: <0°C (cold), 25°C (room temp), >100°C (heat)
- **Solvents**: H₂O, EtOH, MeOH, THF, DCM, DMSO
- **Special**: hν (UV light), catalysts (Pd/C, Pt, FeBr₃)

---

## 🎓 Educational Features

### **1. Real-Time Learning**
- As you add reagents, see if they're compatible
- Instant feedback on what's missing
- Learn which functional groups react with which reagents

### **2. Mechanism Hints**
- E1 vs E2 mechanism guidance
- Markovnikov rule reminders
- Carbocation rearrangement warnings

### **3. Selectivity Guidance**
- Primary vs secondary vs tertiary alcohol behavior
- Aldehyde vs ketone reactivity
- Regioselectivity in substitution/elimination

---

## 🚀 How to Use

### **Step 1: Draw Your Molecule**
```
Go to Draw tab → Use tools to create molecule with functional groups
Example: Draw ethanol (C-C-OH)
```

### **Step 2: Go to Simulate Tab**
```
Your molecule automatically appears as Reactant
Functional groups are auto-detected
```

### **Step 3: Add Reagents**
```
Select reagent from dropdown → Click Add
Watch real-time validation status update
```

### **Step 4: Set Conditions**
```
Adjust temperature (°C)
Select solvent
Validation updates automatically
```

### **Step 5: Predict Products**
```
If ✅ Valid appears → Click "Predict Products"
If ❌ Invalid → Follow suggestions to fix
```

---

## 📈 Advanced Features

### **Multi-Step Validation**
The system checks in this order:
1. ✓ Molecule exists and has atoms?
2. ✓ Reagents provided?
3. ✓ Reagents match reaction type?
4. ✓ Functional groups present?
5. ✓ Required conditions met?
6. ✓ No dangerous combinations?
7. ✓ Calculate success score

### **Error Hierarchy**
- **Level 1 (Blocker)**: Missing molecule, no reagents
- **Level 2 (Critical)**: Wrong reagent for functional group
- **Level 3 (Warning)**: Suboptimal conditions
- **Level 4 (Suggestion)**: Could be improved

---

## 🔧 Technical Implementation

### **Key Classes:**
```javascript
ReactionValidator.validateReaction(molecule, reagents, conditions)
├── detectFunctionalGroups(molecule)
├── determineReactionType(reagents)
├── checkFunctionalGroups(detected, required)
├── validateConditions(required, provided)
├── checkIncompatibilities(reagents, conditions)
├── calculateReactionScore()
└── getSuggestions()
```

### **Validation Return Object:**
```javascript
{
    valid: true/false,           // Can reaction proceed?
    errors: [],                  // Blocking errors
    warnings: [],                // Important considerations
    suggestions: [],             // Optimization tips
    score: 0-100                // Success probability
}
```

---

## 🎯 Example Scenarios

### **Scenario 1: Valid Oxidation**
```
Molecule: Ethanol (C-C-OH)
Reagent: KMnO₄
Conditions: None required

Validation:
✅ Valid - Success: 85%
⚠️ Strong oxidizer may over-oxidize to carboxylic acid

Product: Acetaldehyde (C-C=O) or Acetic acid (C-COOH)
```

### **Scenario 2: Invalid - Missing Functional Group**
```
Molecule: Butane (C-C-C-C)
Reagent: NaBH₄ (reducing agent)
Conditions: None

Validation:
❌ Invalid - Molecule lacks carbonyl group for reduction
💡 This molecule cannot undergo reduction
📚 Current molecule has: no reactive functional groups
```

### **Scenario 3: Dangerous Combination**
```
Molecule: Cyclohexanone (ketone)
Reagent: LiAlH₄
Conditions: H₂O solvent

Validation:
❌ DANGER: LiAlH₄ reacts violently with water!
💡 Use anhydrous conditions (THF or ether)
```

---

## 🏆 Best Practices

### **For Students:**
1. Always check the validation status before predicting products
2. Read warnings carefully - they explain important chemistry concepts
3. Try suggested alternatives to see how reagent choice affects outcomes
4. Use the score to understand reaction feasibility

### **For Educators:**
1. Use the validation system to teach proper reagent selection
2. Show students why certain combinations don't work
3. Demonstrate safety considerations (LiAlH₄ + water)
4. Highlight selectivity principles (NaBH₄ vs LiAlH₄)

### **For Researchers:**
1. Quickly check if a transformation is feasible
2. Get suggestions for optimizing conditions
3. See success probability before running experiments
4. Identify potential side reactions

---

## 📝 Future Enhancements

- [ ] Stereochemistry validation (R/S configuration)
- [ ] Multi-step reaction pathway planning
- [ ] Yield estimation based on substrate structure
- [ ] Literature reaction database integration
- [ ] Machine learning for success prediction
- [ ] Solvent compatibility matrix
- [ ] Temperature optimization suggestions
- [ ] Mechanism animation with validation

---

## 🎓 Learn More

**Key Organic Chemistry Concepts Covered:**
- Functional group reactivity
- Reagent selectivity
- Reaction mechanisms (SN1, SN2, E1, E2)
- Markovnikov vs anti-Markovnikov addition
- Oxidation states
- Safety in organic synthesis

**This system makes Orbital the smartest molecular drawing tool for teaching and learning organic chemistry!** 🧪✨
