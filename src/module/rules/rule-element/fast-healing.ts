import { ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { ChatMessagePF2e } from "@module/chat-message";
import { DamageRoll } from "@system/damage/roll";
import { LocalizePF2e } from "@system/localize";
import { tupleHasValue, objectHasKey, localizeList } from "@util";
import { RuleElementPF2e, RuleElementData, RuleElementSource, RuleElementOptions } from ".";

/**
 * Rule element to implement fast healing and regeneration.
 * Creates a chat card every round of combat.
 * @category RuleElement
 */
class FastHealingRuleElement extends RuleElementPF2e {
    static override validActorTypes: ActorType[] = ["character", "npc", "familiar"];

    constructor(data: FastHealingSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        this.data.deactivatedBy = data.deactivatedBy ?? [];

        const type = this.resolveInjectedProperties(data.type) || "fast-healing";
        if (!tupleHasValue(["fast-healing", "regeneration"] as const, type)) {
            this.ignored = true;
            this.failValidation("FastHealing only supports fast-healing or regeneration types");
            return;
        }

        this.data.type = type;
    }

    get details() {
        if (this.data.details) {
            return game.i18n.localize(this.data.details);
        }

        if (this.data.deactivatedBy.length) {
            const typesArr = this.data.deactivatedBy.map((type) =>
                objectHasKey(CONFIG.PF2E.weaknessTypes, type)
                    ? game.i18n.localize(CONFIG.PF2E.weaknessTypes[type])
                    : type
            );

            const types = localizeList(typesArr);
            return game.i18n.format("PF2E.Encounter.Broadcast.FastHealing.DeactivatedBy", { types });
        }

        return null;
    }

    /** Send a message with a "healing" (damage) roll at the start of its turn */
    override async onTurnStart(): Promise<void> {
        if (!this.test()) return;

        const value = this.resolveValue(this.data.value);
        if (typeof value !== "number") {
            return this.failValidation("Healing requires a non-zero value field or a formula field");
        }

        const roll = (await new DamageRoll(`${value}`).evaluate({ async: true })).toJSON();
        const { ReceivedMessage } = LocalizePF2e.translations.PF2E.Encounter.Broadcast.FastHealing[this.data.type];
        const details = this.details;
        const postFlavor = details ? `<div data-visibility="owner">${details}</div>` : "";
        const flavor = `<div>${ReceivedMessage}</div>${postFlavor}`;
        const rollMode = this.actor.hasPlayerOwner ? "publicroll" : "gmroll";
        const speaker = ChatMessagePF2e.getSpeaker({ actor: this.actor, token: this.token });
        ChatMessagePF2e.create({ flavor, speaker, type: CONST.CHAT_MESSAGE_TYPES.ROLL, rolls: [roll] }, { rollMode });
    }
}

interface FastHealingRuleElement extends RuleElementPF2e {
    data: FastHealingData;
}

interface FastHealingData extends RuleElementData {
    type: "fast-healing" | "regeneration";
    details?: string;
    deactivatedBy: string[];
}

interface FastHealingSource extends RuleElementSource {
    type?: "fast-healing" | "regeneration";
    details?: string;
    deactivatedBy?: string[];
}

export { FastHealingRuleElement, FastHealingData, FastHealingSource };
