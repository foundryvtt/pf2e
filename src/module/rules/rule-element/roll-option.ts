import { ItemPF2e } from "@item";
import { PredicatePF2e } from "@system/predication";
import { AELikeSource, AELikeRuleElement, AELikeData } from "./ae-like";

/**
 * Make a numeric modification to an arbitrary property in a similar way as `ActiveEffect`s
 * @category RuleElement
 */
class RollOptionRuleElement extends AELikeRuleElement {
    constructor(data: RollOptionSource, item: Embedded<ItemPF2e>) {
        data = deepClone(data);
        data.mode = "override";
        data.value = Boolean(data.value ?? true);
        data.path = `flags.pf2e.rollOptions.${data.domain}.${data.option}`;
        super(data, item);

        this.validate(data, "domain");
        this.validate(data, "option");
    }

    private validate(data: RollOptionSource, key: "domain" | "option") {
        const paramValue = this.resolveInjectedProperties(String(data[key]));
        if (!(typeof paramValue === "string" && /^[-:a-z0-9]+$/.test(paramValue) && /[a-z]/.test(paramValue))) {
            const item = this.item;
            console.warn(
                `PF2e System | "${key}" property on RuleElement from item ${item.name} (${item.uuid}) must be a `,
                `string consisting of only lowercase letters, numbers, and hyphens`
            );
            this.ignored = true;
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
