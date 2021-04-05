import { ConsumableData, ConsumableType, TrickMagicItemCastData } from './data-definitions';
import { PhysicalItemPF2e } from './physical';
import { calculateTrickMagicItemCheckDC, canCastConsumable } from './spell-consumables';
import { TrickMagicItemPopup } from '@actor/sheet/trick-magic-item-popup';
import { SpellPF2e } from './spell';

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

    /** Use a consumable item, sending the card to chat */
    async rollConsumable(this: Owned<ConsumablePF2e>) {
        const spellData = this.data.data.spell?.data;
        if (['scroll', 'wand'].includes(this.consumableType) && spellData) {
            if (canCastConsumable(this.actor, this.data)) {
                const spell = SpellPF2e.createOwned(spellData, this.actor);
                await spell.roll();
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
