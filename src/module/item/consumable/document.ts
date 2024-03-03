import type { ActorPF2e } from "@actor";
import { TrickMagicItemPopup } from "@actor/sheet/trick-magic-item-popup.ts";
import type { SpellPF2e, WeaponPF2e } from "@item";
import { ItemProxyPF2e, PhysicalItemPF2e } from "@item";
import { processSanctification } from "@item/ability/helpers.ts";
import { RawItemChatData } from "@item/base/data/index.ts";
import { TrickMagicItemEntry } from "@item/spellcasting-entry/trick.ts";
import type { SpellcastingEntry } from "@item/spellcasting-entry/types.ts";
import type { ValueAndMax } from "@module/data.ts";
import type { ItemAlterationRuleElement } from "@module/rules/rule-element/item-alteration/index.ts";
import type { UserPF2e } from "@module/user/document.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import { ErrorPF2e, setHasElement } from "@util";
import * as R from "remeda";
import type { ConsumableSource, ConsumableSystemData } from "./data.ts";
import type { ConsumableCategory, ConsumableTrait, OtherConsumableTag } from "./types.ts";
import { DAMAGE_ONLY_CONSUMABLE_CATEGORIES, DAMAGE_OR_HEALING_CONSUMABLE_CATEGORIES } from "./values.ts";

class ConsumablePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    static override get validTraits(): Record<ConsumableTrait, string> {
        return CONFIG.PF2E.consumableTraits;
    }

    get otherTags(): Set<OtherConsumableTag> {
        return new Set(this.system.traits.otherTags);
    }

    get category(): ConsumableCategory {
        return this.system.category;
    }

    get isAmmo(): boolean {
        return this.category === "ammo";
    }

    get uses(): ValueAndMax {
        return R.pick(this.system.uses, ["value", "max"]);
    }

    get embeddedSpell(): SpellPF2e<NonNullable<TParent>> | null {
        if (!this.actor) throw ErrorPF2e(`No owning actor found for "${this.name}" (${this.id})`);
        if (!this.system.spell) return null;

        const context = { parent: this.actor, parentItem: this };
        const spell = new ItemProxyPF2e(fu.deepClone(this.system.spell), context) as SpellPF2e<NonNullable<TParent>>;

        const alterations = this.actor.rules.filter((r): r is ItemAlterationRuleElement => r.key === "ItemAlteration");
        for (const alteration of alterations) {
            alteration.applyAlteration({ singleItem: spell });
        }

        processSanctification(spell);

        return spell;
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        this.system.uses.max ||= 1;

        // Refuse to serve rule elements if this item is ammunition and has types that perform writes
        if (!this.isAmmo) return;
        for (const rule of this.system.rules) {
            if (rule.key === "RollOption" && "toggleable" in rule && !!rule.toggleable) {
                console.warn("Toggleable RollOption rule elements may not be added to ammunition");
                this.system.rules = [];
                break;
            } else if (["GrantItem", "ChoiceSet"].includes(String(rule.key))) {
                console.warn(`${rule.key} rule elements may not be added to ammunition`);
                this.system.rules = [];
                break;
            }
        }
    }

    override async getChatData(
        this: ConsumablePF2e<ActorPF2e>,
        htmlOptions: EnrichmentOptions = {},
        rollOptions: Record<string, unknown> = {},
    ): Promise<RawItemChatData> {
        const traits = this.traitChatData(CONFIG.PF2E.consumableTraits);
        const [category, isUsable] = this.isIdentified
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
            isUsable: fromFormula ? false : isUsable,
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
                : ["scroll", "snare", "ammo"].includes(this.category)
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

    isAmmoFor(weapon: WeaponPF2e): boolean {
        if (!this.isAmmo) return false;
        if (!weapon.isOfType("weapon")) {
            console.warn("Cannot load a consumable into a non-weapon");
            return false;
        }

        const { max } = this.uses;
        return weapon.system.traits.value.includes("repeating") ? max > 1 : max <= 1;
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
        } else if (this.category !== "ammo") {
            // Announce consumption of non-ammunition
            const exhausted = uses.max >= thisMany && uses.value === thisMany;
            const key = exhausted && uses.max > 1 ? "UseExhausted" : uses.max > thisMany ? "UseMulti" : "UseSingle";
            const content = game.i18n.format(`PF2E.ConsumableMessage.${key}`, {
                name: this.name,
                current: uses.value - thisMany,
            });
            const flags = {
                pf2e: {
                    origin: {
                        sourceId: this.flags.core?.sourceId,
                        uuid: this.uuid,
                        type: this.type,
                    },
                },
            };
            const speaker = ChatMessage.getSpeaker({ actor });

            if (this.system.damage) {
                const { formula, type, kind } = this.system.damage;
                new DamageRoll(`(${formula})[${type},${kind}]`).toMessage({ speaker, flavor: content, flags });
            } else {
                ChatMessage.create({ speaker, content, flags });
            }
        }

        // Optionally destroy the item
        if (this.system.uses.autoDestroy && uses.value <= thisMany) {
            const quantityRemaining = this.quantity;

            // Keep ammunition if it has rule elements
            const isPreservedAmmo = this.category === "ammo" && this.system.rules.length > 0;
            if (quantityRemaining <= 1 && !isPreservedAmmo) {
                await this.delete();
            } else {
                // Deduct one from quantity if this item has one charge or doesn't have charges
                await this.update({
                    "system.quantity": Math.max(quantityRemaining - 1, 0),
                    "system.uses.value": uses.max,
                });
            }
        } else {
            // Deduct one charge
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
        options: DocumentUpdateContext<TParent>,
        user: UserPF2e,
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
                changed.system.uses.value = Math.clamped(
                    Math.floor(Number(changed.system.uses.value)) || minimum,
                    minimum,
                    9999,
                );
            }

            if ("max" in changed.system.uses) {
                changed.system.uses.max = Math.clamped(Math.floor(Number(changed.system.uses.max)) || 1, 1, 9999);
            }

            if (typeof changed.system.uses.value === "number" && typeof changed.system.uses.max === "number") {
                changed.system.uses.value = Math.min(changed.system.uses.value, changed.system.uses.max);
            }
        }

        if (changed.system.price?.per !== undefined) {
            changed.system.price.per = Math.clamped(Math.floor(Number(changed.system.price.per)) || 1, 1, 999);
        }

        return super._preUpdate(changed, options, user);
    }
}

interface ConsumablePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    readonly _source: ConsumableSource;
    system: ConsumableSystemData;
}

export { ConsumablePF2e };
