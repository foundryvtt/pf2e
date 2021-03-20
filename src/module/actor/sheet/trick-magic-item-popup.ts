import { ActorPF2e, SKILL_DICTIONARY } from '@actor/base';
import { TrickMagicItemCastData } from '@item/data-definitions';
import { calculateTrickMagicItemCastData, TrickMagicItemDifficultyData } from '@item/spell-consumables';
import { SkillAbbreviation } from '@actor/data-definitions';
import { StatisticModifier } from '@module/modifiers';

/**
 * @category Other
 */
export class TrickMagicItemPopup extends FormApplication<ActorPF2e> {
    result: TrickMagicItemCastData | false = false;
    skilloptions: TrickMagicItemDifficultyData;
    castCallback: (trickMagicItemCastData: TrickMagicItemCastData) => void;

    constructor(
        object: ActorPF2e,
        skilloptions: TrickMagicItemDifficultyData,
        callback: (trickMagicItemCastData: TrickMagicItemCastData) => void,
        options?: FormApplicationOptions,
    ) {
        super(object, options);
        this.skilloptions = skilloptions;
        this.castCallback = callback;
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
        const sheetData: FormApplicationData<ActorPF2e> & {
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
            const lowerSkill = skill.toLowerCase() as SkillAbbreviation;
            const options = ['all', 'skill-check', 'action:trick-magic-item'].concat(SKILL_DICTIONARY[lowerSkill]);
            const stat = getProperty(this.object, `data.data.skills.${lowerSkill}`) as StatisticModifier;
            stat.roll({
                actor: this.object,
                event: event,
                options: options,
                notes: stat.notes,
                type: 'skill-check',
                dc: { value: this.skilloptions[skill] },
            });
            this.result = calculateTrickMagicItemCastData(this.object, lowerSkill);
            this.castCallback(this.result);
        } else {
            this.result = false;
        }
    }
}
