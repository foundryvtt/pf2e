import { ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { tupleHasValue } from "@util";
import { RuleElementPF2e, RuleElementData, RuleElementSource } from "./";

/**
 * Rule element to implement fast healing and regeneration.
 * Creates a chat card every round of combat.
 * @category RuleElement
 */
class HealingRuleElement extends RuleElementPF2e {
    static override validActorTypes: ActorType[] = ["character", "npc", "familiar"];

    constructor(data: RuleElementSource, item: Embedded<ItemPF2e>) {
        super(data, item);

        const selector = this.resolveInjectedProperties(data.selector);
        if (!tupleHasValue(["fast-healing", "regeneration"] as const, selector)) {
            this.ignored = true;
            console.warn("PF2e System | Healing only supports fast-healing or regeneration selectors");
            return;
        }

        this.data.selector = selector;
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
            this.data.selector === "fast-healing"
                ? "PF2E.Encounter.Broadcast.FastHealing"
                : "PF2E.Encounter.Broadcast.Regeneration";
        const roll = new Roll(`${value}`).evaluate({ async: false });
        const flavor = game.i18n.format(key);
        const rollMode = this.actor.hasPlayerOwner ? "publicroll" : game.settings.get("core", "rollMode");
        ChatMessage.createDocuments([{ flavor, type: CONST.CHAT_MESSAGE_TYPES.ROLL, roll }], { rollMode });
    }
}

interface HealingRuleElement extends RuleElementPF2e {
    data: HealingData;
}

interface HealingData extends RuleElementData {
    selector: "fast-healing" | "regeneration";
}

export { HealingRuleElement };
