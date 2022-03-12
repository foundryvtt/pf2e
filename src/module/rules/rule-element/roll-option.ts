import { ItemPF2e } from "@item";
import { RuleElementOptions, RuleElementPF2e } from "./base";
import { RuleElementSource } from "./data";

/**
 * Set a roll option at a specificed domain
 * @category RuleElement
 */
class RollOptionRuleElement extends RuleElementPF2e {
    domain: string;

    option: string;

    value: string | boolean;

    constructor(data: RollOptionSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super({ key: "RollOption" }, item, options);

        this.value = typeof data.value === "string" ? data.value : Boolean(data.value ?? true);

        this.domain = String(data.domain);
        this.option = String(data.option);

        if (!(typeof data.domain === "string" && /^[-:a-z0-9]+$/.test(data.domain) && /[a-z]/.test(data.domain))) {
            const item = this.item;
            this.failValidation(
                `"domain" property on RuleElement from item ${item.name} (${item.uuid}) must be a`,
                `string consisting of only lowercase letters, numbers, and hyphens`
            );
        }
    }

    override onApplyActiveEffects(): void {
        if (!this.test()) return;

        const { rollOptions } = this.actor;
        const domain = (rollOptions[this.domain] ??= {});
        const option = this.resolveInjectedProperties(this.option);
        domain[option] = !!this.resolveValue(this.value);
    }

    /**
     * Add or remove directly from/to a provided set of roll options. All RollOption REs, regardless of phase, are
     * (re-)called here.
     */
    override beforeRoll(domains: string[], rollOptions: string[]): void {
        if (!(this.test() && domains.includes(this.domain))) return;

        const option = this.resolveInjectedProperties(this.option);
        const value = this.resolveValue(this.value);
        if (value === true) {
            rollOptions.push(option);
        } else if (value === false) {
            rollOptions.findSplice((o) => o === option);
        } else {
            this.failValidation("Unrecognized roll option value");
        }
    }
}

interface RollOptionSource extends RuleElementSource {
    domain?: unknown;
    option?: unknown;
}

export { RollOptionRuleElement };
