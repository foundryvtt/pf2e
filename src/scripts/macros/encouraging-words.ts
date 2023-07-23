import { CharacterPF2e } from "@actor";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { ActionDefaultOptions } from "@system/action-macros/index.ts";
import { Statistic } from "@system/statistic/index.ts";
import { localizer } from "@util";

export function encouragingWords(options: ActionDefaultOptions): void {
    const localize = localizer("PF2E.Actions.EncouragingWords");

    const actors = Array.isArray(options.actors) ? options.actors : [options.actors];
    const actor = actors[0];
    if (actors.length > 1 || !(actor instanceof CharacterPF2e)) {
        return ui.notifications.error(localize("BadArgs"));
    }

    const encouragingWordsMacro = async (DC: number, bonus: number, dip: Statistic) => {
        dip.roll({
            dc: { value: DC },
            extraRollOptions: ["action:encourage-words"],
            callback: async (roll: Rolled<Roll>) => {
                let healFormula: string | undefined, successLabel: string | undefined;
                const degreeOfSuccess = Number(roll.options.degreeOfSuccess) || 0;

                const bonusString = bonus > 0 ? `+ ${bonus}` : "";
                if (degreeOfSuccess === 3) {
                    healFormula = `2d8${bonusString}`;
                    successLabel = localize("CritSuccess");
                } else if (degreeOfSuccess === 2) {
                    healFormula = `1d8${bonusString}`;
                    successLabel = localize("Success");
                } else if (degreeOfSuccess === 1) {
                    successLabel = localize("Failure");
                } else if (degreeOfSuccess === 0) {
                    healFormula = "1d8";
                    successLabel = localize("CritFailure");
                }
                if (healFormula) {
                    const healRoll = await new Roll(healFormula).roll({ async: true });
                    const rollType = degreeOfSuccess > 1 ? localize("Recovery") : localize("Damage");
                    const token = actor.getActiveTokens().shift()?.document ?? null;

                    ChatMessagePF2e.create({
                        speaker: ChatMessagePF2e.getSpeaker({ actor, token }),
                        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                        flavor: `<strong>${rollType} ${localize("Title")}</strong> (${successLabel})`,
                        rolls: [healRoll.toJSON()],
                    });
                }
            },
        });
    };

    const applyChanges = ($html: JQuery): void => {
        const { diplomacy } = actor.skills;
        const mod = Number($html.find("[name=modifier]").val()) || 0;
        const requestedProf = Number($html.find("[name=dc-type]").val()) || 1;

        const rank = diplomacy.rank ?? 0;
        const usedProf = requestedProf <= rank ? requestedProf : rank;

        const roll = [
            () => ui.notifications.warn(localize("NotTrained", { name: actor.name })),
            () => encouragingWordsMacro(15 + mod, 0, diplomacy),
            () => encouragingWordsMacro(20 + mod, 5, diplomacy),
            () => encouragingWordsMacro(30 + mod, 15, diplomacy),
            () => encouragingWordsMacro(40 + mod, 25, diplomacy),
        ][usedProf];

        roll();
    };

    const dialog = new Dialog({
        title: localize("Title"),
        content: `
    <div>${localize("ContentMain")}</div>
    <hr/>
    <form>
    <div class="form-group">
    <label>${localize("ContentLabel1")}</label>
    <select id="dc-type" name="dc-type">
    <option value="1">${localize("ContentOption1")}</option>
    <option value="2">${localize("ContentOption2")}</option>
    <option value="3">${localize("ContentOption3")}</option>
    <option value="4">${localize("ContentOption4")}</option>
    </select>
    </div>
    </form>
    <form>
    <div class="form-group">
    <label>${localize("ContentLabel2")}</label>
    <input id="modifier" name="modifier" type="number"/>
    </div>
    </form>
    `,
        buttons: {
            yes: {
                icon: `<i class="fas fa-hand-holding-dipical"></i>`,
                label: localize("Title"),
                callback: applyChanges,
            },
            no: {
                icon: `<i class="fas fa-times"></i>`,
                label: localize("Cancel"),
            },
        },
        default: "yes",
    });
    dialog.render(true);
}
