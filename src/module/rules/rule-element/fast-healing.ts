import { ActorType } from "@actor/data/index.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import { localizeList, objectHasKey } from "@util";
import { RuleElementOptions, RuleElementPF2e, RuleElementSchema, RuleElementSource } from "./index.ts";
import type { ArrayField, StringField } from "types/foundry/common/data/fields.d.ts";
import { ResolvableValueField } from "./data.ts";

/**
 * Rule element to implement fast healing and regeneration.
 * Creates a chat card every round of combat.
 * @category RuleElement
 */
class FastHealingRuleElement extends RuleElementPF2e<FastHealingRuleSchema> {
    static override validActorTypes: ActorType[] = ["character", "npc", "familiar"];

    static override defineSchema(): FastHealingRuleSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            value: new ResolvableValueField({ required: true, nullable: false }),
            type: new fields.StringField({
                required: false,
                nullable: false,
                choices: ["fast-healing", "regeneration"],
                initial: "fast-healing",
            }),
            details: new fields.StringField({
                required: false,
                nullable: false,
                initial: undefined,
            }),
            deactivatedBy: new fields.ArrayField(
                new fields.StringField({ required: true, nullable: false, blank: false })
            ),
        };
    }

    constructor(data: RuleElementSource, options: RuleElementOptions) {
        super(data, options);

        if (this.details) {
            this.details = game.i18n.localize(this.details);
        } else if (this.deactivatedBy.length > 0) {
            const typesArr = this.deactivatedBy.map((type) =>
                objectHasKey(CONFIG.PF2E.weaknessTypes, type)
                    ? game.i18n.localize(CONFIG.PF2E.weaknessTypes[type])
                    : type
            );

            const types = localizeList(typesArr);
            this.details = game.i18n.format("PF2E.Encounter.Broadcast.FastHealing.DeactivatedBy", { types });
        } else {
            this.details = this.getReducedLabel();
        }
    }

    /** Send a message with a "healing" (damage) roll at the start of its turn */
    override async onTurnStart(): Promise<void> {
        if (!this.test()) return;

        const value = this.resolveValue(this.value);
        if (typeof value !== "number" && typeof value !== "string") {
            return this.failValidation("value must be a number or a roll formula");
        }

        const roll = (await new DamageRoll(`${value}`).evaluate({ async: true })).toJSON();
        const receivedMessage = game.i18n.localize(`PF2E.Encounter.Broadcast.FastHealing.${this.type}.ReceivedMessage`);
        const postFlavor = `<div data-visibility="owner">${this.details}</div>`;
        const flavor = `<div>${receivedMessage}</div>${postFlavor}`;
        const rollMode = this.actor.hasPlayerOwner ? "publicroll" : "gmroll";
        const speaker = ChatMessagePF2e.getSpeaker({ actor: this.actor, token: this.token });
        ChatMessagePF2e.create({ flavor, speaker, type: CONST.CHAT_MESSAGE_TYPES.ROLL, rolls: [roll] }, { rollMode });
    }
}

type FastHealingRuleSchema = RuleElementSchema & {
    value: ResolvableValueField<true, false, false>;
    type: StringField<FastHealingType, FastHealingType, false, false, true>;
    details: StringField<string, string, false, false, false>;
    deactivatedBy: ArrayField<StringField<string, string, true, false, false>>;
};

interface FastHealingRuleElement
    extends RuleElementPF2e<FastHealingRuleSchema>,
        ModelPropsFromSchema<FastHealingRuleSchema> {}

type FastHealingType = "fast-healing" | "regeneration";

type FastHealingSource = SourceFromSchema<FastHealingRuleSchema>;

export { FastHealingRuleElement, FastHealingSource, FastHealingType };
