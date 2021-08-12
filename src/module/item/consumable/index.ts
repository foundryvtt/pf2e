import { LocalizePF2e } from "@module/system/localize";
import { ConsumableData, ConsumableType } from "./data";
import { PhysicalItemPF2e, SpellPF2e } from "@item";
import { TrickMagicItemCastData } from "@item/data";
import { ErrorPF2e, tupleHasValue } from "@module/utils";
import { ChatMessagePF2e } from "@module/chat-message";
import { canCastConsumable } from "./spell-consumables";
import { TrickMagicItemPopup } from "@actor/sheet/trick-magic-item-popup";

export class ConsumablePF2e extends PhysicalItemPF2e {
    static override get schema(): typeof ConsumableData {
        return ConsumableData;
    }

    get consumableType(): ConsumableType {
        return this.data.data.consumableType.value;
    }

    get uses() {
        return {
            value: this.data.data.uses.value,
            max: this.data.data.uses.max,
            per: this.data.data.uses.per,
        };
    }

    /** Should this item be automatically destroyed upon use */
    get autoDestroy(): boolean {
        return this.data.data.uses.autoDestroy;
    }

    get embeddedSpell(): Embedded<SpellPF2e> | null {
        const spellData = deepClone(this.data.data.spell.data);

        if (!spellData) return null;
        if (!this.actor) throw ErrorPF2e(`No owning actor found for "${this.name}" (${this.id})`);

        const heightenedLevel = this.data.data.spell.heightenedLevel;
        if (typeof heightenedLevel === "number") {
            spellData.data.heightenedLevel = { value: heightenedLevel };
        }

        return new SpellPF2e(spellData, { parent: this.actor }) as Embedded<SpellPF2e>;
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

        const charges = this.uses;
        return this.processChatData(htmlOptions, {
            ...data,
            traits,
            properties:
                this.isIdentified && charges.max > 0
                    ? [`${charges.value}/${charges.max} ${translations.ConsumableChargesLabel}`]
                    : [],
            usesCharges: charges.max > 0,
            hasCharges: charges.max > 0 && charges.value > 0,
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

    /** Use a consumable item, sending the result to chat */
    async consume(this: Embedded<ConsumablePF2e>): Promise<void> {
        if (["scroll", "wand"].includes(this.data.data.consumableType.value) && this.data.data.spell.data) {
            if (canCastConsumable(this.actor, this.data)) {
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
            const cv = this.data.data.consume.value;
            const content = `Uses ${this.name}`;
            if (cv) {
                new Roll(cv).toMessage({
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    flavor: content,
                });
            } else {
                ChatMessage.create({
                    user: game.user.id,
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    content,
                });
            }
        }

        const quantity = this.quantity;
        const uses = this.data.data.uses;

        // Optionally destroy the item
        if (this.autoDestroy && uses.value <= 1) {
            if (quantity <= 1) {
                await this.delete();
            } else {
                // Deduct one from quantity if this item has one charge or doesn't have charges
                await this.update({
                    "data.quantity.value": Math.max(quantity - 1, 0),
                    "data.uses.value": uses.max,
                });
            }
        } else {
            // Deduct one charge
            await this.update({
                "data.uses.value": Math.max(uses.value - 1, 0),
            });
        }
    }

    async castEmbeddedSpell(
        this: Embedded<ConsumablePF2e>,
        trickMagicItemData?: TrickMagicItemCastData
    ): Promise<void> {
        const spell = this.embeddedSpell;
        if (!spell) return;
        const actor = this.actor;
        // Filter to only spellcasting entries that are eligible to cast this consumable
        const realEntries = actor.itemTypes.spellcastingEntry
            .map((entry) => entry.data)
            .filter((i) => ["prepared", "spontaneous"].includes(i.data.prepared.value))
            .filter((i) => tupleHasValue(spell.data.data.traditions.value, i.data.tradition.value));
        const spellcastingEntries = trickMagicItemData ? [trickMagicItemData] : realEntries;
        if (spellcastingEntries.length > 0) {
            let maxBonus = 0;
            let bestEntry = 0;
            for (let i = 0; i < spellcastingEntries.length; i++) {
                if (spellcastingEntries[i].data.spelldc.value > maxBonus) {
                    maxBonus = spellcastingEntries[i].data.spelldc.value;
                    bestEntry = i;
                }
            }
            const systemData = spell.data.data;
            systemData.trickMagicItemData = trickMagicItemData;
            systemData.location.value = spellcastingEntries[bestEntry]._id;

            const isSave = systemData.spellType.value === "save" || systemData.save.value !== "";
            systemData.save.dc = isSave
                ? spellcastingEntries[bestEntry].data.spelldc.dc
                : spellcastingEntries[bestEntry].data.spelldc.value;

            const template = `systems/pf2e/templates/chat/spell-card.html`;
            const token = actor.token;

            // Basic chat message data
            const templateData = {
                actor: actor,
                tokenId: token?.scene ? `${token.scene.id}.${token.id}` : null,
                item: spell,
                data: mergeObject(spell.getChatData(), { item: JSON.stringify(spell.toObject(false)) }),
            };

            const chatData: PreCreate<foundry.data.ChatMessageSource> = {
                speaker: {
                    actor: actor.id,
                    token: actor.getActiveTokens()[0]?.id,
                },
                flags: {
                    core: {
                        canPopout: true,
                    },
                },
                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            };

            // Toggle default roll mode
            const rollMode = game.settings.get("core", "rollMode");
            if (["gmroll", "blindroll"].includes(rollMode))
                chatData.whisper = ChatMessage.getWhisperRecipients("GM").map((u) => u.id);
            if (rollMode === "blindroll") chatData.blind = true;

            // Render the template
            chatData.content = await renderTemplate(template, templateData);

            // Create the chat message
            await ChatMessagePF2e.create(chatData, { renderSheet: false });
        }
    }
}

export interface ConsumablePF2e {
    readonly data: ConsumableData;
}
