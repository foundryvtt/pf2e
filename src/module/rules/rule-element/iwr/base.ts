import { RuleElementPF2e, RuleElementData, RuleElementSource, RuleElementOptions } from "../";
import { ItemPF2e } from "@item";

/** @category RuleElement */
abstract class IWRRuleElement extends RuleElementPF2e {
    type: string[];

    constructor(data: IWRRuleElementSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        this.type =
            Array.isArray(data.type) && data.type.every((t): t is string => typeof t === "string")
                ? [...data.type]
                : typeof data.type === "string"
                ? [data.type]
                : [];

        if (this.type.length === 0) {
            this.failValidation("type must be a string or array of strings");
        }
    }

    abstract dictionary: Record<string, string | undefined>;

    abstract get property(): unknown[];

    validate(value: unknown): boolean {
        return (
            this.type.every((t) => t in this.dictionary) &&
            ((typeof value === "number" && Number.isInteger(value) && value > 0) || typeof value === "string") &&
            (!this.data.except || typeof this.data.except === "string")
        );
    }

    abstract getIWR(value?: unknown): string[] | object[];

    override beforePrepareData(): void {
        if (!this.test()) return;

        this.type = this.resolveInjectedProperties(this.type);

        const value: unknown = this.resolveValue();
        if (!this.validate(value)) {
            this.ignored = true;
            return;
        }
        this.property.push(...this.getIWR(value));
    }
}

interface IWRRuleElement extends RuleElementPF2e {
    data: IWRRuleElementData;
}

interface IWRRuleElementSource extends RuleElementSource {
    type?: unknown;
    except?: unknown;
    override?: unknown;
}

interface IWRRuleElementData extends RuleElementData {
    /** Exceptions to the IWR */
    except?: string;
    /** Whether to override an existing value even if it's higher */
    override: boolean;
}

export { IWRRuleElement };
