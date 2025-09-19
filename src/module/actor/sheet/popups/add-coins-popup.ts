import { ActorPF2e } from "@actor/base.ts";
import { RawCoins } from "@item/physical/data.ts";
import appv1 = foundry.appv1;

interface AddCoinsFormData extends RawCoins {
    combineStacks: boolean;
}

/**
 * @category Other
 */
export class AddCoinsPopup extends appv1.api.FormApplication<ActorPF2e> {
    static override get defaultOptions(): appv1.api.FormApplicationOptions {
        return {
            ...super.defaultOptions,
            id: "add-coins",
            title: "PF2E.AddCoinsTitle",
            template: "systems/pf2e/templates/actors/add-coins.hbs",
        };
    }

    override async _updateObject(_event: Event, formData: Record<string, unknown> & AddCoinsFormData): Promise<void> {
        const combineStacks = !!formData.combineStacks;
        const coins = {
            pp: Number(formData.pp) || 0,
            gp: Number(formData.gp) || 0,
            sp: Number(formData.sp) || 0,
            cp: Number(formData.cp) || 0,
        };
        return this.object.inventory.addCoins(coins, { combineStacks });
    }
}
