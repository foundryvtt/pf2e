import { ItemPF2e } from "@item";
import { PredicatePF2e } from "@system/predication";
import { AELikeSource, AELikeRuleElement, AELikeData } from "./ae-like";
import { RuleElementOptions } from "./base";

/**
 * Make a numeric modification to an arbitrary property in a similar way as `ActiveEffect`s
 * @category RuleElement
 */
class RollOptionRuleElement extends AELikeRuleElement {
    constructor(data: RollOptionSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        data = deepClone(data);
        data.mode = "override";
        data.path = `flags.pf2e.rollOptions.${data.domain}.${data.option}`;
        data.value = Boolean(data.value ?? true);
        super(data, item, options);

        if (!(typeof data.domain === "string" && /^[-:a-z0-9]+$/.test(data.domain) && /[a-z]/.test(data.domain))) {
            const item = this.item;
            this.failValidation(
                `"domain" property on RuleElement from item ${item.name} (${item.uuid}) must be a`,
                `string consisting of only lowercase letters, numbers, and hyphens`
            );
        }
    }

    /**
     * Add or remove directly from/to a provided set of roll options. All RollOption REs, regardless of phase, are
     * (re-)called here.
     */
    override beforeRoll(domains: string[], rollOptions: string[]): void {
        if (!domains.includes(this.data.domain)) return;
        const predicate = this.data.predicate ?? new PredicatePF2e();
        if (!predicate.test(rollOptions)) return;

        const value = this.resolveValue();
        if (value === true) {
            rollOptions.push(this.data.option);
        } else if (value === false) {
            rollOptions.findSplice((o) => o === this.data.option);
        } else {
            this.failValidation("Unrecognized roll option value");
        }
    }
}

interface RollOptionRuleElement extends AELikeRuleElement {
    data: RollOptionData;
}

interface RollOptionData extends AELikeData {
    domain: string;
    option: string;
    value: boolean | string;
}

interface RollOptionSource extends AELikeSource {
    domain?: unknown;
    option?: unknown;
}

export { RollOptionRuleElement };
