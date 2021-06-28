import { ChatMessagePF2e } from '@module/chat-message';
import {
    AbilityModifier,
    ensureProficiencyOption,
    ModifierPF2e,
    ProficiencyModifier,
    StatisticModifier,
} from '@module/modifiers';
import { ErrorPF2e } from '@module/utils';
import { DicePF2e } from '@scripts/dice';
import { ActorPF2e } from '../actor/base';
import { RuleElements } from '../rules/rules';
import { ItemDataPF2e, ItemSourcePF2e, TraitChatData } from './data';
import { isItemSystemData } from './data/helpers';
import { MeleeSystemData } from './melee/data';
import { getAttackBonus, getStrikingDice } from './runes';
import { ItemSheetPF2e } from './sheet/base';
import { AbilityString } from '@actor/data/base';
import { isCreatureData } from '@actor/data/helpers';
import { NPCSystemData } from '@actor/npc/data';
import { HazardSystemData } from '@actor/hazard/data';
import { CheckPF2e } from '@system/rolls';
import { ItemTrait } from './data/base';

interface ItemConstructionContextPF2e extends DocumentConstructionContext<ItemPF2e> {
    pf2e?: {
        ready?: boolean;
    };
}

/** Override and extend the basic :class:`Item` implementation */
export class ItemPF2e extends Item<ActorPF2e> {
    /** Has this item gone through at least one cycle of data preparation? */
    private initialized!: boolean;

    constructor(data: PreCreate<ItemSourcePF2e>, context: ItemConstructionContextPF2e = {}) {
        if (context.pf2e?.ready) {
            super(data, context);
            this.initialized = false;
        } else {
            const ready = { pf2e: { ready: true } };
            return new CONFIG.PF2E.Item.documentClasses[data.type](data, { ...ready, ...context });
        }
    }

    /** The sluggified name of the item **/
    get slug(): string | null {
        return this.data.data.slug;
    }

    /** The compendium source ID of the item **/
    get sourceId() {
        return this.getFlag('core', 'sourceId');
    }

    get traits(): Set<ItemTrait> {
        return new Set(this.data.data.traits.value);
    }

    get description(): string {
        return this.data.data.description.value;
    }

    /** Redirect the deletion of any owned items to ActorPF2e#deleteEmbeddedDocuments for a single workflow */
    override async delete(context: DocumentModificationContext = {}) {
        if (this.actor) {
            await this.actor.deleteEmbeddedDocuments('Item', [this.id], context);
            return this;
        }
        return super.delete(context);
    }

