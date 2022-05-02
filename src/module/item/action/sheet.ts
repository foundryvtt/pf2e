import { ActionItemPF2e } from "@item/action";
import { ItemSheetDataPF2e } from "@item/sheet/data-types";
import { createSheetTags, SheetOptions } from "@module/sheet/helpers";
import { getActionIcon } from "@util";
import { ItemSheetPF2e } from "../sheet/base";

export class ActionSheetPF2e extends ItemSheetPF2e<ActionItemPF2e> {
    override async getData(): Promise<ActionSheetData> {
        const data: ItemSheetDataPF2e<ActionItemPF2e> = await super.getData();

        // Update icon based on the action cost
        data.item.img = getActionIcon(this.item.actionCost);

        return {
            ...data,
            categories: CONFIG.PF2E.actionCategories,
            actionTypes: CONFIG.PF2E.actionTypes,
            actionsNumber: CONFIG.PF2E.actionsNumber,
            actionTraits: CONFIG.PF2E.actionTraits,
            skills: CONFIG.PF2E.skillList,
            proficiencies: CONFIG.PF2E.proficiencyLevels,
            traits: createSheetTags(CONFIG.PF2E.actionTraits, data.data.traits),
        };
    }
}

interface ActionSheetData extends ItemSheetDataPF2e<ActionItemPF2e> {
    categories: ConfigPF2e["PF2E"]["actionCategories"];
    actionTypes: ConfigPF2e["PF2E"]["actionTypes"];
    actionsNumber: ConfigPF2e["PF2E"]["actionsNumber"];
    actionTraits: ConfigPF2e["PF2E"]["actionTraits"];
    skills: ConfigPF2e["PF2E"]["skillList"];
    proficiencies: ConfigPF2e["PF2E"]["proficiencyLevels"];
    traits: SheetOptions;
}
