import type { ActorType } from "@actor/types.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import { localizeList, objectHasKey } from "@util";
import { RuleElement } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema } from "./data.ts";
import fields = foundry.data.fields;

/**
 * Rule element to implement fast healing and regeneration.
 * Creates a chat card every round of combat.
 * @category RuleElement
 */
class FastHealingRuleElement extends RuleElement<FastHealingRuleSchema> {
    static override validActorTypes: ActorType[] = ["army", "character", "npc", "familiar"];

    static override defineSchema(): FastHealingRuleSchema {
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
                blank: false,
                initial: null,
            }),
            deactivatedBy: new fields.ArrayField(
                new fields.StringField({ required: true, nullable: false, blank: false }),
                { required: false, initial: undefined },
            ),
        };
    }

    static override validateJoint(data: fields.SourceFromSchema<FastHealingRuleSchema>): void {
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
                        : type,
                );

                const types = localizeList(typesArr);
                data.details = game.i18n.format("PF2E.Encounter.Broadcast.FastHealing.DeactivatedBy", { types });
            }
        }
    }

    /** Send a message with a "healing" (damage) roll at the start of its turn */
    override async onUpdateEncounter({ event }: { event: "initiative-roll" | "turn-start" }): Promise<void> {
        if (this.ignored || event !== "turn-start" || !this.test()) {
            return;
        }

        const value = this.resolveValue(this.value);
        if (typeof value !== "number" && typeof value !== "string") {
            return this.failValidation("value must be a number or a roll formula");
        }

        const receivedMessage = game.i18n.localize(`PF2E.Encounter.Broadcast.FastHealing.${this.type}.ReceivedMessage`);
        const postFlavor = `<div data-visibility="owner">${this.details ?? this.getReducedLabel()}</div>`;
        const flavor = `<div>${receivedMessage}</div>${postFlavor}`;

        const roll = (await new DamageRoll(`{(${value})[healing]}`).evaluate()).toJSON();
        const rollMode = this.actor.hasPlayerOwner ? "publicroll" : "gmroll";
        const speaker = ChatMessagePF2e.getSpeaker({ actor: this.actor, token: this.token });
        ChatMessagePF2e.create({ flavor, speaker, rolls: [roll] }, { rollMode });
    }
}

type FastHealingRuleSchema = RuleElementSchema & {
    value: ResolvableValueField<true, false, false>;
    type: fields.StringField<FastHealingType, FastHealingType, false, false, true>;
    details: fields.StringField<string, string, false, true, true>;
    deactivatedBy: fields.ArrayField<
        fields.StringField<string, string, true, false, false>,
        string[],
        string[],
        false,
        false,
        false
    >;
};

interface FastHealingRuleElement
    extends RuleElement<FastHealingRuleSchema>,
        ModelPropsFromRESchema<FastHealingRuleSchema> {}

type FastHealingType = "fast-healing" | "regeneration";

type FastHealingSource = fields.SourceFromSchema<FastHealingRuleSchema>;

export { FastHealingRuleElement };
export type { FastHealingSource, FastHealingType };
