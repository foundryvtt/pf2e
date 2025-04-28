import type { ItemUUID } from "@client/documents/_module.d.mts";
import type { ImageFilePath } from "@common/constants.d.mts";
import { ItemSystemModel, ItemSystemSchema } from "@item/base/data/model.ts";
import type {
    ActionType,
    BaseItemSourcePF2e,
    Frequency,
    FrequencyInterval,
    FrequencySource,
    ItemSystemSource,
} from "@item/base/data/system.ts";
import type { OneToThree } from "@module/data.ts";
import { LaxArrayField, SlugField } from "@system/schema-data-fields.ts";
import type { AbilityItemPF2e } from "./document.ts";
import { AbilityTraitToggles } from "./trait-toggles.ts";
import type { AbilityTrait, ActionCategory } from "./types.ts";
import fields = foundry.data.fields;

type AbilitySource = BaseItemSourcePF2e<"action", AbilitySystemSource>;

class FrequencyField extends fields.SchemaField<FrequencySchema, FrequencySource, Frequency, false, true, false> {
    constructor() {
        const frequencies: Record<FrequencyInterval, string> = CONFIG.PF2E.frequencies;
        super(
            {
                value: new fields.NumberField({
                    required: false,
                    nullable: false,
                    integer: true,
                    min: 0,
                    initial: undefined,
                }),
                max: new fields.NumberField({
                    required: true,
                    nullable: false,
                    integer: true,
                    positive: true,
                    initial: 1,
                }),
                per: new fields.StringField({
                    required: true,
                    nullable: false,
                    choices: frequencies,
                    initial: "round",
                }),
            },
            { required: false, nullable: true, initial: undefined },
        );
    }
}

class AbilitySystemData extends ItemSystemModel<AbilityItemPF2e, AbilitySystemSchema> {
    static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "PF2E.Item.Ability"];

    declare traits: AbilityTraits;

    declare frequency: Frequency | null;

    declare selfEffect: SelfEffectReference | null;

    declare deathNote: boolean;

    static override defineSchema(): AbilitySystemSchema {
        const traitChoices: Record<AbilityTrait, string> = CONFIG.PF2E.actionTraits;
        const abilityTypes: Record<ActionType, string> = CONFIG.PF2E.actionTypes;
        const categories: Record<ActionCategory, string> = CONFIG.PF2E.actionCategories;

        return {
            ...super.defineSchema(),
            traits: new fields.SchemaField({
                otherTags: new fields.ArrayField(
                    new SlugField({ required: true, nullable: false, initial: undefined }),
                ),
                value: new LaxArrayField(
                    new fields.StringField({
                        required: true,
                        nullable: false,
                        choices: traitChoices,
                        initial: undefined,
                    }),
                ),
                toggles: new fields.EmbeddedDataField(AbilityTraitToggles, {
                    required: false,
                    nullable: false,
                    initial: undefined,
                }),
            }),
            actionType: new fields.SchemaField({
                value: new fields.StringField({
                    choices: abilityTypes,
                    required: true,
                    nullable: false,
                    initial: "action",
                }),
            }),
            actions: new fields.SchemaField({
                value: new fields.NumberField({ choices: [1, 2, 3], nullable: true, initial: 1 }),
            }),
            category: new fields.StringField({
                required: true,
                nullable: true,
                choices: categories,
                initial: null,
            }),
            deathNote: new fields.BooleanField({ required: false, nullable: false, initial: undefined }),
            frequency: new FrequencyField(),
            selfEffect: new fields.SchemaField(
                {
                    uuid: new fields.DocumentUUIDField({ required: true, nullable: false, initial: undefined }),
                    name: new fields.StringField({ required: true, nullable: false, initial: undefined }),
                },
                { required: false, nullable: true, initial: undefined },
            ),
        };
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        this.deathNote ??= false;

        // Initialize frequency uses if not set
        this.frequency ??= null;
        if (this.parent.actor && this.frequency) {
            this.frequency.value ??= this.frequency.max;
        }

        // Self effects are only usable with actions
        this.selfEffect ??= null;
        if (this.actionType.value === "passive") {
            this.selfEffect = null;
        }

        this.traits.toggles ??= new AbilityTraitToggles(this.traits.toggles ?? {}, { parent: this });
    }

    override prepareDerivedData(): void {
        this.traits.toggles.prepareData();
    }
}

interface AbilitySystemData
    extends ItemSystemModel<AbilityItemPF2e, AbilitySystemSchema>,
        Omit<fields.ModelPropsFromSchema<AbilitySystemSchema>, "description"> {}

type AbilitySystemSchema = Omit<ItemSystemSchema, "traits"> & {
    traits: fields.SchemaField<{
        otherTags: fields.ArrayField<SlugField<true, false, false>>;
        value: fields.ArrayField<fields.StringField<AbilityTrait, AbilityTrait, true, false, false>>;
        toggles: fields.EmbeddedDataField<AbilityTraitToggles, false, false, false>;
    }>;
    actionType: fields.SchemaField<{
        value: fields.StringField<ActionType, ActionType, true, false, true>;
    }>;
    actions: fields.SchemaField<{
        value: fields.NumberField<OneToThree, OneToThree, true, true, true>;
    }>;
    category: fields.StringField<ActionCategory, ActionCategory, true, true, true>;
    deathNote: fields.BooleanField<boolean, boolean, false, false, false>;
    frequency: fields.SchemaField<
        FrequencySchema,
        { value: number | undefined; max: number; per: FrequencyInterval },
        { value: number | undefined; max: number; per: FrequencyInterval },
        false,
        true,
        false
    >;
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

type FrequencySchema = {
    value: fields.NumberField<number, number, false, false, false>;
    max: fields.NumberField<number, number, true, false, true>;
    /** Gap between recharges as an ISO8601 duration, or "day" for daily prep. */
    per: fields.StringField<FrequencyInterval, FrequencyInterval, true, false, true>;
};

type AbilitySystemSource = fields.SourceFromSchema<AbilitySystemSchema> & {
    level?: never;
    schema?: ItemSystemSource["schema"];
};

type AbilityTraitsSource = AbilitySystemSource["traits"];

interface AbilityTraits extends AbilityTraitsSource {
    toggles: AbilityTraitToggles;
}

type SelfEffectReferenceSource = NonNullable<AbilitySystemSource["selfEffect"]>;

interface SelfEffectReference extends SelfEffectReferenceSource {
    img?: Maybe<ImageFilePath>;
}

export { AbilitySystemData, FrequencyField };
export type { AbilitySource, AbilitySystemSchema, AbilitySystemSource, SelfEffectReference, SelfEffectReferenceSource };
