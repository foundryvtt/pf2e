import { TrickMagicItemPopup } from "@actor/sheet/trick-magic-item-popup";
import { ItemPF2e, PhysicalItemPF2e, SpellcastingEntryPF2e, SpellPF2e, WeaponPF2e } from "@item";
import { ItemSummaryData, ItemType } from "@item/data";
import { TrickMagicItemEntry } from "@item/spellcasting-entry/trick";
import { ValueAndMax } from "@module/data";
import { LocalizePF2e } from "@module/system/localize";
import { DamageRoll } from "@system/damage/roll";
import { ErrorPF2e } from "@util";
import { ConsumableData, ConsumableType } from "./data";
import { OtherConsumableTag } from "./types";

class ConsumablePF2e extends PhysicalItemPF2e {
    get otherTags(): Set<OtherConsumableTag> {
        return new Set(this.system.traits.otherTags);
    }

    get consumableType(): ConsumableType {
        return this.system.consumableType.value;
    }

    get isAmmunition(): boolean {
        return this.consumableType === "ammo";
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

    get embeddedSpell(): Embedded<SpellPF2e> | null {
        if (!this.actor) throw ErrorPF2e(`No owning actor found for "${this.name}" (${this.id})`);
        if (!this.system.spell) return null;

        return new SpellPF2e(deepClone(this.system.spell), {
            parent: this.actor,
            fromConsumable: true,
        }) as Embedded<SpellPF2e>;
    }

    override async getChatData(
        this: Embedded<ConsumablePF2e>,
        htmlOptions: EnrichHTMLOptions = {}
    ): Promise<ItemSummaryData> {
        const systemData = this.system;
        const translations = LocalizePF2e.translations.PF2E;
        const traits = this.traitChatData(CONFIG.PF2E.consumableTraits);
        const [consumableType, isUsable] = this.isIdentified
            ? [game.i18n.localize(this.consumableType), true]
            : [
                  this.generateUnidentifiedName({ typeOnly: true }),
                  !["other", "scroll", "talisman", "tool", "wand"].includes(this.consumableType),
              ];

        return this.processChatData(htmlOptions, {
            ...systemData,
            traits,
            properties:
                this.isIdentified && this.uses.max > 0
                    ? [`${systemData.charges.value}/${systemData.charges.max} ${translations.ConsumableChargesLabel}`]
                    : [],
            usesCharges: this.uses.max > 0,
            hasCharges: this.uses.max > 0 && this.uses.value > 0,
            consumableType,
            isUsable,
        });
    }

    override generateUnidentifiedName({ typeOnly = false }: { typeOnly?: boolean } = { typeOnly: false }): string {
        const translations = LocalizePF2e.translations.PF2E.identification;
        const liquidOrSubstance = () =>
            this.traits.has("inhaled") || this.traits.has("contact")
                ? translations.UnidentifiedType.Substance
                : translations.UnidentifiedType.Liquid;
        const itemType = ["drug", "elixir", "mutagen", "oil", "poison", "potion"].includes(this.consumableType)
            ? liquidOrSubstance()
            : ["scroll", "snare", "ammo"].includes(this.consumableType)
            ? game.i18n.localize(CONFIG.PF2E.consumableTypes[this.consumableType])
            : translations.UnidentifiedType.Object;

        if (typeOnly) return itemType;

        const formatString = LocalizePF2e.translations.PF2E.identification.UnidentifiedItem;
        return game.i18n.format(formatString, { item: itemType });
    }

    isAmmoFor(weapon: ItemPF2e): boolean {
        if (!(weapon instanceof WeaponPF2e)) {
            console.warn("Cannot load a consumable into a non-weapon");
            return false;
        }

        const { max } = this.uses;
        return weapon.traits.has("repeating") ? max > 1 : max <= 1;
    }

    /** Use a consumable item, sending the result to chat */
    async consume(this: Embedded<ConsumablePF2e>): Promise<void> {
        const { value, max } = this.uses;

        if (["scroll", "wand"].includes(this.system.consumableType.value) && this.system.spell) {
            if (this.actor.spellcasting.canCastConsumable(this)) {
                this.castEmbeddedSpell();
            } else if (this.actor.itemTypes.feat.some((feat) => feat.slug === "trick-magic-item")) {
                new TrickMagicItemPopup(this);
            } else {
                const formatParams = { actor: this.actor.name, spell: this.name };
                const message = game.i18n.format("PF2E.LackCastConsumableCapability", formatParams);
                ui.notifications.warn(message);
                return;
            }
        } else {
            const exhausted = max > 1 && value === 1;
            const key = exhausted ? "UseExhausted" : max > 1 ? "UseMulti" : "UseSingle";
            const content = game.i18n.format(`PF2E.ConsumableMessage.${key}`, {
                name: this.name,
                current: value - 1,
            });

            // If using this consumable creates a roll, we need to show it
            const formula = this.system.consume.value;
            const flags = {
                pf2e: {
                    origin: {
                        sourceId: this.flags.core?.sourceId,
                        uuid: this.uuid,
                        type: this.type as ItemType,
                    },
                },
            };
            if (formula) {
                const damageType = this.traits.has("positive")
                    ? "positive"
                    : this.traits.has("negative")
                    ? "negative"
                    : "untyped";
                new DamageRoll(`${formula}[${damageType}]`).toMessage({
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    flavor: content,
                    flags,
                });
            } else if (this.consumableType !== "ammo") {
                ChatMessage.create({
                    user: game.user.id,
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    content,
                    flags,
                });
            }
        }

        const quantity = this.quantity;

        // Optionally destroy the item
        if (this.autoDestroy && value <= 1) {
            if (quantity <= 1) {
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

    async castEmbeddedSpell(this: Embedded<ConsumablePF2e>, trickMagicItemData?: TrickMagicItemEntry): Promise<void> {
        const spell = this.embeddedSpell;
        if (!spell) return;
        const actor = this.actor;

        // Find the best spellcasting entry to cast this consumable
        const entry = (() => {
            if (trickMagicItemData) return trickMagicItemData;
            return actor.spellcasting
                .filter((entry) => entry.canCastSpell(spell, { origin: this }))
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

interface ConsumablePF2e {
    readonly data: ConsumableData;
}

export { ConsumablePF2e };
