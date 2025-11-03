import type { DataSchema } from "@common/abstract/_types.d.mts";
import type DataModel from "@common/abstract/data.d.mts";
import type {
    ArrayFieldOptions,
    DataFieldOptions,
    DataFieldValidationOptions,
    ObjectFieldOptions,
    StringFieldOptions,
} from "@common/data/_types.d.mts";
import type {
    CleanFieldOptions,
    MaybeSchemaProp,
    ModelPropFromDataField,
    SourceFromDataField,
    SourceFromSchema,
} from "@common/data/fields.d.mts";
import { Predicate, PredicateStatement, RawPredicate, StatementValidator } from "@system/predication.ts";
import { SlugCamel, sluggify, tupleHasValue } from "@util";
import * as R from "remeda";
import fields = foundry.data.fields;
import validation = foundry.data.validation;

/* -------------------------------------------- */
/*  System `DataSchema` `DataField`s            */
/* -------------------------------------------- */

/** A SchemaField that prunes undefined values */
class PrunedSchemaField<TDataSchema extends DataSchema> extends fields.SchemaField<TDataSchema> {
    protected override _cleanType(
        data: Record<string, unknown>,
        options: CleanFieldOptions = {},
    ): SourceFromSchema<TDataSchema> {
        const cleaned = super._cleanType(data, options);
        for (const key in data) {
            if (cleaned[key] === undefined) delete cleaned[key];
        }
        return cleaned;
    }
}

/** A `SchemaField` that preserves fields not declared in its `DataSchema` */
class LaxSchemaField<TDataSchema extends DataSchema> extends fields.SchemaField<TDataSchema> {
    protected override _cleanType(
        data: Record<string, unknown>,
        options: CleanFieldOptions = {},
    ): SourceFromSchema<TDataSchema> {
        options.source = options.source ?? data;

        // Clean each field that belongs to the schema
        for (const [name, field] of this.entries()) {
            if (!(name in data) && options.partial) continue;
            data[name] = field.clean(data[name], options);
            if (data[name] === undefined) delete data[name];
        }

        return data as SourceFromSchema<TDataSchema>;
    }
}

/** A `SchemaField` that does not cast the source value to an object */
class StrictSchemaField<TDataSchema extends DataSchema> extends fields.SchemaField<TDataSchema> {
    protected override _cast(value: unknown): SourceFromSchema<TDataSchema> {
        return value as SourceFromSchema<TDataSchema>;
    }

    protected override _cleanType(data: object, options?: CleanFieldOptions): SourceFromSchema<TDataSchema> {
        if (!R.isPlainObject(data)) {
            throw Error(`${this.name} is not an object`);
        }
        return super._cleanType(data, options);
    }
}

/** A `StringField` that does not cast the source value */
class StrictStringField<
    TSourceProp extends string,
    TModelProp extends NonNullable<JSONValue> = TSourceProp,
    TRequired extends boolean = false,
    TNullable extends boolean = false,
    THasInitial extends boolean = boolean,
> extends fields.StringField<TSourceProp, TModelProp, TRequired, TNullable, THasInitial> {
    protected override _cast(value: unknown): unknown {
        return value;
    }
}

/** A `NumberField` that does not cast the source value */
class StrictNumberField<
    TSourceProp extends number,
    TModelProp extends NonNullable<JSONValue> = TSourceProp,
    TRequired extends boolean = false,
    TNullable extends boolean = true,
    THasInitial extends boolean = true,
> extends fields.NumberField<TSourceProp, TModelProp, TRequired, TNullable, THasInitial> {
    protected override _cast(value: unknown): unknown {
        return value;
    }
}

