import { ItemPF2e } from "@item";
import { RuleElementPF2e, RuleElementData, RuleElementSource, RuleElementOptions } from "./";

/**
 * @category RuleElement
 */
export class ActorTraitsRuleElement extends RuleElementPF2e {
    constructor(data: ActorTraitsSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        data.add ??= [];
        data.remove ??= [];
        super(data, item, options);
        if (!data.add?.length && !data.remove?.length) {
            this.failValidation("Actor traits rule element requires at least a non-empty add or remove field");
        }
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const traits: string[] = this.actor.data.data.traits.traits.value;
        const newTraits = this.data.add.filter((trait) => !traits.includes(trait));
        for (const trait of newTraits) {
            traits.push(trait);
            this.actor.rollOptions.all[`self:trait:${trait}`] = true;
        }

        for (const toRemove of this.data.remove) {
            traits.findSplice((trait) => trait === toRemove);
            this.actor.rollOptions.all[`self:trait:${toRemove}`] = false;
        }
    }
}

export interface ActorTraitsRuleElement extends RuleElementPF2e {
    data: ActorTraitsData;
}

interface ActorTraitsSource extends RuleElementSource {
    add?: string[];
    remove?: string[];
}

interface ActorTraitsData extends RuleElementData {
    add: string[];
    remove: string[];
}
