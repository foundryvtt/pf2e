import { CharacterPF2e } from "@actor";
import { CharacterSkillData } from "@actor/character/data";
import { ChatMessagePF2e } from "@module/chat-message";
import { ActionDefaultOptions } from "@system/action-macros";
import { LocalizePF2e } from "@system/localize";
import { RollDataPF2e } from "@system/rolls";

export function sacredDefense(options: ActionDefaultOptions): void {
    const translations = LocalizePF2e.translations.PF2E.Actions.SacredDefense;

    const actors = Array.isArray(options.actors) ? options.actors : [options.actors];
    const actor = actors[0];
    if (actors.length > 1 || !(actor instanceof CharacterPF2e)) {
        ui.notifications.error(translations.BadArgs);
        return;
    }

    const sacredDefenseMacro = async (DC: number, rel: CharacterSkillData) => {
        const options = actor.getRollOptions(["all", "skill-check", "religion"]);

        options.push(translations.Title);
        options.push("action:sacred-defense");

        const dc = {
            value: DC,
        };

        rel.roll({
            dc: dc,
            options: options,
            callback: async (roll: Rolled<Roll<RollDataPF2e>>) => {
                let healFormula: string | undefined, successLabel: string | undefined;
                const degreeOfSuccess = roll.data.degreeOfSuccess ?? 0;

                if (degreeOfSuccess === 3) {
                    healFormula = rel.rank === 3 ? `10` : `25`;
                    successLabel = game.i18n.format(translations.CritSuccess, {
                        healFormula: healFormula,
                    });
                } else if (degreeOfSuccess === 2) {
                    healFormula = rel.rank === 3 ? `5` : `15`;
                    successLabel = game.i18n.format(translations.Success, {
                        healFormula: healFormula,
                    });
                } else if (degreeOfSuccess === 1) {
                    successLabel = game.i18n.format(translations.Failure);
                } else if (degreeOfSuccess === 0) {
                    successLabel = game.i18n.format(translations.CritFailure);
                }
                if (healFormula) {
                    const token = actor.getActiveTokens().shift()?.document ?? null;

                    ChatMessagePF2e.create({
                        speaker: ChatMessagePF2e.getSpeaker({ actor, token }),
                        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                        flavor: `<strong>${translations.Title}</strong>`,
                        content: successLabel,
                    });
                }
            },
        });
    };

    const applyChanges = ($html: JQuery): void => {
        const { rel } = actor.system.skills;
        const { name } = actor;
        const requestedProf = Number($html.find("[name=dc-type]").val()) || 1;

        let usedProf = 0;
        usedProf = requestedProf <= rel.rank ? requestedProf : rel.rank;
        const roll = [
            () =>
                ui.notifications.warn(
                    game.i18n.format(translations.NotMaster, {
                        name: name,
                    })
                ),
            () => sacredDefenseMacro(10, rel),
            () => sacredDefenseMacro(20, rel),
            () => sacredDefenseMacro(30, rel),
            () => sacredDefenseMacro(40, rel),
        ][usedProf];

        roll();
    };

    const dialog = new Dialog({
        title: translations.Title,
        content: `
    <div>${translations.ContentMain}</div>
    <hr/>
    <form>
    <div class="form-group">
    <label>${translations.ContentLabel1}</label>
    <select id="dc-type" name="dc-type">
    <option value="3">${translations.ContentOption3}</option>
    <option value="4">${translations.ContentOption4}</option>
    </select>
    </div>
    </form>
    `,
        buttons: {
            yes: {
                icon: `<i class="fas fa-hand-holding-relical"></i>`,
                label: translations.Title,
                callback: applyChanges,
            },
            no: {
                icon: `<i class="fas fa-times"></i>`,
                label: translations.Cancel,
            },
        },
        default: "yes",
    });
    dialog.render(true);
}
