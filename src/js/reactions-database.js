// Comprehensive Organic Reaction Database
// Each reaction includes mechanism steps, electron flow, intermediates, and visual data

const REACTION_DATABASE = {
    // ==================== ELIMINATION REACTIONS ====================
    'e2_elimination': {
        name: 'E2 Elimination',
        type: 'elimination',
        reagents: ['t-BuOK', 'NaOEt', 'KOH'],
        conditions: 'Heat (Δ)',
        
        // Pattern matching for reactant recognition
        recognitionPattern: {
            substrate: 'alkyl_halide',
            requirement: 'beta_hydrogen'
        },
        
        // Mechanism steps
        mechanism: [
            {
                step: 1,
                title: 'Concerted E2 Elimination',
                description: 'Base abstracts β-hydrogen while C-X bond breaks, forming π bond',
                electronFlow: [
                    { from: 'base', to: 'beta_H', type: 'deprotonation' },
                    { from: 'C-H_bond', to: 'C-C_pi', type: 'bond_formation' },
                    { from: 'C-X_bond', to: 'leaving_group', type: 'bond_cleavage' }
                ],
                intermediates: null, // Concerted, no intermediate
                energyLevel: 'transition_state'
            }
        ],
        
        // Product prediction rules
        productRules: {
            majorProduct: 'zaitsev', // More substituted alkene
            stereochemistry: 'anti_periplanar'
        }
    },
    
    'e1_elimination': {
        name: 'E1 Elimination',
        type: 'elimination',
        reagents: ['H2SO4', 'H3PO4'],
        conditions: 'Heat (Δ)',
        
        mechanism: [
            {
                step: 1,
                title: 'Carbocation Formation',
                description: 'Leaving group departs, forming carbocation',
                electronFlow: [
                    { from: 'C-X_bond', to: 'leaving_group', type: 'heterolytic_cleavage' }
                ],
                intermediates: { type: 'carbocation', stability: 'tertiary > secondary > primary' },
                energyLevel: 'high_energy'
            },
            {
                step: 2,
                title: 'Deprotonation',
                description: 'Base removes β-hydrogen, forming π bond',
                electronFlow: [
                    { from: 'base', to: 'beta_H', type: 'deprotonation' },
                    { from: 'C-H_bond', to: 'C-C_pi', type: 'pi_bond_formation' }
                ],
                intermediates: null,
                energyLevel: 'product'
            }
        ],
        
        productRules: {
            majorProduct: 'zaitsev',
            sideReaction: 'sn1_substitution_possible'
        }
    },
    
    // ==================== SUBSTITUTION REACTIONS ====================
    'sn2_substitution': {
        name: 'SN2 Nucleophilic Substitution',
        type: 'substitution',
        reagents: ['NaCN', 'NaN3', 'NaOH'],
        conditions: 'Polar aprotic solvent (DMSO, DMF)',
        
        recognitionPattern: {
            substrate: 'primary_or_secondary_alkyl_halide',
            stericHindrance: 'low'
        },
        
        mechanism: [
            {
                step: 1,
                title: 'Backside Attack',
                description: 'Nucleophile attacks from opposite side of leaving group',
                electronFlow: [
                    { from: 'nucleophile', to: 'carbon', type: 'nucleophilic_attack' },
                    { from: 'C-X_bond', to: 'leaving_group', type: 'bond_cleavage' }
                ],
                intermediates: { type: 'transition_state', geometry: 'trigonal_bipyramidal' },
                energyLevel: 'transition_state',
                stereochemistry: 'inversion_of_configuration'
            }
        ],
        
        productRules: {
            stereochemistry: 'walden_inversion',
            rateDependent: 'both_nucleophile_and_substrate'
        }
    },
    
    'sn1_substitution': {
        name: 'SN1 Nucleophilic Substitution',
        type: 'substitution',
        reagents: ['H2O', 'ROH'],
        conditions: 'Polar protic solvent',
        
        mechanism: [
            {
                step: 1,
                title: 'Ionization',
                description: 'Leaving group departs, forming carbocation',
                electronFlow: [
                    { from: 'C-X_bond', to: 'leaving_group', type: 'heterolytic_cleavage' }
                ],
                intermediates: { type: 'carbocation', planar: true },
                energyLevel: 'high_energy'
            },
            {
                step: 2,
                title: 'Nucleophilic Attack',
                description: 'Nucleophile attacks planar carbocation from either face',
                electronFlow: [
                    { from: 'nucleophile', to: 'carbocation', type: 'nucleophilic_attack' }
                ],
                intermediates: null,
                energyLevel: 'product',
                stereochemistry: 'racemization'
            }
        ],
        
        productRules: {
            stereochemistry: 'racemic_mixture',
            rearrangement: 'possible_carbocation_rearrangement'
        }
    },
    
    // ==================== ADDITION REACTIONS ====================
    'electrophilic_addition': {
        name: 'Electrophilic Addition to Alkenes',
        type: 'addition',
        reagents: ['HBr', 'HCl', 'Br2', 'Cl2'],
        conditions: 'Room temperature',
        
        mechanism: [
            {
                step: 1,
                title: 'π Bond Attacks Electrophile',
                description: 'Alkene π electrons attack H-X or X₂, forming carbocation',
                electronFlow: [
                    { from: 'pi_bond', to: 'electrophile', type: 'electrophilic_attack' },
                    { from: 'E-X_bond', to: 'X', type: 'heterolytic_cleavage' }
                ],
                intermediates: { type: 'carbocation_or_bromonium', stability: 'more_substituted' },
                energyLevel: 'intermediate'
            },
            {
                step: 2,
                title: 'Nucleophile Attacks Carbocation',
                description: 'Halide ion attacks carbocation',
                electronFlow: [
                    { from: 'nucleophile', to: 'carbocation', type: 'nucleophilic_attack' }
                ],
                intermediates: null,
                energyLevel: 'product'
            }
        ],
        
        productRules: {
            regioselectivity: 'markovnikov',
            exception: 'anti_markovnikov_with_peroxides'
        }
    },
    
    // ==================== OXIDATION REACTIONS ====================
    'alcohol_oxidation_primary': {
        name: 'Oxidation of Primary Alcohol',
        type: 'oxidation',
        reagents: ['K2Cr2O7', 'KMnO4'],
        conditions: 'H⁺, Heat (Δ)',
        
        mechanism: [
            {
                step: 1,
                title: 'Aldehyde Formation',
                description: 'Alcohol oxidized to aldehyde',
                electronFlow: [
                    { from: 'C-H_bond', to: 'oxidant', type: 'hydride_transfer' },
                    { from: 'C-O_single', to: 'C-O_double', type: 'bond_order_increase' }
                ],
                intermediates: { type: 'aldehyde', reactivity: 'high' },
                energyLevel: 'intermediate'
            },
            {
                step: 2,
                title: 'Carboxylic Acid Formation',
                description: 'Aldehyde further oxidized to carboxylic acid',
                electronFlow: [
                    { from: 'C-H_bond', to: 'oxidant', type: 'hydride_transfer' }
                ],
                intermediates: null,
                energyLevel: 'product'
            }
        ],
        
        productRules: {
            finalProduct: 'carboxylic_acid',
            mildOxidant: 'PCC_stops_at_aldehyde'
        }
    },
    
    'alcohol_oxidation_secondary': {
        name: 'Oxidation of Secondary Alcohol',
        type: 'oxidation',
        reagents: ['K2Cr2O7', 'PCC', 'KMnO4'],
        conditions: 'H⁺',
        
        mechanism: [
            {
                step: 1,
                title: 'Ketone Formation',
                description: 'Secondary alcohol oxidized to ketone',
                electronFlow: [
                    { from: 'C-H_bond', to: 'oxidant', type: 'hydride_transfer' },
                    { from: 'C-O_single', to: 'C-O_double', type: 'bond_order_increase' }
                ],
                intermediates: null,
                energyLevel: 'product'
            }
        ],
        
        productRules: {
            finalProduct: 'ketone',
            noFurtherOxidation: true
        }
    },
    
    // ==================== REDUCTION REACTIONS ====================
    'carbonyl_reduction': {
        name: 'Carbonyl Reduction',
        type: 'reduction',
        reagents: ['NaBH4', 'LiAlH4'],
        conditions: 'Methanol or ether',
        
        mechanism: [
            {
                step: 1,
                title: 'Hydride Attack',
                description: 'Hydride attacks electrophilic carbonyl carbon',
                electronFlow: [
                    { from: 'hydride', to: 'carbonyl_carbon', type: 'nucleophilic_attack' },
                    { from: 'C=O_pi', to: 'oxygen', type: 'pi_bond_breaks' }
                ],
                intermediates: { type: 'alkoxide', charge: 'negative_on_oxygen' },
                energyLevel: 'intermediate'
            },
            {
                step: 2,
                title: 'Protonation',
                description: 'Alkoxide protonated to form alcohol',
                electronFlow: [
                    { from: 'alkoxide', to: 'proton', type: 'protonation' }
                ],
                intermediates: null,
                energyLevel: 'product'
            }
        ],
        
        productRules: {
            aldehyde: 'primary_alcohol',
            ketone: 'secondary_alcohol'
        }
    },
    
    // ==================== ALDOL REACTIONS ====================
    'aldol_condensation': {
        name: 'Aldol Condensation',
        type: 'condensation',
        reagents: ['NaOH', 'KOH'],
        conditions: 'Base, Heat (Δ)',
        
        mechanism: [
            {
                step: 1,
                title: 'Enolate Formation',
                description: 'Base deprotonates α-carbon, forming enolate',
                electronFlow: [
                    { from: 'base', to: 'alpha_H', type: 'deprotonation' },
                    { from: 'C-H_bond', to: 'C=O_pi', type: 'resonance_delocalization' }
                ],
                intermediates: { type: 'enolate', resonance: 'C- and O-' },
                energyLevel: 'intermediate'
            },
            {
                step: 2,
                title: 'Nucleophilic Addition',
                description: 'Enolate attacks another carbonyl',
                electronFlow: [
                    { from: 'enolate_carbon', to: 'carbonyl_carbon', type: 'nucleophilic_attack' },
                    { from: 'C=O_pi', to: 'oxygen', type: 'pi_bond_breaks' }
                ],
                intermediates: { type: 'beta_hydroxy_carbonyl', name: 'aldol' },
                energyLevel: 'intermediate'
            },
            {
                step: 3,
                title: 'Dehydration',
                description: 'E1cB elimination forms α,β-unsaturated carbonyl',
                electronFlow: [
                    { from: 'base', to: 'alpha_H', type: 'deprotonation' },
                    { from: 'C-OH_bond', to: 'leaving_group', type: 'beta_elimination' }
                ],
                intermediates: null,
                energyLevel: 'product'
            }
        ],
        
        productRules: {
            product: 'alpha_beta_unsaturated_carbonyl',
            conjugation: 'extended_conjugation'
        }
    },
    
    // ==================== GROB FRAGMENTATION ====================
    'grob_fragmentation': {
        name: 'Grob Fragmentation',
        type: 'fragmentation',
        reagents: ['KOH', 't-BuOK'],
        conditions: 'Strong base, Heat (Δ)',
        
        mechanism: [
            {
                step: 1,
                title: 'Deprotonation',
                description: 'Base removes hydroxyl proton, forming alkoxide',
                electronFlow: [
                    { from: 'base', to: 'OH_proton', type: 'deprotonation' }
                ],
                intermediates: { type: 'alkoxide', position: 'bridgehead' },
                energyLevel: 'intermediate'
            },
            {
                step: 2,
                title: 'Concerted Fragmentation',
                description: 'Alkoxide pushes electrons, breaking C-C bond and forming carbonyl',
                electronFlow: [
                    { from: 'alkoxide', to: 'C-C_bond', type: 'electron_push' },
                    { from: 'C-C_bond', to: 'leaving_carbon', type: 'bond_cleavage' },
                    { from: 'leaving_carbon', to: 'carbonyl', type: 'pi_bond_formation' }
                ],
                intermediates: { type: 'ring_opened', carbocation: false },
                energyLevel: 'intermediate',
                drivingForce: 'ring_strain_relief'
            },
            {
                step: 3,
                title: 'Intramolecular Aldol',
                description: 'Carbanion attacks intramolecular carbonyl',
                electronFlow: [
                    { from: 'carbanion', to: 'carbonyl', type: 'aldol_attack' }
                ],
                intermediates: null,
                energyLevel: 'product'
            }
        ],
        
        productRules: {
            ringContraction: true,
            product: 'smaller_ring_with_carbonyl'
        }
    },
    
    // ==================== ADDITION-ELIMINATION (ACYL SUBSTITUTION) ====================
    'ester_hydrolysis_base': {
        name: 'Ester Hydrolysis (Saponification)',
        type: 'acyl_substitution',
        reagents: ['NaOH', 'KOH'],
        conditions: 'Aqueous base, Heat (Δ)',
        
        mechanism: [
            {
                step: 1,
                title: 'Nucleophilic Addition',
                description: 'Hydroxide attacks carbonyl carbon',
                electronFlow: [
                    { from: 'OH-', to: 'carbonyl_carbon', type: 'nucleophilic_attack' },
                    { from: 'C=O_pi', to: 'oxygen', type: 'pi_bond_breaks' }
                ],
                intermediates: { type: 'tetrahedral_intermediate', geometry: 'sp3' },
                energyLevel: 'intermediate'
            },
            {
                step: 2,
                title: 'Elimination',
                description: 'Alkoxide leaving group departs, reforming C=O',
                electronFlow: [
                    { from: 'O-', to: 'C=O_pi', type: 'pi_bond_reforms' },
                    { from: 'C-OR_bond', to: 'OR-', type: 'bond_cleavage' }
                ],
                intermediates: null,
                energyLevel: 'product'
            },
            {
                step: 3,
                title: 'Acid-Base Reaction',
                description: 'Carboxylic acid deprotonated (irreversible)',
                electronFlow: [
                    { from: 'base', to: 'COOH', type: 'acid_base' }
                ],
                intermediates: null,
                energyLevel: 'final_product'
            }
        ],
        
        productRules: {
            products: ['carboxylate_salt', 'alcohol'],
            irreversibility: 'deprotonation_drives_forward'
        }
    }
};

