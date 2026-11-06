import { Resistance } from "@actor/data/iwr.ts";
import { ResistanceType } from "@actor/types.ts";
import type { StrictArrayField } from "@system/schema-data-fields.ts";
import * as R from "remeda";
import { ModelPropsFromRESchema, ResolvableValueField, RuleValue } from "../data.ts";
import { IWRException, IWRExceptionField, IWRRuleElement, IWRRuleSchema } from "./base.ts";
import fields = foundry.data.fields;

/** @category RuleElement */
class ResistanceRuleElement extends IWRRuleElement<ResistanceRuleSchema> {
    static override defineSchema(): ResistanceRuleSchema {
        return {
            ...super.defineSchema(),
            mode: new fields.StringField({ required: true, choices: ["add", "remove", "subtract"], initial: "add" }),
            // A type is optional when subtracting from all resistances
            type: new fields.ArrayField(new fields.StringField({ required: true, blank: false })),
            value: new ResolvableValueField({ required: true, nullable: false, initial: undefined }),
            exceptions: this.createExceptionsField(this.dictionary),
            doubleVs: this.createExceptionsField(this.dictionary),
        };
    }

    static override get dictionary(): Record<ResistanceType, string> {
        return CONFIG.PF2E.resistanceTypes;
    }

    static override validateJoint(source: fields.SourceFromSchema<IWRRuleSchema>): void {
        super.validateJoint(source);

        if (source.type.length === 0 && source.mode !== "subtract") {
            throw Error("  type: must have at least one entry");
        }
    }

    get property(): Resistance[] {
        return this.actor.system.attributes.resistances;
    }

    /**
     * Reducing resistances is deferred until all of them have been added: if no type is given, all of the actor's
     * resistances are reduced.
     */
    override afterPrepareData(): void {
        if (this.mode !== "subtract") return super.afterPrepareData();
        if (!this.test()) return;

        this.type = this.resolveInjectedProperties(this.type);
        const unrecognizedTypes = this.type.filter((t) => !(t in CONFIG.PF2E.resistanceTypes));
        if (unrecognizedTypes.length > 0) {
            for (const type of unrecognizedTypes) this.failValidation(`Type "${type}" is unrecognized`);
            return;
        }

        const value = Math.floor(Number(this.resolveValue(this.value)));
        if (!Number.isInteger(value) || value <= 0) {
            this.failValidation("A `value` to subtract must be a positive integer");
            return;
        }

        this.actor.synthetics.resistanceReductions.push({ types: this.type, value });
    }

    getIWR(value: number): Resistance[] {
        if (value <= 0) return [];

        const resistances = this.property;
        for (const resistanceType of [...this.type]) {
            const current = resistances.find(
                (r) =>
                    r.type === resistanceType &&
                    R.isDeepEqual(r.exceptions, this.exceptions) &&
                    R.isDeepEqual(r.doubleVs, this.doubleVs) &&
                    R.isDeepEqual(r.definition, this.definition ?? null),
            );
            if (current) {
                if (this.override) {
                    resistances.splice(resistances.indexOf(current), 1);
                } else if (this.mode !== "remove") {
                    current.value = Math.max(current.value, value);
                    current.source = this.label;
                    this.type.splice(this.type.indexOf(resistanceType), 1);
                }
            }
        }

        return this.type.map(
            (t): Resistance =>
                new Resistance({
                    type: t,
                    value,
                    customLabel: t === "custom" ? this.label : null,
                    definition: this.definition,
                    exceptions: this.exceptions,
                    doubleVs: this.doubleVs,
                    source: this.item.name,
                }),
        );
    }
}

interface ResistanceRuleElement
    extends IWRRuleElement<ResistanceRuleSchema>, ModelPropsFromRESchema<ResistanceRuleSchema> {
    value: RuleValue;

    type: ResistanceType[];
    // Typescript 5.3 doesn't fully resolve conditional types, so it is redefined here
    exceptions: IWRException<ResistanceType>[];
}

type ResistanceRuleSchema = Omit<IWRRuleSchema, "exceptions"> & {
    value: ResolvableValueField<true, false, false>;
    exceptions: StrictArrayField<IWRExceptionField<ResistanceType>>;
    doubleVs: StrictArrayField<IWRExceptionField<ResistanceType>>;
};

export { ResistanceRuleElement };
