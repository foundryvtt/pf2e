import { ActorPF2e, CreaturePF2e } from "@actor";
import { ChatMessagePF2e } from "@module/chat-message";
import { eventToRollParams } from "@scripts/sheet-util";
import { ActionDefaultOptions } from "@system/action-macros";
import { DamageRoll } from "@system/damage/roll";
import { CheckDC, DegreeOfSuccessAdjustment, DEGREE_ADJUSTMENT_AMOUNTS } from "@system/degree-of-success";

function CheckFeat(actor: ActorPF2e, slug: string) {
    if (actor.items.find((i) => i.slug === slug && i.type === "feat")) {
        return true;
    }
    return false;
}

export async function treatWounds(options: ActionDefaultOptions) {
    const actors = Array.isArray(options.actors) ? options.actors : [options.actors];
    const actor = actors[0];
    if (!actor || !actor.isOfType("creature")) {
        ui.notifications.error("PF2E.ErrorMessage.NoPCTokenSelected");
        return;
    }

    const chirurgeon = CheckFeat(actor, "chirurgeon");
    const naturalMedicine = CheckFeat(actor, "natural-medicine");
    const domIdAppend = randomID(); // Attached to element id attributes for DOM uniqueness
    const dialog = new Dialog({
        title: game.i18n.localize("PF2E.Actions.TreatWounds.Label"),
        content: `
<div>${game.i18n.localize("PF2E.Actions.TreatWounds.Label")}</div>
<hr/>
<form>
<div class="form-group">
<label for="skill-${domIdAppend}">${game.i18n.localize("PF2E.Actions.TreatWounds.SkillSelect")}</label>
<select id="skill-${domIdAppend}"${!chirurgeon && !naturalMedicine ? " disabled" : ""}>
  <option value="medicine">Medicine</option>
  ${chirurgeon ? `<option value="crafting">Crafting</option>` : ``}
  ${naturalMedicine ? `<option value="nature">Nature</option>` : ``}
</select>
</div>
</form>
<form>
<div class="form-group">
<label for="dc-type-${domIdAppend}">Medicine DC:</label>
<select id="dc-type-${domIdAppend}" name="dc-type">
  <option value="1">${game.i18n.localize("PF2E.Actions.TreatWounds.DC.Trained")}</option>
  <option value="2">${game.i18n.localize("PF2E.Actions.TreatWounds.DC.Expert")}</option>
  <option value="3">${game.i18n.localize("PF2E.Actions.TreatWounds.DC.Master")}</option>
  <option value="4">${game.i18n.localize("PF2E.Actions.TreatWounds.DC.Legendary")}</option>
</select>
</div>
</form>
<form>
<div class="form-group">
<label for="modifier-${domIdAppend}">${game.i18n.localize("PF2E.Actions.TreatWounds.DC.Mod")}</label>
<input id="modifier-${domIdAppend}" type="number" />
</div>
</form>
${
    CheckFeat(actor, "risky-surgery")
        ? `<form><div class="form-group">
<label for="risky-surgery-${domIdAppend}">${game.i18n.localize("PF2E.Actions.TreatWounds.Feats.RiskySurgery")}</label>
<input type="checkbox" id="risky-surgery-${domIdAppend}" />
</div></form>`
        : ``
}
${
    CheckFeat(actor, "mortal-healing")
        ? `<form><div class="form-group">
<label for="mortal-healing-${domIdAppend}">${game.i18n.localize("PF2E.Actions.TreatWounds.Feats.MortalHealing")}</label>
<input type="checkbox" id="mortal-healing-${domIdAppend}" checked />
</div></form>`
        : ``
}
</form>
`,
        buttons: {
            yes: {
                icon: `<i class="fas fa-hand-holding-medical"></i>`,
                label: game.i18n.localize("PF2E.Actions.TreatWounds.Label"),
                callback: ($html) => treat(actor, $html, options.event, domIdAppend),
            },
            no: {
                icon: `<i class="fas fa-times"></i>`,
                label: game.i18n.localize("Cancel"),
            },
        },
        default: "yes",
    });
    dialog.render(true);
}

