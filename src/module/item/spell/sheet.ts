import { SpellPF2e } from '@item/spell';
import { ItemSheetDataPF2e, ItemSheetPF2e } from '../sheet/base';
import { SpellSheetData } from '../sheet/data-types';
import { SpellSystemData } from './data';

export class SpellSheetPF2e extends ItemSheetPF2e<SpellPF2e> {
    override getData(): SpellSheetData {
        const data: ItemSheetDataPF2e<SpellPF2e> = super.getData();
        return {
            ...data,
            spellCategories: CONFIG.PF2E.spellCategories,
            spellTypes: CONFIG.PF2E.spellTypes,
            magicSchools: CONFIG.PF2E.magicSchools,
            spellLevels: CONFIG.PF2E.spellLevels,
            magicTraditions: this.prepareOptions(CONFIG.PF2E.magicTraditions, data.data.traditions),
            traits: this.prepareOptions(CONFIG.PF2E.spellTraits, data.data.traits),
            rarities: this.prepareOptions(CONFIG.PF2E.rarityTraits, { value: [data.data.traits.rarity.value] }),
            spellComponents: this.formatSpellComponents(data.data),
            areaSizes: CONFIG.PF2E.areaSizes,
            areaTypes: CONFIG.PF2E.areaTypes,
            spellScalingModes: CONFIG.PF2E.spellScalingModes,
            isRitual: this.item.isRitual,
        };
    }

    private formatSpellComponents(data: SpellSystemData): string[] {
        if (!data.components.value) return [];
        const comps = data.components.value
            .split(',')
            .map(
                (component: string) =>
                    CONFIG.PF2E.spellComponents[component.trim() as keyof ConfigPF2e['PF2E']['spellComponents']] ??
                    component.trim().capitalize(),
            );
        if (data.materials.value) comps.push(data.materials.value);
        return comps;
    }
}
