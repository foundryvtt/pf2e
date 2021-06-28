import { SpellPF2e } from '@item/spell';
import { ItemSheetPF2e } from '../sheet/base';
import { ItemSheetDataPF2e, SpellSheetData } from '../sheet/data-types';
import { SpellSystemData } from './data';
import { objectHasKey } from '@module/utils';

export class SpellSheetPF2e extends ItemSheetPF2e<SpellPF2e> {
    override getData(): SpellSheetData {
        const data: ItemSheetDataPF2e<SpellPF2e> = super.getData();

        // Create a level label to show in the summary.
        // This one is a longer version than the chat card
        const levelLabel = (() => {
            const category =
                this.item.isCantrip && this.item.isFocusSpell
                    ? game.i18n.localize('PF2E.SpellCategoryFocusCantrip')
                    : this.item.isCantrip
                    ? game.i18n.localize('PF2E.TraitCantrip')
                    : game.i18n.localize(CONFIG.PF2E.spellCategories[this.item.data.data.category.value]);
            return game.i18n.format('PF2E.SpellLevel', { category, level: this.item.level });
        })();

        return {
            ...data,
            levelLabel,
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
        };
    }

    override activateListeners(html: JQuery<HTMLElement>): void {
        super.activateListeners(html);

        html.find('.toggle-trait').on('change', (evt) => {
            const target = evt.target as HTMLInputElement;
            const trait = target.dataset.trait ?? '';
            if (!objectHasKey(CONFIG.PF2E.spellTraits, trait)) {
                console.warn('Toggled trait is invalid');
                return;
            }

            if (target.checked && !this.item.traits.has(trait)) {
                const newTraits = this.item.data.data.traits.value.concat([trait]);
                this.item.update({ 'data.traits.value': newTraits });
            } else if (!target.checked && this.item.traits.has(trait)) {
                const newTraits = this.item.data.data.traits.value.filter((t) => t !== trait);
                this.item.update({ 'data.traits.value': newTraits });
            }
        });
    }

    private formatSpellComponents(data: SpellSystemData): string[] {
        if (!data.components) return [];
        const comps: string[] = [];
        if (data.components.material) comps.push(game.i18n.localize(CONFIG.PF2E.spellComponents.M));
        if (data.components.somatic) comps.push(game.i18n.localize(CONFIG.PF2E.spellComponents.S));
        if (data.components.verbal) comps.push(game.i18n.localize(CONFIG.PF2E.spellComponents.V));
        if (data.materials.value) comps.push(data.materials.value);
        return comps;
    }
}
