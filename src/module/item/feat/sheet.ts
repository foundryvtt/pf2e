import { FeatPF2e } from "@item/feat";
import { FeatSheetData, ItemSheetDataPF2e } from "../sheet/data-types";
import { ItemSheetPF2e } from "../sheet/base";
import { createSheetOptions, createSheetTags } from "@module/sheet/helpers";

export class FeatSheetPF2e extends ItemSheetPF2e<FeatPF2e> {
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<FeatSheetData> {
        const sheetData: ItemSheetDataPF2e<FeatPF2e> = await super.getData(options);

        const hasLineageTrait = this.item.traits.has("lineage");

        return {
            ...sheetData,
            itemType: game.i18n.localize(this.item.isFeature ? "PF2E.LevelLabel" : "ITEM.TypeFeat"),
            featTypes: CONFIG.PF2E.featTypes,
            actionTypes: CONFIG.PF2E.actionTypes,
            actionsNumber: CONFIG.PF2E.actionsNumber,
            frequencies: CONFIG.PF2E.frequencies,
            categories: CONFIG.PF2E.actionCategories,
            damageTypes: { ...CONFIG.PF2E.damageTypes, ...CONFIG.PF2E.healingTypes },
            prerequisites: JSON.stringify(this.item.system.prerequisites?.value ?? []),
            rarities: createSheetOptions(CONFIG.PF2E.rarityTraits, { value: [sheetData.data.traits.rarity] }),
            traits: createSheetTags(CONFIG.PF2E.featTraits, sheetData.data.traits),
            isFeat: this.item.isFeat,
            mandatoryTakeOnce: hasLineageTrait || sheetData.data.onlyLevel1,
            hasLineageTrait,
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);

        $html.find("[data-action=frequency-add]").on("click", () => {
            const per = CONFIG.PF2E.frequencies.day;
            this.item.update({ data: { frequency: { max: 1, per } } });
        });

        $html.find("[data-action=frequency-delete]").on("click", () => {
            this.item.update({ "data.-=frequency": null });
        });
    }

    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // This will be here until we migrate feat prerequisites to be a list of strings
        if (Array.isArray(formData["data.prerequisites.value"])) {
            formData["data.prerequisites.value"] = formData["data.prerequisites.value"].map((value) => ({ value }));
        }

        return super._updateObject(event, formData);
    }
}
