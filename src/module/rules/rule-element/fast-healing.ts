import { ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { tupleHasValue } from "@util";
import { RuleElementPF2e, RuleElementData, RuleElementSource } from ".";

/**
 * Rule element to implement fast healing and regeneration.
 * Creates a chat card every round of combat.
 * @category RuleElement
 */
class FastHealingRuleElement extends RuleElementPF2e {
    static override validActorTypes: ActorType[] = ["character", "npc", "familiar"];

    constructor(data: FastHealingSource, item: Embedded<ItemPF2e>) {
        super(data, item);

        const type = this.resolveInjectedProperties(data.type) || "fast-healing";
        if (!tupleHasValue(["fast-healing", "regeneration"] as const, type)) {
            this.ignored = true;
            console.warn("PF2e System | FastHealing only supports fast-healing or regeneration types");
            return;
        }

        this.data.type = type;
    }

    /** Refresh the actor's temporary hit points at the start of its turn */
    override onTurnStart(): void {
        if (this.ignored) return;

        const value = this.resolveValue(this.data.value);
        if (typeof value !== "number") {
            console.warn("PF2e System | Healing requires a non-zero value field or a formula field");
            return;
        }

        const key =
            this.data.type === "fast-healing"
                ? "PF2E.Encounter.Broadcast.FastHealing"
                : "PF2E.Encounter.Broadcast.Regeneration";
        const roll = new Roll(`${value}`).evaluate({ async: false });
        const flavor = game.i18n.format(key);
        const rollMode = this.actor.hasPlayerOwner ? "publicroll" : game.settings.get("core", "rollMode");
        ChatMessage.createDocuments([{ flavor, type: CONST.CHAT_MESSAGE_TYPES.ROLL, roll }], { rollMode });
    }
}

interface FastHealingRuleElement extends RuleElementPF2e {
    data: FastHealingData;
}

interface FastHealingData extends RuleElementData {
    type: "fast-healing" | "regeneration";
}

interface FastHealingSource extends RuleElementSource {
    type?: "fast-healing" | "regeneration";
}

export { FastHealingRuleElement as HealingRuleElement };
