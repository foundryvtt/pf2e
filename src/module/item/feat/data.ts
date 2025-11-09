import type { Language, SenseAcuity, SenseType } from "@actor/creature/types.ts";
import type { AttributeString, SaveType } from "@actor/types.ts";
import type { ItemUUID } from "@client/documents/_module.d.mts";
import type { SourceFromDataField } from "@common/data/fields.d.mts";
import { FrequencyField, SelfEffectReference } from "@item/ability/index.ts";
import { AbilityTraitToggles } from "@item/ability/trait-toggles.ts";
import type { ArmorCategory } from "@item/armor/types.ts";
import { ItemSystemModel, ItemSystemSchema } from "@item/base/data/model.ts";
import type {
    ActionType,
    BaseItemSourcePF2e,
    Frequency,
    ItemSystemSource,
    ItemTraits,
} from "@item/base/data/system.ts";
import type { ClassTrait } from "@item/class/types.ts";
import type { WeaponCategory } from "@item/weapon/types.ts";
import type { OneToFour, OneToThree } from "@module/data.ts";
import { RarityField } from "@module/model.ts";
import { LaxArrayField, RecordField, SlugField } from "@system/schema-data-fields.ts";
import type { FeatPF2e } from "./document.ts";
import type { FeatOrFeatureCategory, FeatTrait } from "./types.ts";
import fields = foundry.data.fields;

type FeatSource = BaseItemSourcePF2e<"feat", FeatSystemSource>;

class FeatSystemData extends ItemSystemModel<FeatPF2e, FeatSystemSchema> {
    declare traits: FeatTraits;

    declare maxTakable: number;

    declare frequency: Frequency | null;

    declare selfEffect: SelfEffectReference | null;

    declare subfeatures: FeatSubfeatures;

