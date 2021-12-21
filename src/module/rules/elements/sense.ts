import { RuleElementPF2e } from "../rule-element";
import { RuleElementData, RuleElementSource, RuleElementSynthetics } from "../rules-data-definitions";
import { CharacterPF2e, FamiliarPF2e } from "@actor";
import { ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { CreatureSensePF2e, SenseAcuity, SenseType } from "@actor/creature/sense";

/**
 * @category RuleElement
 */
export class SenseRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "familiar"];

    constructor(data: SenseRuleElementSource, item: Embedded<ItemPF2e>) {
        data.force ??= false;
        data.range ??= "";
        data.acuity ??= "precise";
        const defaultLabels: Record<string, string | undefined> = CONFIG.PF2E.senses;
        data.label ??= defaultLabels[data.selector ?? ""];

        super(data, item);
    }

    override onBeforePrepareData(synthetics: RuleElementSynthetics): void {
        if (this.ignored) return;

        const range = this.resolveValue(this.data.range, "");
        if (this.data.selector) {
            const newSense = new CreatureSensePF2e({
                type: this.data.selector,
                acuity: this.data.acuity,
                value: String(range),
                source: this.item.name,
            });
            synthetics.senses.push({
                sense: newSense,
                predicate: this.data.predicate ?? null,
                force: this.data.force,
            });
        } else {
            console.warn("PF2E | Sense requires at least a selector field and a label field or item name");
        }
    }
}

export interface SenseRuleElement {
    get actor(): CharacterPF2e | FamiliarPF2e;
    data: SenseRuleElementData;
}

interface SenseRuleElementData extends RuleElementData {
    label: string;
    force: boolean;
    acuity: SenseAcuity;
    range: string | number;
    selector: SenseType;
}

interface SenseRuleElementSource extends RuleElementSource {
    acuity?: SenseAcuity;
    range?: string | number | null;
    force?: boolean;
}
