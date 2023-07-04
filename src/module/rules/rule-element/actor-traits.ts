import { RuleElementOptions, RuleElementPF2e, RuleElementSchema, RuleElementSource } from "./index.ts";
import type { ArrayField, StringField } from "types/foundry/common/data/fields.d.ts";

class ActorTraitsRuleElement extends RuleElementPF2e<ActorTraitsRuleSchema> {
    static override defineSchema(): ActorTraitsRuleSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            add: new fields.ArrayField(new fields.StringField({ required: true, nullable: false, blank: false })),
            remove: new fields.ArrayField(new fields.StringField({ required: true, nullable: false, blank: false })),
        };
    }

    constructor(data: RuleElementSource, options: RuleElementOptions) {
        super({ ...data, priority: 99 }, options);
    }

    override beforePrepareData(): void {
        if (!this.test()) return;

        if (this.actor.system.traits) {
            const traits: { value: string[] } = this.actor.system.traits;
            const newTraits = this.resolveInjectedProperties(this.add).filter((t) => !traits.value.includes(t));
            for (const trait of newTraits) {
                traits.value.push(trait);
                this.actor.rollOptions.all[`self:trait:${trait}`] = true;
            }

            const toRemoves = this.resolveInjectedProperties(this.remove);
            for (const trait of toRemoves) {
                traits.value = traits.value.filter((t) => t !== trait);
                delete this.actor.rollOptions.all[`self:trait:${trait}`];
            }
        }
    }
}

type ActorTraitsRuleSchema = RuleElementSchema & {
    add: ArrayField<StringField<string, string, true, false, false>>;
    remove: ArrayField<StringField<string, string, true, false, false>>;
};

interface ActorTraitsRuleElement
    extends RuleElementPF2e<ActorTraitsRuleSchema>,
        ModelPropsFromSchema<ActorTraitsRuleSchema> {}

export { ActorTraitsRuleElement };
