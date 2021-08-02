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

    constructor(object: ActorPF2e, options: MoveLootOptions, callback: MoveLootCallback) {
        super(object, options);

        this.onSubmitCallback = callback;
    }

    override getData() {
        return {
            ...super.getData(),
            maxQuantity: this.options.maxQuantity,
        };
    }

    static override get defaultOptions(): FormApplicationOptions {
        const options = super.defaultOptions;

        options.id = "MoveLootPopup";
        options.classes = [];
        options.title = game.i18n.localize("PF2E.loot.MoveLootPopupTitle");
        options.template = "systems/pf2e/templates/popups/loot/move-loot-popup.html";
        options.width = "auto";

        return options;
    }

    override activateListeners(html: JQuery) {
        super.activateListeners(html);

        // Subscribe to events
    }

    override async _updateObject(_event: ElementDragEvent, formData: MoveLootFormData) {
        if (this.onSubmitCallback) {
            this.onSubmitCallback(formData.quantity);
        }
    }
}
