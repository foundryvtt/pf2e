import { IWRSource, Immunity, Resistance, Weakness } from "@actor/data/iwr.ts";
import { IWRType } from "@actor/types.ts";
import type { Predicate } from "@system/predication.ts";
import { DataUnionField, PredicateField, StrictArrayField, StrictStringField } from "@system/schema-data-fields.ts";
import { AELikeChangeMode } from "../ae-like.ts";
import { RuleElement } from "../base.ts";
import { ModelPropsFromRESchema, RuleElementSchema, RuleElementSource, RuleValue } from "../data.ts";
import fields = foundry.data.fields;

/** @category RuleElement */
abstract class IWRRuleElement<TSchema extends IWRRuleSchema> extends RuleElement<TSchema> {
    abstract value: RuleValue | null;

    static get dictionary(): Record<string, string | undefined> {
        return {};
    }

    static override defineSchema(): IWRRuleSchema {
        return {
            ...super.defineSchema(),
            mode: new fields.StringField({ required: true, choices: ["add", "remove"], initial: "add" }),
            type: new fields.ArrayField(new fields.StringField({ required: true, blank: false }), { min: 1 }),
            definition: new PredicateField({ required: false, initial: undefined }),
            exceptions: this.createExceptionsField(),
            override: new fields.BooleanField(),
        };
    }

    protected static createExceptionsField<TType extends string>(
        types?: Record<TType, string>,
    ): StrictArrayField<IWRExceptionField<TType>> {
        const customExceptionField = new foundry.data.fields.SchemaField(
            {
                definition: new PredicateField<true, false, false>({ initial: undefined }),
                label: new StrictStringField<string, string, true, false, false>({
                    required: true,
                    blank: false,
                    initial: undefined,
                }),
            },
            { required: true, initial: undefined },
        );
        const exceptionField = new DataUnionField(
            [
                new StrictStringField<TType, TType, true, false, false>({
                    required: true,
                    blank: false,
                    initial: undefined,
                    choices: types,
                }),
                customExceptionField,
            ],
            { required: true, nullable: false, initial: undefined },
        );

        return new StrictArrayField(exceptionField);
    }

    static override validateJoint(source: fields.SourceFromSchema<IWRRuleSchema>): void {
        super.validateJoint(source);

        if (source.type.some((t) => t === "custom")) {
            if (source.type.length > 1) {
                throw Error('  type: "custom" may not be included among other types');
            }

            if (!source.definition) {
                throw Error("  definition: must be present if defining a custom type");
            }
        } else if (source.definition) {
            throw Error("  definition: may only be present if defining a custom type");
        }

        if (source.mode === "remove" && source.exceptions.length > 0) {
            throw Error('  exceptions: may not be included with a mode of "remove"');
        }
    }

    /** A reference to the pertinent property in actor system data */
    abstract get property(): IWRSource[];

    #isValidValue(value: unknown): boolean {
        const dictionary = this.constructor.dictionary;

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

    abstract getIWR(value?: number): Immunity[] | Weakness[] | Resistance[];

    override afterPrepareData(): void {
        if (!this.test()) return;

        this.type = this.resolveInjectedProperties(this.type);
        this.definition = this.resolveInjectedProperties(this.definition);

        const value = Math.floor(Number(this.resolveValue(this.value)));
        if (!this.#isValidValue(value)) return;

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
    extends RuleElement<TSchema>,
        ModelPropsFromRESchema<IWRRuleSchema> {
    constructor: typeof IWRRuleElement<TSchema>;
}

type IWRRuleSchema = RuleElementSchema & {
    /** Whether to add or remove an immunity, weakness, or resistance (default is "add") */
    mode: fields.StringField<IWRChangeMode, IWRChangeMode, true, false, true>;
    /** One or more IWR types: "custom" is also an acceptable value, but it must be used in isolation. */
    type: fields.ArrayField<fields.StringField<string, string, true, false, false>>;
    /**
     * A list of exceptions, which may include string values corresponding with the IWR type or objects defining custom
     * exceptions
     */
    exceptions: StrictArrayField<IWRExceptionField>;
    /** A definition for a "custom"-type IWR */
    definition: PredicateField<false, false, false>;
    /** Whether to override an existing IWR of the same type, even if it's higher */
    override: fields.BooleanField;
};

type IWRExceptionField<TType extends string = string> = DataUnionField<
    | StrictStringField<TType, TType, true, false, false>
    | fields.SchemaField<{
          definition: PredicateField<true, false, false>;
          label: StrictStringField<string, string, true, false, false>;
      }>,
    true,
    false,
    false
>;

type IWRException<TType extends IWRType = IWRType> = TType | { definition: Predicate; label: string };

type IWRChangeMode = Extract<AELikeChangeMode, "add" | "remove">;

interface IWRRuleElementSource extends RuleElementSource {
    mode?: unknown;
    type?: unknown;
    exceptions?: unknown;
    override?: unknown;
}

export { IWRRuleElement };
export type { IWRException, IWRExceptionField, IWRRuleElementSource, IWRRuleSchema };
