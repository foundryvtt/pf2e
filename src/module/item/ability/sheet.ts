import { AbilityItemPF2e } from "@item/ability/document.ts";
import { ItemSheetDataPF2e, ItemSheetPF2e } from "../base/sheet/base.ts";
import { activateActionSheetListeners, createSelfEffectSheetData, handleSelfEffectDrop } from "./helpers.ts";
import { SelfEffectReference } from "./index.ts";

export class ActionSheetPF2e extends ItemSheetPF2e<AbilityItemPF2e> {
    static override get defaultOptions(): DocumentSheetOptions {
        return {
            ...super.defaultOptions,
            dragDrop: [{ dropSelector: ".tab[data-tab=details]" }],
        };
    }

    override async getData(options?: Partial<DocumentSheetOptions>): Promise<ActionSheetData> {
        const sheetData = await super.getData(options);

        return {
            ...sheetData,
            hasSidebar: true,
            categories: CONFIG.PF2E.actionCategories,
            actionTypes: CONFIG.PF2E.actionTypes,
            actionsNumber: CONFIG.PF2E.actionsNumber,
            actionTraits: CONFIG.PF2E.actionTraits,
            frequencies: CONFIG.PF2E.frequencies,
            skills: CONFIG.PF2E.skillList,
            proficiencies: CONFIG.PF2E.proficiencyLevels,
            selfEffect: createSelfEffectSheetData(sheetData.data.selfEffect),
        };
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        if (!this.isEditable) return;

        const html = $html[0];
        activateActionSheetListeners(this.item, html);
    }

    override async _onDrop(event: ElementDragEvent): Promise<void> {
        return handleSelfEffectDrop(this, event);
    }
}

interface ActionSheetData extends ItemSheetDataPF2e<AbilityItemPF2e> {
    categories: ConfigPF2e["PF2E"]["actionCategories"];
    actionTypes: ConfigPF2e["PF2E"]["actionTypes"];
    actionsNumber: ConfigPF2e["PF2E"]["actionsNumber"];
    actionTraits: ConfigPF2e["PF2E"]["actionTraits"];
    frequencies: ConfigPF2e["PF2E"]["frequencies"];
    skills: ConfigPF2e["PF2E"]["skillList"];
    proficiencies: ConfigPF2e["PF2E"]["proficiencyLevels"];
    selfEffect: SelfEffectReference | null;
}
