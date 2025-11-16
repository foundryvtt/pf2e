import type { ModelPropsFromSchema, SourceFromSchema } from "@common/data/fields.mjs";
import type { MeleePF2e } from "@item";
import { ItemSystemModel, ItemSystemSchema } from "@item/base/data/model.ts";
import type {
    BaseItemSourcePF2e,
    ItemFlagsPF2e,
    ItemSystemSource,
    ItemTraitsNoRarity,
} from "@item/base/data/system.ts";
import type { EffectAreaShape } from "@item/types.ts";
import { EFFECT_AREA_SHAPES } from "@item/values.ts";
import type { WeaponMaterialData } from "@item/weapon/data.ts";
import type { WeaponPropertyRuneType } from "@item/weapon/types.ts";
import { getLegacyRangeData } from "@module/migration/migrations/949-npc-range-data.ts";
import { damageCategoriesUnique } from "@scripts/config/damage.ts";
import type { DamageCategoryUnique, DamageType } from "@system/damage/types.ts";
import { LaxArrayField, RecordField, SlugField } from "@system/schema-data-fields.ts";
import * as R from "remeda";
import type { NPCAttackActionType, NPCAttackTrait } from "./types.ts";
import { NPC_ATTACK_ACTIONS } from "./values.ts";
import fields = foundry.data.fields;

type MeleeSource = BaseItemSourcePF2e<"melee", MeleeSystemSource> & {
    flags: DeepPartial<MeleeFlags>;
};

type MeleeFlags = ItemFlagsPF2e & {
    pf2e: {
        linkedWeapon?: string;
    };
};

class MeleeSystemData extends ItemSystemModel<MeleePF2e, NPCAttackSystemSchema> {
    static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "PF2E.Item.NPCAttack"];

    declare material: WeaponMaterialData;

    /** Weapon property runes (or rather the effects thereof) added via rule element */
    declare runes: { property: WeaponPropertyRuneType[] };

    static override defineSchema(): NPCAttackSystemSchema {
        const traitChoices: Record<NPCAttackTrait, string> = CONFIG.PF2E.npcAttackTraits;

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
            }),
            action: new fields.StringField({
                choices: NPC_ATTACK_ACTIONS,
                required: true,
                nullable: false,
                initial: "strike",
            }),
            area: new fields.SchemaField(
                {
                    type: new fields.StringField({
                        choices: EFFECT_AREA_SHAPES,
                        required: true,
                        nullable: false,
                        initial: "burst",
                    }),
                    value: new fields.NumberField({
                        min: 5,
                        max: 50,
                        step: 5,
                        required: true,
                        nullable: false,
                        initial: 5,
                    }),
                },
                { required: true, nullable: true, initial: null },
            ),
            damageRolls: new RecordField(
                new fields.StringField({ required: true, nullable: false, blank: false, initial: undefined }),
                new fields.SchemaField({
                    damage: new fields.StringField({
                        required: true,
                        nullable: false,
                        blank: false,
                        initial: undefined,
                    }),
                    damageType: new fields.StringField({
                        required: true,
                        nullable: false,
                        initial: "bludgeoning",
                        choices: CONFIG.PF2E.damageTypes,
                    }),
                    category: new fields.StringField({
                        required: true,
                        nullable: true,
                        initial: null,
                        choices: damageCategoriesUnique,
                    }),
                }),
            ),
            bonus: new fields.SchemaField({
                value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
            }),
            attackEffects: new fields.SchemaField({
                value: new fields.ArrayField(
                    new fields.StringField({ required: true, nullable: false, blank: false, initial: undefined }),
                ),
            }),
            range: new fields.SchemaField(
                {
                    increment: new fields.NumberField({
                        required: true,
                        integer: true,
                        min: 5,
                        step: 5,
                        max: 500,
                        nullable: true,
                        initial: null,
                    }),
                    max: new fields.NumberField({
                        required: true,
                        integer: true,
                        min: 5,
                        step: 5,
                        max: 500,
                        nullable: true,
                        initial: null,
                    }),
                },
                { required: true, nullable: true, initial: null },
            ),
        };
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        if (this.action !== "strike") this.area ??= { type: "burst", value: 5 };

        // Set precious material (currently unused)
        this.material = { type: null, grade: null, effects: [] };

        // Set empty property runes array for use by rule elements
        this.runes = { property: [] };

        for (const attackDamage of Object.values(this.damageRolls)) {
            if (attackDamage.damageType === "bleed") attackDamage.category = "persistent";
        }
    }

    static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
        const migrated = super.migrateData(source);
        if (!R.isPlainObject(migrated.traits) || !Array.isArray(migrated.traits.value)) return migrated;
        const rangeData = getLegacyRangeData(migrated.traits.value);
        if (rangeData) {
            migrated.range ??= { increment: rangeData.increment, max: rangeData.max };
            migrated.traits.value = migrated.traits.value.filter((t) => !/^(?:range-increment|range)-\d+$/.test(t));
        }
        return migrated;
    }
}

