import { activateActionSheetListeners } from "@item/ability/helpers.ts";
import { ItemSheetDataPF2e, ItemSheetOptions, ItemSheetPF2e } from "@item/base/sheet/sheet.ts";
import type { HTMLTagifyTagsElement } from "@system/html-elements/tagify-tags.ts";
import { htmlQuery, tagify } from "@util";
import type { CampaignFeaturePF2e } from "./document.ts";
import { KINGMAKER_CATEGORIES } from "./values.ts";

class CampaignFeatureSheetPF2e extends ItemSheetPF2e<CampaignFeaturePF2e> {
    static override get defaultOptions(): ItemSheetOptions {
        return { ...super.defaultOptions, hasSidebar: true };
    }

    override get validTraits(): Record<string, string> {
        return CONFIG.PF2E.kingmakerTraits;
    }

    override async getData(options?: Partial<ItemSheetOptions>): Promise<CampaignFeatureSheetData> {
        const sheetData = await super.getData(options);
        const hasLevel = this.item.behavior !== "activity";

        return {
            ...sheetData,
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

        const prerequisites = htmlQuery<HTMLTagifyTagsElement>(html, 'tagify-tags[name="system.prerequisites.value"]');
        if (prerequisites) {
            tagify(prerequisites, {
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
