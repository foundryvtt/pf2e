import type { ActorType, CharacterPF2e } from "@actor";
import type { ItemUUID } from "@client/documents/_module.d.mts";
import { ItemPF2e } from "@item";
import { PredicateField } from "@system/schema-data-fields.ts";
import { sluggify } from "@util";
import { RuleElement, RuleElementOptions } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema, RuleElementSource } from "./data.ts";
import fields = foundry.data.fields;

/**
 * @category RuleElement
 */
class CraftingAbilityRuleElement extends RuleElement<CraftingAbilityRuleSchema> {
    protected static override validActorTypes: ActorType[] = ["character"];

    constructor(data: CraftingAbilityRuleSource, options: RuleElementOptions) {
        super({ priority: 19, ...data }, options);

        // Default slug to resource if provided
        if (!this.slug && !this.resource) {
            this.failValidation("Either a resource or a slug is required");
        } else if (this.resource) {
            this.slug ??= this.resource;
        }

        // Max slots acts as a pseudo resource and is incompatible with resource
        if (this.maxSlots && this.resource) {
            this.failValidation("Only one of resource or maxSlots is allowed");
        }

        if (this.isAlchemical || this.isDailyPrep) {
            this.isPrepared = true;
        }
    }

    static override defineSchema(): CraftingAbilityRuleSchema {
        return {
            ...super.defineSchema(),
            resource: new fields.StringField({ required: false, nullable: true, blank: false, initial: null }),
            isAlchemical: new fields.BooleanField(),
            isDailyPrep: new fields.BooleanField(),
            isPrepared: new fields.BooleanField(),
            batchSizes: new fields.SchemaField(
                {
                    default: new fields.NumberField({ required: false, min: 1, max: 99 }),
                    other: new fields.ArrayField(
                        new fields.SchemaField({
                            quantity: new fields.NumberField({
                                required: true,
                                nullable: false,
                                positive: true,
                                integer: true,
                                initial: 2,
                                min: 1,
                                max: 99,
                            }),
                            definition: new PredicateField(),
                        }),
                    ),
                },
                { initial: (d) => ({ default: d.isAlchemical ? 2 : 1, other: [] }) },
            ),
            maxItemLevel: new ResolvableValueField({ required: false, nullable: false }),
            maxSlots: new ResolvableValueField({ required: false, nullable: false }),
            craftableItems: new PredicateField(),
            prepared: new fields.ArrayField(
                new fields.SchemaField(
                    {
                        uuid: new fields.DocumentUUIDField({ required: true, blank: false }),
                        quantity: new fields.NumberField({ required: false, nullable: false, initial: undefined }),
                        expended: new fields.BooleanField({ required: false, initial: undefined }),
                        isSignatureItem: new fields.BooleanField({ required: false, initial: undefined }),
                    },
                    { required: true, nullable: false },
                ),
                { initial: [] },
            ),
        };
    }