/** A `BooleanField` when genuine nullability support */
class NullableBooleanField<
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> extends fields.BooleanField<boolean, boolean, TRequired, TNullable, THasInitial> {
    protected override _cast(value: unknown): boolean | null {
        if (value === "true") return true;
        if (value === "false") return false;
        if (value === "null" || value === "") return this.nullable ? null : false;
        if (typeof value === "object") return false;
        return !!value;
    }

    /** Create a select element for nullable fields. */
    protected override _toInput(config: foundry.data.FormInputConfig<boolean>): HTMLElement {
        if (!this.nullable) return super._toInput(config);
        const value = String(config.value ?? null);
        const options = [
            { value: "true", label: game.i18n.localize("Yes"), selected: value === "true" },
            { value: "false", label: game.i18n.localize("No"), selected: value === "false" },
            { value: "null", label: "", selected: value === "null" },
        ];
        return fa.fields.createSelectInput(fu.mergeObject(config, { value, options, dataset: { data: "JSON" } }));
    }
}

/** A `BooleanField` that does not cast the source value */
class StrictBooleanField<
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> extends fields.BooleanField<boolean, boolean, TRequired, TNullable, THasInitial> {
    protected override _cast(value: unknown): unknown {
        return value;
    }
}

class StrictArrayField<
    TElementField extends fields.DataField,
    TSourceProp extends Partial<SourceFromDataField<TElementField>>[] = SourceFromDataField<TElementField>[],
    TModelProp extends object = ModelPropFromDataField<TElementField>[],
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> extends fields.ArrayField<TElementField, TSourceProp, TModelProp, TRequired, TNullable, THasInitial> {
    /** Don't wrap a non-array in an array */
    protected override _cast(value: unknown): unknown {
        return value;
    }

    /** Parent method assumes array-wrapping: pass through unchanged */
    protected override _cleanType(value: unknown): unknown {
        return Array.isArray(value) ? super._cleanType(value) : value;
    }

    override initialize(
        value: JSONValue,
        model: DataModel,
        options: ArrayFieldOptions<TSourceProp, TRequired, TNullable, THasInitial>,
    ): MaybeSchemaProp<TModelProp, TRequired, TNullable, THasInitial>;
    override initialize(
        value: JSONValue,
        model: DataModel,
        options: ArrayFieldOptions<TSourceProp, TRequired, TNullable, THasInitial>,
    ): Maybe<TModelProp> {
        return Array.isArray(value) ? super.initialize(value, model, options) : this.nullable ? null : undefined;
    }
}

/** An array field that will prune invalid elements without complaint */
class LaxArrayField<
    TElementField extends fields.DataField,
    TSourceProp extends Partial<SourceFromDataField<TElementField>>[] = SourceFromDataField<TElementField>[],
    TModelProp extends object = ModelPropFromDataField<TElementField>[],
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> extends fields.ArrayField<TElementField, TSourceProp, TModelProp, TRequired, TNullable, THasInitial> {
    protected override _validateElements(
        value: unknown[],
        options?: DataFieldValidationOptions,
    ): void | validation.DataModelValidationFailure {
        const failure = super._validateElements(value, options);
        if (!failure) return failure;

        for (const element of failure.elements) {
            value.splice(Number(element.id), 1);
        }
        failure.unresolved = false;

        return failure;
    }
}

class StrictObjectField<
    TSourceProp extends object,
    TModelProp extends object = TSourceProp,
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> extends fields.ObjectField<TSourceProp, TModelProp, TRequired, TNullable, THasInitial> {
    protected override _cast(value: unknown): unknown {
        return value;
    }
}

type JSONPrimitive = Exclude<JSONValue, "object">;