interface MeleeSystemData
    extends ItemSystemModel<MeleePF2e, NPCAttackSystemSchema>,
        Omit<fields.ModelPropsFromSchema<NPCAttackSystemSchema>, "description"> {
    traits: NPCAttackTraits;
}

type NPCAttackSystemSchema = Omit<ItemSystemSchema, "traits"> & {
    traits: fields.SchemaField<{
        otherTags: fields.ArrayField<SlugField<true, false, false>, string[], string[], true, false, true>;
        value: fields.ArrayField<
            fields.StringField<NPCAttackTrait, NPCAttackTrait, true, false, false>,
            NPCAttackTrait[],
            NPCAttackTrait[],
            true,
            false,
            true
        >;
    }>;
    action: fields.StringField<NPCAttackActionType, NPCAttackActionType, true, false, true>;
    area: fields.SchemaField<
        EffectAreaSchema,
        SourceFromSchema<EffectAreaSchema>,
        ModelPropsFromSchema<EffectAreaSchema>,
        true,
        true,
        true
    >;
    damageRolls: RecordField<
        fields.StringField<string, string, true, false, false>,
        fields.SchemaField<{
            damage: fields.StringField<string, string, true, false, false>;
            damageType: fields.StringField<DamageType, DamageType, true, false, true>;
            category: fields.StringField<DamageCategoryUnique, DamageCategoryUnique, true, true, true>;
        }>,
        true,
        false,
        true,
        true
    >;
    /** The base attack modifier for this attack  */
    bonus: fields.SchemaField<{
        value: fields.NumberField<number, number, true, false, true>;
    }>;
    attackEffects: fields.SchemaField<{
        value: fields.ArrayField<fields.StringField<string, string, true, false, false>>;
    }>;
    range: fields.SchemaField<
        {
            increment: fields.NumberField<number, number, true, true, true>;
            max: fields.NumberField<number, number, true, true, true>;
        },
        { increment: number | null; max: number | null },
        { increment: number | null; max: number | null },
        true,
        true,
        true
    >;
};

type EffectAreaSchema = {
    type: fields.StringField<EffectAreaShape, EffectAreaShape, true, false, true>;
    value: fields.NumberField<number, number, true, false, true>;
};

type MeleeSystemSource = fields.SourceFromSchema<NPCAttackSystemSchema> & {
    level?: never;
    schema?: ItemSystemSource["schema"];
};

type NPCAttackDamage = fields.SourceFromSchema<NPCAttackSystemSchema>["damageRolls"]["string"];
type NPCAttackTraits = ItemTraitsNoRarity<NPCAttackTrait>;

export { MeleeSystemData };
export type { MeleeFlags, MeleeSource, MeleeSystemSource, NPCAttackDamage, NPCAttackTraits };