    override onApplyActiveEffects(): void {
        if (this.ignored) return;

        const slug = this.resolveInjectedProperties(this.slug);
        const key = sluggify(slug, { camel: "dromedary" });
        const maxSlots = this.maxSlots !== undefined ? Math.floor(Number(this.resolveValue(this.maxSlots))) : null;
        const maxItemLevel = Number(this.resolveValue(this.maxItemLevel));
        const existing = this.actor.system.crafting.entries[key];
        if (existing) {
            // Labels default to item name, don't override if its the default
            if (this.label !== this.item.name) {
                existing.label = this.label;
            }

            // Add craftable items and batch size others. These will eventually be merged
            existing.craftableItems ??= [];
            if (this.craftableItems.length > 0) {
                existing.craftableItems.push({ predicate: this.craftableItems });
            }
            for (const other of this.batchSizes.other) {
                existing.craftableItems.push({ predicate: other.definition, batchSize: other.quantity });
            }

            existing.batchSize = Math.max(existing.batchSize, this.batchSizes?.default || 1);
            existing.maxItemLevel = Math.max(maxItemLevel, existing.maxItemLevel);
            existing.maxSlots =
                (existing.maxSlots ?? maxSlots) === null ? null : Math.max(existing.maxSlots ?? 0, maxSlots ?? 0);
            existing.preparedFormulaData ??= this.prepared;
        } else {
            this.actor.system.crafting.entries[key] = {
                slug,
                resource: this.resource,
                label: this.label,
                isAlchemical: this.isAlchemical,
                isDailyPrep: this.isDailyPrep,
                isPrepared: this.isPrepared,
                batchSize: this.batchSizes.default ?? (this.isAlchemical ? 2 : 1),
                craftableItems: [
                    { predicate: this.craftableItems },
                    ...this.batchSizes.other.map((o) => ({ predicate: o.definition, batchSize: o.quantity })),
                ].filter((i) => i.predicate.length),
                maxItemLevel: maxItemLevel || this.actor.level,
                maxSlots,
                preparedFormulaData: this.prepared,
            };

            // Set a roll option to cue subsequent max-item-level-increasing `ActiveEffectLike`s
            this.actor.rollOptions.all[`crafting:entry:${slug}`] = true;
        }
    }

    /** Attach the crafting ability to the feat or ability if not prepared */
    override afterPrepareData(): void {
        if (this.ignored) return;

        if (!this.isPrepared && this.item.isOfType("feat", "action") && this.item.actionCost) {
            const ability = this.actor.crafting.abilities.get(this.slug);
            if (ability && ability.craftableItems.length) {
                this.item.crafting = ability;
            }
        }
    }
}

interface CraftingAbilityRuleElement
    extends RuleElement<CraftingAbilityRuleSchema>,
        ModelPropsFromRESchema<CraftingAbilityRuleSchema> {
    readonly parent: ItemPF2e<CharacterPF2e>;
    slug: string;

    get actor(): CharacterPF2e;
}

type CraftingAbilityRuleSchema = RuleElementSchema & {
    resource: fields.StringField<string, string, false, true, true>;
    isAlchemical: fields.BooleanField<boolean, boolean, false, false, true>;
    isDailyPrep: fields.BooleanField<boolean, boolean, false, false, true>;
    isPrepared: fields.BooleanField<boolean, boolean, false, false, true>;
    batchSizes: fields.SchemaField<{
        default: fields.NumberField<number, number, false, false, false>;
        other: fields.ArrayField<
            fields.SchemaField<{
                quantity: fields.NumberField<number, number, true, false, true>;
                definition: PredicateField;
            }>
        >;
    }>;
    maxItemLevel: ResolvableValueField<false, false, true>;
    maxSlots: ResolvableValueField<false, false, true>;
    craftableItems: PredicateField;
    prepared: fields.ArrayField<fields.SchemaField<PreparedFormulaSchema>>;
};

type PreparedFormulaSchema = {
    uuid: fields.DocumentUUIDField<ItemUUID, true, false, false>;
    quantity: fields.NumberField<number, number, false, false, false>;
    expended: fields.BooleanField<boolean, boolean, false, false, false>;
    isSignatureItem: fields.BooleanField<boolean, boolean, false, false, false>;
};

type CraftingAbilityRuleData = Omit<fields.SourceFromSchema<CraftingAbilityRuleSchema>, "preparedFormulas"> & {
    prepared: (Partial<fields.SourceFromSchema<PreparedFormulaSchema>> & { uuid: string })[];
};

interface CraftingAbilityRuleSource extends RuleElementSource {
    resource?: unknown;
    batchSizes?: unknown;
    isAlchemical?: unknown;
    isDailyPrep?: unknown;
    isPrepared?: unknown;
    maxItemLevel?: unknown;
    maxSlots?: unknown;
    craftableItems?: unknown;
    prepared?: unknown;
}

export { CraftingAbilityRuleElement };
export type { CraftingAbilityRuleData, CraftingAbilityRuleSource };
