import type { ActorPF2e } from "@actor";
import { TrickMagicItemPopup } from "@actor/sheet/trick-magic-item-popup.ts";
import type { DatabaseUpdateCallbackOptions } from "@common/abstract/_types.d.mts";
import type { SpellPF2e } from "@item";
import { ItemProxyPF2e, PhysicalItemPF2e } from "@item";
import { RawItemChatData } from "@item/base/data/index.ts";
import { performLatePreparation } from "@item/helpers.ts";
import { TrickMagicItemEntry } from "@item/spellcasting-entry/trick.ts";
import type { SpellcastingEntry } from "@item/spellcasting-entry/types.ts";
import type { ValueAndMax } from "@module/data.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import type { EnrichmentOptionsPF2e } from "@system/text-editor.ts";
import { ErrorPF2e, setHasElement } from "@util";
import * as R from "remeda";
import type { ConsumableSource, ConsumableSystemData } from "./data.ts";
import { type ConsumableCategory, type ConsumableTrait, type OtherConsumableTag } from "./types.ts";
import { DAMAGE_ONLY_CONSUMABLE_CATEGORIES, DAMAGE_OR_HEALING_CONSUMABLE_CATEGORIES } from "./values.ts";

class ConsumablePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    /** A cached copy of embeddedSpell, lazily regenerated every data preparation cycle */
    declare private _embeddedSpell: SpellPF2e<NonNullable<TParent>> | null | undefined;

    static override get validTraits(): Record<ConsumableTrait, string> {
        return CONFIG.PF2E.consumableTraits;
    }

    get otherTags(): Set<OtherConsumableTag> {
        return new Set(this.system.traits.otherTags);
    }

    get category(): ConsumableCategory {
        return this.system.category;
    }

    get uses(): ValueAndMax {
        return R.pick(this.system.uses, ["value", "max"]);
    }

    get embeddedSpell(): SpellPF2e<NonNullable<TParent>> | null {
        if (!this.actor) throw ErrorPF2e(`No owning actor found for "${this.name}" (${this.id})`);
        if (this._embeddedSpell !== undefined) {
            return this._embeddedSpell;
        }
        if (!this.system.spell) {
            this._embeddedSpell = null;
            return null;
        }

        try {
            const spellSource = fu.mergeObject(
                this.system.spell,
                { "system.location.value": null },
                { inplace: false },
            );
            const context = { parent: this.actor, parentItem: this };
            const spell = new ItemProxyPF2e(spellSource, context) as SpellPF2e<NonNullable<TParent>>;
            performLatePreparation(spell);
            this._embeddedSpell = spell;
            return spell;
        } catch (ex) {
            this._embeddedSpell = null;
            console.error(ex);
            return null;
        }
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        this._embeddedSpell = undefined;
        this.system.uses.max ||= 1;
    }

    override async getChatData(
        this: ConsumablePF2e<ActorPF2e>,
        htmlOptions: EnrichmentOptionsPF2e = {},
        rollOptions: Record<string, unknown> = {},
    ): Promise<RawItemChatData> {
        const traits = this.traitChatData(CONFIG.PF2E.consumableTraits);
        const [category, isUsableItemType] = this.isIdentified
            ? [game.i18n.localize(CONFIG.PF2E.consumableCategories[this.category]), true]
            : [
                  this.generateUnidentifiedName({ typeOnly: true }),
                  !["other", "scroll", "talisman", "toolkit", "wand"].includes(this.category),
              ];

        const usesLabel = game.i18n.localize("PF2E.Item.Consumable.Uses.Label");
        const fromFormula = !!rollOptions.fromFormula;

        return this.processChatData(htmlOptions, {
            ...(await super.getChatData()),
            traits,
            properties:
                this.isIdentified && this.uses.max > 1 ? [`${this.uses.value}/${this.uses.max} ${usesLabel}`] : [],
            category,
            isUsable: isUsableItemType && !fromFormula && this.parent && this.parent.items.get(this.id),
        });
    }

    override generateUnidentifiedName({ typeOnly = false }: { typeOnly?: boolean } = { typeOnly: false }): string {
        const liquidOrSubstance = () =>
            this.traits.has("inhaled") || this.traits.has("contact")
                ? "PF2E.identification.UnidentifiedType.Substance"
                : "PF2E.identification.UnidentifiedType.Liquid";
        const itemType = game.i18n.localize(
            ["drug", "elixir", "mutagen", "oil", "poison", "potion"].includes(this.category)
                ? liquidOrSubstance()
                : ["scroll", "snare"].includes(this.category)
                  ? CONFIG.PF2E.consumableCategories[this.category]
                  : "PF2E.identification.UnidentifiedType.Object",
        );

        if (typeOnly) return itemType;

        return game.i18n.format("PF2E.identification.UnidentifiedItem", { item: itemType });
    }

    override getRollOptions(prefix = this.type, options?: { includeGranter?: boolean }): string[] {
        return [
            ...super.getRollOptions(prefix, options),
            ...Object.entries({
                [`category:${this.category}`]: true,
            })
                .filter(([, isTrue]) => isTrue)
                .map(([key]) => `${prefix}:${key}`),
        ];
    }

    /** Use a consumable item, sending the result to chat */
    async consume(thisMany = 1): Promise<void> {
        const actor = this.actor;
        if (!actor) return;
        const uses = this.uses;

        if (["scroll", "wand"].includes(this.category) && this.system.spell) {
            if (actor.spellcasting?.canCastConsumable(this)) {
                this.castEmbeddedSpell();
            } else if (actor.itemTypes.feat.some((feat) => feat.slug === "trick-magic-item")) {
                new TrickMagicItemPopup(this);
            } else {
                const formatParams = { actor: actor.name, spell: this.name };
                const message = game.i18n.format("PF2E.LackCastConsumableCapability", formatParams);
                ui.notifications.warn(message);
                return;
            }
        } else {
            // Announce consumption of other types
            const exhausted = uses.max >= thisMany && uses.value === thisMany;
            const key = exhausted && uses.max > 1 ? "UseExhausted" : uses.max > thisMany ? "UseMulti" : "UseSingle";
            const content = game.i18n.format(`PF2E.ConsumableMessage.${key}`, {
                name: this.name,
                current: uses.value - thisMany,
            });
            const flags = {
                pf2e: {
                    origin: {
                        sourceId: this.sourceId,
                        uuid: this.uuid,
                        type: this.type,
                    },
                },
            };
            const speaker = ChatMessage.getSpeaker({ actor });

            if (this.system.damage) {
                const { formula, type, kind } = this.system.damage;
                new DamageRoll(`(${formula})[${type},${kind}]`, this.getRollData()).toMessage({
                    speaker,
                    flavor: content,
                    flags,
                });
            } else {
                ChatMessage.create({ speaker, content, flags });
            }
        }

        // Optionally destroy the item or deduct charges or quantity
        if (this.system.uses.autoDestroy && uses.value <= thisMany) {
            const newQuantity = Math.max(this.quantity - (uses.max > 1 ? 1 : thisMany), 0);
            if (newQuantity <= 0) {
                await this.delete();
            } else {
                await this.update({
                    "system.quantity": newQuantity,
                    "system.uses.value": uses.max,
                });
            }
        } else {
            await this.update({
                "system.uses.value": Math.max(uses.value - thisMany, 0),
            });
        }
    }

    async castEmbeddedSpell(trickMagicItemData?: TrickMagicItemEntry): Promise<void> {
        const actor = this.actor;
        const spell = this.embeddedSpell;
        if (!actor || !spell) return;

        // Find the best spellcasting entry to cast this consumable
        const entry = ((): SpellcastingEntry<ActorPF2e> | null => {
            if (trickMagicItemData) return trickMagicItemData;
            type SpellcastingAbility = SpellcastingEntry<ActorPF2e>;

            return (
                actor.spellcasting
                    ?.filter((e): e is SpellcastingAbility => !!e.statistic && e.canCast(spell, { origin: this }))
                    .reduce((best, e) => (e.statistic.dc.value > best.statistic.dc.value ? e : best)) ?? null
            );
        })();

        return entry?.cast(spell, { consume: false });
    }

    protected override _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        if (!changed.system) return super._preUpdate(changed, options, user);

        if (typeof changed.system.damage?.type === "string") {
            const category = changed.system.category ?? this.system.category;
            if (!setHasElement(DAMAGE_OR_HEALING_CONSUMABLE_CATEGORIES, category)) {
                changed.system.damage = null;
            } else if (
                setHasElement(DAMAGE_ONLY_CONSUMABLE_CATEGORIES, category) ||
                !["vitality", "void", "untyped"].includes(changed.system.damage.type)
            ) {
                // Ensure kind is still valid after changing damage type
                changed.system.damage.kind = "damage";
            }
        }

        if (changed.system.uses) {
            if ("value" in changed.system.uses) {
                const minimum = this.system.uses.autoDestroy ? 1 : 0;
                changed.system.uses.value = Math.clamp(
                    Math.floor(Number(changed.system.uses.value)) || minimum,
                    minimum,
                    9999,
                );
            }

            if ("max" in changed.system.uses) {
                changed.system.uses.max = Math.clamp(Math.floor(Number(changed.system.uses.max)) || 1, 1, 9999);
            }

            if (typeof changed.system.uses.value === "number" && typeof changed.system.uses.max === "number") {
                changed.system.uses.value = Math.min(changed.system.uses.value, changed.system.uses.max);
            }
        }

        if (changed.system.price?.per !== undefined) {
            changed.system.price.per = Math.clamp(Math.floor(Number(changed.system.price.per)) || 1, 1, 999);
        }

        return super._preUpdate(changed, options, user);
    }
}

interface ConsumablePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    readonly _source: ConsumableSource;
    system: ConsumableSystemData;
}

export { ConsumablePF2e };