/** A field that allows nothing except for the provided choices */
class AnyChoiceField<
    TChoices extends JSONPrimitive,
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> extends fields.DataField<TChoices, TChoices, TRequired, TNullable, THasInitial> {
    static override get _defaults(): AnyChoiceFieldOptions<JSONPrimitive, boolean, boolean, boolean> {
        return { ...super._defaults, choices: [] } as AnyChoiceFieldOptions<JSONPrimitive, boolean, boolean, boolean>;
    }

    // Overriden to satisfy typescript types only
    constructor(
        options?: AnyChoiceFieldOptions<TChoices, TRequired, TNullable, THasInitial>,
        context?: foundry.data.DataFieldContext,
    ) {
        super(options, context);
    }

    /** Converts invalid string representations to valid non-string choices if they exist */
    protected override _cleanType(value: unknown): unknown {
        if (typeof value === "string" && !this.choices.includes(value)) {
            const index = this.choices.findIndex((c) => String(c) === value);
            return index >= 0 ? this.choices[index] : value;
        }
        return value;
    }

    protected override _cast(value: unknown): unknown {
        return value;
    }

    protected override _validateType(value: unknown): void {
        if (this.options.nullable && value === null) return;
        if (!tupleHasValue(this.choices, value)) {
            throw new Error(`${value} is not a valid choice`);
        }
    }

    override _toInput(
        config: foundry.applications.fields.SelectInputConfig & Partial<foundry.data.ChoiceInputConfig>,
    ): HTMLElement | HTMLCollection {
        config.choices ??= R.mapToObj(this.choices, (c) => [String(c), c]);
        fields.StringField._prepareChoiceConfig(config);
        return foundry.applications.fields.createSelectInput(config);
    }
}

interface AnyChoiceField<
    TChoices extends JSONPrimitive,
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> extends fields.DataField<TChoices, TChoices, TRequired, TNullable, THasInitial> {
    choices: JSONPrimitive[];
    options: AnyChoiceFieldOptions<TChoices, TRequired, TNullable, THasInitial>;
}

interface AnyChoiceFieldOptions<
    TChoices extends JSONPrimitive,
    TRequired extends boolean,
    TNullable extends boolean,
    THasInitial extends boolean,
> extends DataFieldOptions<TChoices, TRequired, TNullable, THasInitial> {
    choices: JSONPrimitive[];
}

class DataUnionField<
    TField extends fields.DataField,
    TRequired extends boolean = boolean,
    TNullable extends boolean = boolean,
    THasInitial extends boolean = boolean,
> extends fields.DataField<
    TField extends fields.DataField<infer TSourceProp> ? TSourceProp : never,
    TField extends fields.DataField<infer _TSourceProp, infer TModelProp> ? TModelProp : never,
    TRequired,
    TNullable,
    THasInitial
> {
    fields: TField[];

    constructor(
        fields: TField[],
        options: DataFieldOptions<
            TField extends fields.DataField<infer TSourceProp> ? TSourceProp : never,
            TRequired,
            TNullable,
            THasInitial
        >,
    ) {
        super(options);
        this.fields = fields;
    }

    protected override _cast(value?: unknown): unknown {
        if (typeof value === "string") value = value.trim();
        return value;
    }

    /**
     * Perform some cleaning while first checking that an upstream `_cast` won't convert a dog into a cat (or a number
     * into an array).
     */
    override clean(
        value: unknown,
        options?: CleanFieldOptions | undefined,
    ): MaybeUnionSchemaProp<TField, TRequired, TNullable, THasInitial> {
        type MaybeProp = MaybeUnionSchemaProp<TField, TRequired, TNullable, THasInitial>;
        if (Array.isArray(value) && this.fields.some((f) => f instanceof fields.ArrayField)) {
            const arrayField = this.fields.find((f) => f instanceof StrictArrayField);
            return (arrayField?.clean(value, options) ?? value) as MaybeProp;
        } else if (R.isPlainObject(value)) {
            const field = this.fields.find((f) => f instanceof fields.SchemaField || f instanceof fields.ObjectField);
            const initial = field?.getInitialValue();
            if (!R.isPlainObject(initial)) return super.clean(value, options) as MaybeProp;
            for (const key of Object.keys(initial)) {
                if (!(key in value)) value[key] = initial[key];
            }
            return value as MaybeProp;
        }

        return super.clean(value, options) as MaybeProp;
    }

    protected override _validateType(
        value: unknown,
        options?: DataFieldValidationOptions | undefined,
    ): boolean | void | validation.DataModelValidationFailure {
        const errors: { field: TField; result: validation.DataModelValidationFailure }[] = [];
        for (const field of this.fields) {
            const result = field.validate(value, options);
            if (result instanceof validation.DataModelValidationFailure) {
                errors.push({ field, result });
            } else {
                return true;
            }
        }

        const lastError = errors.at(-1)?.result;
        if (!lastError) return false;

        // Attempt to determine which error is the most relevant based on simple heuristics
        if (Array.isArray(value)) {
            return errors.findLast((e) => e.field instanceof fields.ArrayField)?.result ?? lastError;
        } else if (typeof value === "object") {
            // This is not exhaustive, but it only needs to catch the most common cases
            return (
                errors.findLast((e) => e.field instanceof fields.ObjectField || e.field instanceof fields.SchemaField)
                    ?.result ?? lastError
            );
        } else {
            return lastError;
        }
    }

    override initialize(
        value: unknown,
        model?: DataModel,
        options?: object | undefined,
    ): MaybeUnionSchemaProp<TField, TRequired, TNullable, THasInitial> {
        const field = this.fields.find((f) => !f.validate(value));
        return field?.initialize(value, model, options) as MaybeUnionSchemaProp<
            TField,
            TRequired,
            TNullable,
            THasInitial
        >;
    }
}

