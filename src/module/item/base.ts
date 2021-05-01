/**
 * Override and extend the basic :class:`Item` implementation
 */
import { SpellFacade } from './spell-facade';
import { getAttackBonus, getStrikingDice } from './runes';
import {
    AbilityModifier,
    ensureProficiencyOption,
    ModifierPF2e,
    StatisticModifier,
    ProficiencyModifier,
} from '@module/modifiers';
import { DicePF2e } from '@scripts/dice';
import { ActorPF2e } from '../actor/base';
import {
    isItemSystemData,
    ItemDataPF2e,
    ItemTraits,
    MeleeDetailsData,
    TrickMagicItemCastData,
} from './data-definitions';
import { canCastConsumable } from './spell-consumables';
import { TrickMagicItemPopup } from '@actor/sheet/trick-magic-item-popup';
import { AbilityString, RawHazardData, RawNPCData } from '@actor/data-definitions';
import { CheckPF2e } from '@system/rolls';
import { ConfigPF2e } from '@scripts/config';
import { ActiveEffectPF2e } from '@module/active-effect';
import { ErrorPF2e, tupleHasValue } from '@module/utils';

interface ItemConstructorOptionsPF2e extends ItemConstructorOptions<ActorPF2e> {
    pf2e?: {
        ready?: boolean;
    };
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
    get slug(): string | null {
        return this.data.data.slug;
    }

    /** The compendium source ID of the item **/
    get sourceId() {
        return this.getFlag('core', 'sourceId');
    }

    get traits(): Set<string> {
        const rarity: string = this.data.data.traits.rarity.value;
        return new Set([rarity].concat(this.data.data.traits.value));
    }

