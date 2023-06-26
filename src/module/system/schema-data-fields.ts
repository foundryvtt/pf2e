import { PredicatePF2e, PredicateStatement, RawPredicate, StatementValidator } from "@system/predication.ts";
import { SlugCamel, sluggify } from "@util";
import { isObject } from "remeda";
import type {
    ArrayFieldOptions,
    CleanFieldOptions,
    DataField,
    DataFieldOptions,
    DataFieldValidationOptions,
    DataSchema,
    MaybeSchemaProp,
    ModelPropFromDataField,
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
        options: CleanFieldOptions = {}
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

/** A sluggified string field */
class SlugField<
    TRequired extends boolean = true,
    TNullable extends boolean = true,
    THasInitial extends boolean = true
> extends fields.StringField<string, string, TRequired, TNullable, THasInitial> {
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
        options?: CleanFieldOptions
    ): MaybeSchemaProp<string, TRequired, TNullable, THasInitial>;
    protected override _cleanType(value: Maybe<string>, options?: CleanFieldOptions): unknown {
        const slug = super._cleanType(value, options);
        const camel = this.options.camel ?? null;
        return typeof slug === "string" ? sluggify(slug, { camel }) : slug;
    }
}

interface SlugField<
    TRequired extends boolean = true,
    TNullable extends boolean = true,
    THasInitial extends boolean = true
> extends StringField<string, string, TRequired, TNullable, THasInitial> {
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
    THasInitial extends boolean = true
> extends fields.ArrayField<PredicateStatementField, RawPredicate, PredicatePF2e, TRequired, TNullable, THasInitial> {
    constructor(options?: ArrayFieldOptions<RawPredicate, TRequired, TNullable, THasInitial>) {
        super(new PredicateStatementField(), options);
    }

    /** Don't wrap a non-array in an array */
    protected override _cast(value: unknown): unknown {
        return value;
    }

    /** Parent method assumes array-wrapping: pass through unchanged */
    protected override _cleanType(value: unknown): unknown {
        return value;
    }

    /** Construct a `PredicatePF2e` from the initialized `PredicateStatement[]` */
    override initialize(
        value: RawPredicate,
        model: ConstructorOf<foundry.abstract.DataModel>,
        options?: ArrayFieldOptions<RawPredicate, TRequired, TNullable, THasInitial>
    ): MaybeSchemaProp<PredicatePF2e, TRequired, TNullable, THasInitial>;
    override initialize(
        value: RawPredicate,
        model: ConstructorOf<foundry.abstract.DataModel>,
        options: ArrayFieldOptions<RawPredicate, TRequired, TNullable, THasInitial>
    ): PredicatePF2e | null | undefined {
        const statements = super.initialize(value, model, options);
        return statements ? new PredicatePF2e(...statements) : statements;
    }
}

class RecordField<
    TDataField extends DataField,
    TSourceProp extends Record<string, SourcePropFromDataField<TDataField>> = Record<
        string,
        SourcePropFromDataField<TDataField>
    >,
    TModelProp extends Record<string, ModelPropFromDataField<TDataField>> = Record<
        string,
        ModelPropFromDataField<TDataField>
    >,
    TRequired extends boolean = false,
    TNullable extends boolean = false,
    THasInitial extends boolean = true
> extends fields.DataField<TSourceProp, TModelProp, TRequired, TNullable, THasInitial> {
    static override recursive = true;

    field: TDataField;
    keys: string[];

    constructor(
        field: TDataField,
        options: DataFieldOptions<TSourceProp, TRequired, TNullable, THasInitial> & { keys?: string[] }
    ) {
        super(options);

        this.field = this._validateFieldType(field);
        this.keys = options.keys ?? [];
    }

    protected _validateFieldType(field: unknown): TDataField {
        if (!(field instanceof fields.DataField)) {
            throw new Error(`${this.name} must have a DataField as its contained field`);
        }
        return field as TDataField;
    }

    protected _validateValues(
        values: Record<string, unknown>,
        options?: DataFieldValidationOptions
    ): DataModelValidationFailure | void {
        const validationFailure = foundry.data.validation.DataModelValidationFailure;
        const valueFailure = new validationFailure();
        for (const [key, value] of Object.entries(values)) {
            if (this.keys.length && !this.keys.includes(key)) {
                valueFailure.elements.push({
                    id: key,
                    failure: new validationFailure({ message: `is not in the list of specified keys` }),
                });
                continue;
            }
            const failure = this.field.validate(value, options);
            if (failure) {
                valueFailure.elements.push({ id: key, failure });
            }
        }
        if (valueFailure.elements.length) {
            return valueFailure;
        }
    }

    protected override _validateType(
        values: unknown,
        options?: DataFieldValidationOptions
    ): boolean | DataModelValidationFailure | void {
        if (!isObject(values)) {
            return new foundry.data.validation.DataModelValidationFailure({ message: "must be an Object" });
        }
        return this._validateValues(values, options);
    }

    protected override _cast(value?: unknown): unknown {
        return value;
    }

    protected override _cleanType(value: unknown): unknown {
        return value;
    }

    override initialize(
        values: Record<string, unknown> | null | undefined,
        model: ConstructorOf<foundry.abstract.DataModel>,
        options?: DataFieldOptions<TSourceProp, TRequired, TNullable, THasInitial>
    ): MaybeSchemaProp<TModelProp, TRequired, TNullable, THasInitial>;
    override initialize(
        values: Record<string, unknown> | null | undefined,
        model: ConstructorOf<foundry.abstract.DataModel>,
        options?: DataFieldOptions<TSourceProp, TRequired, TNullable, THasInitial>
    ): Record<string, ModelPropFromDataField<TDataField>> | null | undefined {
        if (!values) return values;
        const data: Record<string, ModelPropFromDataField<TDataField>> = {};
        for (const [key, value] of Object.entries(values)) {
            data[key] = this.field.initialize(value, model, options) as ModelPropFromDataField<TDataField>;
        }
        return data;
    }
}

export { LaxSchemaField, PredicateField, RecordField, SlugField };