async function treat(
    actor: CreaturePF2e,
    $html: JQuery,
    event: JQuery.TriggeredEvent,
    domIdAppend: string
): Promise<void> {
    const { name } = actor;
    const mod = Number($html.find(`#modifier-${domIdAppend}`).val()) || 0;
    const requestedProf = Number($html.find(`#dc-type-${domIdAppend}`).val()) || 1;
    const riskySurgery: boolean = $html.find(`#risky-surgery-${domIdAppend}`).prop("checked");
    const mortalHealing: boolean = $html.find(`#mortal-healing-${domIdAppend}`).prop("checked");
    const skillSlug = String($html.find(`#skill-${domIdAppend}`).val()) || "medicine";
    const skill = actor.skills[skillSlug];
    if (!skill?.proficient) {
        return ui.notifications.warn(game.i18n.format("PF2E.Actions.TreatWounds.Error", { name }));
    }

    const rank = skill.rank ?? 1;
    const usedProf = requestedProf <= rank ? requestedProf : rank;
    const medicBonus = CheckFeat(actor, "medic-dedication") ? (usedProf - 1) * 5 : 0;
    const dcValue = [15, 20, 30, 40][usedProf - 1] + mod;
    const bonus = [0, 10, 30, 50][usedProf - 1] + medicBonus;

    const rollOptions = actor.getRollOptions(["all", "skill-check", "medicine"]);
    rollOptions.push("action:treat-wounds");
    if (riskySurgery) rollOptions.push("risky-surgery");
    const dc: CheckDC = { value: dcValue, visible: true };
    const increaseDoS = (locKey: string): DegreeOfSuccessAdjustment => ({
        adjustments: {
            success: {
                label: `PF2E.Actions.TreatWounds.Rolls.${locKey}`,
                amount: DEGREE_ADJUSTMENT_AMOUNTS.INCREASE,
            },
        },
    });

    (actor.synthetics.degreeOfSuccessAdjustments["medicine"] ??= []).push(
        ...(riskySurgery ? [increaseDoS("RiskySurgery")] : mortalHealing ? [increaseDoS("MortalHealing")] : [])
    );

    skill.check.roll({
        dc,
        ...eventToRollParams(event),
        extraRollOptions: rollOptions,
        callback: async (_roll, outcome) => {
            const successLabel = outcome ? game.i18n.localize(`PF2E.Check.Result.Degree.Check.${outcome}`) : "";
            const magicHands = CheckFeat(actor, "magic-hands");
            const bonusString = bonus > 0 ? `+ ${bonus}` : "";

            const healFormula = (() => {
                switch (outcome) {
                    case "criticalSuccess":
                        return magicHands ? `32${bonusString}` : `4d8${bonusString}`;
                    case "success":
                        return magicHands ? `16${bonusString}` : `2d8${bonusString}`;
                    case "criticalFailure":
                        return "1d8";
                    default:
                        return null;
                }
            })();

            const speaker = ChatMessagePF2e.getSpeaker({ actor });

            if (riskySurgery) {
                ChatMessagePF2e.create({
                    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                    flavor: `<strong>${game.i18n.localize("PF2E.Actions.TreatWounds.Rolls.RiskySurgery")}</strong>`,
                    rolls: [(await new DamageRoll("{1d8[slashing]}").roll({ async: true })).toJSON()],
                    speaker,
                });
            }

            if (healFormula) {
                const healRoll = await new DamageRoll(`{(${healFormula})[healing]}`).roll({ async: true });
                const rollType =
                    outcome !== "criticalFailure"
                        ? game.i18n.localize("PF2E.Actions.TreatWounds.Rolls.TreatWounds")
                        : game.i18n.localize("PF2E.Actions.TreatWounds.Rolls.TreatWoundsCriticalFailure");
                ChatMessagePF2e.create({
                    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                    flavor: `<strong>${rollType}</strong> (${successLabel})`,
                    rolls: [healRoll.toJSON()],
                    speaker,
                });
            }
        },
    });
}
