import { RuleElementPF2e, RuleElementSource, RuleElementOptions } from "../";
import { ItemPF2e } from "@item";
import { ImmunityData, ResistanceData, WeaknessData } from "@actor/data/iwr";

/** @category RuleElement */
abstract class IWRRuleElement extends RuleElementPF2e {
    type: string[];

    exceptions: string[];

    /** Whether to override an existing value even if it's higher */
    override: boolean;

    constructor(data: IWRRuleElementSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        this.type =
            Array.isArray(data.type) && data.type.every((t): t is string => typeof t === "string")
                ? [...data.type]
                : typeof data.type === "string"
                ? [data.type]
                : [];

        this.exceptions =
            Array.isArray(data.exceptions) && data.exceptions.every((e): e is string => typeof e === "string")
                ? data.exceptions
                : [];

        if (this.type.length === 0) {
            this.failValidation("type must be a string or array of strings");
        }

        this.override = !!data.override;
    }

    protected abstract dictionary: Record<string, string | undefined>;

    abstract get property(): unknown[];

    validate(value: unknown): boolean {
        if (this.type.length === 0) {
            this.failValidation("A type must be provided");
            return false;
        }

        const unrecognizedTypes = this.type.filter((t) => !(t in this.dictionary));
        if (unrecognizedTypes.length > 0) {
            for (const type of unrecognizedTypes) {
                this.failValidation(`Type "${type}" is unrecognized`);
            }
            return false;
        }

        if (this.dictionary !== CONFIG.PF2E.immunityTypes && (typeof value !== "number" || value < 0)) {
            this.failValidation("A `value` must be a positive number");
            return false;
        }

        const unrecognizedExceptions = this.exceptions.filter((e) => !(e in this.dictionary));
        if (unrecognizedExceptions.length > 0) {
            for (const type of unrecognizedTypes) {
                this.failValidation(`Type "${type}" is unrecognized`);
            }
            return false;
        }

        return true;
    }

    abstract getIWR(value?: number): ImmunityData[] | WeaknessData[] | ResistanceData[];

    override beforePrepareData(): void {
        if (!this.test()) return;

        this.type = this.resolveInjectedProperties(this.type);

        const value = Math.floor(Number(this.resolveValue()));
        if (!this.validate(value)) {
            this.ignored = true;
            return;
        }
        this.property.push(...this.getIWR(value));
    }
}

interface IWRRuleElementSource extends RuleElementSource {
    type?: unknown;
    exceptions?: unknown;
    override?: unknown;
}

export { IWRRuleElement, IWRRuleElementSource };
