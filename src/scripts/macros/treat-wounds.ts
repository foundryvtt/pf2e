import type { ActorPF2e, CreaturePF2e } from "@actor";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import type { RollOptionRuleElement } from "@module/rules/rule-element/roll-option/rule-element.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import type { ActionDefaultOptions } from "@system/action-macros/index.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import {
    DEGREE_ADJUSTMENT_AMOUNTS,
    type CheckDC,
    type DegreeOfSuccessAdjustment,
    type DegreeOfSuccessString,
} from "@system/degree-of-success.ts";
import { fontAwesomeIcon, objectHasKey } from "@util";

function CheckFeat(actor: ActorPF2e, slug: string): boolean {
    if (actor.items.find((i) => i.slug === slug && i.type === "feat")) {
        return true;
    }
    return false;
}

/** Override in-memory value of the risky surgery roll option RE */
function toggleRiskySurgery(actor: ActorPF2e, value: boolean | string | null): boolean | string | null {
    if (value === null) return null;

    const rollOption = actor.rules.find(
        (r): r is RollOptionRuleElement => r.key === "RollOption" && "option" in r && r.option === "risky-surgery",
    );
    if (!rollOption) return null;

    const currentValue = rollOption.value;
    if (rollOption.value !== value) {
        rollOption.value = value;
    }
    return currentValue;
}

