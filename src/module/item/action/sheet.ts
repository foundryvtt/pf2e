import { ActionItemPF2e } from "@item/action";
import { ItemSheetDataPF2e } from "@item/sheet/data-types";
import { createSheetTags, SheetOptions } from "@module/sheet/helpers";
import { getActionIcon } from "@util";
import { ItemSheetPF2e } from "../sheet/base";

export class ActionSheetPF2e extends ItemSheetPF2e<ActionItemPF2e> {
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<ActionSheetData> {
        const data = super.getBaseData(options);

        // Update icon based on the action cost
        data.item.img = getActionIcon(this.item.actionCost);

        return {
            ...data,
            hasSidebar: true,
            categories: CONFIG.PF2E.actionCategories,
            actionTypes: CONFIG.PF2E.actionTypes,
            actionsNumber: CONFIG.PF2E.actionsNumber,
            actionTraits: CONFIG.PF2E.actionTraits,
            frequencies: CONFIG.PF2E.frequencies,
            skills: CONFIG.PF2E.skillList,
            proficiencies: CONFIG.PF2E.proficiencyLevels,
            traits: createSheetTags(CONFIG.PF2E.actionTraits, data.data.traits),
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);

        $html.find("[data-action=frequency-add]").on("click", () => {
            const per = CONFIG.PF2E.frequencies.day;
            this.item.update({ system: { frequency: { max: 1, per } } });
        });

        $html.find("[data-action=frequency-delete]").on("click", () => {
            this.item.update({ "system.-=frequency": null });
        });
    }
}

interface ActionSheetData extends ItemSheetDataPF2e<ActionItemPF2e> {
    categories: ConfigPF2e["PF2E"]["actionCategories"];
    actionTypes: ConfigPF2e["PF2E"]["actionTypes"];
    actionsNumber: ConfigPF2e["PF2E"]["actionsNumber"];
    actionTraits: ConfigPF2e["PF2E"]["actionTraits"];
    frequencies: ConfigPF2e["PF2E"]["frequencies"];
    skills: ConfigPF2e["PF2E"]["skillList"];
    proficiencies: ConfigPF2e["PF2E"]["proficiencyLevels"];
    traits: SheetOptions;
}
