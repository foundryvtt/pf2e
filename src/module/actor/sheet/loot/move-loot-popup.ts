import { ActorPF2e } from "@actor/base";

interface MoveLootOptions extends FormApplicationOptions {
    maxQuantity: number;
}
interface MoveLootFormData extends FormData {
    quantity: number;
}
type MoveLootCallback = (quantity: number) => void;

export class MoveLootPopup extends FormApplication<{}, MoveLootOptions> {
    onSubmitCallback: MoveLootCallback;

    constructor(object: ActorPF2e, options: Partial<MoveLootOptions>, callback: MoveLootCallback) {
        super(object, options);

        this.onSubmitCallback = callback;
    }

    override getData() {
        return {
            ...super.getData(),
            maxQuantity: this.options.maxQuantity,
        };
    }

    static override get defaultOptions(): MoveLootOptions {
        return {
            ...super.defaultOptions,
            id: "MoveLootPopup",
            classes: [],
            title: game.i18n.localize("PF2E.loot.MoveLootPopupTitle"),
            template: "systems/pf2e/templates/popups/loot/move-loot-popup.html",
            width: "auto",
            maxQuantity: 1,
        };
    }

    override async _updateObject(
        _event: ElementDragEvent,
        formData: Record<string, unknown> & MoveLootFormData
    ): Promise<void> {
        if (this.onSubmitCallback) {
            this.onSubmitCallback(formData.quantity);
        }
    }
}
