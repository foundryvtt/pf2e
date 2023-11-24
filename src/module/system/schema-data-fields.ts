import { PredicatePF2e, PredicateStatement, RawPredicate, StatementValidator } from "@system/predication.ts";
import { SlugCamel, sluggify } from "@util";
import { isObject } from "remeda";
import type DataModel from "types/foundry/common/abstract/data.d.ts";
import type {
    ArrayFieldOptions,
    CleanFieldOptions,
    DataField,
    DataFieldOptions,
    DataFieldValidationOptions,
    DataSchema,
    MaybeSchemaProp,
    ModelPropFromDataField,
    NumberField,
    ObjectFieldOptions,
    SourcePropFromDataField,
    StringField,
    StringFieldOptions,
} from "types/foundry/common/data/fields.d.ts";
import type { DataModelValidationFailure } from "types/foundry/common/data/validation-failure.d.ts";

/* -------------------------------------------- */
/*  System `DataSchema` `DataField`s            */
/* -------------------------------------------- */

const { fields } = foundry.data;

/** A `SchemaField` that preserves fields not declared in its `DataSchema` */
class LaxSchemaField<TDataSchema extends DataSchema> extends fields.SchemaField<TDataSchema> {
    protected override _cleanType(
        data: Record<string, unknown>,
        options: CleanFieldOptions = {},
    ): SourceFromSchema<TDataSchema> {
        options.source = options.source || data;

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
        if (!isObject(data)) {
            throw Error(`${this.name} is not an object`);
        }
        return super._cleanType(data, options);
    }
}

/** A `StringField` that does not cast the source value */
class StrictStringField<
    TSourceProp extends string,
    TModelProp = TSourceProp,
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
    TModelProp = TSourceProp,
    TRequired extends boolean = false,
    TNullable extends boolean = true,
    THasInitial extends boolean = true,
> extends fields.NumberField<TSourceProp, TModelProp, TRequired, TNullable, THasInitial> {
    protected override _cast(value: unknown): unknown {
        return value;
    }
}

/** A `BooleanField` that does not cast the source value */
class StrictBooleanField<
    TRequired extends boolean = false,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> extends fields.BooleanField<boolean, boolean, TRequired, TNullable, THasInitial> {
    protected override _cast(value: unknown): unknown {
        return value;
    }
}

class StrictArrayField<
    TElementField extends DataField,
    TSourceProp extends Partial<SourcePropFromDataField<TElementField>>[] = SourcePropFromDataField<TElementField>[],
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
        model: ConstructorOf<DataModel>,
        options: ArrayFieldOptions<TSourceProp, TRequired, TNullable, THasInitial>,
    ): MaybeSchemaProp<TModelProp, TRequired, TNullable, THasInitial>;
    override initialize(
        value: JSONValue,
        model: ConstructorOf<DataModel>,
        options: ArrayFieldOptions<TSourceProp, TRequired, TNullable, THasInitial>,
    ): Maybe<TModelProp> {
        return Array.isArray(value) ? super.initialize(value, model, options) : null;
    }
}

class StrictObjectField<
    TSourceProp extends object,
    TModelProp = TSourceProp,
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> extends fields.ObjectField<TSourceProp, TModelProp, TRequired, TNullable, THasInitial> {
    protected override _cast(value: unknown): unknown {
        return value;
    }
}

class DataUnionField<
    TField extends DataField,
    TRequired extends boolean = boolean,
    TNullable extends boolean = boolean,
    THasInitial extends boolean = boolean,
> extends fields.DataField<
    TField extends DataField<infer TSourceProp> ? TSourceProp : never,
    TField extends DataField<infer _TSourceProp, infer TModelProp> ? TModelProp : never,
    TRequired,
    TNullable,
    THasInitial
