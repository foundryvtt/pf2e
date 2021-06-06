import { LocalizePF2e } from '@module/system/localize';
import { ConsumableData, ConsumableType } from './data';
import { PhysicalItemPF2e } from '../physical';
import { TrickMagicItemCastData } from '@item/data';
import { tupleHasValue } from '@module/utils';
import { ChatMessagePF2e } from '@module/chat-message';
import { canCastConsumable } from './spell-consumables';
import { TrickMagicItemPopup } from '@actor/sheet/trick-magic-item-popup';

export class ConsumablePF2e extends PhysicalItemPF2e {
    /** @override */
    static get schema(): typeof ConsumableData {
        return ConsumableData;
    }

    get consumableType(): ConsumableType {
        return this.data.data.consumableType.value;
    }

    get charges() {
        return {
            current: this.data.data.charges.value,
            max: this.data.data.charges.max,
        };
    }

    getChatData(this: Embedded<ConsumablePF2e>, htmlOptions: EnrichHTMLOptions = {}) {
        const data = this.data.data;
        const translations = LocalizePF2e.translations.PF2E;
        const traits = this.traitChatData(CONFIG.PF2E.consumableTraits);
        const [consumableType, isUsable] = this.isIdentified
            ? [game.i18n.localize(this.consumableType), true]
            : [
                  this.generateUnidentifiedName({ typeOnly: true }),
                  !['other', 'scroll', 'talisman', 'tool', 'wand'].includes(this.consumableType),
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

    /** @override */
    generateUnidentifiedName({ typeOnly = false }: { typeOnly?: boolean } = { typeOnly: false }): string {
        const translations = LocalizePF2e.translations.PF2E.identification;
        const liquidOrSubstance = () =>
            this.traits.has('inhaled') || this.traits.has('contact')
                ? translations.UnidentifiedType.Substance
                : translations.UnidentifiedType.Liquid;
        const itemType = ['drug', 'elixir', 'mutagen', 'oil', 'poison', 'potion'].includes(this.consumableType)
            ? liquidOrSubstance()
            : ['scroll', 'snare', 'ammo'].includes(this.consumableType)
            ? game.i18n.localize(CONFIG.PF2E.consumableTypes[this.consumableType])
            : translations.UnidentifiedType.Object;

        if (typeOnly) return itemType;

        const formatString = LocalizePF2e.translations.PF2E.identification.UnidentifiedItem;
        return game.i18n.format(formatString, { item: itemType });
    }

    /** Use a consumable item, sending the result to chat */
    async consume(this: Embedded<ConsumablePF2e>): Promise<void> {
        const embeddedSpell = this.data.data.spell.data;
        if (['scroll', 'wand'].includes(this.data.data.consumableType.value) && embeddedSpell) {
            if (canCastConsumable(this.actor, this.data)) {
                this.castEmbeddedSpell();
            } else if (this.actor.itemTypes.feat.some((feat) => feat.slug === 'trick-magic-item')) {
                new TrickMagicItemPopup(this);
            } else {
                const content = game.i18n.format('PF2E.LackCastConsumableCapability', { name: this.name });
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
        const charges = this.data.data.charges;

        // Optionally destroy the item
        if (charges.value <= 1 && quantity <= 1 && this.data.data.autoDestroy.value) {
            await this.delete();
        }
        // Deduct one from quantity if this item doesn't have charges
        else if (charges.max < 1) {
            await this.update({
                'data.quantity.value': Math.max(quantity - 1, 0),
                'data.charges.value': charges.max,
            });
        }
        // Deduct one charge
        else {
            await this.update({
                'data.charges.value': Math.max(charges.value - 1, 0),
            });
        }
    }

    async castEmbeddedSpell(
        this: Embedded<ConsumablePF2e>,
        trickMagicItemData?: TrickMagicItemCastData,
    ): Promise<void> {
        if (!(this.data.data.spell?.data && this.data.data.spell?.heightenedLevel)) return;
        const actor = this.actor;
        const spellData = duplicate(this.data.data.spell.data.data);
        // Filter to only spellcasting entries that are eligible to cast this consumable
        const realEntries = actor.itemTypes.spellcastingEntry
            .map((entry) => entry.data)
            .filter((i) => ['prepared', 'spontaneous'].includes(i.data.prepared.value))
            .filter((i) => tupleHasValue(spellData.traditions.value, i.data.tradition.value));
        const spellcastingEntries = trickMagicItemData ? [trickMagicItemData] : realEntries;
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
            spellData.save.str = spellData.save.value ? CONFIG.PF2E.saves[spellData.save.value] : '';
            spellData.damageLabel =
                spellData.spellType.value === 'heal' ? localize('PF2E.SpellTypeHeal') : localize('PF2E.DamageLabel');
            spellData.isAttack = spellData.spellType.value === 'attack';

            const props: (number | string | null)[] = [
                CONFIG.PF2E.spellLevels[spellData.level.value],
                `${localize('PF2E.SpellComponentsLabel')}: ${spellData.components.value}`,
                spellData.range.value ? `${localize('PF2E.SpellRangeLabel')}: ${spellData.range.value}` : null,
                spellData.target.value ? `${localize('PF2E.SpellTargetLabel')}: ${spellData.target.value}` : null,
                spellData.area.value
                    ? `${localize('PF2E.SpellAreaLabel')}: ${CONFIG.PF2E.areaSizes[spellData.area.value]} ${
                          CONFIG.PF2E.areaTypes[spellData.area.areaType]
                      }`
                    : null,
                spellData.time.value ? `${localize('PF2E.SpellTimeLabel')}: ${spellData.time.value}` : null,
                spellData.duration.value ? `${localize('PF2E.SpellDurationLabel')}: ${spellData.duration.value}` : null,
            ];
            spellData.spellLvl = this.data.data.spell.heightenedLevel.toString();
            if (spellData.level.value < parseInt(spellData.spellLvl, 10)) {
                props.push(`Heightened: +${parseInt(spellData.spellLvl, 10) - spellData.level.value}`);
            }
            spellData.properties = props.filter(
                (property): property is NonNullable<typeof property> => property !== null,
            );
            spellData.traits = this.traitChatData(CONFIG.PF2E.spellTraits) as any;

            spellData.item = JSON.stringify(this.data);

            const template = `systems/pf2e/templates/chat/spell-card.html`;
            const token = actor.token;
            // Set
            const templateData = {
                actor: actor,
                tokenId: token?.scene ? `${token.scene.id}.${token.id}` : null,
                item: this,
                data: spellData,
            };

            // Basic chat message data
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
            const rollMode = game.settings.get('core', 'rollMode');
            if (['gmroll', 'blindroll'].includes(rollMode))
                chatData.whisper = ChatMessage.getWhisperRecipients('GM').map((u) => u.id);
            if (rollMode === 'blindroll') chatData.blind = true;

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
