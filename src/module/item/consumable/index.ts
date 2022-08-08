import { TrickMagicItemPopup } from "@actor/sheet/trick-magic-item-popup";
import { ItemPF2e, PhysicalItemPF2e, SpellcastingEntryPF2e, SpellPF2e, WeaponPF2e } from "@item";
import { ItemSummaryData } from "@item/data";
import { TrickMagicItemEntry } from "@item/spellcasting-entry/trick";
import { ValueAndMax } from "@module/data";
import { LocalizePF2e } from "@module/system/localize";
import { ErrorPF2e } from "@util";
import { ConsumableData, ConsumableType } from "./data";
import { createConsumableFromSpell } from "./spell-consumables";
import { SpellSource } from "@item/data";

class ConsumablePF2e extends PhysicalItemPF2e {
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

    get embeddedSpell(): Promise<Embedded<SpellPF2e> | null> {
        if (!this.actor) throw ErrorPF2e(`No owning actor found for "${this.name}" (${this.id})`);
        const type = this.system.consumableType.value;
        return (async () => {
            if (!(type === "scroll" || type === "wand")) return null;

            // Get spell for old items with embedded data
            if (this.system.spell.data) {
                return this.getSpellFromData(deepClone(this.system.spell.data), type);
            }

            const { heightenedLevel, uuid } = this.system.spell;
            if (uuid && heightenedLevel) {
                const spell = await fromUuid<SpellPF2e>(uuid);
                if (spell) {
                    const source = spell.toObject();
                    source.system.location.heightenedLevel = heightenedLevel;
                    source.flags = mergeObject(source.flags, {
                        pf2e: { consumableData: { uuid: this.uuid, spellUuid: uuid, type } },
                    });

                    const embeddedSpell = new SpellPF2e(source, {
                        parent: this.actor,
                    }) as Embedded<SpellPF2e>;
                    const entry = this.getSpellCastingEntry(embeddedSpell);
                    if (entry) {
                        embeddedSpell.system.location.value = entry.id;
                    }
                    return embeddedSpell;
                }
                throw ErrorPF2e(`Could not find Spell with UUID "${uuid}"!`);
            }
            return null;
        })();
    }

