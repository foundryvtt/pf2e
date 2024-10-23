import { ItemSystemModel, ItemSystemSchema } from "@item/base/data/schema.ts";
import type { ActionType, BaseItemSourcePF2e, FrequencyInterval, ItemSystemSource } from "@item/base/data/system.ts";
import type { OneToThree } from "@module/data.ts";
import { LaxArrayField, SlugField } from "@system/schema-data-fields.ts";
import type { ModelPropFromDataField } from "types/foundry/common/data/fields.d.ts";
import type { AbilityItemPF2e } from "./document.ts";
import { AbilityTraitToggles } from "./trait-toggles.ts";
import type { AbilityTrait, ActionCategory } from "./types.ts";
import fields = foundry.data.fields;

type AbilitySource = BaseItemSourcePF2e<"action", AbilitySystemSource>;

class AbilitySystemData extends ItemSystemModel<AbilityItemPF2e, AbilitySystemSchema> {
    static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "PF2E.Item.Ability"];

    declare traits: AbilityTraits;

    declare frequency: FrequencyData | null;

    declare selfEffect: SelfEffectReference | null;

    declare deathNote: boolean;

    static override defineSchema(): AbilitySystemSchema {
        const fields = foundry.data.fields;
        const traitChoices: Record<AbilityTrait, string> = CONFIG.PF2E.actionTraits;
        const abilityTypes: Record<ActionType, string> = CONFIG.PF2E.actionTypes;
        const categories: Record<ActionCategory, string> = CONFIG.PF2E.actionCategories;
        const frequencies: Record<FrequencyInterval, string> = CONFIG.PF2E.frequencies;

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
                toggles: new fields.SchemaField(
                    {
                        mindshift: new fields.SchemaField(
                            { selected: new fields.BooleanField() },
                            { required: false, nullable: true, initial: undefined },
                        ),
                    },
                    { required: false, nullable: false, initial: undefined },
                ),
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
            frequency: new fields.SchemaField(
                {
                    value: new fields.NumberField({
                        required: true,
                        nullable: false,
                        integer: true,
                        min: 0,
                        initial: 1,
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
            ),
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
        this.traits.toggles = new AbilityTraitToggles(this.parent);
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
    }
}

interface AbilitySystemData
    extends ItemSystemModel<AbilityItemPF2e, AbilitySystemSchema>,
        Omit<ModelPropsFromSchema<AbilitySystemSchema>, "description"> {}

type AbilitySystemSchema = Omit<ItemSystemSchema, "traits"> & {
    traits: fields.SchemaField<{
        otherTags: fields.ArrayField<SlugField<true, false, false>, string[], string[], true, false, true>;
        value: fields.ArrayField<
            fields.StringField<AbilityTrait, AbilityTrait, true, false, false>,
            AbilityTrait[],
            AbilityTrait[],
            true,
            false,
            true
        >;
        toggles: fields.SchemaField<
            {
                mindshift: fields.SchemaField<
                    { selected: fields.BooleanField },
                    { selected: boolean },
                    { selected: boolean },
                    false,
                    true,
                    false
                >;
            },
            { mindshift: { selected: boolean } | null | undefined },
            { mindshift: { selected: boolean } | null },
            false,
            false,
            false
        >;
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
        {
            value: fields.NumberField<number, number, true, false, true>;
            max: fields.NumberField<number, number, true, false, true>;
            /** Gap between recharges as an ISO8601 duration, or "day" for daily prep. */
            per: fields.StringField<FrequencyInterval, FrequencyInterval, true, false, true>;
        },
        { value: number; max: number; per: FrequencyInterval },
        { value: number; max: number; per: FrequencyInterval },
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

type AbilitySystemSource = SourceFromSchema<AbilitySystemSchema> & {
    level?: never;
    schema?: ItemSystemSource["schema"];
};

type FrequencyData = NonNullable<ModelPropFromDataField<AbilitySystemSchema["frequency"]>>;

type AbilityTraitsSource = AbilitySystemSource["traits"];

interface AbilityTraits extends AbilityTraitsSource {
    toggles: AbilityTraitToggles;
}

type SelfEffectReferenceSource = NonNullable<AbilitySystemSource["selfEffect"]>;

interface SelfEffectReference extends SelfEffectReferenceSource {
    img?: Maybe<ImageFilePath>;
}

export { AbilitySystemData };
export type { AbilitySource, AbilitySystemSchema, AbilitySystemSource, SelfEffectReference, SelfEffectReferenceSource };
