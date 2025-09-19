import type { ActorType, CharacterPF2e, FamiliarPF2e } from "@actor";
import type { SenseAcuity, SenseType } from "@actor/creature/types.ts";
import {
    SENSES_WITH_MANDATORY_ACUITIES,
    SENSES_WITH_UNLIMITED_RANGE,
    SENSE_ACUITIES,
    SENSE_TYPES,
} from "@actor/creature/values.ts";
import { tupleHasValue } from "@util";
import { RuleElement } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema } from "./data.ts";
import fields = foundry.data.fields;

/**
 * @category RuleElement
 */
class SenseRuleElement extends RuleElement<SenseRuleSchema> {
    protected static override validActorTypes: ActorType[] = ["character", "familiar", "npc"];

    static override defineSchema(): SenseRuleSchema {
        return {
            ...super.defineSchema(),
            selector: new fields.StringField({ required: true, nullable: false, choices: [...SENSE_TYPES] }),
            force: new fields.BooleanField({ required: false, nullable: false, initial: false }),
            acuity: new fields.StringField({
                required: false,
                nullable: false,
                choices: SENSE_ACUITIES,
                initial: undefined,
            }),
            range: new ResolvableValueField({ required: false, nullable: false, initial: undefined }),
        };
    }

    override beforePrepareData(): void {
        const range = tupleHasValue(SENSES_WITH_UNLIMITED_RANGE, this.selector)
            ? Infinity
            : Math.max(0, Math.trunc(Math.floor(Number(this.resolveValue(this.range, Infinity)) || 0)));
        if (range <= 0) {
            if (range < 0) this.failValidation("range: must resolve to a positive number");
            return;
        }

        const sense = {
            type: this.selector,
            acuity: SENSES_WITH_MANDATORY_ACUITIES[this.selector] ?? this.acuity,
            range,
            source: this.item.name,
        };
        this.actor.synthetics.senses.push({ sense, predicate: this.predicate, force: this.force });
    }
}

interface SenseRuleElement extends RuleElement<SenseRuleSchema>, ModelPropsFromRESchema<SenseRuleSchema> {
    get actor(): CharacterPF2e | FamiliarPF2e;
}

type SenseRuleSchema = RuleElementSchema & {
    selector: fields.StringField<SenseType, SenseType, true, false, false>;
    force: fields.BooleanField<boolean, boolean, false, false, true>;
    acuity: fields.StringField<SenseAcuity, SenseAcuity, false, false, true>;
    range: ResolvableValueField<false, false, false>;
};

export { SenseRuleElement };
