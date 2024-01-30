import type { AbilityItemPF2e } from "@item/ability/document.ts";
import { ItemSheetDataPF2e, ItemSheetOptions, ItemSheetPF2e } from "@item/base/sheet/sheet.ts";
import * as R from "remeda";
import { SelfEffectReference } from "./data.ts";
import { activateActionSheetListeners, createSelfEffectSheetData, handleSelfEffectDrop } from "./helpers.ts";

class AbilitySheetPF2e extends ItemSheetPF2e<AbilityItemPF2e> {
    static override get defaultOptions(): ItemSheetOptions {
        return {
            ...super.defaultOptions,
            dragDrop: [{ dropSelector: ".tab[data-tab=details]" }],
            hasSidebar: true,
        };
    }

    protected override get validTraits(): Record<string, string> {
        return R.omit(this.item.constructor.validTraits, ["archetype", "cantrip", "focus", "general"]);
    }

    override async getData(options: Partial<ItemSheetOptions> = {}): Promise<ActionSheetData> {
        const sheetData = await super.getData(options);

        return {
            ...sheetData,
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

    override async _onDrop(event: DragEvent): Promise<void> {
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

export { AbilitySheetPF2e };