    static override defineSchema(): FeatSystemSchema {
        const featTraits: Record<FeatTrait, string> = CONFIG.PF2E.featTraits;
        const featCategories: Record<FeatOrFeatureCategory, string> = CONFIG.PF2E.featCategories;
        const actionTypes: Record<ActionType, string> = CONFIG.PF2E.actionTypes;
        const attributes: Record<AttributeString, string> = CONFIG.PF2E.abilities;
        const senseTypes: Record<SenseType, string> = CONFIG.PF2E.senses;
        const senseAcuities: Record<SenseAcuity, string> = CONFIG.PF2E.senseAcuities;
        const languages: Record<Language, string> = CONFIG.PF2E.languages;

        // Defer creation to allow homebrew content to fill the records
        let increasableProficiencies: Record<IncreasableProficiency, string> | null = null;
        const getIncreasableProficiencies = () => {
            return (increasableProficiencies ??= {
                ...CONFIG.PF2E.saves,
                ...CONFIG.PF2E.classTraits,
                ...CONFIG.PF2E.armorCategories,
                ...CONFIG.PF2E.weaponCategories,
                perception: "PF2E.PerceptionLabel",
                spellcasting: "PF2E.Item.Spell.Plural",
            });
        };

        return {
            ...super.defineSchema(),
            level: new fields.SchemaField({
                value: new fields.NumberField({
                    required: true,
                    nullable: false,
                    integer: true,
                    min: 1,
                    max: 30,
                    initial: 1,
                }),
                taken: new fields.NumberField({
                    required: false,
                    nullable: true,
                    integer: true,
                    min: 1,
                    max: 30,
                    initial: undefined,
                }),
            }),
            traits: new fields.SchemaField({
                otherTags: new fields.ArrayField(
                    new SlugField({ required: true, nullable: false, initial: undefined }),
                ),
                value: new LaxArrayField(
                    new fields.StringField({
                        required: true,
                        nullable: false,
                        choices: featTraits,
                        initial: undefined,
                    }),
                ),
                rarity: new RarityField(),
                toggles: new fields.EmbeddedDataField(AbilityTraitToggles, {
                    required: false,
                    nullable: false,
                    initial: undefined,
                }),
            }),
            category: new fields.StringField({
                required: true,
                nullable: false,
                choices: featCategories,
                initial: "bonus",
            }),
            onlyLevel1: new fields.BooleanField({ required: true, nullable: false, initial: false }),
            maxTakable: new fields.NumberField({
                required: true,
                nullable: true,
                positive: true,
                integer: true,
                initial: 1,
            }),
            actionType: new fields.SchemaField({
                value: new fields.StringField({
                    required: true,
                    nullable: false,
                    choices: actionTypes,
                    initial: "passive",
                }),
            }),
            actions: new fields.SchemaField({
                value: new fields.NumberField({ required: true, nullable: true, choices: [1, 2, 3] as const }),
            }),
            prerequisites: new fields.SchemaField({
                value: new fields.ArrayField(
                    new fields.SchemaField({
                        value: new fields.StringField({ required: true, nullable: false, initial: undefined }),
                    }),
                ),
            }),
            frequency: new FrequencyField(),
            subfeatures: new fields.SchemaField({
                keyOptions: new fields.ArrayField(
                    new fields.StringField<AttributeString, AttributeString, true, false, false>({
                        required: true,
                        nullable: false,
                        choices: attributes,
                        initial: undefined,
                    }),
                    {
                        required: false,
                        nullable: false,
                        initial: undefined,
                    },
                ),
                languages: new fields.SchemaField(
                    {
                        slots: new fields.NumberField({
                            required: true,
                            nullable: false,
                            integer: true,
                            min: 0,
                            initial: 0,
                        }),
                        granted: new fields.ArrayField(
                            new fields.StringField({ required: true, nullable: false, choices: languages }),
                        ),
                    },
                    { required: false, nullable: false, initial: undefined },
                ),
                proficiencies: new RecordField(
                    new fields.StringField({ required: true, nullable: false, choices: getIncreasableProficiencies }),
                    new fields.SchemaField({
                        rank: new fields.NumberField<OneToFour, OneToFour, true, false, false>({
                            required: true,
                            nullable: false,
                            integer: true,
                            min: 1,
                            max: 4,
                            initial: undefined,
                        }),
                        attribute: new fields.StringField<AttributeString, AttributeString, true, true, true>({
                            required: true,
                            nullable: true,
                            choices: attributes,
                            initial: null,
                        }),
                    }),
                ),
                senses: new RecordField(
                    new fields.StringField({ required: true, nullable: false, choices: senseTypes }),
                    new fields.SchemaField({
                        acuity: new fields.StringField({
                            required: false,
                            nullable: false,
                            choices: senseAcuities,
                            initial: undefined,
                        }),
                        /** The radius of the sense in feet: `null` indicates no limit. */
                        range: new fields.NumberField({ required: true, min: 5, step: 5, max: 300 }),
                        /** "Special" clauses for darkvision */
                        special: new fields.SchemaField({
                            /** Only grant darkvision if the PC's ancestry grants low-light vision. */
                            ancestry: new fields.BooleanField(),
                            /**
                             * Grant darkvision if the PC has low-light vision from any prior source (ancestry, earlier feats, etc.). This
                             * option is mutually exclusive with `ancestry`.
                             */
                            llv: new fields.BooleanField(),
                            /** Grant darkvision if this feat is taken a second time. */
                            second: new fields.BooleanField(),
                        }),
                    }),
                ),
                suppressedFeatures: new fields.ArrayField(
                    new fields.DocumentUUIDField({ required: true, nullable: false, initial: undefined }),
                ),
            }),
            selfEffect: new fields.SchemaField(
                {
                    uuid: new fields.DocumentUUIDField({ required: true, nullable: false, initial: undefined }),
                    name: new fields.StringField({ required: true, nullable: false, initial: undefined }),
                },
                { required: false, nullable: true, initial: undefined },
            ),
            location: new fields.StringField({ required: true, nullable: true, blank: false, initial: null }),
        };
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        // `Infinity` is stored as `null` in JSON, so change back
        this.maxTakable ??= Infinity;

        this.frequency ??= null;
        this.selfEffect ??= null;
        if (this.actor && this.frequency) this.frequency.value ??= this.frequency.max;

        this.traits.toggles ??= new AbilityTraitToggles({}, { parent: this });

        const subfeatures = this.subfeatures;
        subfeatures.keyOptions ??= [];
        subfeatures.languages ??= { slots: 0, granted: [] };
        subfeatures.senses ??= {};
        subfeatures.suppressedFeatures ??= [];
    }

    override prepareDerivedData(): void {
        this.traits.toggles.prepareData();
    }
}

interface FeatSystemData
    extends ItemSystemModel<FeatPF2e, FeatSystemSchema>,
        Omit<fields.ModelPropsFromSchema<FeatSystemSchema>, "description"> {}

