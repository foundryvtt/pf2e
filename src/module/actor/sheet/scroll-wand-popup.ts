/* global game */

import { SpellData } from 'src/module/item/dataDefinitions';

/**
 * @category Other
 */
export class ScrollWandPopup extends FormApplication {
    onSubmitCallback: (a: number, b: string, c: SpellData) => void;
    spellData: SpellData;

    constructor(object, options, callback) {
        super(object, options);

        this.onSubmitCallback = callback;
    }

    static get defaultOptions() {
        const options = super.defaultOptions;

        options.id = 'ScrollWandPopup';
        options.classes = [];
        options.title = game.i18n.localize('PF2E.ScrollWandPopup.title');
        options.template = 'systems/pf2e/templates/popups/scroll-wand-popup.html';
        options.width = 'auto';

        return options;
    }

    getData() {
        const sheetData = super.getData();
        sheetData.validLevels = [];
        for (let i = this.spellData.data.level.value; i <= 10; i++) {
            sheetData.validLevels.push(i);
        }
        return sheetData;
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Subscribe to events
    }

    async _updateObject(event, formData) {
        if (formData.itemType === 'wand' && formData.level === 10) {
            ui.notifications.warn(game.i18n.localize('PF2E.ScrollWandPopup.10thLevelWand'));
        } else if (this.onSubmitCallback) {
            this.onSubmitCallback(formData.level as number, formData.itemType as string, this.spellData);
        }
    }
}