async function treatWounds(options: ActionDefaultOptions): Promise<void> {
    const actors = Array.isArray(options.actors) ? options.actors : [options.actors];
    const actor = actors[0];
    if (!actor || !actor.isOfType("creature")) {
        ui.notifications.error("PF2E.ErrorMessage.NoPCTokenSelected", { localize: true });
        return;
    }

    const medicineName = game.i18n.localize("PF2E.Skill.Medicine");
    const chirurgeon = CheckFeat(actor, "chirurgeon");
    const naturalMedicine = CheckFeat(actor, "natural-medicine");
    const domIdAppend = fu.randomID(); // Attached to element id attributes for DOM uniqueness
    const dialog = new Dialog({
        title: game.i18n.localize("PF2E.Actions.TreatWounds.Label"),
        content: `
<div>${game.i18n.localize("PF2E.Actions.TreatWounds.Label")}</div>
<hr/>
<form>
<div class="form-group">
<label for="skill-${domIdAppend}">${game.i18n.localize("PF2E.Actions.TreatWounds.SkillSelect")}</label>
<select id="skill-${domIdAppend}"${!chirurgeon && !naturalMedicine ? " disabled" : ""}>
  <option value="medicine">${medicineName}</option>
  ${chirurgeon ? `<option value="crafting">${game.i18n.localize("PF2E.Skill.Crafting")}</option>` : ``}
  ${naturalMedicine ? `<option value="nature">${game.i18n.localize("PF2E.Skill.Nature")}</option>` : ``}
</select>
</div>
<div class="form-group">
<label for="dc-type-${domIdAppend}">${game.i18n.format("PF2E.InlineCheck.DCWithName", { name: medicineName })}</label>
<select id="dc-type-${domIdAppend}" name="dc-type">
  <option value="1">${game.i18n.localize("PF2E.Actions.TreatWounds.DC.Trained")}</option>
  <option value="2">${game.i18n.localize("PF2E.Actions.TreatWounds.DC.Expert")}</option>
  <option value="3">${game.i18n.localize("PF2E.Actions.TreatWounds.DC.Master")}</option>
  <option value="4">${game.i18n.localize("PF2E.Actions.TreatWounds.DC.Legendary")}</option>
</select>
</div>
<div class="form-group">
<label for="modifier-${domIdAppend}">${game.i18n.localize("PF2E.Actions.TreatWounds.DC.Mod")}</label>
<input id="modifier-${domIdAppend}" type="number" />
</div>
${
    CheckFeat(actor, "risky-surgery")
        ? `<div class="form-group">
<label for="risky-surgery-${domIdAppend}">${game.i18n.localize("PF2E.Actions.TreatWounds.Feats.RiskySurgery")}</label>
<input type="checkbox" id="risky-surgery-${domIdAppend}" />
</div>`
        : ``
}
${
    CheckFeat(actor, "mortal-healing")
        ? `<div class="form-group">
<label for="mortal-healing-${domIdAppend}">${game.i18n.localize("PF2E.Actions.TreatWounds.Feats.MortalHealing")}</label>
<input type="checkbox" id="mortal-healing-${domIdAppend}" checked />
</div>`
        : ``
}
</form>
`,
        buttons: {
            yes: {
                icon: fontAwesomeIcon("hand-holding-medical").outerHTML,
                label: game.i18n.localize("PF2E.Actions.TreatWounds.Label"),
                callback: ($html) => treat(actor, $html, options.event, domIdAppend),
            },
            no: {
                icon: fontAwesomeIcon("times").outerHTML,
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
    event: JQuery.TriggeredEvent | Event | null = null,
    domIdAppend: string,
): Promise<void> {
    const { name } = actor;
    const mod = Number($html.find(`#modifier-${domIdAppend}`).val()) || 0;
    const requestedProf = Number($html.find(`#dc-type-${domIdAppend}`).val()) || 1;
    const riskySurgery: boolean = $html.find(`#risky-surgery-${domIdAppend}`).prop("checked");
    const mortalHealing: boolean = $html.find(`#mortal-healing-${domIdAppend}`).prop("checked");
    const skillSlug = String($html.find(`#skill-${domIdAppend}`).val()) || "medicine";
    const skill = actor.skills[skillSlug];
    if (!skill?.proficient) {
        const skillName = objectHasKey(CONFIG.PF2E.skills, skillSlug)
            ? game.i18n.localize(CONFIG.PF2E.skills[skillSlug].label)
            : skillSlug;
        ui.notifications.warn(game.i18n.format("PF2E.Actions.TreatWounds.Error", { name, skill: skillName }));
        return;
    }

    const rank = skill.rank ?? 1;
    const usedProf = requestedProf <= rank ? requestedProf : rank;
    const medicBonus = CheckFeat(actor, "medic-dedication") ? (usedProf - 1) * 5 : 0;
    const magicHandsBonus = CheckFeat(actor, "magic-hands") ? actor.system.details.level.value : 0;
    const dcValue = [15, 20, 30, 40][usedProf - 1] + mod;
    const bonus = [0, 10, 30, 50][usedProf - 1] + medicBonus + magicHandsBonus;

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
        ...(riskySurgery ? [increaseDoS("RiskySurgery")] : mortalHealing ? [increaseDoS("MortalHealing")] : []),
    );

    const previoustRSValue = toggleRiskySurgery(actor, riskySurgery);
    await skill.check.roll({
        dc,
        ...eventToRollParams(event, { type: "check" }),
        extraRollOptions: rollOptions,
        callback: async (_roll, outcome, message) => {
            // Ensure the message is fully rendered in the chat log before updating the flag
            Hooks.once("renderChatMessage", (m) => {
                if (m.id !== message.id) return;
                const flags = foundry.utils.mergeObject(
                    m._source.flags,
                    { pf2e: { treatWoundsMacroFlag: { bonus } } },
                    { inplace: false },
                );
                m.update({ flags }, { render: false });
            });
            treatWoundsMacroCallback({ actor, bonus, message, outcome });
        },
    });
    toggleRiskySurgery(actor, previoustRSValue);
}

async function treatWoundsMacroCallback({
    actor,
    bonus,
    message,
    originalMessageId,
    outcome,
}: {
    actor: ActorPF2e;
    bonus: number;
    message: ChatMessagePF2e;
    originalMessageId?: string;
    outcome?: DegreeOfSuccessString | null;
}): Promise<void> {
    const successLabel = outcome ? game.i18n.localize(`PF2E.Check.Result.Degree.Check.${outcome}`) : "";
    const magicHands = CheckFeat(actor, "magic-hands");
    const riskySurgery = !!message.flags.pf2e.modifiers?.some((m) => m.slug === "risky-surgery" && m.enabled);
    const bonusString = bonus > 0 ? `+ ${bonus}` : "";

    const healFormula = (() => {
        switch (outcome) {
            case "criticalSuccess":
                return magicHands ? `4d10${bonusString}` : `4d8${bonusString}`;
            case "success":
                return magicHands ? `2d10${bonusString}` : `2d8${bonusString}`;
            case "criticalFailure":
                return "1d8";
            default:
                return null;
        }
    })();

    // Clean up old messages first if needed
    if (originalMessageId) {
        const messages = game.messages.contents
            .slice(game.messages.size - 25)
            .filter((m) => m.flags.pf2e.origin?.messageId === originalMessageId);
        const toDelete: Promise<ChatMessagePF2e | undefined>[] = [];
        for (const m of messages) {
            toDelete.push(m.delete());
        }
        await Promise.all(toDelete);
    }

    const speaker = ChatMessagePF2e.getSpeaker({ actor });
    const flags = foundry.utils.mergeObject(message.toObject().flags, { pf2e: { origin: { messageId: message.id } } });

    if (riskySurgery) {
        ChatMessagePF2e.create({
            flags,
            flavor: `<strong>${game.i18n.localize("PF2E.Actions.TreatWounds.Rolls.RiskySurgery")}</strong>`,
            rolls: [(await new DamageRoll("{1d8[slashing]}").roll()).toJSON()],
            speaker,
        });
    }

    if (healFormula) {
        const formulaModifier = outcome === "criticalFailure" ? "" : "[healing]";
        const healRoll = await new DamageRoll(`{(${healFormula})${formulaModifier}}`).roll();
        const rollType =
            outcome !== "criticalFailure"
                ? game.i18n.localize("PF2E.Actions.TreatWounds.Rolls.TreatWounds")
                : game.i18n.localize("PF2E.Actions.TreatWounds.Rolls.TreatWoundsCriticalFailure");
        ChatMessagePF2e.create({
            flags,
            flavor: `<strong>${rollType}</strong> (${successLabel})`,
            rolls: [healRoll.toJSON()],
            speaker,
        });
    }
}

export { treatWounds, treatWoundsMacroCallback };