    /**
     * Create a chat card for this item and send it to the chat log. Many cards contain follow-up options for attack
     * rolls, effect application, etc.
     */
    async toChat(this: Embedded<ItemPF2e>, event?: JQuery.TriggeredEvent): Promise<ChatMessagePF2e | undefined> {
        // Basic template rendering data
        const template = `systems/pf2e/templates/chat/${this.data.type}-card.html`;
        const { token } = this.actor;
        const nearestItem = event ? event.currentTarget.closest('.item') : {};
        const contextualData = nearestItem.dataset || {};
        const templateData = {
            actor: this.actor,
            tokenId: token ? `${token.parent?.id}.${token.id}` : null,
            item: this,
            data: this.getChatData(undefined, contextualData),
        };

        // Basic chat message data
        const chatData: PreCreate<foundry.data.ChatMessageSource> = {
            speaker: {
                actor: this.actor.id,
                token: this.actor.getActiveTokens()[0]?.id,
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
            chatData.whisper = ChatMessagePF2e.getWhisperRecipients('GM').map((u) => u.id);
        if (rollMode === 'blindroll') chatData.blind = true;

        // Render the template
        chatData.content = await renderTemplate(template, templateData);

        // Create the chat message
        return ChatMessagePF2e.create(chatData, { renderSheet: false });
    }

    /** Refresh the Item Directory if this item isn't owned */
    override prepareDerivedData(): void {
        super.prepareDerivedData();
        if (!this.isOwned && ui.items && this.initialized) ui.items.render();
        this.initialized = true;
    }

    /* -------------------------------------------- */
    /*  Chat Card Data                              */
    /* -------------------------------------------- */

    /**
     * Internal method that transforms data into something that can be used for chat.
     * Currently renders description text using TextEditor.enrichHTML()
     */
    protected processChatData<T>(htmlOptions: EnrichHTMLOptions = {}, data: T): T {
        if (isItemSystemData(data)) {
            const chatData = duplicate(data);
            chatData.description.value = TextEditor.enrichHTML(chatData.description.value, htmlOptions);
            return chatData;
        }

        return data;
    }

    getChatData(
        this: Embedded<ItemPF2e>,
        htmlOptions: EnrichHTMLOptions = {},
        _rollOptions: Record<string, any> = {},
    ): Record<string, unknown> {
        return this.processChatData(htmlOptions, {
            ...duplicate(this.data.data),
            traits: this.traitChatData(),
        });
    }

    protected traitChatData(dictionary: Record<string, string> = {}): TraitChatData[] {
        const traits: string[] = [...this.traits].sort();
        const customTraits = this.data.data.traits.custom
            .trim()
            .split(/\s*[,;|]\s*/)
            .filter((trait) => trait);
        traits.push(...customTraits);

        const traitChatLabels = traits.map((trait) => {
            const label = dictionary[trait] || trait.charAt(0).toUpperCase() + trait.slice(1);
            const traitDescriptions: Record<string, string> = CONFIG.PF2E.traitsDescriptions;

            return {
                value: trait,
                label,
                description: traitDescriptions[trait],
            };
        });

        return traitChatLabels;
    }

    /* -------------------------------------------- */
    /*  Roll Attacks                                */
    /* -------------------------------------------- */

    /**
     * Roll a Weapon Attack
     * Rely upon the DicePF2e.d20Roll logic for the core implementation
     */
    rollWeaponAttack(this: Embedded<ItemPF2e>, event: JQuery.ClickEvent, multiAttackPenalty = 1) {
        if (this.type !== 'weapon' && this.type !== 'melee') throw new Error('Wrong item type!');

        // Prepare roll data
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

    /**
     * Roll Weapon Damage
     * Rely upon the DicePF2e.damageRoll logic for the core implementation
     */
    rollWeaponDamage(this: Embedded<ItemPF2e>, event: JQuery.ClickEvent, critical = false) {
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
    rollNPCAttack(this: Embedded<ItemPF2e>, event: JQuery.ClickEvent, multiAttackPenalty = 1) {
        if (this.type !== 'melee') throw ErrorPF2e('Wrong item type!');
        if (this.actor?.data.type !== 'npc' && this.actor?.data.type !== 'hazard') {
            throw ErrorPF2e('Attempted to roll an attack without an actor!');
        }
        // Prepare roll data
        const itemData: any = this.getChatData();
        const rollData: (NPCSystemData | HazardSystemData) & { item?: unknown; itemBonus?: number } = duplicate(
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
    rollNPCDamage(this: Embedded<ItemPF2e>, event: JQuery.ClickEvent, critical = false) {
        if (this.data.type !== 'melee') throw ErrorPF2e('Wrong item type!');
        if (this.actor.data.type !== 'npc' && this.actor.data.type !== 'hazard') {
            throw ErrorPF2e('Attempted to roll an attack without an actor!');
        }

        // Get item and actor data and format it for the damage roll
        const item = this.data;
        const itemData = item.data;
        const rollData: (NPCSystemData | HazardSystemData) & { item?: MeleeSystemData } = duplicate(
            this.actor.data.data,
        );
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

    /**
     * Roll Spell Damage
     * Rely upon the DicePF2e.d20Roll logic for the core implementation
     */
    rollSpellcastingEntryCheck(this: Embedded<ItemPF2e>, event: JQuery.ClickEvent) {
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
    rollSpellAttack(this: Embedded<ItemPF2e>, event: JQuery.ClickEvent, multiAttackPenalty = 1) {
        const itemData = deepClone(this.data);
        if (itemData.type !== 'spell') throw new Error('Wrong item type!');

        // Prepare roll data
        const trickMagicItemData = itemData.data.trickMagicItemData;
        const systemData = itemData.data;
        const rollData = duplicate(this.actor.data.data);
        const spellcastingEntry = this.actor.itemTypes.spellcastingEntry.find(
            (entry) => entry.id === systemData.location.value,
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

    /**
     * The heightened level is not transferred correctly to spell chat cards.
     * Therefore you have to look into the triggering's event proximity.
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
    rollSpellDamage(this: Embedded<ItemPF2e>, event: JQuery.ClickEvent) {
        // If this is a consumable, roll spell damage on the consumable instead
        if (this instanceof CONFIG.PF2E.Item.documentClasses.consumable && this.data.data.spell?.data) {
            this.embeddedSpell?.rollSpellDamage(event);
            return;
        }

        if (!(this instanceof CONFIG.PF2E.Item.documentClasses.spell)) {
            throw new Error('Wrong item type!');
        }

        const item = this.toObject();

        // Get data
        const itemData = item.data;
        const rollData = duplicate(this.actor.data.data) as any;
        const isHeal = itemData.spellType.value === 'heal';
        const damageType = game.i18n.localize(CONFIG.PF2E.damageTypes[itemData.damageType.value]);

        const castLevel = ItemPF2e.findSpellLevel(event);
        const parts = this.computeDamageParts(castLevel);

        // Append damage type to title
        const damageLabel = game.i18n.localize(isHeal ? 'PF2E.SpellTypeHeal' : 'PF2E.DamageLabel');
        let title = `${this.name} - ${damageLabel}`;
        if (damageType && !isHeal) title += ` (${damageType})`;

        // Add item to roll data
        if (!this.spellcasting?.data && this.data.data.trickMagicItemData) {
            rollData.mod = rollData.abilities[this.data.data.trickMagicItemData.ability].mod;
        } else {
            rollData.mod = rollData.abilities[this.spellcasting?.ability ?? 'int'].mod;
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
    rollCounteract(this: Embedded<ItemPF2e>, event: JQuery.ClickEvent) {
        const itemData =
            this.data.type === 'consumable' && this.data.data.spell?.data
                ? duplicate(this.data.data.spell.data)
                : this.toObject();
        if (itemData.type !== 'spell') throw new Error('Wrong item type!');

        const spellcastingEntry = this.actor.itemTypes.spellcastingEntry.find(
            (entry) => entry.id === itemData.data.location.value,
        );
        if (!spellcastingEntry) throw ErrorPF2e('Spell points to location that is not a spellcasting type');

        const modifiers: ModifierPF2e[] = [];
        const ability: AbilityString = spellcastingEntry.data.data.ability?.value || 'int';
        const score = this.actor.data.data.abilities[ability]?.value ?? 0;
        modifiers.push(AbilityModifier.fromAbilityScore(ability, score));

        const proficiencyRank = spellcastingEntry.data.data.proficiency.value ?? 0;
        modifiers.push(ProficiencyModifier.fromLevelAndRank(this.actor.data.data.details.level.value, proficiencyRank));

        const rollOptions = ['all', 'counteract-check'];
        const extraOptions = [];
        const traits = itemData.data.traits.value;

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

    /** Don't allow the user to create a condition or spellcasting entry from the sidebar. */
    static override async createDialog(
        data: { folder?: string } = {},
        options: FormApplicationOptions = {},
    ): Promise<ItemPF2e | undefined> {
        const original = game.system.entityTypes.Item;
        game.system.entityTypes.Item = original.filter(
            (itemType: string) =>
                !(['condition', 'martial', 'spellcastingEntry'].includes(itemType) && BUILD_MODE === 'production'),
        );
        const newItem = super.createDialog(data, options) as Promise<ItemPF2e | undefined>;
        game.system.entityTypes.Item = original;
        return newItem;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override _onCreate(data: ItemSourcePF2e, options: DocumentModificationContext, userId: string): void {
        if (this.actor) {
            // Rule Elements
            if (!(isCreatureData(this.actor?.data) && this.canUserModify(game.user, 'update'))) return;
            const rules = RuleElements.fromRuleElementData(this.data.data?.rules ?? [], this.data);
            const tokens = this.actor.getAllTokens();
            const actorUpdates = {};
            for (const rule of rules) {
                rule.onCreate(this.actor.data, this.data, actorUpdates, tokens);
            }
            this.actor.update(actorUpdates);

            // Effect Panel
            game.pf2e.effectPanel.refresh();
        }

        super._onCreate(data, options, userId);
    }

    protected override _onUpdate(
        changed: DeepPartial<this['data']['_source']>,
        options: DocumentModificationContext,
        userId: string,
    ): void {
        if (this.isOwned && this.actor) {
            game.pf2e.effectPanel.refresh();
        }

        super._onUpdate(changed, options, userId);
    }

    protected override _onDelete(options: DocumentModificationContext, userId: string): void {
        if (this.isOwned) {
            if (this.actor) {
                if (this.data.type === 'effect') {
                    game.pf2e.effectTracker.unregister(this.data);
                }

                if (!(isCreatureData(this.actor.data) && this.canUserModify(game.user, 'update'))) return;
                const rules = RuleElements.fromRuleElementData(this.data.data?.rules ?? [], this.data);
                const tokens = this.actor.getAllTokens();
                const actorUpdates = {};
                for (const rule of rules) {
                    rule.onDelete(this.actor.data, this.data, actorUpdates, tokens);
                }
                this.actor.update(actorUpdates);

                game.pf2e.effectPanel.refresh();
            }
        }

        super._onDelete(options, userId);
    }
}

export interface ItemPF2e {
    readonly data: ItemDataPF2e;
    readonly parent: ActorPF2e | null;

    _sheet: ItemSheetPF2e<this>;

    getFlag(scope: 'core', key: 'sourceId'): string;
    getFlag(scope: 'pf2e', key: 'constructing'): true | undefined;
    getFlag(scope: string, key: string): any;
}
