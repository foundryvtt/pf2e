/**
 * Override and extend the basic :class:`Item` implementation
 */
import {
    AbilityModifier,
    ensureProficiencyOption,
    ModifierPF2e,
    StatisticModifier,
    ProficiencyModifier,
} from '@module/modifiers';
import { DicePF2e } from '@scripts/dice';
import { ActorPF2e, TokenPF2e } from '../actor/base';
import { ItemDataPF2e, ItemTraits, SpellcastingEntryData, TrickMagicItemCastData } from './data-definitions';
import { calculateTrickMagicItemCheckDC, canCastConsumable } from './spell-consumables';
import { TrickMagicItemPopup } from '@actor/sheet/trick-magic-item-popup';
import { AbilityString } from '@actor/data-definitions';
import { CheckPF2e } from '@system/rolls';
import { ConfigPF2e } from '@scripts/config';
import { ActiveEffectPF2e } from '@module/active-effect';

interface ItemConstructorOptionsPF2e extends ItemConstructorOptions<ActorPF2e> {
    pf2e?: {
        ready?: boolean;
    };
}

export interface RollAttackOptions {
    /**
     * Event that lead to this damage roll.
     * TODO: refactor so that event can be optional
     */
    event: JQuery.Event;
    options?: string[];
    multiAttackPenalty?: 1 | 2 | 3;
}

export interface RollDamageOptions {
    /**
     * Event that lead to this damage roll.
     * TODO: refactor so that event can be optional
     */
    event: JQuery.Event;
    options?: string[];
    critical?: boolean;
}

/**
 * @category PF2
 */
export class ItemPF2e extends Item<ActorPF2e, ActiveEffectPF2e> {
    constructor(data: ItemDataPF2e, options: ItemConstructorOptionsPF2e = {}) {
        if (options.pf2e?.ready) {
            delete options.pf2e.ready;
            super(data, options);
        } else {
            try {
                const ready = { pf2e: { ready: true } };
                return new CONFIG.PF2E.Item.entityClasses[data.type](data, { ...ready, ...options });
            } catch (_error) {
                super(data, options); // eslint-disable-line constructor-super
                console.warn(`Unrecognized Item type (${data.type}): falling back to PF2EItem`);
            }
        }
    }

    /** The default sheet, token, etc. image of a newly created world item */
    static get defaultImg() {
        const [typeName] = Object.entries(CONFIG.PF2E.Item.entityClasses).find(([_key, cls]) => cls.name === this.name);
        return `systems/pf2e/icons/default-icons/${typeName}.svg`;
    }

    /** The sluggified name of the item **/
    get slug(): string {
        return this.data.data.slug;
    }

    /** The compendium source ID of the item **/
    get sourceId() {
        return this.getFlag('core', 'sourceId');
    }

    get traits(): Set<string> {
        const rarity: string = this.data.data.rarity.value;
        return new Set([rarity].concat(this.data.data.traits.value));
    }

    /** @override */
    prepareData(): void {
        // Remove any empty-string traits that somehow got snuck their way in
        this._data.data.traits.value = this._data.data.traits.value.filter((trait) => !!trait);
        super.prepareData();
    }

