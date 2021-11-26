import { ActionPF2e } from "@item/action";
import { ItemSheetDataPF2e } from "@item/sheet/data-types";
import { getActionIcon } from "@util";
import { ItemSheetPF2e } from "../sheet/base";

export class ActionSheetPF2e extends ItemSheetPF2e<ActionPF2e> {
    override async getData() {
        const data: ItemSheetDataPF2e<ActionPF2e> = await super.getData();
        const actorWeapons = this.actor?.itemTypes.weapon.map((weapon) => weapon.data) ?? [];

        // Update icon based on the action cost
        data.item.img = getActionIcon(this.item.actionCost);

        return {
            ...data,
            categories: CONFIG.PF2E.actionCategories,
            weapons: actorWeapons,
            actionTypes: CONFIG.PF2E.actionTypes,
            actionsNumber: CONFIG.PF2E.actionsNumber,
            actionTraits: CONFIG.PF2E.actionTraits,
            skills: CONFIG.PF2E.skillList,
            proficiencies: CONFIG.PF2E.proficiencyLevels,
            traits: this.prepareOptions(CONFIG.PF2E.actionTraits, data.data.traits),
        };
    }
}
