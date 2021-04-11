import { ConsumableData, ConsumableType, SpellcastingEntryData, TrickMagicItemCastData } from './data-definitions';
import { PhysicalItemPF2e } from './physical';
import { calculateTrickMagicItemCheckDC, canCastConsumable } from './spell-consumables';
import { TrickMagicItemPopup } from '@actor/sheet/trick-magic-item-popup';
import { SpellPF2e } from './spell';
import { ChatMessagePF2e } from '@module/chat-message';
import { ErrorPF2e } from '@module/utils';

export class ConsumablePF2e extends PhysicalItemPF2e {
    get consumableType(): ConsumableType {
        return this.data.data.consumableType.value;
    }

    /* Deduct from the consumable's charges and/or quantity on use? */
    get autoUse(): boolean {
        return this.data.data.autoUse.value;
    }

    /* Destroy the item if no uses remain? */
    get destroyOnUse(): boolean {
        return this.charges.value <= 1 && this.quantity <= 1 && this.data.data.autoDestroy.value === true;
    }

    get charges(): { value: number; max: number } {
        return {
            value: this.data.data.charges.value,
            max: this.data.data.charges.max,
        };
    }

    get storedSpell(): Owned<SpellPF2e> | null {
        if (!this.actor) {
            throw ErrorPF2e('Only spells from owned consumables can cast.');
        }
        const spellData = this.data.data.spell.data;
        const spell = spellData ? SpellPF2e.createOwned(spellData, this.actor) : null;
        if (spell)
            spell.data.data.heightenedLevel = {
                value: this.data.data.spell.heightenedLevel ?? spell.data.data.level.value,
            };
        return spell;
    }

    /** Use a consumable item, sending the card to chat */
    async rollConsumable(this: Owned<ConsumablePF2e>) {
        const spellData = this.data.data.spell?.data;
        if (['scroll', 'wand'].includes(this.consumableType) && spellData) {
            if (canCastConsumable(this.actor, this.data)) {
                this.castEmbeddedSpell();
            } else if (this.actor.itemTypes.feat.some((feat) => feat.slug === 'trick-magic-item')) {
                const DC = calculateTrickMagicItemCheckDC(this.data);
                const trickMagicItemCallback = async (trickMagicItemPromise: TrickMagicItemCastData): Promise<void> => {
                    const trickMagicItemData = trickMagicItemPromise;
                    if (trickMagicItemData) this.castEmbeddedSpell(trickMagicItemData);
                };
                const popup = new TrickMagicItemPopup(this.actor, DC, trickMagicItemCallback);
                popup.render(true);
            } else {
                const content = game.i18n.format('PF2E.LackCastConsumableCapability', { name: this.name });
                await ChatMessage.create({
                    user: game.user._id,
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    whisper: ChatMessage.getWhisperRecipients(this.actor.name),
                    content,
                });
            }
        } else {
            const cv = this.data.data.consume.value;
            const content = `Uses ${this.name}`;
            if (cv) {
                await new Roll(cv).toMessage({
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    flavor: content,
                });
            } else {
                await ChatMessage.create({
                    user: game.user._id,
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    content,
                });
            }
        }

        if (this.autoUse) await this.consume();
    }

    /** Deduct consumed charges from the item */
    async consume(this: Owned<ConsumablePF2e>): Promise<void> {
        if (this.destroyOnUse) {
            await this.actor.deleteEmbeddedEntity('OwnedItem', this.id);
        } else {
            // Deduct one from quantity if this item doesn't have charges
            const newQuantity = this.charges.value <= 1 ? Math.max(this.quantity - 1, 0) : this.quantity;
            await this.actor.updateEmbeddedEntity('OwnedItem', {
                _id: this.id,
                'data.quantity.value': newQuantity,
                'data.charges.value': Math.max(this.charges.value - 1, 0),
            });
        }
    }

