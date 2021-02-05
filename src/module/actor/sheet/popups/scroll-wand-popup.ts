import { PF2EActor } from '../../actor';
import { SpellData } from '@item/data-definitions';

/**
 * @category Other
 */
export class ScrollWandPopup extends FormApplication<PF2EActor> {
    onSubmitCallback: (a: number, b: string, spellData: SpellData) => void;
    spellData: SpellData;

    constructor(
        object: PF2EActor,
        options: FormApplicationOptions,
        callback: (a: number, b: string, c: SpellData) => void,
        spellData: SpellData,
    ) {
        super(object, options);

        this.spellData = spellData;
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

        if (!this.spellData) {
            throw Error('PF2E | ScrollWandPopup | Could not read spelldata');
        }

        for (let i = this.spellData.data.level.value; i <= 10; i++) {
            sheetData.validLevels.push(i);
        }
        return sheetData;
    }

    async _updateObject(_event: Event, formData: { itemType: string; level: number }) {
        if (formData.itemType === 'wand' && formData.level === 10) {
            ui.notifications.warn(game.i18n.localize('PF2E.ScrollWandPopup.10thLevelWand'));
        } else if (this.onSubmitCallback) {
            this.onSubmitCallback(formData.level, formData.itemType, this.spellData);
        }
    }
}
