import { RuneTrait } from "@item/physical/runes.ts";
import { CoppersField } from "@item/physical/schema.ts";
import { RARITIES, Rarity } from "@module/data.ts";
import { PublicationField } from "@module/model.ts";
import { Predicate, RawPredicate } from "@system/predication.ts";
import { PredicateField } from "@system/schema-data-fields.ts";
import * as R from "remeda";
import { RUNE_CATEGORIES } from "./constants.ts";
import { RuneCategory } from "./types.ts";

import fields = foundry.data.fields;

class RunePageSystemData<TParent extends fd.JournalEntryPage | null = fd.JournalEntryPage | null> extends foundry
    .abstract.TypeDataModel<TParent, RunePageSystemSchema> {
    static override LOCALIZATION_PREFIXES = ["PF2E.JournalEntryPage.Rune"];

    /** The lowest level in which this rune is available */
    declare lowestLevel: number;

    static override defineSchema(): RunePageSystemSchema {
        const runeTraits: Exclude<RuneTrait, "magical">[] = R.keys(R.omit(CONFIG.PF2E.runeTraits, ["magical"]));
        return {
            category: new fields.StringField({ required: true, choices: RUNE_CATEGORIES, initial: "weapon-property" }),
            traits: new fields.SchemaField({
                rarity: new fields.StringField({ required: true, choices: RARITIES, initial: "common" }),
                value: new fields.SetField(new fields.StringField({ required: true, choices: runeTraits })),
            }),
            usage: new fields.SchemaField({
                text: new fields.StringField({ required: true }),
                predicate: new PredicateField(),
            }),
            craft: new fields.SchemaField(
                {
                    text: new fields.StringField({ required: true }),
                    predicate: new PredicateField(),
                },
                { nullable: true, initial: null },
            ),
            variants: new fields.TypedObjectField(
                new fields.SchemaField({
                    name: new fields.StringField({ required: true, nullable: true, blank: false, initial: null }),
                    price: new CoppersField(),
                    addendum: new fields.HTMLField(),
                }),
                {
                    initial: () => ({ 2: { name: null, addendum: "", price: 0, craft: null } }),
                    validateKey: (key) => {
                        const level = Number(key || NaN);
                        return level >= 0 && Number.isInteger(level) && level < 100;
                    },
                },
            ),
            publication: new PublicationField(),
        };
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        this.lowestLevel = fu.iterateKeys(this.variants).reduce((lowest, key) => {
            const level = Number(key);
            return level < lowest ? level : lowest;
        }, 99);
        const traits = this.traits.value;
        if (!traits.has("magical") && !traits.values().some((t) => t in CONFIG.PF2E.magicTraditions)) {
            this.traits.value.add("magical");
        }
    }

    protected override async _preCreate(
        data: DeepPartial<NonNullable<TParent>["_source"] & { system: RunePageSystemSource }>,
        options: foundry.abstract.DatabaseCreateCallbackOptions,
        user: User,
    ): Promise<boolean | void> {
        const allowed = await super._preCreate(data, options, user);
        if (allowed === false) return false;
        const traits = data.system?.traits ?? {};
        traits.value &&= R.unique(traits.value).sort();
    }

    protected override async _preUpdate(
        changes: Record<string, unknown>,
        options: foundry.abstract.DatabaseUpdateCallbackOptions,
        user: User,
    ): Promise<boolean | void> {
        const allowed = await super._preUpdate(changes, options, user);
        if (allowed === false) return false;
        if (R.isPlainObject(changes.system) && R.isPlainObject(changes.system.traits)) {
            const traits = changes.system.traits;
            if (Array.isArray(traits.value)) traits.value = R.unique(traits.value).sort();
        }
    }
}

interface RunePageSystemData<TParent extends fd.JournalEntryPage | null = fd.JournalEntryPage | null>
    extends
        foundry.abstract.TypeDataModel<TParent, RunePageSystemSchema>,
        fields.ModelPropsFromSchema<RunePageSystemSchema> {}

declare namespace RunePageSystemData {
    const schema: fields.DataModelSchemaField<RunePageSystemSchema>;
}

type RunePageSystemSchema = {
    category: fields.StringField<RuneCategory, RuneCategory, true, false, true>;
    traits: fields.SchemaField<{
        rarity: fields.StringField<Rarity, Rarity, true, false, true>;
        value: fields.SetField<fields.StringField<Exclude<RuneTrait, "magical">, RuneTrait, true, false, false>>;
    }>;
    usage: fields.SchemaField<{
        text: fields.StringField<string, string, true, false, true>;
        predicate: PredicateField;
    }>;
    variants: fields.TypedObjectField<fields.SchemaField<RuneVariantSchema>>;
    craft: fields.SchemaField<
        {
            text: fields.StringField<string, string, true, false, true>;
            predicate: PredicateField;
        },
        { text: string; predicate: RawPredicate },
        { text: string; predicate: Predicate },
        true,
        true,
        true
    >;
    publication: PublicationField;
};

type RuneVariantSchema = {
    name: fields.StringField<string, string, true, true, true>;
    price: CoppersField;
    addendum: fields.HTMLField<string, string, true, false, true>;
};

type RunePageSystemSource = fields.SourceFromSchema<RunePageSystemSchema>;

export { RunePageSystemData };
export type { RunePageSystemSchema, RunePageSystemSource, RuneVariantSchema };
