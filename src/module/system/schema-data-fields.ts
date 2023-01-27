import { PredicatePF2e, PredicateStatement, RawPredicate, StatementValidator } from "@system/predication";
import { sluggify } from "@util";
import { DataModel } from "types/foundry/common/abstract/data.mjs";
import {
    ArrayFieldOptions,
    CleanFieldOptions,
    DataFieldOptions,
    DataSchema,
    StringFieldOptions,
} from "types/foundry/common/data/fields.mjs";

/* -------------------------------------------- */
/*  System `DataSchema` `DataField`s            */
/* -------------------------------------------- */

const { fields } = foundry.data;

/** A sluggified string field */
class SlugField<TNullable extends boolean = true> extends fields.StringField<string, string, TNullable> {
    protected static override get _defaults(): StringFieldOptions {
        return mergeObject(super._defaults, {
            initial: null,
            nullable: true,
        });
    }

    protected override _cleanType(value: Maybe<string>, options?: CleanFieldOptions): Maybe<string> {
        const slug = super._cleanType(value, options);
        return typeof slug === "string" ? sluggify(slug) : slug;
    }
}

class PredicateStatementField extends fields.DataField<PredicateStatement, PredicateStatement> {
    /** A `PredicateStatement` is always required (not `undefined`) and never nullable */
    constructor(options: DataFieldOptions<PredicateStatement, false> = {}) {
        super({ ...options, required: true, nullable: false });
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

class PredicateField<TNullable extends boolean = false> extends fields.ArrayField<
    PredicateStatementField,
    RawPredicate,
    RawPredicate,
    TNullable
> {
    constructor(options: Pick<ArrayFieldOptions<PredicateStatementField, TNullable>, "initial" | "nullable"> = {}) {
        super(new PredicateStatementField(), options);
    }

    /** Construct a `PredicatePF2e` from the initialized `PredicateStatement[]` */
    override initialize(
        value: RawPredicate,
        model: ConstructorOf<DataModel>,
        options?: ArrayFieldOptions<PredicateStatementField, TNullable>
    ): TNullable extends true ? PredicatePF2e | null : PredicatePF2e;
    override initialize(
        value: RawPredicate,
        model: ConstructorOf<DataModel>,
        options: ArrayFieldOptions<PredicateStatementField, TNullable>
    ): PredicatePF2e | null {
        const statements = super.initialize(value, model, options);
        return statements ? new PredicatePF2e(...statements) : statements;
    }
}

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

export { LaxSchemaField, PredicateField, SlugField };
