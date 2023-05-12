import { ActorPF2e } from "@actor";
import { ActorType } from "@actor/data/index.ts";
import { ItemPF2e } from "@item";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import { localizeList, objectHasKey, tupleHasValue } from "@util";
import { RuleElementData, RuleElementOptions, RuleElementPF2e, RuleElementSource } from "./index.ts";

/**
 * Rule element to implement fast healing and regeneration.
 * Creates a chat card every round of combat.
 * @category RuleElement
 */
class FastHealingRuleElement extends RuleElementPF2e implements FastHealingData {
    static override validActorTypes: ActorType[] = ["character", "npc", "familiar"];

    type: "fast-healing" | "regeneration";

    deactivatedBy: string[];

    #details?: string;

    constructor(data: FastHealingSource, item: ItemPF2e<ActorPF2e>, options?: RuleElementOptions) {
        data.type ??= "fast-healing";

        super(data, item, options);

        this.deactivatedBy =
            Array.isArray(data.deactivatedBy) && data.deactivatedBy.every((db): db is string => typeof db === "string")
                ? data.deactivatedBy
                : [];

        if (tupleHasValue(["fast-healing", "regeneration"] as const, data.type)) {
            this.type = data.type;
        } else {
            this.type = "fast-healing";
            this.failValidation("FastHealing only supports fast-healing or regeneration types");
        }

        if (typeof data.details === "string") this.#details = data.details;
    }

    get details(): string | null {
        if (this.#details) {
            return game.i18n.localize(this.#details);
        }

        if (this.deactivatedBy.length > 0) {
            const typesArr = this.deactivatedBy.map((type) =>
                objectHasKey(CONFIG.PF2E.weaknessTypes, type)
                    ? game.i18n.localize(CONFIG.PF2E.weaknessTypes[type])
                    : type
            );

            const types = localizeList(typesArr);
            return game.i18n.format("PF2E.Encounter.Broadcast.FastHealing.DeactivatedBy", { types });
        }

        return this.getReducedLabel();
    }

    /** Send a message with a "healing" (damage) roll at the start of its turn */
    override async onTurnStart(): Promise<void> {
        if (!this.test()) return;

        const value = this.resolveValue();
        if (typeof value !== "number") {
            return this.failValidation("Healing requires a non-zero value field or a formula field");
        }

        const roll = (await new DamageRoll(`${value}`).evaluate({ async: true })).toJSON();
        const receivedMessage = game.i18n.localize(`PF2E.Encounter.Broadcast.FastHealing.${this.type}.ReceivedMessage`);
        const details = this.details;
        const postFlavor = details ? `<div data-visibility="owner">${details}</div>` : "";
        const flavor = `<div>${receivedMessage}</div>${postFlavor}`;
        const rollMode = this.actor.hasPlayerOwner ? "publicroll" : "gmroll";
        const speaker = ChatMessagePF2e.getSpeaker({ actor: this.actor, token: this.token });
        ChatMessagePF2e.create({ flavor, speaker, type: CONST.CHAT_MESSAGE_TYPES.ROLL, rolls: [roll] }, { rollMode });
    }
}

interface FastHealingData extends RuleElementData {
    type: "fast-healing" | "regeneration";
    details?: string | null;
    deactivatedBy: string[];
}

interface FastHealingSource extends RuleElementSource {
    type?: unknown;
    details?: unknown;
    deactivatedBy?: unknown;
}

export { FastHealingData, FastHealingRuleElement, FastHealingSource };
