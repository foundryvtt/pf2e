import { LocalizePF2e } from "@module/system/localize";
import { ConsumableData, ConsumableType } from "./data";
import { ItemPF2e, PhysicalItemPF2e, SpellcastingEntryPF2e, SpellPF2e, WeaponPF2e } from "@item";
import { ErrorPF2e } from "@util";
import { ChatMessagePF2e } from "@module/chat-message";
import { TrickMagicItemPopup } from "@actor/sheet/trick-magic-item-popup";
import { TrickMagicItemEntry } from "@item/spellcasting-entry/trick";

class ConsumablePF2e extends PhysicalItemPF2e {
    get consumableType(): ConsumableType {
        return this.data.data.consumableType.value;
    }

    get isAmmunition(): boolean {
        return this.consumableType === "ammo";
    }

    get charges() {
        return {
            current: this.data.data.charges.value,
            max: this.data.data.charges.max,
        };
    }

    /** Should this item be automatically destroyed upon use */
    get autoDestroy(): boolean {
        return this.data.data.autoDestroy.value;
    }

    get embeddedSpell(): Embedded<SpellPF2e> | null {
        const spellData = deepClone(this.data.data.spell.data);

        if (!spellData) return null;
        if (!this.actor) throw ErrorPF2e(`No owning actor found for "${this.name}" (${this.id})`);

        const heightenedLevel = this.data.data.spell.heightenedLevel;
        if (typeof heightenedLevel === "number") {
            spellData.data.location.heightenedLevel = heightenedLevel;
        }

        return new SpellPF2e(spellData, {
            parent: this.actor,
            fromConsumable: true,
        }) as Embedded<SpellPF2e>;
    }

    override getChatData(this: Embedded<ConsumablePF2e>, htmlOptions: EnrichHTMLOptions = {}): Record<string, unknown> {
        const data = this.data.data;
        const translations = LocalizePF2e.translations.PF2E;
        const traits = this.traitChatData(CONFIG.PF2E.consumableTraits);
        const [consumableType, isUsable] = this.isIdentified
            ? [game.i18n.localize(this.consumableType), true]
            : [
                  this.generateUnidentifiedName({ typeOnly: true }),
                  !["other", "scroll", "talisman", "tool", "wand"].includes(this.consumableType),
              ];

        return this.processChatData(htmlOptions, {
            ...data,
            traits,
            properties:
                this.isIdentified && this.charges.max > 0
                    ? [`${data.charges.value}/${data.charges.max} ${translations.ConsumableChargesLabel}`]
                    : [],
            usesCharges: this.charges.max > 0,
            hasCharges: this.charges.max > 0 && this.charges.current > 0,
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

        const { max } = this.charges;
        return weapon.traits.has("repeating") ? max > 1 : max <= 1;
    }

    /** Use a consumable item, sending the result to chat */
    async consume(this: Embedded<ConsumablePF2e>): Promise<void> {
        const { current, max } = this.charges;

        if (["scroll", "wand"].includes(this.data.data.consumableType.value) && this.data.data.spell.data) {
            if (this.actor.spellcasting.canCastConsumable(this)) {
                this.castEmbeddedSpell();
            } else if (this.actor.itemTypes.feat.some((feat) => feat.slug === "trick-magic-item")) {
                new TrickMagicItemPopup(this);
            } else {
                const content = game.i18n.format("PF2E.LackCastConsumableCapability", { name: this.name });
                await ChatMessagePF2e.create({
                    user: game.user.id,
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    whisper: ChatMessage.getWhisperRecipients(this.actor.name).map((user) => user.id),
                    content,
                });
            }
        } else {
            const exhausted = max > 1 && current === 1;
            const key = exhausted ? "UseExhausted" : max > 1 ? "UseMulti" : "UseSingle";
            const content = game.i18n.format(`PF2E.ConsumableMessage.${key}`, {
                name: this.name,
                current: current - 1,
            });

            // If using this consumable creates a roll, we need to show it
            const formula = this.data.data.consume.value;
            if (formula) {
                new Roll(formula).toMessage({
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    flavor: content,
                });
            } else if (this.consumableType !== "ammo") {
                ChatMessage.create({
                    user: game.user.id,
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    content,
                });
            }
        }

        const quantity = this.quantity;

        // Optionally destroy the item
        if (this.autoDestroy && current <= 1) {
            if (quantity <= 1) {
                await this.delete();
            } else {
                // Deduct one from quantity if this item has one charge or doesn't have charges
                await this.update({
                    "data.quantity": Math.max(quantity - 1, 0),
                    "data.charges.value": max,
                });
            }
        } else {
            // Deduct one charge
            await this.update({
                "data.charges.value": Math.max(current - 1, 0),
            });
        }
    }

    async castEmbeddedSpell(this: Embedded<ConsumablePF2e>, trickMagicItemData?: TrickMagicItemEntry): Promise<void> {
        const spell = this.embeddedSpell;
        if (!spell) return;
        const actor = this.actor;

        // Filter to only spellcasting entries that are eligible to cast this consumable
        const entry = (() => {
            if (trickMagicItemData) return trickMagicItemData;

            const spellcastingEntries = actor.spellcasting.spellcastingFeatures.filter((entry) =>
                spell.traditions.has(entry.tradition)
            );

            let maxBonus = 0;
            let bestEntry = 0;
            for (let i = 0; i < spellcastingEntries.length; i++) {
                if (spellcastingEntries[i].data.data.spelldc.value > maxBonus) {
                    maxBonus = spellcastingEntries[i].data.data.spelldc.value;
                    bestEntry = i;
                }
            }

            return spellcastingEntries[bestEntry];
        })();

        if (entry) {
            const systemData = spell.data.data;
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
