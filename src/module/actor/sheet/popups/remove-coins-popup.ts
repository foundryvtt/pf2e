import { Coins } from "@item/physical/data.ts";
import { ActorPF2e } from "@actor";

interface PopupFormData extends Coins {
    removeByValue: boolean;
}

/**
 * @category Other
 */
export class RemoveCoinsPopup extends FormApplication<ActorPF2e> {
    static override get defaultOptions(): FormApplicationOptions {
        const options = super.defaultOptions;
        options.id = "remove-coins";
        options.classes = [];
        options.title = "Remove Coins";
        options.template = "systems/pf2e/templates/actors/remove-coins.hbs";
        options.width = "auto";
        return options;
    }

    override async _updateObject(_event: Event, formData: Record<string, unknown> & PopupFormData): Promise<void> {
        const actor = this.object;
        const coinsToRemove = {
            pp: formData.pp,
            gp: formData.gp,
            sp: formData.sp,
            cp: formData.cp,
        };

        if (!(await actor.inventory.removeCoins(coinsToRemove, { byValue: formData.removeByValue }))) {
            ui.notifications.warn("PF2E.ErrorMessage.NotEnoughCoins", { localize: true });
        }
    }
}
