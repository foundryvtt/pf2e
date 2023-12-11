import type { CharacterPF2e, FamiliarPF2e } from "@actor";
import { CreatureSensePF2e, SENSE_ACUITIES, SENSE_TYPES, SenseAcuity, SenseType } from "@actor/creature/sense.ts";
import { ActorType } from "@actor/data/index.ts";
import type { BooleanField, StringField } from "types/foundry/common/data/fields.d.ts";
import { RuleElementOptions, RuleElementPF2e } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema, RuleElementSource } from "./data.ts";

/**
 * @category RuleElement
 */
class SenseRuleElement extends RuleElementPF2e<SenseRuleSchema> {
    protected static override validActorTypes: ActorType[] = ["character", "familiar"];

    static override defineSchema(): SenseRuleSchema {
        const { fields } = foundry.data;
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

    constructor(data: SenseRuleElementSource, options: RuleElementOptions) {
        super(data, options);
    }

    override beforePrepareData(): void {
        if (!this.test()) return;

        const range = this.resolveValue(this.range, "");
        const newSense = new CreatureSensePF2e({
            type: this.selector,
            acuity: this.acuity,
            value: String(range),
            source: this.item.name,
        });
        this.actor.synthetics.senses.push({
            sense: newSense,
            predicate: this.predicate,
            force: this.force,
        });
    }
}

interface SenseRuleElement extends RuleElementPF2e<SenseRuleSchema>, ModelPropsFromRESchema<SenseRuleSchema> {
    get actor(): CharacterPF2e | FamiliarPF2e;
}

type SenseRuleSchema = RuleElementSchema & {
    selector: StringField<SenseType, SenseType, true, false, false>;
    force: BooleanField<boolean, boolean, false, false, true>;
    acuity: StringField<SenseAcuity, SenseAcuity, false, false, true>;
    range: ResolvableValueField<false, false, false>;
};

interface SenseRuleElementSource extends RuleElementSource {
    selector?: SenseType;
}

export { SenseRuleElement };