    /**
     * Roll the item to Chat, creating a chat card which contains follow up attack or damage roll options
     */
    async roll(this: Owned<ItemPF2e>, event?: JQuery.TriggeredEvent): Promise<ChatMessage> {
        // Basic template rendering data
        const template = `systems/pf2e/templates/chat/${this.data.type}-card.html`;
        const { token } = this.actor;
        const nearestItem = event ? event.currentTarget.closest('.item') : {};
        const contextualData = nearestItem.dataset || {};
        const templateData = {
            actor: this.actor,
            tokenId: token ? `${token.scene._id}.${token.id}` : null,
            item: this.data,
            data: this.getChatData(undefined, contextualData),
        };

        // Basic chat message data
        const chatData: Partial<ChatMessageData> = {
            user: game.user.id,
            speaker: {
                actor: this.actor.id,
                token: this.actor.token?.id,
                alias: this.actor.name,
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
            chatData.whisper = ChatMessage.getWhisperRecipients('GM').map((u) => u._id);
        if (rollMode === 'blindroll') chatData.blind = true;

        // Render the template
        chatData.content = await renderTemplate(template, templateData);

        // Create the chat message
        return ChatMessage.create(chatData, { displaySheet: false });
    }

    /* -------------------------------------------- */
    /*  Chat Card Data
    /* -------------------------------------------- */

    /**
     * Internal method that transforms data into something that can be used for chat.
     * Currently renders description text using TextEditor.enrichHTML()
     */
    protected processChatData(htmlOptions: Record<string, boolean> | undefined, data: any): unknown {
        if (data?.description) {
            data.description.value = TextEditor.enrichHTML(data.description.value, htmlOptions);
        }

        return data;
    }

    getChatData(htmlOptions?: Record<string, boolean>, _rollOptions?: any) {
        return this.processChatData(htmlOptions, duplicate(this.data.data));
    }

    /* -------------------------------------------- */

    static traitChatData(
        itemTraits: ItemTraits,
        traitList: Record<string, string>,
    ): { label: string; description: string }[] {
        let traits: string[] = duplicate(itemTraits.value);
        const customTraits = itemTraits.custom ? itemTraits.custom.trim().split(/\s*[,;|]\s*/) : [];

        if (customTraits.length > 0) {
            traits = traits.concat(customTraits);
        }

        const traitChatLabels = traits.map((trait) => {
            const label = traitList[trait] || trait.charAt(0).toUpperCase() + trait.slice(1);
            return {
                label,
                description:
                    CONFIG.PF2E.traitsDescriptions[trait as keyof ConfigPF2e['PF2E']['traitsDescriptions']] ?? '',
            };
        });

        return traitChatLabels;
    }

    /* -------------------------------------------- */
    /*  Roll Attacks
    /* -------------------------------------------- */

    /**
     * Roll Spell Damage
     * Rely upon the DicePF2e.d20Roll logic for the core implementation
     */
    rollSpellcastingEntryCheck(event: JQuery.ClickEvent) {
        // Prepare roll data
        const itemData: ItemDataPF2e = this.data;
        if (itemData.type !== 'spellcastingEntry') throw new Error('Wrong item type!');
        if (!this.actor) throw new Error('Attempted a spellcasting check without an actor!');

        const rollData = duplicate(this.actor.data.data);
        const modifier = itemData.data.spelldc.value;
        const parts = [modifier];
        const title = `${this.name} - Spellcasting Check`;

        const traits = this.actor.data.data.traits.traits.value;
        if (traits.some((trait) => trait === 'elite')) {
            parts.push(2);
        } else if (traits.some((trait) => trait === 'weak')) {
            parts.push(-2);
        }

        // Call the roll helper utility
        DicePF2e.d20Roll({
            event,
            parts,
            data: rollData,
            title,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            dialogOptions: {
                width: 400,
                top: event.clientY - 80,
                left: window.innerWidth - 710,
            },
        });
    }

    /* -------------------------------------------- */
    /**
     * The heightened level is not transferred correctly to spell chat cards.
     * Therefore you have to look into the triggering's event proximity.
     *
     * @param event
     */
    static findSpellLevel(event: any): number {
        const button = event.currentTarget;
        const card = button.closest('*[data-spell-lvl]');
        const cardData = card ? card.dataset : {};
        return parseInt(cardData.spellLvl, 10);
    }

    /**
     * Roll Counteract check
     * Rely upon the DicePF2e.d20Roll logic for the core implementation
     */
    rollCounteract(event: JQuery.ClickEvent) {
        let item: ItemDataPF2e = this.data;
        if (item.type === 'consumable' && item.data.spell?.data) {
            item = item.data.spell.data;
        }
        if (item.type !== 'spell') throw new Error('Wrong item type!');

        const itemData = item.data;
        const spellcastingEntry = this.actor?.getOwnedItem(itemData.location.value);
        if (!spellcastingEntry || spellcastingEntry.data.type !== 'spellcastingEntry')
            throw new Error('Spell points to location that is not a spellcasting type');

        const modifiers: ModifierPF2e[] = [];
        const ability: AbilityString = spellcastingEntry.data.data.ability?.value || 'int';
        const score = this.actor.data.data.abilities[ability]?.value ?? 0;
        modifiers.push(AbilityModifier.fromAbilityScore(ability, score));

        const proficiencyRank = spellcastingEntry.data.data.proficiency.value ?? 0;
        modifiers.push(ProficiencyModifier.fromLevelAndRank(this.actor.data.data.details.level.value, proficiencyRank));

        const rollOptions = ['all', 'counteract-check'];
        const extraOptions = [];
        const traits = item.data.traits.value;

        let flavor = '<hr>';
        flavor += `<h3>${game.i18n.localize('PF2E.Counteract')}</h3>`;
        flavor += `<hr>`;

        const spellLevel = ItemPF2e.findSpellLevel(event);

        const addFlavor = (success: string, level: number) => {
            const title = game.i18n.localize(`PF2E.${success}`);
            const desc = game.i18n.format(`PF2E.CounteractDescription.${success}`, {
                level: level,
            });
            flavor += `<b>${title}</b> ${desc}<br>`;
        };
        flavor += `<p>${game.i18n.localize('PF2E.CounteractDescription.Hint')}</p>`;
        flavor += '<p>';
        addFlavor('CritSuccess', spellLevel + 3);
        addFlavor('Success', spellLevel + 1);
        addFlavor('Failure', spellLevel);
        addFlavor('CritFailure', 0);
        flavor += '</p>';
        const check = new StatisticModifier(flavor, modifiers);
        const finalOptions = this.actor.getRollOptions(rollOptions).concat(extraOptions).concat(traits);
        ensureProficiencyOption(finalOptions, proficiencyRank);
        CheckPF2e.roll(
            check,
            {
                actor: this.actor,
                type: 'counteract-check',
                options: finalOptions,
                title: game.i18n.localize('PF2E.Counteract'),
                traits,
            },
            event,
        );
    }

    /* -------------------------------------------- */

    /**
     * Use a consumable item
     */
    async rollConsumable(this: Owned<ItemPF2e>, _ev: JQuery.ClickEvent) {
        const item: ItemDataPF2e = this.data;
        if (item.type !== 'consumable') throw Error('Tried to roll consumable on a non-consumable');
        if (!this.actor) throw Error('Tried to roll a consumable that has no actor');

        const itemData = item.data;
        // Submit the roll to chat
        if (
            ['scroll', 'wand'].includes(item.data.consumableType.value) &&
            item.data.spell?.data &&
            this.actor instanceof ActorPF2e
        ) {
            if (canCastConsumable(this.actor, item)) {
                this._castEmbeddedSpell();
            } else if (this.actor.itemTypes.feat.some((feat) => feat.slug === 'trick-magic-item')) {
                const DC = calculateTrickMagicItemCheckDC(item);
                const trickMagicItemCallback = async (trickMagicItemPromise: TrickMagicItemCastData): Promise<void> => {
                    const trickMagicItemData = await trickMagicItemPromise;
                    if (trickMagicItemData) this._castEmbeddedSpell(trickMagicItemData);
                };
                const popup = new TrickMagicItemPopup(this.actor, DC, trickMagicItemCallback);
                popup.render(true);
            } else {
                const content = game.i18n.format('PF2E.LackCastConsumableCapability', { name: this.name });
                ChatMessage.create({
                    user: game.user._id,
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    whisper: ChatMessage.getWhisperRecipients(this.actor.name),
                    content,
                });
            }
        } else {
            const cv = itemData.consume.value;
            const content = `Uses ${this.name}`;
            if (cv) {
                new Roll(cv).toMessage({
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    flavor: content,
                });
            } else {
                ChatMessage.create({
                    user: game.user._id,
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    content,
                });
            }
        }

        // Deduct consumed charges from the item
        if (itemData.autoUse.value) this.consume();
    }

    consume() {
        const item: ItemDataPF2e = this.data;
        if (item.type !== 'consumable') throw Error('Tried to consume non-consumable');

        const itemData = item.data;
        const qty = itemData.quantity;
        const chg = itemData.charges;

        if (!this.actor) return;

        // Optionally destroy the item
        if (chg.value <= 1 && qty.value <= 1 && itemData.autoDestroy.value) {
            this.actor.deleteEmbeddedEntity('OwnedItem', this.data._id);
        }
        // Deduct one from quantity if this item doesn't have charges
        else if (chg.max < 1) {
            const options = {
                _id: this.data._id,
                'data.quantity.value': Math.max(qty.value - 1, 0),
                'data.charges.value': chg.max,
            };
            this.actor.updateEmbeddedEntity('OwnedItem', options);
        }
        // Deduct one charge
        else {
            this.actor.updateEmbeddedEntity('OwnedItem', {
                _id: this.data._id,
                'data.charges.value': Math.max(chg.value - 1, 0),
            });
        }
    }

    protected async _castEmbeddedSpell(trickMagicItemData?: TrickMagicItemCastData) {
        if (this.data.type !== 'consumable' || !this.actor) return;
        if (!(this.data.data.spell?.data && this.data.data.spell?.heightenedLevel)) return;
        const actor = this.actor;
        const spellData = duplicate(this.data.data.spell.data.data);
        let spellcastingEntries: SpellcastingEntryData[] | TrickMagicItemCastData[] = actor.data.items.filter(
            (i) => i.type === 'spellcastingEntry',
        ) as SpellcastingEntryData[];
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
            spellData.traits = ItemPF2e.traitChatData(spellData.traits, CONFIG.PF2E.spellTraits) as any;

            spellData.item = JSON.stringify(this.data);

            const template = `systems/pf2e/templates/chat/spell-card.html`;
            const { token } = actor;
            const templateData = {
                actor: actor,
                tokenId: token ? `${token.scene._id}.${token.id}` : null,
                item: this,
                data: spellData,
            };

            // Basic chat message data
            const chatData: any = {
                user: game.user._id,
                speaker: {
                    actor: actor._id,
                    token: actor.token,
                    alias: actor.name,
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
                chatData.whisper = ChatMessage.getWhisperRecipients('GM').map((u) => u._id);
            if (rollMode === 'blindroll') chatData.blind = true;

            // Render the template
            chatData.content = await renderTemplate(template, templateData);

            // Create the chat message
            return ChatMessage.create(chatData, { displaySheet: false });
        }
    }

    calculateMap(): { label: string; map2: number; map3: number } {
        return ItemPF2e.calculateMap(this.data);
    }

    static calculateMap(item: ItemDataPF2e): { label: string; map2: number; map3: number } {
        if (['melee', 'weapon'].includes(item.type)) {
            // calculate multiple attack penalty tiers
            const agile = item.data.traits.value.includes('agile');
            const alternateMAP = ((item.data as any).MAP || {}).value;
            switch (alternateMAP) {
                case '1':
                    return { label: 'PF2E.MultipleAttackPenalty', map2: -1, map3: -2 };
                case '2':
                    return { label: 'PF2E.MultipleAttackPenalty', map2: -2, map3: -4 };
                case '3':
                    return { label: 'PF2E.MultipleAttackPenalty', map2: -3, map3: -6 };
                case '4':
                    return { label: 'PF2E.MultipleAttackPenalty', map2: -4, map3: -8 };
                case '5':
                    return { label: 'PF2E.MultipleAttackPenalty', map2: -5, map3: -10 };
                default: {
                    if (agile) return { label: 'PF2E.MultipleAttackPenalty', map2: -4, map3: -8 };
                    else return { label: 'PF2E.MultipleAttackPenalty', map2: -5, map3: -10 };
                }
            }
        }
        return { label: 'PF2E.MultipleAttackPenalty', map2: -5, map3: -10 };
    }

    /* -------------------------------------------- */

    /* -------------------------------------------- */

    static chatListeners(html: JQuery) {
        // Chat card actions
        html.on('click', '.card-buttons button', (ev) => {
            ev.preventDefault();

            // Extract card data
            const button = $(ev.currentTarget);
            const messageId = button.parents('.message').attr('data-message-id');
            const senderId = game.messages.get(messageId).user._id;
            const card = button.parents('.chat-card');
            const action = button.attr('data-action');

            // Confirm roll permission
            if (!game.user.isGM && game.user._id !== senderId && action !== 'save') return;

            // Get the Actor from a synthetic Token
            let actor: ActorPF2e | null;
            const tokenKey = card.attr('data-token-id');
            if (tokenKey) {
                const [sceneId, tokenId] = tokenKey.split('.');
                let token: TokenPF2e | undefined;
                if (sceneId === canvas.scene?._id) token = canvas.tokens.get(tokenId);
                else {
                    const scene = game.scenes.get(sceneId);
                    if (!scene) return;
                    const tokenData = scene.data.tokens.find((t) => t._id === tokenId);
                    if (tokenData) token = new Token(tokenData);
                }
                if (!token) return;
                actor = ActorPF2e.fromToken(token);
            } else actor = game.actors.get(card.attr('data-actor-id'));

            // Get the Item
            if (!actor) return;
            const itemId = card.attr('data-item-id') ?? '';
            let item: Owned<ItemPF2e> | null = null;
            let itemData: ItemDataPF2e | undefined = undefined;
            const embeddedItem = $(ev.target).parents('.item-card').attr('data-embedded-item');
            if (embeddedItem) {
                itemData = JSON.parse(embeddedItem) as ItemDataPF2e | undefined;
                if (itemData) {
                    item = actor.items.get(itemData._id);
                }
            } else {
                item = actor.getOwnedItem(itemId);
                itemData = item?.data;
            }
            if (item && itemData) {
                item.handleButtonAction(ev, action);
            } else {
                const strikeIndex = card.attr('data-strike-index');
                const strikeName = card.attr('data-strike-name');
                const strikeAction = actor.data.data.actions[Number(strikeIndex)];

                if (strikeAction && strikeAction.name === strikeName) {
                    const options = (actor as ActorPF2e).getRollOptions(['all', 'attack-roll']);
                    if (action === 'strikeAttack') strikeAction.variants[0].roll({ event: ev, options });
                    else if (action === 'strikeAttack2') strikeAction.variants[1].roll({ event: ev, options });
                    else if (action === 'strikeAttack3') strikeAction.variants[2].roll({ event: ev, options });
                    else if (action === 'strikeDamage') strikeAction.damage({ event: ev, options });
                    else if (action === 'strikeCritical') strikeAction.critical({ event: ev, options });
                }
            }
        });
    }

    /**
     * Handles a button click event from a chat message or other similar source
     * @returns true if it was handled, false otherwise
     */
    handleButtonAction(event: JQuery.ClickEvent, action: string): boolean {
        const options = this.actor?.getRollOptions(['all', 'attack-roll']);
        switch (action) {
            case 'attack':
            case 'weaponAttack':
            case 'spellAttack':
            case 'npcAttack':
                this.rollAttack({ event });
                break;
            case 'attack2':
            case 'weaponAttack2':
            case 'spellAttack2':
            case 'npcAttack2':
                this.rollAttack({ event, multiAttackPenalty: 2 });
                break;
            case 'attack3':
            case 'weaponAttack3':
            case 'spellAttack3':
            case 'npcAttack23':
                this.rollAttack({ event, multiAttackPenalty: 3 });
                break;
            case 'damage':
            case 'weaponDamage':
            case 'spellDamage':
            case 'npcDamage':
                this.rollDamage({ event, options });
                break;
            case 'criticalDamage':
            case 'weaponDamageCritical':
            case 'npcDamageCritical':
                this.rollDamage({ event, options, critical: true });
                break;
            case 'consume':
                this.rollConsumable(event);
                break;
            case 'spellCounteract':
                this.rollCounteract(event);
                break;
            case 'save':
                ActorPF2e.rollSave(event, this);
                break;
            default:
                return false;
        }

        return true;
    }

    rollAttack(_options: RollAttackOptions) {
        console.error(`Wrong Item Type for rollAttack(): ${this.type}`);
    }

    rollDamage(_options: RollDamageOptions) {
        console.error(`Wrong Item Type for rollDamage(): ${this.type}`);
    }
}

export interface ItemPF2e {
    data: ItemDataPF2e;
    _data: ItemDataPF2e;
}
