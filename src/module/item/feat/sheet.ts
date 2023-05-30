import { FeatPF2e } from "@item/feat/document.ts";
import { ItemSheetDataPF2e, ItemSheetPF2e } from "@item/sheet/index.ts";
import { htmlQuery, tagify } from "@util";
import Tagify from "@yaireo/tagify";
import { featCanHaveKeyOptions } from "./helpers.ts";
import { FrequencySource } from "@item/data/base.ts";

class FeatSheetPF2e extends ItemSheetPF2e<FeatPF2e> {
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
            categories: CONFIG.PF2E.featCategories,
            actionTypes: CONFIG.PF2E.actionTypes,
            actionsNumber: CONFIG.PF2E.actionsNumber,
            frequencies: CONFIG.PF2E.frequencies,
            damageTypes: { ...CONFIG.PF2E.damageTypes, ...CONFIG.PF2E.healingTypes },
            prerequisites: JSON.stringify(this.item.system.prerequisites?.value ?? []),
            isFeat: this.item.isFeat,
            mandatoryTakeOnce: hasLineageTrait || sheetData.data.onlyLevel1,
            hasLineageTrait,
            canHaveKeyOptions: featCanHaveKeyOptions(this.item),
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        const prerequisites = htmlQuery<HTMLInputElement>(html, 'input[name="system.prerequisites.value"]');
        if (prerequisites) {
            new Tagify(prerequisites, {
                editTags: 1,
            });
        }

        htmlQuery(html, "a[data-action=frequency-add]")?.addEventListener("click", () => {
            const frequency: FrequencySource = { max: 1, per: "day" };
            this.item.update({ system: { frequency } });
        });

        htmlQuery(html, "a[data-action=frequency-delete]")?.addEventListener("click", () => {
            this.item.update({ "system.-=frequency": null });
        });

        const keyOptionsInput = htmlQuery<HTMLInputElement>(html, 'input[name="system.subfeatures.keyOptions"]');
        tagify(keyOptionsInput, { whitelist: CONFIG.PF2E.abilities, maxTags: 3 });
    }

    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // This will be here until we migrate feat prerequisites to be a list of strings
        if (Array.isArray(formData["system.prerequisites.value"])) {
            formData["system.prerequisites.value"] = formData["system.prerequisites.value"].map((value) => ({ value }));
        }

        // Keep feat data tidy
        const keyOptionsKey = "system.subfeatures.keyOptions";
        const hasEmptyKeyOptions = Array.isArray(formData[keyOptionsKey]) && formData[keyOptionsKey].length === 0;
        const hasNoKeyOptions = !(keyOptionsKey in formData);
        if (hasEmptyKeyOptions || hasNoKeyOptions) {
            delete formData[keyOptionsKey];
            if (this.item._source.system.subfeatures) {
                formData["system.subfeatures.-=keyOptions"] = null;
            }
        }

        return super._updateObject(event, formData);
    }
}

interface FeatSheetData extends ItemSheetDataPF2e<FeatPF2e> {
    categories: ConfigPF2e["PF2E"]["featCategories"];
    actionTypes: ConfigPF2e["PF2E"]["actionTypes"];
    actionsNumber: ConfigPF2e["PF2E"]["actionsNumber"];
    frequencies: ConfigPF2e["PF2E"]["frequencies"];
    damageTypes: ConfigPF2e["PF2E"]["damageTypes"] & ConfigPF2e["PF2E"]["healingTypes"];
    prerequisites: string;
    isFeat: boolean;
    mandatoryTakeOnce: boolean;
    hasLineageTrait: boolean;
    canHaveKeyOptions: boolean;
}

export { FeatSheetPF2e };
