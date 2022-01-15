import { SpellPF2e } from "@item/spell";
import { ItemSheetPF2e } from "../sheet/base";
import { ItemSheetDataPF2e, SpellSheetData } from "../sheet/data-types";
import { SpellDamage, SpellSystemData } from "./data";
import { objectHasKey } from "@util";

const DEFAULT_INTERVAL_SCALING: SpellSystemData["scaling"] = {
    interval: 1,
    damage: {},
};

export class SpellSheetPF2e extends ItemSheetPF2e<SpellPF2e> {
    override async getData(): Promise<SpellSheetData> {
        const data: ItemSheetDataPF2e<SpellPF2e> = await super.getData();

        // Create a level label to show in the summary.
        // This one is a longer version than the chat card
        const itemType =
            this.item.isCantrip && this.item.isFocusSpell
                ? game.i18n.localize("PF2E.SpellCategoryFocusCantrip")
                : this.item.isCantrip
                ? game.i18n.localize("PF2E.TraitCantrip")
                : game.i18n.localize(CONFIG.PF2E.spellCategories[this.item.data.data.category.value]);

        return {
            ...data,
            itemType,
            spellCategories: CONFIG.PF2E.spellCategories,
            spellTypes: CONFIG.PF2E.spellTypes,
            magicSchools: CONFIG.PF2E.magicSchools,
            spellLevels: CONFIG.PF2E.spellLevels,
            magicTraditions: this.prepareOptions(CONFIG.PF2E.magicTraditions, data.data.traditions),
            damageSubtypes: CONFIG.PF2E.damageSubtypes,
            damageCategories: CONFIG.PF2E.damageCategories,
            traits: this.prepareOptions(CONFIG.PF2E.spellTraits, data.data.traits, { selectedOnly: true }),
            rarities: this.prepareOptions(CONFIG.PF2E.rarityTraits, { value: [data.data.traits.rarity] }),
            spellComponents: this.formatSpellComponents(data.data),
            areaSizes: CONFIG.PF2E.areaSizes,
            areaTypes: CONFIG.PF2E.areaTypes,
            spellScalingIntervals: [1, 2, 3, 4],
        };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        $html.find(".toggle-trait").on("change", (evt) => {
            const target = evt.target as HTMLInputElement;
            const trait = target.dataset.trait ?? "";
            if (!objectHasKey(CONFIG.PF2E.spellTraits, trait)) {
                console.warn("Toggled trait is invalid");
                return;
            }

            if (target.checked && !this.item.traits.has(trait)) {
                const newTraits = this.item.data.data.traits.value.concat([trait]);
                this.item.update({ "data.traits.value": newTraits });
            } else if (!target.checked && this.item.traits.has(trait)) {
                const newTraits = this.item.data.data.traits.value.filter((t) => t !== trait);
                this.item.update({ "data.traits.value": newTraits });
            }
        });

        $html.find("[data-action='damage-create']").on("click", (event) => {
            event.preventDefault();
            const emptyDamage: SpellDamage = { value: "", type: { value: "bludgeoning", categories: [] } };
            this.item.update({
                [`data.damage.value.${randomID()}`]: emptyDamage,
            });
        });

        $html.find("[data-action='damage-delete']").on("click", (event) => {
            event.preventDefault();
            const id = $(event.target).closest("[data-action='damage-delete']").attr("data-id");
            if (id) {
                const values = { [`data.damage.value.-=${id}`]: null };
                if (this.item.data.data.scaling) {
                    values[`data.scaling.damage.-=${id}`] = null;
                }
                this.item.update(values);
            }
        });

        $html.find("[data-action='scaling-create']").on("click", (event) => {
            event.preventDefault();
            this.item.update({ "data.scaling": DEFAULT_INTERVAL_SCALING });
        });

        $html.find("[data-action='scaling-delete']").on("click", (event) => {
            event.preventDefault();
            this.item.update({ "data.-=scaling": null });
        });
    }

    private formatSpellComponents(data: SpellSystemData): string[] {
        if (!data.components) return [];
        const comps: string[] = [];
        if (data.components.focus) comps.push(game.i18n.localize(CONFIG.PF2E.spellComponents.F));
        if (data.components.material) comps.push(game.i18n.localize(CONFIG.PF2E.spellComponents.M));
        if (data.components.somatic) comps.push(game.i18n.localize(CONFIG.PF2E.spellComponents.S));
        if (data.components.verbal) comps.push(game.i18n.localize(CONFIG.PF2E.spellComponents.V));
        if (data.materials.value) comps.push(data.materials.value);
        return comps;
    }
}
