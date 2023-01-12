import { CharacterPF2e } from "@actor";
import { CharacterSkillData } from "@actor/character/data";
import { ChatMessagePF2e } from "@module/chat-message";
import { ActionDefaultOptions } from "@system/action-macros";
import { LocalizePF2e } from "@system/localize";

export function encouragingWords(options: ActionDefaultOptions): void {
    const translations = LocalizePF2e.translations.PF2E.Actions.EncouragingWords;

    const actors = Array.isArray(options.actors) ? options.actors : [options.actors];
    const actor = actors[0];
    if (actors.length > 1 || !(actor instanceof CharacterPF2e)) {
        ui.notifications.error(translations.BadArgs);
        return;
    }

    const encouragingWordsMacro = async (DC: number, bonus: number, dip: CharacterSkillData) => {
        const options = actor.getRollOptions(["all", "skill-check", "diplomacy"]);

        options.push(translations.Title);
        options.push("action:encourage-words");

        dip.roll({
            dc: { value: DC },
            options: options,
            callback: async (roll: Rolled<Roll>) => {
                let healFormula: string | undefined, successLabel: string | undefined;
                const degreeOfSuccess = roll.data.degreeOfSuccess ?? 0;

                const bonusString = bonus > 0 ? `+ ${bonus}` : "";
                if (degreeOfSuccess === 3) {
                    healFormula = `2d8${bonusString}`;
                    successLabel = translations.CritSuccess;
                } else if (degreeOfSuccess === 2) {
                    healFormula = `1d8${bonusString}`;
                    successLabel = translations.Success;
                } else if (degreeOfSuccess === 1) {
                    successLabel = translations.Failure;
                } else if (degreeOfSuccess === 0) {
                    healFormula = "1d8";
                    successLabel = translations.CritFailure;
                }
                if (healFormula) {
                    const healRoll = await new Roll(healFormula).roll({ async: true });
                    const rollType = degreeOfSuccess > 1 ? translations.Recovery : translations.Damage;
                    const token = actor.getActiveTokens().shift()?.document ?? null;

                    ChatMessagePF2e.create({
                        speaker: ChatMessagePF2e.getSpeaker({ actor, token }),
                        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                        flavor: `<strong>${rollType} ${translations.Title}</strong> (${successLabel})`,
                        rolls: [healRoll.toJSON()],
                    });
                }
            },
        });
    };

    const applyChanges = ($html: JQuery): void => {
        const { dip } = actor.system.skills;
        const { name } = actor;
        const mod = Number($html.find("[name=modifier]").val()) || 0;
        const requestedProf = Number($html.find("[name=dc-type]").val()) || 1;

        let usedProf = 0;
        usedProf = requestedProf <= dip.rank ? requestedProf : dip.rank;

        const roll = [
            () =>
                ui.notifications.warn(
                    game.i18n.format(translations.NotTrained, {
                        name: name,
                    })
                ),
            () => encouragingWordsMacro(15 + mod, 0, dip),
            () => encouragingWordsMacro(20 + mod, 5, dip),
            () => encouragingWordsMacro(30 + mod, 15, dip),
            () => encouragingWordsMacro(40 + mod, 25, dip),
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
    <option value="1">${translations.ContentOption1}</option>
    <option value="2">${translations.ContentOption2}</option>
    <option value="3">${translations.ContentOption3}</option>
    <option value="4">${translations.ContentOption4}</option>
    </select>
    </div>
    </form>
    <form>
    <div class="form-group">
    <label>${translations.ContentLabel2}</label>
    <input id="modifier" name="modifier" type="number"/>
    </div>
    </form>
    `,
        buttons: {
            yes: {
                icon: `<i class="fas fa-hand-holding-dipical"></i>`,
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
