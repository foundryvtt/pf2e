import { ActorPF2e } from "@actor";
import { TrickMagicItemPopup } from "@actor/sheet/trick-magic-item-popup.ts";
import { PhysicalItemPF2e, SpellcastingEntryPF2e, SpellPF2e, WeaponPF2e } from "@item";
import { ItemSummaryData } from "@item/base/data/index.ts";
import { TrickMagicItemEntry } from "@item/spellcasting-entry/trick.ts";
import { ValueAndMax } from "@module/data.ts";
import { RuleElementPF2e } from "@module/rules/index.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import { ErrorPF2e } from "@util";
import { ConsumableCategory, ConsumableSource, ConsumableSystemData } from "./data.ts";
import { OtherConsumableTag } from "./types.ts";

class ConsumablePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    get otherTags(): Set<OtherConsumableTag> {
        return new Set(this.system.traits.otherTags);
    }

    get category(): ConsumableCategory {
        return this.system.consumableType.value;
    }

    get isAmmunition(): boolean {
        return this.category === "ammo";
    }

    get uses(): ValueAndMax {
        return {
            value: this.system.charges.value,
            max: this.system.charges.max,
        };
    }

    /** Should this item be automatically destroyed upon use */
    get autoDestroy(): boolean {
        return this.system.autoDestroy.value;
    }

    get embeddedSpell(): SpellPF2e<ActorPF2e> | null {
        if (!this.actor) throw ErrorPF2e(`No owning actor found for "${this.name}" (${this.id})`);
        if (!this.system.spell) return null;

        return new SpellPF2e(deepClone(this.system.spell), {
            parent: this.actor,
            fromConsumable: true,
        }) as SpellPF2e<ActorPF2e>;
    }

    get formula(): string | null {
        return this.system.consume.value.trim() || null;
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        // Refuse to serve rule elements if this item is ammunition and has types that perform writes
        if (!this.isAmmunition) return;
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

    /** Rule elements cannot be executed from consumable items, but they can be used to generate effects */
    override prepareRuleElements(): RuleElementPF2e[] {
        const rules = super.prepareRuleElements();
        for (const rule of rules) {
            rule.ignored = true;
        }

        return rules;
    }

    override async getChatData(
        this: ConsumablePF2e<ActorPF2e>,
        htmlOptions: EnrichmentOptions = {},
        rollOptions: Record<string, unknown> = {},
    ): Promise<ItemSummaryData> {
        const traits = this.traitChatData(CONFIG.PF2E.consumableTraits);
        const [consumableType, isUsable] = this.isIdentified
            ? [game.i18n.localize(CONFIG.PF2E.consumableTypes[this.category]), true]
            : [
                  this.generateUnidentifiedName({ typeOnly: true }),
                  !["other", "scroll", "talisman", "tool", "wand"].includes(this.category),
              ];

        const usesLabel = game.i18n.localize("PF2E.ConsumableChargesLabel");
        const fromFormula = !!rollOptions.fromFormula;

        return this.processChatData(htmlOptions, {
            ...(await super.getChatData()),
            traits,
            properties:
                this.isIdentified && this.uses.max > 1 ? [`${this.uses.value}/${this.uses.max} ${usesLabel}`] : [],
            usesCharges: this.uses.max > 0,
            hasCharges: this.uses.max > 0 && this.uses.value > 0,
            consumableType,
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
                ? CONFIG.PF2E.consumableTypes[this.category]
                : "PF2E.identification.UnidentifiedType.Object",
        );

        if (typeOnly) return itemType;

        return game.i18n.format("PF2E.identification.UnidentifiedItem", { item: itemType });
    }

    override getRollOptions(prefix = this.type): string[] {
        return [
            ...super.getRollOptions(prefix),
            ...Object.entries({
                [`category:${this.category}`]: true,
            })
                .filter(([, isTrue]) => isTrue)
                .map(([key]) => `${prefix}:${key}`),
        ];
    }

    isAmmoFor(weapon: WeaponPF2e): boolean {
        if (!this.isAmmunition) return false;
        if (!(weapon instanceof WeaponPF2e)) {
            console.warn("Cannot load a consumable into a non-weapon");
            return false;
        }

        const { max } = this.uses;
        return weapon.system.traits.value.includes("repeating") ? max > 1 : max <= 1;
    }

    /** Use a consumable item, sending the result to chat */
    async consume(): Promise<void> {
        const { actor } = this;
        if (!actor) return;
        const { value, max } = this.uses;

        if (["scroll", "wand"].includes(this.category) && this.system.spell) {
            if (actor.spellcasting.canCastConsumable(this)) {
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
            const exhausted = max > 1 && value === 1;
            const key = exhausted ? "UseExhausted" : max > 1 ? "UseMulti" : "UseSingle";
            const content = game.i18n.format(`PF2E.ConsumableMessage.${key}`, {
                name: this.name,
                current: value - 1,
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

            if (this.formula) {
                const damageType = this.traits.has("vitality")
                    ? "vitality"
                    : this.traits.has("void")
                    ? "void"
                    : "untyped";
                new DamageRoll(`${this.formula}[${damageType}]`).toMessage({ speaker, flavor: content, flags });
            } else {
                ChatMessage.create({ speaker, content, flags });
            }
        }

        // Optionally destroy the item
        if (this.autoDestroy && value <= 1) {
            const { quantity } = this;

            // Keep ammunition if it has rule elements
            const isPreservedAmmo = this.category === "ammo" && this.system.rules.length > 0;
            if (quantity <= 1 && !isPreservedAmmo) {
                await this.delete();
            } else {
                // Deduct one from quantity if this item has one charge or doesn't have charges
                await this.update({
                    "system.quantity": Math.max(quantity - 1, 0),
                    "system.charges.value": max,
                });
            }
        } else {
            // Deduct one charge
            await this.update({
                "system.charges.value": Math.max(value - 1, 0),
            });
        }
    }

    async castEmbeddedSpell(trickMagicItemData?: TrickMagicItemEntry): Promise<void> {
        const { actor } = this;
        const spell = this.embeddedSpell;
        if (!actor || !spell) return;

        // Find the best spellcasting entry to cast this consumable
        const entry = (() => {
            if (trickMagicItemData) return trickMagicItemData;
            return actor.spellcasting
                .filter(
                    (e): e is SpellcastingEntryPF2e<ActorPF2e> =>
                        e instanceof SpellcastingEntryPF2e && e.canCast(spell, { origin: this }),
                )
                .reduce((previous, current) => {
                    const previousDC = previous.statistic.dc.value;
                    const currentDC = current.statistic.dc.value;
                    return currentDC > previousDC ? current : previous;
                });
        })();

        if (entry) {
            const systemData = spell.system;
            if (entry instanceof SpellcastingEntryPF2e) {
                systemData.location.value = entry.id;
            }

            entry.cast(spell, { consume: false });
        }
    }
}

interface ConsumablePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    readonly _source: ConsumableSource;
    system: ConsumableSystemData;
}

export { ConsumablePF2e };
