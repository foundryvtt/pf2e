import { ActorPF2e } from "@actor/base.ts";
import { Coins } from "@item/physical/data.ts";

interface AddCoinsFormData extends Coins {
    combineStacks: boolean;
}

/**
 * @category Other
 */
export class AddCoinsPopup extends FormApplication<ActorPF2e> {
    static override get defaultOptions(): FormApplicationOptions {
        const options = super.defaultOptions;
        options.id = "add-coins";
        options.classes = [];
        options.title = "Add Coins";
        options.template = "systems/pf2e/templates/actors/add-coins.hbs";
        options.width = "auto";
        return options;
    }

    override async _updateObject(_event: Event, formData: Record<string, unknown> & AddCoinsFormData): Promise<void> {
        const combineStacks = formData.combineStacks;
        const coins = { pp: formData.pp, gp: formData.gp, sp: formData.sp, cp: formData.cp };
        this.object.inventory.addCoins(coins, { combineStacks });
    }
}
