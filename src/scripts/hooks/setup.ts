import { PF2eSystem } from '../../module/pf2e-system';

/**
 * This runs after game data has been requested and loaded from the servers, so entities exist
 */
export function listen() {
    Hooks.once('setup', () => {
        window.PF2e = new PF2eSystem();

        // Localize CONFIG objects once up-front
        const toLocalize = [
            'abilities',
            'skills',
            'martialSkills',
            'currencies',
            'saves',
            'armorTraits',
            'preciousMaterialGrades',
            'armorPotencyRunes',
            'armorResiliencyRunes',
            'armorPropertyRunes',
            'weaponPotencyRunes',
            'weaponStrikingRunes',
            'weaponPropertyRunes',
            'rarityTraits',
            'damageTypes',
            'weaponDamage',
            'healingTypes',
            'weaponTypes',
            'weaponGroups',
            'consumableTraits',
            'weaponDescriptions',
            'weaponTraits',
            'traitsDescriptions',
            'weaponHands',
            'equipmentTraits',
            'itemBonuses',
            'damageDie',
            'weaponRange',
            'weaponMAP',
            'weaponReload',
            'armorTypes',
            'armorGroups',
            'consumableTypes',
            'magicTraditions',
            'preparationType',
            'spellTraits',
            'featTraits',
            'areaTypes',
            'areaSizes',
            'classTraits',
            'ancestryTraits',
            'alignment',
            'skillList',
            'spellComponents',
            'spellTypes',
            'spellTraditions',
            'spellSchools',
            'spellLevels',
            'featTypes',
            'featActionTypes',
            'actionTypes',
            'actionTypes',
            'actionsNumber',
            'actionCategories',
            'proficiencyLevels',
            'heroPointLevels',
            'actorSizes',
            'bulkTypes',
            'conditionTypes',
            'immunityTypes',
            'resistanceTypes',
            'weaknessTypes',
            'languages',
            'monsterTraits',
            'spellScalingModes',
            'attackEffects',
            'hazardTraits',
            'attributes',
            'speedTypes',
            'senses',
            'preciousMaterials',
            'prerequisitePlaceholders',
            'ancestryItemTraits',
            'levels',
            'dcAdjustments',
        ];
        for (const o of toLocalize) {
            CONFIG.PF2E[o] = Object.entries(CONFIG.PF2E[o]).reduce((obj, e: any) => {
                obj[e[0]] = game.i18n.localize(e[1]);
                return obj;
            }, {});
        }
    });
}
