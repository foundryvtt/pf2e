/* global game */

import { PF2EActor } from '../actor';
import { SpellData } from 'src/module/item/dataDefinitions';

/**
 * @category Other
 */
export class ScrollWandPopup extends FormApplication<PF2EActor> {
    onSubmitCallback: (a: number, b: string, spellData: SpellData) => void;
    spellData: SpellData;

    constructor(object: PF2EActor, options: unknown, callback: (a: number, b: string, c: SpellData) => void) {
        super(object, options);

        this.onSubmitCallback = callback;
    }

    static get defaultOptions() {
        const options = super.defaultOptions;

        options.classes = [];
        options.title = game.i18n.localize('PF2E.ScrollWandPopup.title');
        options.template = 'systems/pf2e/templates/popups/scroll-wand-popup.html';
        options.width = 'auto';

        return options;
    }

    getData() {
        const sheetData: FormApplicationData<PF2EActor> & { validLevels?: number[] } = super.getData();
        sheetData.validLevels = [];
        for (let i = this.spellData.data.level.value; i <= 10; i++) {
            sheetData.validLevels.push(i);
        }
        return sheetData;
    }

    async _updateObject(_event: Event, formData: FormData & { itemType: string; level: number }) {
        if (formData.itemType === 'wand' && formData.level === 10) {
            ui.notifications.warn(game.i18n.localize('PF2E.ScrollWandPopup.10thLevelWand'));
        } else if (this.onSubmitCallback) {
            this.onSubmitCallback(formData.level as number, formData.itemType as string, this.spellData);
        }
    }
}
