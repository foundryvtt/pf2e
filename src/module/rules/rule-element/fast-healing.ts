import { ActorType } from "@actor/data/index.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import { localizeList, objectHasKey } from "@util";
import { RuleElementPF2e, RuleElementSchema } from "./index.ts";
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
                nullable: true,
                initial: null,
            }),
            deactivatedBy: new fields.ArrayField(
                new fields.StringField({ required: true, nullable: false, blank: false }),
                { required: false, initial: undefined }
            ),
        };
    }

    static override validateJoint(data: SourceFromSchema<FastHealingRuleSchema>): void {
        super.validateJoint(data);

        if (data.type === "fast-healing") {
            if (data.deactivatedBy) {
                data.ignored = true;
                throw Error("deactivatedBy is only valid for type regeneration");
            }
            if (data.details) {
                data.details = game.i18n.localize(data.details);
            }
        } else if (data.type === "regeneration") {
            if (data.details) {
                data.ignored = true;
                throw Error("details is only valid for type fast-healing");
            }
            if (data.deactivatedBy?.length) {
                const typesArr = data.deactivatedBy.map((type) =>
                    objectHasKey(CONFIG.PF2E.weaknessTypes, type)
                        ? game.i18n.localize(CONFIG.PF2E.weaknessTypes[type])
                        : type
                );

                const types = localizeList(typesArr);
                data.details = game.i18n.format("PF2E.Encounter.Broadcast.FastHealing.DeactivatedBy", { types });
            }
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
        const postFlavor = `<div data-visibility="owner">${this.details ?? this.getReducedLabel()}</div>`;
        const flavor = `<div>${receivedMessage}</div>${postFlavor}`;
        const rollMode = this.actor.hasPlayerOwner ? "publicroll" : "gmroll";
        const speaker = ChatMessagePF2e.getSpeaker({ actor: this.actor, token: this.token });
        ChatMessagePF2e.create({ flavor, speaker, type: CONST.CHAT_MESSAGE_TYPES.ROLL, rolls: [roll] }, { rollMode });
    }
}

type FastHealingRuleSchema = RuleElementSchema & {
    value: ResolvableValueField<true, false, false>;
    type: StringField<FastHealingType, FastHealingType, false, false, true>;
    details: StringField<string, string, false, true, true>;
    deactivatedBy: ArrayField<StringField<string, string, true, false, false>, string[], string[], false, false, false>;
};

interface FastHealingRuleElement
    extends RuleElementPF2e<FastHealingRuleSchema>,
        ModelPropsFromSchema<FastHealingRuleSchema> {}

type FastHealingType = "fast-healing" | "regeneration";

type FastHealingSource = SourceFromSchema<FastHealingRuleSchema>;

export { FastHealingRuleElement, FastHealingSource, FastHealingType };
