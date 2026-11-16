import type { ActorPF2e } from "@actor";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import type { DegreeOfSuccessString } from "@system/degree-of-success.ts";

function CheckFeat(actor: ActorPF2e, slug: string): boolean {
    if (actor.items.find((i) => i.slug === slug && i.type === "feat")) {
        return true;
    }
    return false;
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
    const successLabel = outcome ? _loc(`PF2E.Check.Result.Degree.Check.${outcome}`) : "";
    const magicHands = CheckFeat(actor, "magic-hands");
    const riskySurgery = !!message.flags[SYSTEM_ID].modifiers?.some((m) => m.slug === "risky-surgery" && m.enabled);
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
            .filter((m) => m.flags[SYSTEM_ID].origin?.messageId === originalMessageId);
        const toDelete: Promise<ChatMessagePF2e | undefined>[] = [];
        for (const m of messages) {
            toDelete.push(m.delete());
        }
        await Promise.all(toDelete);
    }

    const speaker = ChatMessagePF2e.getSpeaker({ actor });
    const flags = fu.mergeObject(message.toObject().flags, { [SYSTEM_ID]: { origin: { messageId: message.id } } });

    if (riskySurgery) {
        ChatMessagePF2e.create({
            flags,
            flavor: `<strong>${_loc("PF2E.Actions.TreatWounds.Rolls.RiskySurgery")}</strong>`,
            rolls: [(await new DamageRoll("{1d8[slashing]}").roll()).toJSON()],
            speaker,
        });
    }

    if (healFormula) {
        const formulaModifier = outcome === "criticalFailure" ? "" : "[healing]";
        const healRoll = await new DamageRoll(`{(${healFormula})${formulaModifier}}`).roll();
        const rollType =
            outcome !== "criticalFailure"
                ? _loc("PF2E.Actions.TreatWounds.Rolls.TreatWounds")
                : _loc("PF2E.Actions.TreatWounds.Rolls.TreatWoundsCriticalFailure");
        ChatMessagePF2e.create({
            flags,
            flavor: `<strong>${rollType}</strong> (${successLabel})`,
            rolls: [healRoll.toJSON()],
            speaker,
        });
    }
}

export { CheckFeat, treatWoundsMacroCallback };