// Functional group detection patterns
const FUNCTIONAL_GROUPS = {
    alkyl_halide: {
        pattern: ['C-X'], // X = Cl, Br, I
        properties: { reactivity: 'I > Br > Cl > F' }
    },
    alcohol: {
        pattern: ['C-OH'],
        classification: ['primary', 'secondary', 'tertiary']
    },
    alkene: {
        pattern: ['C=C'],
        properties: { nucleophilic: true }
    },
    alkyne: {
        pattern: ['C≡C'],
        properties: { acidic: 'terminal_H' }
    },
    carbonyl: {
        pattern: ['C=O'],
        subtypes: ['aldehyde', 'ketone', 'ester', 'amide', 'acid']
    },
    ester: {
        pattern: ['C(=O)-O-C'],
        reactivity: 'nucleophilic_acyl_substitution'
    },
    amine: {
        pattern: ['C-NH2', 'C-NH-C', 'C-N(C)C'],
        classification: ['primary', 'secondary', 'tertiary']
    }
};

// Reaction condition effects
const CONDITION_EFFECTS = {
    heat: {
        symbol: 'Δ',
        effect: 'Increases kinetic energy, favors elimination over substitution',
        temp_range: '60-100°C typical'
    },
    cold: {
        symbol: '0°C or -78°C',
        effect: 'Slows side reactions, increases selectivity',
        common_use: 'Ozonolysis, organometallic reactions'
    },
    light: {
        symbol: 'hν',
        effect: 'Homolytic cleavage, initiates radical reactions',
        common_use: 'Halogenation, photochemical reactions'
    },
    pressure: {
        symbol: 'High P',
        effect: 'Favors reactions with volume decrease',
        common_use: 'Hydrogenation'
    }
};

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { REACTION_DATABASE, FUNCTIONAL_GROUPS, CONDITION_EFFECTS };
}