type MaybeUnionSchemaProp<
    TField extends fields.DataField,
    TRequired extends boolean,
    TNullable extends boolean,
    THasInitial extends boolean,
> = MaybeSchemaProp<
    TField extends fields.DataField<infer _TSourceProp, infer TModelProp, boolean, boolean, boolean>
        ? TModelProp
        : never,
    TRequired,
    TNullable,
    THasInitial
>;

/** A sluggified string field */
class SlugField<
    TRequired extends boolean = true,
    TNullable extends boolean = boolean,
    THasInitial extends boolean = boolean,
> extends StrictStringField<string, string, TRequired, TNullable, THasInitial> {
    constructor(options: SlugFieldOptions<TRequired, TNullable, THasInitial> = {}) {
        options.blank = false;
        options.camel ??= null;
        super(options);
    }

    protected static override get _defaults(): SlugFieldOptions<boolean, boolean, boolean> {
        return { ...super._defaults, nullable: true, initial: null, camel: null };
    }

    protected override _cleanType(
        value: Maybe<string>,
        options?: CleanFieldOptions,
    ): MaybeSchemaProp<string, TRequired, TNullable, THasInitial>;
    protected override _cleanType(value: Maybe<string>, options?: CleanFieldOptions): unknown {
        const slug = super._cleanType(value, options);
        const camel = this.options.camel ?? null;
        return typeof slug === "string" ? sluggify(slug, { camel }) : slug;
    }
}

interface SlugField<
    TRequired extends boolean = true,
    TNullable extends boolean = boolean,
    THasInitial extends boolean = boolean,
> extends StrictStringField<string, string, TRequired, TNullable, THasInitial> {
    options: SlugFieldOptions<TRequired, TNullable, THasInitial>;
}

interface SlugFieldOptions<TRequired extends boolean, TNullable extends boolean, THasInitial extends boolean>
    extends StringFieldOptions<string, TRequired, TNullable, THasInitial> {
    camel?: SlugCamel;
}

class PredicateStatementField extends fields.DataField<PredicateStatement, PredicateStatement, true, false, false> {
    /** A `PredicateStatement` is always required (not `undefined`) and never nullable */
    constructor(options: DataFieldOptions<PredicateStatement, true, false, false> = {}) {
        super({
            ...options,
            required: true,
            nullable: false,
            initial: undefined,
            validationError: "must be a recognized predication statement",
        });
    }

    protected override _validateType(value: unknown): boolean {
        return StatementValidator.isStatement(value);
    }

    /** No casting is available for a predicate statement */
    protected override _cast(value: unknown): unknown {
        return value;
    }

    protected override _cleanType(value: PredicateStatement): PredicateStatement {
        return typeof value === "string" ? value.trim() : value;
    }
}

