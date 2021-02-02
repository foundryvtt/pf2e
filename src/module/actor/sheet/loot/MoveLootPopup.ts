import { PF2EActor } from '@actor/actor';

interface MoveLootOptions extends FormApplicationOptions {
    maxQuantity: number;
}
interface MoveLootFormData extends FormData {
    quantity: number;
}
type MoveLootCallback = (quantity: number) => void;

/**
 * @category Other
 */
export class MoveLootPopup extends FormApplication {
    onSubmitCallback: MoveLootCallback;

    constructor(object: PF2EActor, options: MoveLootOptions, callback: MoveLootCallback) {
        super(object, options);

        this.onSubmitCallback = callback;
    }

    /** @override */
    getData() {
        return {
            ...super.getData(),
            maxQuantity: this.options.maxQuantity,
        };
    }

    /** @override */
    static get defaultOptions(): FormApplicationOptions {
        const options = super.defaultOptions;

        options.id = 'MoveLootPopup';
        options.classes = [];
        options.title = game.i18n.localize('PF2E.loot.MoveLootPopupTitle');
        options.template = 'systems/pf2e/templates/popups/loot/move-loot-popup.html';
        options.width = 'auto';

        return options;
    }

    activateListeners(html: JQuery) {
        super.activateListeners(html);

        // Subscribe to events
    }

    async _updateObject(_event: DragEvent, formData: MoveLootFormData) {
        if (this.onSubmitCallback) {
            this.onSubmitCallback(formData.quantity);
        }
    }
}
