
/**
* Checks if the variant rule for proficiency (no level added) is enabled by the user.
*/
export function useVariantProficientyRule() {
    return game.settings.get('pf2e', 'proficientyVariant') === 'ProficiencyWithoutLevel';
}

export function calculateUntrainedImprovisationProficiencyBonus(characterLevel: number) {
    let bonus = 0;
    
    if (useVariantProficientyRule()) {
        // GMG does not specify how to treat this case, so use the same as normal rules
        if (characterLevel < 7) {
            bonus = characterLevel / 2;
        } else {
            bonus = characterLevel;
        }
    } else if (characterLevel < 7) {
        bonus = characterLevel / 2;
    } else {
        bonus = characterLevel;
    }    
    
    return bonus;
}
