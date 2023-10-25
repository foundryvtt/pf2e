import { activateActionSheetListeners } from "@item/ability/helpers.ts";
import { ItemSheetDataPF2e, ItemSheetPF2e } from "@item/base/sheet/index.ts";
import { htmlQuery } from "@util";
import Tagify from "@yaireo/tagify";
import { CampaignFeaturePF2e } from "./document.ts";
import { KINGMAKER_CATEGORIES } from "./values.ts";

class CampaignFeatureSheetPF2e extends ItemSheetPF2e<CampaignFeaturePF2e> {
    override get validTraits(): Record<string, string> {
        return CONFIG.PF2E.kingmakerTraits;
    }

    override async getData(options?: Partial<DocumentSheetOptions>): Promise<CampaignFeatureSheetData> {
        const sheetData = await super.getData(options);
        const hasLevel = this.item.behavior !== "activity";

        return {
            ...sheetData,
            hasSidebar: true,
            itemType: hasLevel ? game.i18n.localize(this.item.levelLabel) : null,
            categories: KINGMAKER_CATEGORIES,
            actionTypes: CONFIG.PF2E.actionTypes,
            actionsNumber: CONFIG.PF2E.actionsNumber,
            frequencies: CONFIG.PF2E.frequencies,
            prerequisites: JSON.stringify(this.item.system.prerequisites?.value ?? []),
            isFeat: this.item.isFeat,
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];
        activateActionSheetListeners(this.item, html);

        const prerequisites = htmlQuery<HTMLInputElement>(html, 'input[name="system.prerequisites.value"]');
        if (prerequisites) {
            new Tagify(prerequisites, {
                editTags: 1,
            });
        }
    }

    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // This will be here until we migrate feat prerequisites to be a list of strings
        if (Array.isArray(formData["system.prerequisites.value"])) {
            formData["system.prerequisites.value"] = formData["system.prerequisites.value"].map((value) => ({ value }));
        }

        return super._updateObject(event, formData);
    }
}

interface CampaignFeatureSheetData extends ItemSheetDataPF2e<CampaignFeaturePF2e> {
    categories: Record<string, string>;
    actionTypes: ConfigPF2e["PF2E"]["actionTypes"];
    actionsNumber: ConfigPF2e["PF2E"]["actionsNumber"];
    frequencies: ConfigPF2e["PF2E"]["frequencies"];
    prerequisites: string;
    isFeat: boolean;
}

export { CampaignFeatureSheetPF2e };
