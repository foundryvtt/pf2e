import {
    activateActionSheetListeners,
    createSelfEffectSheetData,
    handleSelfEffectDrop,
} from "@item/ability/helpers.ts";
import { SelfEffectReference } from "@item/ability/index.ts";
import { FeatPF2e } from "@item/feat/document.ts";
import { ItemSheetDataPF2e, ItemSheetPF2e } from "@item/base/sheet/index.ts";
import { tagify } from "@util";
import { featCanHaveKeyOptions } from "./helpers.ts";

class FeatSheetPF2e extends ItemSheetPF2e<FeatPF2e> {
    static override get defaultOptions(): DocumentSheetOptions {
        return {
            ...super.defaultOptions,
            dragDrop: [{ dropSelector: ".tab[data-tab=details]" }],
        };
    }

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
            mandatoryTakeOnce: hasLineageTrait || sheetData.data.onlyLevel1,
            hasLineageTrait,
            canHaveKeyOptions: featCanHaveKeyOptions(this.item),
            selfEffect: createSelfEffectSheetData(sheetData.data.selfEffect),
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];
        activateActionSheetListeners(this.item, html);

        const getInput = (name: string): HTMLInputElement | null => html.querySelector(`input[name="${name}"]`);
        tagify(getInput("system.prerequisites.value"), { maxTags: 6 });
        tagify(getInput("system.subfeatures.keyOptions"), { whitelist: CONFIG.PF2E.abilities, maxTags: 3 });
    }

    override async _onDrop(event: ElementDragEvent): Promise<void> {
        return handleSelfEffectDrop(this, event);
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
    mandatoryTakeOnce: boolean;
    hasLineageTrait: boolean;
    canHaveKeyOptions: boolean;
    selfEffect: SelfEffectReference | null;
}

export { FeatSheetPF2e };