    /** Cast a stored spell on the item (typically from a wand or scroll) */
    private async castEmbeddedSpell(trickMagicItemData?: TrickMagicItemCastData): Promise<ChatMessagePF2e | void> {
        const storedSpell = this.storedSpell;
        if (storedSpell === null) return;

        const spellData = storedSpell.data.data;
        let spellcastingEntries:
            | SpellcastingEntryData[]
            | TrickMagicItemCastData[] = this.actor.itemTypes.spellcastingEntry.map((entry) => entry.data);
        // Filter to only spellcasting entries that are eligible to cast this consumable
        spellcastingEntries = spellcastingEntries
            .filter((i) => ['prepared', 'spontaneous'].includes(i.data.prepared.value))
            .filter((i) => spellData.traditions.value.includes(i.data.tradition.value));
        if (spellcastingEntries.length === 0 && trickMagicItemData) spellcastingEntries = [trickMagicItemData];
        if (spellcastingEntries.length > 0) {
            const localize: Localization['localize'] = game.i18n.localize.bind(game.i18n);
            let maxBonus = 0;
            let bestEntry = 0;
            for (let i = 0; i < spellcastingEntries.length; i++) {
                if (spellcastingEntries[i].data.spelldc.value > maxBonus) {
                    maxBonus = spellcastingEntries[i].data.spelldc.value;
                    bestEntry = i;
                }
            }
            this.data.data.spell.data.data.trickMagicItemData = trickMagicItemData;
            this.data.data.spell.data.data.location.value = spellcastingEntries[bestEntry]._id;
            spellData.isSave = spellData.spellType.value === 'save' || spellData.save.value !== '';
            if (spellData.isSave) {
                spellData.save.dc = spellcastingEntries[bestEntry].data.spelldc.dc;
            } else spellData.save.dc = spellcastingEntries[bestEntry].data.spelldc.value;
            spellData.save.str = spellData.save.value ? CONFIG.PF2E.saves[spellData.save.value.toLowerCase()] : '';
            spellData.damageLabel =
                spellData.spellType.value === 'heal' ? localize('PF2E.SpellTypeHeal') : localize('PF2E.DamageLabel');
            spellData.isAttack = spellData.spellType.value === 'attack';

            const props: (number | string)[] = [
                CONFIG.PF2E.spellLevels[spellData.level.value],
                `${localize('PF2E.SpellComponentsLabel')}: ${spellData.components.value}`,
                spellData.range.value ? `${localize('PF2E.SpellRangeLabel')}: ${spellData.range.value}` : null,
                spellData.target.value ? `${localize('PF2E.SpellTargetLabel')}: ${spellData.target.value}` : null,
                spellData.area.value
                    ? `${localize('PF2E.SpellAreaLabel')}: ${CONFIG.PF2E.areaSizes[spellData.area.value]} ${
                          CONFIG.PF2E.areaTypes[spellData.area.areaType]
                      }`
                    : null,
                spellData.areasize?.value ? `${localize('PF2E.SpellAreaLabel')}: ${spellData.areasize.value}` : null,
                spellData.time.value ? `${localize('PF2E.SpellTimeLabel')}: ${spellData.time.value}` : null,
                spellData.duration.value ? `${localize('PF2E.SpellDurationLabel')}: ${spellData.duration.value}` : null,
            ];
            spellData.spellLvl = this.data.data.spell.heightenedLevel.toString();
            if (spellData.level.value < parseInt(spellData.spellLvl, 10)) {
                props.push(`Heightened: +${parseInt(spellData.spellLvl, 10) - spellData.level.value}`);
            }
            spellData.properties = props.filter((p) => p !== null);
            spellData.traits = ConsumablePF2e.traitChatData(spellData.traits, CONFIG.PF2E.spellTraits) as any;

            spellData.item = JSON.stringify(this.data);

            const template = `systems/pf2e/templates/chat/spell-card.html`;
            const { token } = this.actor;
            const templateData = {
                actor: this.actor,
                tokenId: token ? `${token.scene._id}.${token.id}` : null,
                item: this,
                data: spellData,
            };

            // Basic chat message data
            const chatData: Partial<ChatMessageData> = {
                user: game.user.id,
                speaker: {
                    actor: this.actor.id,
                    token: token?.id,
                    alias: this.actor.name,
                },
                flags: {
                    core: {
                        canPopout: true,
                    },
                },
                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                content: await renderTemplate(template, templateData),
            };

            // Toggle default roll mode
            const rollMode = game.settings.get('core', 'rollMode');
            if (['gmroll', 'blindroll'].includes(rollMode))
                chatData.whisper = ChatMessage.getWhisperRecipients('GM').map((u) => u._id);
            if (rollMode === 'blindroll') chatData.blind = true;

            // Create the chat message
            return ChatMessagePF2e.create(chatData, { displaySheet: false });
        }
    }

    getChatData(htmlOptions?: Record<string, boolean>) {
        const data = this.data.data;
        const localize = game.i18n.localize.bind(game.i18n);
        const consumableType = CONFIG.PF2E.consumableTypes[data.consumableType.value];
        return this.processChatData(htmlOptions, {
            ...data,
            consumableType: {
                ...data.consumableType,
                str: consumableType,
            },
            properties: [
                consumableType,
                `${data.charges.value}/${data.charges.max} ${localize('PF2E.ConsumableChargesLabel')}`,
            ],
            hasCharges: data.charges.value >= 0,
        });
    }
}

export interface ConsumablePF2e {
    data: ConsumableData;
    _data: ConsumableData;
}
