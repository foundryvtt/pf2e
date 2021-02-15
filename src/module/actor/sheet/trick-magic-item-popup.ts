import { PF2EActor, SKILL_DICTIONARY } from '@actor/actor';
import { TrickMagicItemCastData } from '@item/dataDefinitions';
import { calculateTrickMagicItemCastData, TrickMagicItemDifficultyData } from '@item/spellConsumables';
import { PF2StatisticModifier } from '../../modifiers';

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
            this.result = value;
        };
        // Build a promise to pass out the result with
        const promise = new Promise<TrickMagicItemCastData | false>((resolve) => {
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
        options.title = game.i18n.localize('PF2E.TrickMagicItemPopup.Title');
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

    async _updateObject(event: any) {
        if (event.submitter?.name) {
            const skill = event.submitter.name;
            const lowerSkill = skill.toLowerCase();
            const options = ['all', 'skill-check', 'action:trick-magic-item'].concat(SKILL_DICTIONARY[lowerSkill]);
            const stat = getProperty(this.object, `data.data.skills.${lowerSkill}`) as PF2StatisticModifier;
            stat.roll({
                actor: this.object,
                event: event,
                options: options,
                notes: stat.notes,
                type: 'skill-check',
                dc: { value: this.skilloptions[skill] },
            });
            this.result = calculateTrickMagicItemCastData(this.object, lowerSkill);
        } else {
            this.result = false;
        }
    }
}
