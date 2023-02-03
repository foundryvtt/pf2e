import { PredicatePF2e, PredicateStatement, RawPredicate, StatementValidator } from "@system/predication";
import { sluggify } from "@util";
import { DataModel } from "types/foundry/common/abstract/data.mjs";
import {
    ArrayFieldOptions,
    CleanFieldOptions,
    DataFieldOptions,
    DataSchema,
    MaybeSchemaProp,
    StringFieldOptions,
} from "types/foundry/common/data/fields.mjs";

/* -------------------------------------------- */
/*  System `DataSchema` `DataField`s            */
/* -------------------------------------------- */

const { fields } = foundry.data;

/** A `SchemaField` that preserves fields not declared in its `DataSchema` */
class LaxSchemaField<TSourceProp extends DataSchema = DataSchema> extends fields.SchemaField<TSourceProp> {
    protected override _cleanType(data: Record<string, unknown>, options: CleanFieldOptions = {}): TSourceProp {
        options.source = options.source || data;

        // Clean each field that belongs to the schema
        for (const [name, field] of this.entries()) {
            if (!(name in data) && options.partial) continue;
            data[name] = field.clean(data[name], options);
            if (data[name] === undefined) delete data[name];
        }

        return data as TSourceProp;
    }
}

/** A sluggified string field */
class SlugField<
    TRequired extends boolean = true,
    TNullable extends boolean = true,
    THasInitial extends boolean = true
> extends fields.StringField<string, string, TRequired, TNullable, THasInitial> {
    protected static override get _defaults(): StringFieldOptions<string, boolean, boolean, boolean> {
        return { ...super._defaults, nullable: true, initial: null };
    }

    protected override _cleanType(
        value: Maybe<string>,
        options?: CleanFieldOptions
    ): MaybeSchemaProp<string, TRequired, TNullable, THasInitial>;
    protected override _cleanType(value: Maybe<string>, options?: CleanFieldOptions): string | null | undefined {
        const slug = super._cleanType(value, options);
        return typeof slug === "string" ? sluggify(slug) : slug;
    }
}

class PredicateStatementField extends fields.DataField<PredicateStatement, PredicateStatement, true, false, false> {
    /** A `PredicateStatement` is always required (not `undefined`) and never nullable */
    constructor(options: DataFieldOptions<PredicateStatement, true, false, false> = {}) {
        super({ ...options, required: true, nullable: false, initial: undefined });
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
    constructor(options?: ArrayFieldOptions<PredicateStatementField, TRequired, TNullable, THasInitial>) {
        super(new PredicateStatementField(), options);
    }

    /** Construct a `PredicatePF2e` from the initialized `PredicateStatement[]` */
    override initialize(
        value: RawPredicate,
        model: ConstructorOf<DataModel>,
        options?: ArrayFieldOptions<PredicateStatementField, TRequired, TNullable, THasInitial>
    ): MaybeSchemaProp<PredicatePF2e, TRequired, TNullable, THasInitial>;
    override initialize(
        value: RawPredicate,
        model: ConstructorOf<DataModel>,
        options: ArrayFieldOptions<PredicateStatementField, TRequired, TNullable, THasInitial>
    ): PredicatePF2e | null | undefined {
        const statements = super.initialize(value, model, options);
        return statements ? new PredicatePF2e(...statements) : statements;
    }
}

export { LaxSchemaField, PredicateField, SlugField };