type FeatSystemSchema = Omit<ItemSystemSchema, "traits"> & {
    level: fields.SchemaField<{
        value: fields.NumberField<number, number, true, false, true>;
        taken: fields.NumberField<number, number, false, true, false>;
    }>;
    traits: fields.SchemaField<{
        value: fields.ArrayField<fields.StringField<FeatTrait, FeatTrait, true, false, false>>;
        rarity: RarityField;
        otherTags: fields.ArrayField<SlugField<true, false, false>, string[], string[], true, false, true>;
        toggles: fields.EmbeddedDataField<AbilityTraitToggles, false, false, false>;
    }>;
    category: fields.StringField<FeatOrFeatureCategory, FeatOrFeatureCategory, true, false, true>;
    /** Whether this feat must be taken at character level 1 */
    onlyLevel1: fields.BooleanField<boolean, boolean, true, false, true>;
    /** The maximum number of times this feat can be taken by a character. A value of `null` indicates no limit */
    maxTakable: fields.NumberField<number, number, true, true, true>;
    actionType: fields.SchemaField<{
        value: fields.StringField<ActionType, ActionType, true, false, true>;
    }>;
    actions: fields.SchemaField<{
        value: fields.NumberField<OneToThree, OneToThree, true, true, true>;
    }>;
    prerequisites: fields.SchemaField<{
        value: fields.ArrayField<
            fields.SchemaField<{
                value: fields.StringField<string, string, true, false, false>;
            }>
        >;
    }>;
    location: fields.StringField<string, string, true, true, true>;
    frequency: FrequencyField;
    subfeatures: fields.SchemaField<{
        keyOptions: fields.ArrayField<
            fields.StringField<AttributeString, AttributeString, true, false, false>,
            AttributeString[],
            AttributeString[],
            false,
            false,
            false
        >;
        languages: fields.SchemaField<
            {
                slots: fields.NumberField<number, number, true, false, true>;
                /** Additional specific languages the character knows */
                granted: fields.ArrayField<fields.StringField<Language, Language, true, false, false>>;
            },
            { slots: number; granted: Language[] },
            { slots: number; granted: Language[] },
            false,
            false,
            false
        >;
        proficiencies: RecordField<
            fields.StringField<IncreasableProficiency, IncreasableProficiency, true, false, false>,
            fields.SchemaField<{
                rank: fields.NumberField<OneToFour, OneToFour, true, false, false>;
                attribute: fields.StringField<AttributeString, AttributeString, true, true, true>;
            }>
        >;
        senses: SensesField;
        suppressedFeatures: fields.ArrayField<fields.DocumentUUIDField<ItemUUID, true, false, false>>;
    }>;
    /** A self-applied effect for simple actions */
    selfEffect: fields.SchemaField<
        {
            uuid: fields.DocumentUUIDField<ItemUUID, true, false, false>;
            name: fields.StringField<string, string, true, false, false>;
        },
        { uuid: ItemUUID; name: string },
        { uuid: ItemUUID; name: string },
        false,
        true,
        false
    >;
};

type SensesField = RecordField<
    fields.StringField<SenseType, SenseType, true, false, false>,
    fields.SchemaField<{
        acuity: fields.StringField<SenseAcuity, SenseAcuity, false, false, false>;
        /** The radius of the sense in feet: `null` indicates no limit. */
        range: fields.NumberField<number, number, true, true, true>;
        /** "Special" clauses for darkvision */
        special: fields.SchemaField<
            {
                /** Only grant darkvision if the PC's ancestry grants low-light vision. */
                ancestry: fields.BooleanField;
                /**
                 * Grant darkvision if the PC has low-light vision from any prior source (ancestry, earlier feats, etc.). This
                 * option is mutually exclusive with `ancestry`.
                 */
                llv: fields.BooleanField;
                /** Grant darkvision if this feat is taken a second time. */
                second: fields.BooleanField;
            },
            { ancestry: boolean; llv: boolean; second: boolean },
            { ancestry: boolean; llv: boolean; second: boolean },
            false,
            false,
            false
        >;
    }>
>;

type SenseSubfeature = SourceFromDataField<FeatSystemSchema["subfeatures"]>["senses"];

type FeatSystemSource = fields.SourceFromSchema<FeatSystemSchema> & {
    schema?: ItemSystemSource["schema"];
};

interface FeatTraitsSource extends ItemTraits<FeatTrait> {
    toggles?: { mindshift?: { selected?: boolean } | null };
}

interface FeatTraits extends FeatTraitsSource {
    toggles: AbilityTraitToggles;
}

interface FeatSubfeatures {
    keyOptions: AttributeString[];
    languages: LanguagesSubfeature;
    proficiencies: { [K in IncreasableProficiency]?: { rank: OneToFour; attribute: AttributeString | null } };
    senses: SenseSubfeature;
    suppressedFeatures: ItemUUID[];
}

interface LanguagesSubfeature {
    /** A number of open slots fillable with any language */
    slots: number;
    /** Additional specific languages the character knows */
    granted: Language[];
}

type IncreasableProficiency = ArmorCategory | ClassTrait | SaveType | WeaponCategory | "perception" | "spellcasting";

export { FeatSystemData };
export type { FeatSource, FeatSubfeatures, FeatSystemSource, FeatTraits };
