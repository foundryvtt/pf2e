import { ActorPF2e, CreaturePF2e } from "@actor";
import { ChatMessagePF2e } from "@module/chat-message";
import { eventToRollParams } from "@scripts/sheet-util";
import { ActionDefaultOptions } from "@system/action-macros";
import { CheckDC } from "@system/degree-of-success";

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
    const dialog = new Dialog({
        title: "Treat Wounds",
        content: `
<div>Select a target DC. Remember that you can't attempt a heal above your proficiency. Attempting to do so will downgrade the DC and amount healed to the highest you're capable of.</div>
<hr/>
<form>
<div class="form-group">
<label>Treat Wounds Skill:</label>
<select id="skill" name="skill"${!chirurgeon && !naturalMedicine ? " disabled" : ""}>
<option value="medicine">Medicine</option>
${chirurgeon ? `<option value="crafting">Crafting</option>` : ``}
${naturalMedicine ? `<option value="nature">Nature</option>` : ``}
</select>
</div>
</form>
<form>
<div class="form-group">
<label>Medicine DC:</label>
<select id="dc-type" name="dc-type">
<option value="1">Trained DC 15</option>
<option value="2">Expert DC 20, +10 Healing</option>
<option value="3">Master DC 30, +30 Healing</option>
<option value="4">Legendary DC 40, +50 Healing</option>
</select>
</div>
</form>
<form>
<div class="form-group">
<label>DC Modifier:</label>
<input id="modifier" name="modifier" type="number"/>
</div>
</form>
${
    CheckFeat(actor, "risky-surgery")
        ? `<form><div class="form-group">
<label>Risky Surgery</label>
<input type="checkbox" id="risky_surgery_bool" name="risky_surgery_bool"></input>
</div></form>`
        : ``
}
${
    CheckFeat(actor, "mortal-healing")
        ? `<form><div class="form-group">
<label>Mortal Healing</label>
<input type="checkbox" id="mortal_healing_bool" name="mortal_healing_bool" checked></input>
</div></form>`
        : ``
}
</form>
`,
        buttons: {
            yes: {
                icon: `<i class="fas fa-hand-holding-medical"></i>`,
                label: "Treat Wounds",
                callback: ($html) => applyChanges(actor, $html, options.event),
            },
            no: {
                icon: `<i class="fas fa-times"></i>`,
                label: "Cancel",
            },
        },
        default: "yes",
    });
    dialog.render(true);
}

async function applyChanges(actor: CreaturePF2e, $html: JQuery, event: JQuery.TriggeredEvent) {
    const { name } = actor;
    const mod = Number($html.find('[name="modifier"]').val()) || 0;
    const requestedProf = Number($html.find('[name="dc-type"]').val()) || 1;
    const riskysurgery = $html.find('[name="risky_surgery_bool"]').prop("checked");
    const mortalhealing = $html.find('[name="mortal_healing_bool"]').prop("checked");
    const skillName = String($html.find('[name="skill"]').val());

    const skill = actor.skills[skillName];
    if (!skill?.proficient) {
        ui.notifications.warn(`Token ${name} does not have the medicine skill`);
        return;
    }

    const rank = skill.rank ?? 1;
    const usedProf = requestedProf <= rank ? requestedProf : rank;
    const medicBonus = CheckFeat(actor, "medic-dedication") ? (usedProf - 1) * 5 : 0;
    const dcValue = [15, 20, 30, 40][usedProf - 1] + mod;
    const bonus = [0, 10, 30, 50][usedProf - 1] + medicBonus;

    const rollOptions = actor.getRollOptions(["all", "skill-check", "medicine"]);
    rollOptions.push("treat wounds");
    rollOptions.push("action:treat-wounds");
    if (riskysurgery) {
        rollOptions.push("risky-surgery");
    }

    const modifiers = riskysurgery || mortalhealing ? ({ success: "one-degree-better" } as const) : undefined;
    const dc: CheckDC = { value: dcValue, visibility: "all", modifiers };

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

            if (riskysurgery) {
                ChatMessagePF2e.create({
                    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                    flavor: `<strong>Damage Roll: Risky Surgery</strong>`,
                    roll: (await new Roll("{1d8}[slashing]").roll({ async: true })).toJSON(),
                    speaker,
                });
            }

            if (healFormula) {
                const healRoll = await new Roll(`{${healFormula}}[healing]`).roll({ async: true });
                const rollType = outcome !== "criticalFailure" ? "Healing" : "Damage";
                ChatMessagePF2e.create({
                    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                    flavor: `<strong>${rollType} Roll: Treat Wounds</strong> (${successLabel})`,
                    roll: healRoll.toJSON(),
                    speaker,
                });
            }
        },
    });
}