> {
    fields: TField[];

    constructor(
        fields: TField[],
        options: DataFieldOptions<
            TField extends DataField<infer TSourceProp> ? TSourceProp : never,
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

    override clean(
        value: unknown,
        options?: CleanFieldOptions | undefined,
    ): MaybeUnionSchemaProp<TField, TRequired, TNullable, THasInitial> {
        if (Array.isArray(value) && this.fields.some((f) => f instanceof foundry.data.fields.ArrayField)) {
            const arrayField = this.fields.find((f) => f instanceof StrictArrayField);
            return (arrayField?.clean(value, options) ?? value) as MaybeUnionSchemaProp<
                TField,
                TRequired,
                TNullable,
                THasInitial
            >;
        }

        return super.clean(value, options) as MaybeUnionSchemaProp<TField, TRequired, TNullable, THasInitial>;
    }

    override validate(
        value: unknown,
        options?: DataFieldValidationOptions | undefined,
    ): void | DataModelValidationFailure {
        const { DataModelValidationFailure } = foundry.data.validation;
        const { StringField } = foundry.data.fields;
        for (const field of this.fields) {
            if (field.validate(value, options) instanceof DataModelValidationFailure) {
                continue;
            } else if (field instanceof StringField && typeof value !== "string") {
                continue;
            } else {
                return;
            }
        }

        return this.fields[0].validate(value, options);
    }

    override initialize(
        value: unknown,
        model?: ConstructorOf<DataModel> | undefined,
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
    TField extends DataField,
    TRequired extends boolean,
    TNullable extends boolean,
    THasInitial extends boolean,
> = MaybeSchemaProp<
    TField extends DataField<infer _TSourceProp, infer TModelProp, boolean, boolean, boolean> ? TModelProp : never,
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
            validationError: "must be recognized predicated statement type",
        });
    }

    protected override _validateType(value: unknown): boolean {
        return StatementValidator.isStatement(value);
    }

    /** No casting is available for a predicate statement */
    protected _cast(value: unknown): unknown {
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
> extends StrictArrayField<PredicateStatementField, RawPredicate, PredicatePF2e, TRequired, TNullable, THasInitial> {
    constructor(options: ArrayFieldOptions<RawPredicate, TRequired, TNullable, THasInitial> = {}) {
        super(new PredicateStatementField(), { label: "PF2E.RuleEditor.General.Predicate", ...options });
    }

    /** Construct a `PredicatePF2e` from the initialized `PredicateStatement[]` */
    override initialize(
        value: RawPredicate,
        model: ConstructorOf<foundry.abstract.DataModel>,
        options?: ArrayFieldOptions<RawPredicate, TRequired, TNullable, THasInitial>,
    ): MaybeSchemaProp<PredicatePF2e, TRequired, TNullable, THasInitial>;
    override initialize(
        value: RawPredicate,
        model: ConstructorOf<foundry.abstract.DataModel>,
        options: ArrayFieldOptions<RawPredicate, TRequired, TNullable, THasInitial>,
    ): PredicatePF2e | null | undefined {
        const statements = super.initialize(value, model, options);
        return Array.isArray(statements) ? new PredicatePF2e(...statements) : statements;
    }
}

type RecordFieldModelProp<
    TKeyField extends StringField<string, string, true, false, false> | NumberField<number, number, true, false, false>,
    TValueField extends DataField,
> = Partial<Record<ModelPropFromDataField<TKeyField>, ModelPropFromDataField<TValueField>>>;

type RecordFieldSourceProp<
    TKeyField extends StringField<string, string, true, false, false> | NumberField<number, number, true, false, false>,
    TValueField extends DataField,
> = Partial<Record<SourcePropFromDataField<TKeyField>, SourcePropFromDataField<TValueField>>>;

class RecordField<
    TKeyField extends StringField<string, string, true, false, false> | NumberField<number, number, true, false, false>,
    TValueField extends DataField,
    TRequired extends boolean = true,
    TNullable extends boolean = false,
    THasInitial extends boolean = true,
> extends fields.ObjectField<
    RecordFieldSourceProp<TKeyField, TValueField>,
    RecordFieldModelProp<TKeyField, TValueField>,
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
        options: ObjectFieldOptions<RecordFieldSourceProp<TKeyField, TValueField>, TRequired, TNullable, THasInitial>,
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
    ): keyField is StringField<string, string, true, false, false> | NumberField<number, number, true, false, false> {
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
    ): DataModelValidationFailure | void {
        const validationFailure = foundry.data.validation.DataModelValidationFailure;
        const failures = new validationFailure();
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
            return failures;
        }
    }

    protected override _cleanType(
        values: Record<string, unknown>,
        options?: CleanFieldOptions | undefined,
    ): Record<string, unknown> {
        for (const [key, value] of Object.entries(values)) {
            values[key] = this.valueField.clean(value, options);
        }
        return values;
    }

    protected override _validateType(
        values: unknown,
        options?: DataFieldValidationOptions,
    ): boolean | DataModelValidationFailure | void {
        if (!isObject(values)) {
            return new foundry.data.validation.DataModelValidationFailure({ message: "must be an Object" });
        }
        return this._validateValues(values, options);
    }

    override initialize(
        values: object | null | undefined,
        model: ConstructorOf<foundry.abstract.DataModel>,
        options?: ObjectFieldOptions<RecordFieldSourceProp<TKeyField, TValueField>, TRequired, TNullable, THasInitial>,
    ): MaybeSchemaProp<RecordFieldModelProp<TKeyField, TValueField>, TRequired, TNullable, THasInitial>;
    override initialize(
        values: object | null | undefined,
        model: ConstructorOf<foundry.abstract.DataModel>,
        options?: ObjectFieldOptions<RecordFieldSourceProp<TKeyField, TValueField>, TRequired, TNullable, THasInitial>,
    ): RecordFieldModelProp<TKeyField, TValueField> | null | undefined {
        if (!values) return values;
        const data: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(values)) {
            data[key] = this.valueField.initialize(value, model, options);
        }
        return data as RecordFieldModelProp<TKeyField, TValueField>;
    }
}

export {
    DataUnionField,
    LaxSchemaField,
    PredicateField,
    RecordField,
    SlugField,
    StrictArrayField,
    StrictBooleanField,
    StrictNumberField,
    StrictObjectField,
    StrictSchemaField,
    StrictStringField,
};