    get description(): string {
        return this.data.data.description.value;
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
    protected processChatData(htmlOptions: EnrichHTMLOptions = {}, data: Record<string, any> = {}): unknown {
        if (isItemSystemData(data)) {
            const chatData = duplicate(data);
            chatData.description.value = TextEditor.enrichHTML(chatData.description.value, htmlOptions);
        }

        return data;
    }

    getChatData(this: Owned<ItemPF2e>, htmlOptions: EnrichHTMLOptions = {}, _rollOptions: Record<string, any> = {}) {
        return this.processChatData(htmlOptions, duplicate(this.data.data));
    }

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
     * Roll a Weapon Attack
     * Rely upon the DicePF2e.d20Roll logic for the core implementation
     */
    rollWeaponAttack(this: Owned<ItemPF2e>, event: JQuery.ClickEvent, multiAttackPenalty = 1) {
        if (this.type !== 'weapon' && this.type !== 'melee') throw new Error('Wrong item type!');

        // Prepare roll data
        // let itemData = this.data.data,
        const itemData: any = this.getChatData();
        const rollData = duplicate(this.actor.data.data) as any;
        const isFinesse = itemData.isFinesse;
        const abl =
            isFinesse && rollData.abilities.dex.mod > rollData.abilities.str.mod
                ? 'dex'
                : itemData.ability.value || 'str';
        const prof = itemData.weaponType.value || 'simple';
        let parts = ['@itemBonus', `@abilities.${abl}.mod`];

        const title = `${this.name} - Attack Roll${multiAttackPenalty > 1 ? ` (MAP ${multiAttackPenalty})` : ''}`;

        if (this.actor.data.type === 'npc') {
            parts = ['@itemBonus'];
        } else if (itemData.proficiency && itemData.proficiency.type === 'skill') {
            parts.push(itemData.proficiency.value);
        } else {
            parts.push(`@martial.${prof}.value`);
        }

        rollData.item = itemData;
        rollData.itemBonus = getAttackBonus(itemData);
        // if ( !itemData.proficient.value ) parts.pop();

        if (multiAttackPenalty === 2) parts.push(itemData.map2);
        else if (multiAttackPenalty === 3) parts.push(itemData.map3);

        // TODO: Incorporate Elven Accuracy

        // Call the roll helper utility
        DicePF2e.d20Roll({
            event,
            parts,
            actor: this.actor,
            data: rollData,
            rollType: 'attack-roll',
            title,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            dialogOptions: {
                width: 400,
                top: event && event.clientY ? event.clientY - 80 : 400,
                left: window.innerWidth - 710,
            },
        });
    }

    /* -------------------------------------------- */

    /**
     * Roll Weapon Damage
     * Rely upon the DicePF2e.damageRoll logic for the core implementation
     */
    rollWeaponDamage(this: Owned<ItemPF2e>, event: JQuery.ClickEvent, critical = false) {
        const localize: Function = game.i18n.localize.bind(game.i18n);

        const item = this.data;
        // Check to see if this is a damage roll for either: a weapon, a NPC attack or an action associated with a weapon.
        if (item.type !== 'weapon') throw new Error('Wrong item type!');
        const itemData = item.data;

        // Get item and actor data and format it for the damage roll
        const rollData = duplicate(this.actor.data.data) as any;
        let rollDie = itemData.damage.die;
        const abl = 'str';
        let abilityMod: number = rollData.abilities[abl].mod;
        let parts: (string | number)[] = [];
        const partsCritOnly: string[] = [];
        const dtype: string = CONFIG.PF2E.damageTypes[itemData.damage.damageType];

        // Get detailed trait information from item
        const traits = itemData.traits.value;
        let critTrait = '';
        let critDie = '';
        let bonusDamage = 0;
        let twohandedTrait = false;
        let twohandedDie = '';
        let thrownTrait = false;
        const critRegex = /\b(deadly|fatal)-(d\d+)/;
        const twohandedRegex = /\b(two-hand)-(d\d+)/;
        const thrownRegex = /\b(thrown)-(\d+)/;
        const hasThiefRacket = this.actor.itemTypes.feat.some((feat) => feat.slug === 'thief-racket');
        const strikingDice = getStrikingDice(itemData);

        if (hasThiefRacket && rollData.abilities.dex.mod > abilityMod) abilityMod = rollData.abilities.dex.mod;

        // Find detailed trait information
        for (const trait of traits) {
            const critMatch = critRegex.exec(trait);
            const twoHandedMatch = twohandedRegex.exec(trait);
            const thrownMatch = thrownRegex.exec(trait);
            if (Array.isArray(critMatch) && typeof critMatch[1] === 'string' && typeof critMatch[2] === 'string') {
                critTrait = critMatch[1];
                critDie = critMatch[2];
            } else if (Array.isArray(twoHandedMatch) && typeof twoHandedMatch[2] === 'string') {
                twohandedTrait = true;
                twohandedDie = twoHandedMatch[2];
            } else if (Array.isArray(thrownMatch)) {
                thrownTrait = true;
            }
        }

        // If weapon has two-hand trait and wielded in two hands, apply the appropriate damage die
        if (twohandedTrait && itemData.hands.value) {
            rollDie = twohandedDie;
        }

        // Add bonus damage
        if (itemData.bonusDamage && itemData.bonusDamage.value) bonusDamage = parseInt(itemData.bonusDamage.value, 10);

        // Join the damage die into the parts to make a roll (this will be overwriten below if the damage is critical)
        const damageDice = itemData.damage.dice ?? 1;
        let weaponDamage = damageDice + strikingDice + rollDie;
        parts = [weaponDamage, '@itemBonus'];
        rollData.itemBonus = bonusDamage;

        // Apply critical damage and effects
        if (critTrait === 'deadly') {
            // Deadly adds 3 dice with major Striking, 2 dice with greater Striking
            // and 1 die otherwise
            const deadlyDice = strikingDice > 0 ? strikingDice : 1;
            const deadlyDamage = deadlyDice + critDie;
            partsCritOnly.push(deadlyDamage);
        } else if (critTrait === 'fatal') {
            if (critical === true) {
                weaponDamage = damageDice + strikingDice + critDie;
                parts = [weaponDamage, '@itemBonus'];
            }
            partsCritOnly.push(1 + critDie);
        }

        // Add abilityMod to the damage roll.
        if (itemData.range.value === 'melee' || itemData.range.value === 'reach' || itemData.range.value === '') {
            // if a melee attack
            parts.push(abilityMod);
        } else if (itemData.traits.value.includes('propulsive')) {
            if (Math.sign(this.actor.data.data.abilities.str.mod) === 1) {
                const halfStr = Math.floor(this.actor.data.data.abilities.str.mod / 2);
                parts.push(halfStr);
            }
        } else if (thrownTrait) {
            parts.push(abilityMod);
        }

        // Add property rune damage

        // add strike damage
        if (itemData.property1.dice && itemData.property1.die && itemData.property1.damageType) {
            const propertyDamage = Number(itemData.property1.dice) + itemData.property1.die;
            parts.push(propertyDamage);
        }
        // add critical damage
        if (itemData.property1.critDice && itemData.property1.critDie && itemData.property1.critDamageType) {
            const propertyDamage = Number(itemData.property1.critDice) + itemData.property1.critDie;
            partsCritOnly.push(propertyDamage);
        }

        // Set the title of the roll
        const critTitle = critTrait ? critTrait.toUpperCase() : '';
        let title = critical
            ? `${localize('PF2E.CriticalDamageLabel')} ${critTitle} ${localize('PF2E.DamageLabel')}: ${this.name}`
            : `${localize('PF2E.DamageLabel')}: ${this.name}`;
        if (dtype) title += ` (${dtype})`;

        // Call the roll helper utility
        rollData.item = itemData;
        DicePF2e.damageRoll({
            event,
            parts,
            partsCritOnly,
            critical,
            actor: this.actor ? this.actor : undefined,
            data: rollData,
            title,
            speaker: ChatMessage.getSpeaker({ actor: this.actor ? this.actor : undefined }),
            dialogOptions: {
                width: 400,
                top: event.clientY ? event.clientY - 80 : 400,
                left: window.innerWidth - 710,
            },
        });
    }

    /**
     * Roll a NPC Attack
     * Rely upon the DicePF2e.d20Roll logic for the core implementation
     */
    rollNPCAttack(this: Owned<ItemPF2e>, event: JQuery.ClickEvent, multiAttackPenalty = 1) {
        if (this.type !== 'melee') throw ErrorPF2e('Wrong item type!');
        if (this.actor?.data.type !== 'npc' && this.actor?.data.type !== 'hazard') {
            throw ErrorPF2e('Attempted to roll an attack without an actor!');
        }
        // Prepare roll data
        const itemData: any = this.getChatData();
        const rollData: (RawNPCData | RawHazardData) & { item?: unknown; itemBonus?: number } = duplicate(
            this.actor.data.data,
        );
        const parts = ['@itemBonus'];
        const title = `${this.name} - Attack Roll${multiAttackPenalty > 1 ? ` (MAP ${multiAttackPenalty})` : ''}`;

        rollData.item = itemData;

        let adjustment = 0;
        const traits = this.actor.data.data.traits.traits.value;
        if (traits.some((trait) => trait === 'elite')) {
            adjustment = 2;
        } else if (traits.some((trait) => trait === 'weak')) {
            adjustment = -2;
        }

        rollData.itemBonus = Number(itemData.bonus.value) + adjustment;

        if (multiAttackPenalty === 2) parts.push(itemData.map2);
        else if (multiAttackPenalty === 3) parts.push(itemData.map3);

        // Call the roll helper utility
        DicePF2e.d20Roll({
            event,
            parts,
            actor: this.actor,
            data: rollData,
            rollType: 'attack-roll',
            title,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            dialogOptions: {
                width: 400,
                top: event ? event.clientY - 80 : 400,
                left: window.innerWidth - 710,
            },
        });
    }

    /**
     * Roll NPC Damage
     * Rely upon the DicePF2e.damageRoll logic for the core implementation
     */
    rollNPCDamage(event: JQuery.ClickEvent, critical = false) {
        if (this.data.type !== 'melee') throw ErrorPF2e('Wrong item type!');
        if (this.actor?.data.type !== 'npc' && this.actor?.data.type !== 'hazard') {
            throw ErrorPF2e('Attempted to roll an attack without an actor!');
        }

        // Get item and actor data and format it for the damage roll
        const item = this.data;
        const itemData = item.data;
        const rollData: (RawNPCData | RawHazardData) & { item?: MeleeDetailsData } = duplicate(this.actor.data.data);
        let parts: Array<string | number> = [];
        const partsType: string[] = [];

        // If the NPC is using the updated NPC Attack data object
        if (itemData.damageRolls && typeof itemData.damageRolls === 'object') {
            Object.keys(itemData.damageRolls).forEach((key) => {
                if (itemData.damageRolls[key].damage) parts.push(itemData.damageRolls[key].damage);
                partsType.push(`${itemData.damageRolls[key].damage} ${itemData.damageRolls[key].damageType}`);
            });
        } else {
            parts = [(itemData as any).damage.die];
        }

        // Set the title of the roll
        const title = `${this.name}: ${partsType.join(', ')}`;

        // do nothing if no parts are provided in the damage roll
        if (parts.length === 0) {
            console.log('PF2e System | No damage parts provided in damage roll');
            parts = ['0'];
        }

        const traits = this.actor.data.data.traits.traits.value;
        if (traits.some((trait) => trait === 'elite')) {
            parts.push('+2');
        } else if (traits.some((trait) => trait === 'weak')) {
            parts.push('-2');
        }

        // Call the roll helper utility
        rollData.item = itemData;
        DicePF2e.damageRoll({
            event,
            parts,
            critical,
            actor: this.actor,
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

    /**
     * Roll Spell Damage
     * Rely upon the DicePF2e.d20Roll logic for the core implementation
     */
    rollSpellAttack(event: JQuery.ClickEvent, multiAttackPenalty = 1) {
        let item: ItemDataPF2e = this.data;
        if (item.type === 'consumable' && item.data.spell?.data) {
            item = item.data.spell.data;
        }
        if (item.type !== 'spell') throw new Error('Wrong item type!');
        if (!this.actor) throw new Error('Attempted to cast a spell without an actor');

        // Prepare roll data
        const trickMagicItemData = item.data.trickMagicItemData;
        const itemData = item.data;
        const rollData = duplicate(this.actor.data.data);
        const spellcastingEntry = this.actor.itemTypes.spellcastingEntry.find(
            (entry) => entry.id === itemData.location.value,
        )?.data;
        const useTrickData = !spellcastingEntry;

        if (useTrickData && !trickMagicItemData)
            throw new Error('Spell points to location that is not a spellcasting type');

        // calculate multiple attack penalty
        const map = this.calculateMap();

        if (spellcastingEntry && spellcastingEntry.data.attack?.roll) {
            const options = this.actor
                .getRollOptions(['all', 'attack-roll', 'spell-attack-roll'])
                .concat(...this.traits);
            const modifiers: ModifierPF2e[] = [];
            if (multiAttackPenalty > 1) {
                modifiers.push(new ModifierPF2e(map.label, map[`map${multiAttackPenalty}`], 'untyped'));
            }
            spellcastingEntry.data.attack.roll({ event, options, modifiers });
        } else {
            const spellAttack = useTrickData
                ? trickMagicItemData?.data.spelldc.value
                : spellcastingEntry?.data.spelldc.value;
            const parts = [Number(spellAttack) || 0];
            const title = `${this.name} - Spell Attack Roll`;

            const traits = this.actor.data.data.traits.traits.value;
            if (traits.some((trait) => trait === 'elite')) {
                parts.push(2);
            } else if (traits.some((trait) => trait === 'weak')) {
                parts.push(-2);
            }

            if (multiAttackPenalty > 1) {
                parts.push(map[`map${multiAttackPenalty}`]);
            }

            // Call the roll helper utility
            DicePF2e.d20Roll({
                event,
                parts,
                data: rollData,
                rollType: 'attack-roll',
                title,
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                dialogOptions: {
                    width: 400,
                    top: event.clientY - 80,
                    left: window.innerWidth - 710,
                },
            });
        }
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
     * Roll Spell Damage
     * Rely upon the DicePF2e.damageRoll logic for the core implementation
     */
    rollSpellDamage(event: JQuery.ClickEvent) {
        let item = this.data;
        if (item.type === 'consumable' && item.data.spell?.data) {
            item = item.data.spell.data;
        }
        if (item.type !== 'spell') throw new Error('Wrong item type!');

        // Get data
        const itemData = item.data;
        const rollData = duplicate(this.actor.data.data) as any;
        const isHeal = itemData.spellType.value === 'heal';
        const damageType = game.i18n.localize(CONFIG.PF2E.damageTypes[itemData.damageType.value]);

        const spellLvl = ItemPF2e.findSpellLevel(event);
        const spell = new SpellFacade(item, { castingActor: this.actor, castLevel: spellLvl });
        const parts = spell.damageParts;

        // Append damage type to title
        const damageLabel = game.i18n.localize(isHeal ? 'PF2E.SpellTypeHeal' : 'PF2E.DamageLabel');
        let title = `${this.name} - ${damageLabel}`;
        if (damageType && !isHeal) title += ` (${damageType})`;

        // Add item to roll data
        if (!spell.spellcastingEntry?.data && spell.data.data.trickMagicItemData) {
            rollData.mod = rollData.abilities[spell.data.data.trickMagicItemData.ability].mod;
        } else {
            rollData.mod = rollData.abilities[spell.spellcastingEntry?.ability ?? 'int'].mod;
        }
        rollData.item = itemData;

        if (this.isOwned) {
            const traits = this.actor.data.data.traits.traits.value;
            if (traits.some((trait) => trait === 'elite')) {
                parts.push(4);
            } else if (traits.some((trait) => trait === 'weak')) {
                parts.push(-4);
            }
        }

        // Call the roll helper utility
        DicePF2e.damageRoll({
            event,
            parts,
            data: rollData,
            actor: this.actor,
            title,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            dialogOptions: {
                width: 400,
                top: event.clientY - 80,
                left: window.innerWidth - 710,
            },
        });
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
    async rollConsumable(this: Owned<ItemPF2e>, _event: JQuery.ClickEvent): Promise<void> {
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
                this.castEmbeddedSpell();
            } else if (this.actor.itemTypes.feat.some((feat) => feat.slug === 'trick-magic-item')) {
                new TrickMagicItemPopup(this);
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

    async castEmbeddedSpell(trickMagicItemData?: TrickMagicItemCastData): Promise<void> {
        if (this.data.type !== 'consumable' || !this.actor) return;
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
            await ChatMessage.create(chatData, { displaySheet: false });
        }
    }

    calculateMap(): { label: string; map2: number; map3: number } {
        return ItemPF2e.calculateMap(this.data);
    }

    static calculateMap(item: ItemDataPF2e): { label: string; map2: number; map3: number } {
        if (item.type === 'melee' || item.type === 'weapon') {
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

    /**
     * Don't allow the user to create a condition or spellcasting entry from the sidebar.
     * @override
     */
    static async createDialog(data: { folder?: string } = {}, options: FormApplicationOptions = {}): Promise<ItemPF2e> {
        const original = game.system.entityTypes.Item;
        game.system.entityTypes.Item = original.filter(
            (itemType: string) =>
                !(['condition', 'martial', 'spellcastingEntry'].includes(itemType) && BUILD_MODE === 'production'),
        );
        const newItem = super.createDialog(data, options);
        game.system.entityTypes.Item = original;
        return newItem as Promise<ItemPF2e>;
    }
}

export interface ItemPF2e {
    data: ItemDataPF2e;
    _data: ItemDataPF2e;

    getFlag(scope: string, key: string): any;
    getFlag(scope: 'core', key: 'sourceId'): string | undefined;
}
