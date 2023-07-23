import { ActorType } from "@actor/data/index.ts";
import { ErrorPF2e } from "@util";
import type { ArrayField, StringField } from "types/foundry/common/data/fields.d.ts";
import { RuleElementOptions, RuleElementPF2e, RuleElementSchema, RuleElementSource } from "./index.ts";

class ActorTraitsRuleElement extends RuleElementPF2e<ActorTraitsRuleSchema> {
    protected static override validActorTypes: ActorType[] = ["character", "npc", "familiar", "hazard", "vehicle"];

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

    get #traitsDictionary(): Record<string, string> {
        switch (this.actor.type) {
            case "character":
            case "familiar":
            case "npc":
                return CONFIG.PF2E.creatureTraits;
            case "hazard":
                return CONFIG.PF2E.hazardTraits;
            case "vehicle":
                return CONFIG.PF2E.vehicleTraits;
            default:
                throw ErrorPF2e("unexpected actor type");
        }
    }

    override beforePrepareData(): void {
        if (!this.test()) return;

        if (this.actor.system.traits) {
            const traits: { value: string[] } = this.actor.system.traits;
            const newTraits = this.resolveInjectedProperties(this.add).filter((t) => !traits.value.includes(t));
            const traitsDictionary = this.#traitsDictionary;
            for (const trait of newTraits) {
                if (!(trait in traitsDictionary)) {
                    return this.failValidation(`${trait} is not a recognized trait`);
                }
                traits.value.push(trait);
                this.actor.rollOptions.all[`self:trait:${trait}`] = true;
                if (["construct", "undead"].includes(trait)) this.#handleModeAffectingTrait();
            }

            const toRemoves = this.resolveInjectedProperties(this.remove);
            for (const trait of toRemoves) {
                traits.value = traits.value.filter((t) => t !== trait);
                delete this.actor.rollOptions.all[`self:trait:${trait}`];
                if (["construct", "undead"].includes(trait)) this.#handleModeAffectingTrait();
            }
        }
    }

    /** Handle the addition or removal of a trait that may affect the actor's mode of being */
    #handleModeAffectingTrait(): void {
        const { actor } = this;
        const { rollOptions } = actor;
        for (const mode of ["construct", "living", "undead"]) {
            delete rollOptions.all[`self:mode:${mode}`];
        }
        rollOptions.all[`self:mode:${actor.modeOfBeing}`] = true;
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
