import { RuleElementPF2e, RuleElementSource, RuleElementOptions, RuleElementSchema } from "../";
import { ItemPF2e } from "@item";
import { ImmunityData, ResistanceData, WeaknessData } from "@actor/data/iwr";
import { ArrayField, BooleanField, ModelPropsFromSchema, StringField } from "types/foundry/common/data/fields.mjs";

const { fields } = foundry.data;

/** @category RuleElement */
abstract class IWRRuleElement<TSchema extends IWRRuleSchema> extends RuleElementPF2e<TSchema> {
    constructor(data: IWRRuleElementSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        if (typeof data.type === "string") {
            data.type = [data.type];
        }

        super(data, item, options);
    }

    static get dictionary(): Record<string, string | undefined> {
        return {};
    }

    static override defineSchema(): IWRRuleSchema {
        return {
            ...super.defineSchema(),
            type: new fields.ArrayField(new fields.StringField({ required: true, blank: false, initial: undefined })),
            exceptions: new fields.ArrayField(
                new fields.StringField({ required: true, blank: false, initial: undefined })
            ),
            override: new fields.BooleanField(),
        };
    }

    /** A reference to the pertinent property in actor system data */
    abstract get property(): unknown[];

    #isValid(value: unknown): boolean {
        if (this.type.length === 0) {
            this.failValidation("A type must be provided");
            return false;
        }

        const { dictionary } = this.constructor;

        const unrecognizedTypes = this.type.filter((t) => !(t in dictionary));
        if (unrecognizedTypes.length > 0) {
            for (const type of unrecognizedTypes) {
                this.failValidation(`Type "${type}" is unrecognized`);
            }
            return false;
        }

        if (dictionary !== CONFIG.PF2E.immunityTypes && (typeof value !== "number" || value < 0)) {
            this.failValidation("A `value` must be a positive number");
            return false;
        }

        return true;
    }

    abstract getIWR(value?: number): ImmunityData[] | WeaknessData[] | ResistanceData[];

    override beforePrepareData(): void {
        if (!this.test()) return;

        this.type = this.resolveInjectedProperties(this.type);

        const value = Math.floor(Number(this.resolveValue()));
        if (!this.#isValid(value)) {
            this.ignored = true;
            return;
        }
        this.property.push(...this.getIWR(value));
    }
}

interface IWRRuleElement<TSchema extends IWRRuleSchema>
    extends RuleElementPF2e<TSchema>,
        Omit<ModelPropsFromSchema<IWRRuleSchema>, "exceptions"> {
    constructor: typeof IWRRuleElement<TSchema>;

    // Typescript 4.9 doesn't fully resolve conditional types, so omit from `ModelPropsFromSchema` and redefine
    exceptions: string[];
}

type IWRRuleSchema = RuleElementSchema & {
    type: ArrayField<StringField<string, string, true, false, false>>;
    exceptions: ArrayField<StringField<string, string, true, false, false>>;
    override: BooleanField;
};

interface IWRRuleElementSource extends RuleElementSource {
    type?: unknown;
    exceptions?: unknown;
    override?: unknown;
}

export { IWRRuleElement, IWRRuleSchema, IWRRuleElementSource };
