import { TrickMagicItemCastData, TrickMagicItemDifficultyData } from '@item/spellConsumables';
import { PF2EActor } from '../actor';

/**
 * @category Other
 */
export class TrickMagicItemPopup extends FormApplication<PF2EActor> {
    result: TrickMagicItemCastData | false = false;
    skilloptions: TrickMagicItemDifficultyData;

    constructor(object: PF2EActor, skilloptions: TrickMagicItemDifficultyData, options?: FormApplicationOptions) {
        super(object, options);
        this.skilloptions = skilloptions;
        let setter = (value: TrickMagicItemCastData | false) => {
            return;
        };
        // Build a promise to pass out the result with
        const promise = new Promise<TrickMagicItemCastData | false>((resolve, reject) => {
            setter = (value) => {
                if (value) {
                    resolve(value);
                }
            };
        });
        // Assign the getter and setters for the result property to return and resolve
        // the promise accordingly so the calling function can know when the popup has closed
        Object.defineProperty(this, 'result', {
            set: setter,
            get: () => promise,
        });
    }

    static get defaultOptions() {
        const options = super.defaultOptions;

        options.classes = [];
        options.title = game.i18n.localize('PF2E.TrickMagicItemPopup.title');
        options.template = 'systems/pf2e/templates/popups/trick-magic-item-popup.html';
        options.width = 'auto';
        options.submitOnClose = true;

        return options;
    }

    getData() {
        const sheetData: FormApplicationData<PF2EActor> & {
            skills?: { id: string; localized: string }[];
        } = super.getData();
        sheetData.skills = Object.getOwnPropertyNames(this.skilloptions).map((s) => {
            return { id: s, localized: game.i18n.localize(`PF2E.Skill${s}`) };
        });
        return sheetData;
    }

    async _updateObject(event: any, formData: FormData & { itemType: string; level: number }) {
        if (event.submitter?.name) {
            this.result = { ability: event.submitter.name.toLowerCase() };
        } else {
            this.result = false;
        }
    }
}
