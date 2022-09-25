import { FeatPF2e } from "@item/feat";
import { FeatSheetData } from "../sheet/data-types";
import { ItemSheetPF2e } from "../sheet/base";
import Tagify from "@yaireo/tagify";

export class FeatSheetPF2e extends ItemSheetPF2e<FeatPF2e> {
    override get validTraits(): Record<string, string> {
        return CONFIG.PF2E.featTraits;
    }

    override async getData(options?: Partial<DocumentSheetOptions>): Promise<FeatSheetData> {
        const sheetData = await super.getData(options);

        const hasLineageTrait = this.item.traits.has("lineage");

        return {
            ...sheetData,
            hasSidebar: true,
            itemType: game.i18n.localize(this.item.isFeature ? "PF2E.LevelLabel" : "PF2E.Item.Feat.LevelLabel"),
            featTypes: CONFIG.PF2E.featTypes,
            actionTypes: CONFIG.PF2E.actionTypes,
            actionsNumber: CONFIG.PF2E.actionsNumber,
            frequencies: CONFIG.PF2E.frequencies,
            categories: CONFIG.PF2E.actionCategories,
            damageTypes: { ...CONFIG.PF2E.damageTypes, ...CONFIG.PF2E.healingTypes },
            prerequisites: JSON.stringify(this.item.system.prerequisites?.value ?? []),
            isFeat: this.item.isFeat,
            mandatoryTakeOnce: hasLineageTrait || sheetData.data.onlyLevel1,
            hasLineageTrait,
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        const prerequisites = html.querySelector<HTMLInputElement>('input[name="system.prerequisites.value"]');
        if (prerequisites) {
            new Tagify(prerequisites, {
                editTags: 1,
            });
        }

        html.querySelector<HTMLAnchorElement>("a[data-action=frequency-add]")?.addEventListener("click", () => {
            const per = CONFIG.PF2E.frequencies.day;
            this.item.update({ system: { frequency: { max: 1, per } } });
        });

        html.querySelector("a[data-action=frequency-delete]")?.addEventListener("click", () => {
            this.item.update({ "system.-=frequency": null });
        });
    }

    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // This will be here until we migrate feat prerequisites to be a list of strings
        if (Array.isArray(formData["system.prerequisites.value"])) {
            formData["system.prerequisites.value"] = formData["system.prerequisites.value"].map((value) => ({ value }));
        }

        return super._updateObject(event, formData);
    }
}
