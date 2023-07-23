import { IWRSource, ImmunityData, ResistanceData, WeaknessData } from "@actor/data/iwr.ts";
import type { ArrayField, BooleanField, StringField } from "types/foundry/common/data/fields.d.ts";
import { AELikeChangeMode } from "../ae-like.ts";
import { RuleElementOptions, RuleElementPF2e, RuleElementSchema, RuleElementSource, RuleValue } from "../index.ts";

/** @category RuleElement */
abstract class IWRRuleElement<TSchema extends IWRRuleSchema> extends RuleElementPF2e<TSchema> {
    abstract value: RuleValue;

    constructor(data: IWRRuleElementSource, options: RuleElementOptions) {
        if (typeof data.type === "string") {
            data.type = [data.type];
        }

        super(data, options);
    }

    static get dictionary(): Record<string, string | undefined> {
        return {};
    }

    static override defineSchema(): IWRRuleSchema {
        const { fields } = foundry.data;

        return {
            ...super.defineSchema(),
            mode: new fields.StringField({ required: true, choices: ["add", "remove"], initial: "add" }),
            type: new fields.ArrayField(new fields.StringField({ required: true, blank: false, initial: undefined })),
            exceptions: new fields.ArrayField(
                new fields.StringField({ required: true, blank: false, initial: undefined })
            ),
            override: new fields.BooleanField(),
        };
    }

    static override validateJoint(source: SourceFromSchema<IWRRuleSchema>): void {
        super.validateJoint(source);

        if (source.type.length === 0) {
            throw Error("must have at least one type");
        }

        if (source.mode === "remove" && source.exceptions.length > 0) {
            throw Error('`exceptions` may not be included with a `mode` of "remove"');
        }
    }

    /** A reference to the pertinent property in actor system data */
    abstract get property(): IWRSource[];

    #isValid(value: unknown): boolean {
        const { dictionary } = this.constructor;

        const unrecognizedTypes = this.type.filter((t) => !(t in dictionary));
        if (unrecognizedTypes.length > 0) {
            for (const type of unrecognizedTypes) {
                this.failValidation(`Type "${type}" is unrecognized`);
            }
            return false;
        }

        if (
            this.mode === "add" &&
            dictionary !== CONFIG.PF2E.immunityTypes &&
            (typeof value !== "number" || value < 0)
        ) {
            this.failValidation("A `value` must be a positive number");
            return false;
        }

        return true;
    }

    abstract getIWR(value?: number): ImmunityData[] | WeaknessData[] | ResistanceData[];

    override afterPrepareData(): void {
        if (!this.test()) return;

        this.type = this.resolveInjectedProperties(this.type);

        const value = Math.floor(Number(this.resolveValue(this.value)));
        if (!this.#isValid(value)) return;

        if (this.mode === "add") {
            this.property.push(...this.getIWR(value));
        } else {
            for (const toRemove of this.type) {
                this.property.findSplice((iwr) => iwr.type === toRemove);
            }
        }
    }
}

interface IWRRuleElement<TSchema extends IWRRuleSchema>
    extends RuleElementPF2e<TSchema>,
        Omit<ModelPropsFromSchema<IWRRuleSchema>, "exceptions"> {
    constructor: typeof IWRRuleElement<TSchema>;

    // Typescript 5 doesn't fully resolve conditional types, so omit from `ModelPropsFromSchema` and redefine
    exceptions: string[];
}

type IWRRuleSchema = RuleElementSchema & {
    /** Whether to add or remove an immunity, weakness, or resistance (default is "add") */
    mode: StringField<IWRChangeMode, IWRChangeMode, true, false, true>;
    type: ArrayField<StringField<string, string, true, false, false>>;
    exceptions: ArrayField<StringField<string, string, true, false, false>>;
    override: BooleanField;
};

type IWRChangeMode = Extract<AELikeChangeMode, "add" | "remove">;

interface IWRRuleElementSource extends RuleElementSource {
    mode?: unknown;
    type?: unknown;
    exceptions?: unknown;
    override?: unknown;
}

export { IWRRuleElement, IWRRuleElementSource, IWRRuleSchema };