class PredicateField<
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> extends StrictArrayField<PredicateStatementField, RawPredicate, Predicate, TRequired, TNullable, THasInitial> {
    constructor(options: ArrayFieldOptions<RawPredicate, TRequired, TNullable, THasInitial> = {}) {
        super(new PredicateStatementField(), options);
    }

    /** Construct a `PredicatePF2e` from the initialized `PredicateStatement[]` */
    override initialize(
        value: RawPredicate,
        model: foundry.abstract.DataModel,
        options?: ArrayFieldOptions<RawPredicate, TRequired, TNullable, THasInitial>,
    ): MaybeSchemaProp<Predicate, TRequired, TNullable, THasInitial>;
    override initialize(
        value: RawPredicate,
        model: foundry.abstract.DataModel,
        options: ArrayFieldOptions<RawPredicate, TRequired, TNullable, THasInitial>,
    ): Predicate | null | undefined {
        const statements = super.initialize(value, model, options);
        return Array.isArray(statements) ? new Predicate(...statements) : statements;
    }

    protected override _toInput(config: foundry.data.FormInputConfig): HTMLInputElement {
        return foundry.applications.fields.createTextInput(
            Object.assign(config, { value: JSON.stringify(config.value ?? []) }),
        );
    }
}

type RecordFieldModelProp<
    TKeyField extends
        | fields.StringField<string, string, true, false, false>
        | fields.NumberField<number, number, true, false, false>,
    TValueField extends fields.DataField,
    TDense extends boolean = false,
> = TDense extends true
    ? Record<ModelPropFromDataField<TKeyField>, ModelPropFromDataField<TValueField>>
    : TDense extends false
      ? Partial<Record<ModelPropFromDataField<TKeyField>, ModelPropFromDataField<TValueField>>>
      :
            | Record<ModelPropFromDataField<TKeyField>, ModelPropFromDataField<TValueField>>
            | Partial<Record<ModelPropFromDataField<TKeyField>, ModelPropFromDataField<TValueField>>>;

type RecordFieldSourceProp<
    TKeyField extends
        | fields.StringField<string, string, true, false, false>
        | fields.NumberField<number, number, true, false, false>,
    TValueField extends fields.DataField,
    /** Whether this is to be treated as a "dense" record; i.e., any valid key should return a value */
    TDense extends boolean = false,
> = TDense extends true
    ? Record<SourceFromDataField<TKeyField>, SourceFromDataField<TValueField>>
    : TDense extends false
      ? Partial<Record<SourceFromDataField<TKeyField>, SourceFromDataField<TValueField>>>
      :
            | Record<SourceFromDataField<TKeyField>, SourceFromDataField<TValueField>>
            | Partial<Record<SourceFromDataField<TKeyField>, SourceFromDataField<TValueField>>>;

class RecordField<
    TKeyField extends
        | fields.StringField<string, string, true, false, false>
        | fields.NumberField<number, number, true, false, false>,
    TValueField extends fields.DataField,
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
    TDense extends boolean = false,
> extends fields.ObjectField<
    RecordFieldSourceProp<TKeyField, TValueField, TDense>,
    RecordFieldModelProp<TKeyField, TValueField, TDense>,
    TRequired,
    TNullable,
    THasInitial
