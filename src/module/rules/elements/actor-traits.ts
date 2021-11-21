import { ItemPF2e } from "@item";
import { RuleElementPF2e } from "../rule-element";
import { RuleElementData, RuleElementSource } from "../rules-data-definitions";

/**
 * @category RuleElement
 */
export class ActorTraitsRuleElement extends RuleElementPF2e {
    constructor(data: ActorTraitsSource, item: Embedded<ItemPF2e>) {
        data.add ??= [];
        data.remove ??= [];
        if (!data.add?.length && !data.remove?.length) {
            console.warn("PF2E | Actor traits rule element requires at least a non-empty add or remove field");
            data.ignored = true;
        }
        super(data, item);
    }

    override onBeforePrepareData() {
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
