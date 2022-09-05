import { RuleElementPF2e, RuleElementData, RuleElementSource } from "./";
import { CharacterPF2e, FamiliarPF2e } from "@actor";
import { ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { CreatureSensePF2e, SenseAcuity, SenseType, SENSE_TYPES } from "@actor/creature/sense";
import { RuleElementOptions } from "./base";
import { setHasElement } from "@util";

/**
 * @category RuleElement
 */
export class SenseRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "familiar"];

    private selector: SenseType;

    constructor(data: SenseRuleElementSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        data.force ??= false;
        data.range ??= "";
        data.acuity ??= "precise";
        const defaultLabels: Record<string, string | undefined> = CONFIG.PF2E.senses;
        data.label ??= defaultLabels[String(data.selector) ?? ""];

        super(data, item, options);

        if (setHasElement(SENSE_TYPES, data.selector)) {
            this.selector = data.selector;
        } else {
            this.failValidation("Missing string selector property");
            this.selector = "scent";
        }
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const range = this.resolveValue(this.data.range, "");
        if (this.data.selector) {
            const newSense = new CreatureSensePF2e({
                type: this.selector,
                acuity: this.data.acuity,
                value: String(range),
                source: this.item.name,
            });
            this.actor.synthetics.senses.push({
                sense: newSense,
                predicate: this.data.predicate ?? null,
                force: this.data.force,
            });
        } else {
            this.failValidation("Sense requires at least a selector field and a label field or item name");
        }
    }
}

export interface SenseRuleElement {
    get actor(): CharacterPF2e | FamiliarPF2e;
    data: SenseRuleElementData;
}

interface SenseRuleElementData extends RuleElementData {
    selector: SenseType;
    label: string;
    force: boolean;
    acuity: SenseAcuity;
    range: string | number;
}

interface SenseRuleElementSource extends RuleElementSource {
    selector?: unknown;
    acuity?: string;
    range?: string | number | null;
    force?: boolean;
}