> {
    static override recursive = true;

    keyField: TKeyField;
    valueField: TValueField;

    constructor(
        keyField: TKeyField,
        valueField: TValueField,
        options?: ObjectFieldOptions<
            RecordFieldSourceProp<TKeyField, TValueField, TDense>,
            TRequired,
            TNullable,
            THasInitial
        >,
    ) {
        super(options);

        if (!this._isValidKeyFieldType(keyField)) {
            throw new Error(`key field must be a StringField or a NumberField`);
        }
        this.keyField = keyField;

        if (!(valueField instanceof fields.DataField)) {
            throw new Error(`${this.name} must have a DataField as its contained field`);
        }
        this.valueField = valueField;
    }

    protected _isValidKeyFieldType(
        keyField: unknown,
    ): keyField is
        | fields.StringField<string, string, true, false, false>
        | fields.NumberField<number, number, true, false, false> {
        if (keyField instanceof fields.StringField || keyField instanceof fields.NumberField) {
            if (keyField.options.required !== true || keyField.options.nullable === true) {
                throw new Error(`key field must be required and non-nullable`);
            }
            return true;
        }
        return false;
    }

    protected _validateValues(
        values: Record<string, unknown>,
        options?: DataFieldValidationOptions,
    ): validation.DataModelValidationFailure | void {
        const failures = new validation.DataModelValidationFailure();
        for (const [key, value] of Object.entries(values)) {
            // If this is a deletion key for a partial update, skip
            if (key.startsWith("-=") && options?.partial) continue;

            const keyFailure = this.keyField.validate(key, options);
            if (keyFailure) {
                failures.elements.push({ id: key, failure: keyFailure });
            }
            const valueFailure = this.valueField.validate(value, options);
            if (valueFailure) {
                failures.elements.push({ id: `${key}-value`, failure: valueFailure });
            }
        }
        if (failures.elements.length) {
            if (failures.elements.every((f) => f.id in values)) {
                failures.unresolved = false;
            } else {
                failures.unresolved = failures.elements.some((e) => e.failure.unresolved);
            }

            return failures;
        }
    }

    protected override _cleanType(
        values: Record<string, unknown>,
        options?: CleanFieldOptions | undefined,
    ): Record<string, unknown> {
        for (const [key, value] of Object.entries(values)) {
            if (key.startsWith("-=")) continue; // Don't attempt to clean deletion entries
            values[key] = this.valueField.clean(value, options);
        }
        return values;
    }

    protected override _validateType(
        values: unknown,
        options?: DataFieldValidationOptions,
    ): boolean | validation.DataModelValidationFailure | void {
        if (!R.isPlainObject(values)) {
            return new validation.DataModelValidationFailure({ message: "must be an Object" });
        }
        return this._validateValues(values, options);
    }

    override initialize(
        values: object | null | undefined,
        model: foundry.abstract.DataModel,
        options?: ObjectFieldOptions<RecordFieldSourceProp<TKeyField, TValueField>, TRequired, TNullable, THasInitial>,
    ): MaybeSchemaProp<RecordFieldModelProp<TKeyField, TValueField, TDense>, TRequired, TNullable, THasInitial>;
    override initialize(
        values: object | null | undefined,
        model: foundry.abstract.DataModel,
        options?: ObjectFieldOptions<RecordFieldSourceProp<TKeyField, TValueField>, TRequired, TNullable, THasInitial>,
    ): Record<string, unknown> | null | undefined {
        if (!values) return values;

        // Check for validation failures in the model to omit from the results
        const path = this.fieldPath.startsWith(model.schema.fieldPath + ".")
            ? this.fieldPath.substring(model.schema.fieldPath.length + 1)
            : this.fieldPath;
        const pathParts = path.split(".");
        const failures = pathParts.reduce((fields, part) => {
            return fields ? fields.fields[part] : null;
        }, model.validationFailures.fields);
        const failureKeys = failures?.elements.map((e) => e.id) ?? [];

        const data: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(values)) {
            if (failureKeys.includes(key)) continue;
            data[key] = this.valueField.initialize(value, model, options);
        }

        return data;
    }
}

/** A field that always results in a value of `null` */
class NullField extends fields.DataField<null, null, true, true, true> {
    constructor() {
        super({ required: true, nullable: true, initial: null });
    }

    protected override _cast(): null {
        return null;
    }
}

export {
    AnyChoiceField,
    DataUnionField,
    LaxArrayField,
    LaxSchemaField,
    NullableBooleanField,
    NullField,
    PredicateField,
    PrunedSchemaField,
    RecordField,
    SlugField,
    StrictArrayField,
    StrictBooleanField,
    StrictNumberField,
    StrictObjectField,
    StrictSchemaField,
    StrictStringField,
};