    /** For backwards compatibility */
    private getSpellFromData(spellData: SpellSource, type: "wand" | "scroll"): Embedded<SpellPF2e> {
        console.warn(
            `The consumable item "${this.name}" [${this.uuid}] uses the old consumable data format and will stop working in a future system version.`
        );
        const heightenedLevel = this.system.spell.heightenedLevel;
        if (heightenedLevel) {
            spellData.system.location.heightenedLevel = heightenedLevel;
        }
        const sourceId = spellData.flags.core?.sourceId;
        spellData.flags = mergeObject(spellData.flags, {
            pf2e: { consumableData: { uuid: this.uuid, spellUuid: sourceId, type, fromData: true } },
        });

        const spell = new SpellPF2e(spellData, {
            parent: this.actor,
        }) as Embedded<SpellPF2e>;
        const entry = this.getSpellCastingEntry(spell);
        if (entry) {
            spell.system.location.value = entry.id;
        }
        return spell;
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
        const spell = await this.embeddedSpell;

        if (["scroll", "wand"].includes(this.system.consumableType.value) && this.system.spell) {
            if (this.actor.spellcasting.canCastConsumable(this)) {
                this.castEmbeddedSpell();
            } else if (this.actor.itemTypes.feat.some((feat) => feat.slug === "trick-magic-item")) {
                new TrickMagicItemPopup(this, spell);
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

    /** Try to retrieve a spell from a consumable item that was referenced in a chat message
     * @param chatMessage The chat message where the consumable item was referenced.
     * @param original Return the original spell instead of a variant. Defaults to `false`.
     */
    static async spellFromChatMessage(message: ChatMessagePF2e, original = false): Promise<Embedded<SpellPF2e> | null> {
        const { consumableUuid, consumableType, spellUuid, data, castLevel, originalOwner, trickMagicItemSkill } =
            message.flags.pf2e.consumableData ?? {};
        const overlayIds = message.flags.pf2e.spellVariant?.overlayIds;

        const spellFromTempConsumable = async (spell: SpellPF2e, spellSource?: SpellSource) => {
            if (originalOwner && consumableType) {
                const parent = game.actors.get(originalOwner);
                if (parent) {
                    const source = await createConsumableFromSpell(consumableType, spell, castLevel);
                    if (data) {
                        source.system.spell.data = spellSource;
                    }
                    const tempConsumable = new ConsumablePF2e(source, { parent });
                    const embeddedSpell = await tempConsumable.embeddedSpell;
                    if (trickMagicItemSkill && embeddedSpell && parent.isOfType("character")) {
                        embeddedSpell.trickMagicEntry = new TrickMagicItemEntry(parent, trickMagicItemSkill);
                    }
                    if (!original && embeddedSpell && overlayIds) {
                        return embeddedSpell.loadVariant({ overlayIds, castLevel });
                    }
                    return embeddedSpell;
                }
            }
            return null;
        };

        // Old item with embedded data
        if (data) {
            const source: SpellSource = JSON.parse(data);
            return spellFromTempConsumable(new SpellPF2e(source), source);
        }

        // New item with a consumableUuid
        if (consumableUuid) {
            const consumable = fromUuidSync<Embedded<ConsumablePF2e>>(consumableUuid);
            if (consumable) {
                const spell = await consumable.embeddedSpell;
                if (trickMagicItemSkill && spell?.actor.isOfType("character")) {
                    spell.trickMagicEntry = new TrickMagicItemEntry(spell.actor, trickMagicItemSkill);
                }
                if (!original && spell && overlayIds) {
                    const castLevel = spell.system.location.heightenedLevel ?? 1;
                    return spell.loadVariant({ overlayIds, castLevel });
                }
                return spell;
            }

            // The consumable item no longer exists. Try creating a temporary one
            if (spellUuid && consumableType) {
                // This covers both world and compendium items
                const spell = await fromUuid<SpellPF2e>(spellUuid);
                if (spell) {
                    return spellFromTempConsumable(spell);
                }
                console.warn(`The spell with UUID [${spellUuid}] could not be retrieved. Maybe it was deleted?`);
            }
        }
        return null;
    }

    private getSpellCastingEntry(
        spell: Embedded<SpellPF2e>,
        trickMagicItemData?: TrickMagicItemEntry
    ): SpellcastingEntryPF2e | TrickMagicItemEntry | null {
        const actor = this.actor;
        if (!spell || !actor) return null;

        // Filter to only spellcasting entries that are eligible to cast this consumable
        const entry = (() => {
            if (trickMagicItemData) return trickMagicItemData;

            const spellcastingEntries = actor.spellcasting.spellcastingFeatures.filter((entry) =>
                entry.canCastSpell(spell)
            );

            let maxBonus = 0;
            let bestEntry = 0;
            for (let i = 0; i < spellcastingEntries.length; i++) {
                if (spellcastingEntries[i].system.spelldc.value > maxBonus) {
                    maxBonus = spellcastingEntries[i].system.spelldc.value;
                    bestEntry = i;
                }
            }

            return spellcastingEntries[bestEntry];
        })();

        return entry ? entry : null;
    }

    async castEmbeddedSpell(
        this: Embedded<ConsumablePF2e>,
        spell?: Embedded<SpellPF2e>,
        trickMagicItemData?: TrickMagicItemEntry
    ): Promise<void> {
        if (!spell) {
            const embedded = await this.embeddedSpell;
            if (!embedded) return;
            spell = embedded;
        }
        const entry = (() => {
            if (trickMagicItemData) {
                return trickMagicItemData;
            }
            if (spell.system.location.value) {
                return spell.actor.spellcasting.get(spell.system.location.value);
            }
            return;
        })();

        if (entry) {
            entry.cast(spell, { consume: false });
        }
    }
}

interface ConsumablePF2e {
    readonly data: ConsumableData;
}

export { ConsumablePF2e };
