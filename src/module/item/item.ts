/* global game, canvas, CONFIG */
/**
 * Override and extend the basic :class:`Item` implementation
 */
import { Spell } from './spell';
import { getAttackBonus, getArmorBonus, getStrikingDice } from './runes';
import { addSign } from '../utils';
import { ProficiencyModifier } from '../modifiers';
import { DicePF2e } from '../../scripts/dice';
import { PF2EActor } from '../actor/actor';
import { ItemData } from './dataDefinitions';
import { parseTraits, TraitChatEntry } from '../traits';

class ItemTraits {
    value: Array<string>;
    custom: string;
}

/**
 * @category PF2
 */
export class PF2EItem extends Item<PF2EActor> {
    /** @override */
    data!: ItemData;

    constructor(data: ItemData, options?: any) {
        if (options?.pf2e?.ready) {
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

    /**
     * Roll the item to Chat, creating a chat card which contains follow up attack or damage roll options
     */
    async roll(event?: JQuery.TriggeredEvent): Promise<ChatMessage> {
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
        const chatData: any = {
            user: game.user._id,
            speaker: {
                actor: this.actor._id,
                token: this.actor.token,
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

    getChatData(htmlOptions?, rollOptions?: any) {
        const itemType = this.data.type;
        const data = this[`_${itemType}ChatData`](rollOptions);
        if (data) {
            data.description.value = TextEditor.enrichHTML(data.description.value, htmlOptions);
        }
        return data;
    }

    getSpellInfo() {
        return this._spellChatData();
    }

    /* -------------------------------------------- */

    _armorChatData() {
        const localize = game.i18n.localize.bind(game.i18n);
        const data: any = duplicate(this.data.data);
        const properties = [
            CONFIG.PF2E.armorTypes[data.armorType.value],
            CONFIG.PF2E.armorGroups[data.group.value],
            `${addSign(getArmorBonus(data))} ${localize('PF2E.ArmorArmorLabel')}`,
            `${data.dex.value || 0} ${localize('PF2E.ArmorDexLabel')}`,
            `${data.check.value || 0} ${localize('PF2E.ArmorCheckLabel')}`,
            `${data.speed.value || 0} ${localize('PF2E.ArmorSpeedLabel')}`,
            data.traits.value,
            data.equipped.value ? localize('PF2E.ArmorEquippedLabel') : null,
        ];
        data.properties = properties.filter((p) => p !== null);

        data.traits = null;
        return data;
    }

    /* -------------------------------------------- */

    _equipmentChatData() {
        const data: any = duplicate(this.data.data);
        const properties = [data.equipped.value ? game.i18n.localize('PF2E.EquipmentEquippedLabel') : null];
        data.properties = properties.filter((p) => p !== null);
        return data;
    }

    /* -------------------------------------------- */

    _weaponChatData() {
        const data: any = duplicate(this.data.data);
        const actorData = this.actor.data;
        const traits = PF2EItem.traitChatData(data.traits, CONFIG.PF2E.weaponTraits);
        const twohandedRegex = '(\\btwo-hand\\b)-(d\\d+)';
        const twohandedTrait = data.traits.value.find((trait) => trait.match(twohandedRegex)) !== undefined;

        if (this.data.type !== 'weapon') {
            throw new Error('tried to create a weapon chat data for a non-weapon item');
        }

        // calculate attackRoll modifier (for _onItemSummary)
        const isFinesse = (data.traits.value || []).includes('finesse');
        const abl =
            isFinesse && actorData.data.abilities.dex.mod > actorData.data.abilities.str.mod
                ? 'dex'
                : data.ability.value || 'str';

        const prof = data.weaponType.value || 'simple';
        // if a default martial proficiency then lookup the martial value, else find the martialSkill item and get the value from there.
        const proficiency = {
            type: 'default',
            value: 0,
        };
        if (Object.keys(CONFIG.PF2E.weaponTypes).includes(prof)) {
            proficiency.type = 'martial';
            proficiency.value = (actorData.data as any).martial?.[prof]?.value || 0;
        } else {
            try {
                const martialSkill = this.actor.getOwnedItem(prof);
                if (martialSkill.data.type === 'martial') {
                    proficiency.type = 'skill';
                    const rank = martialSkill.data.data.proficient?.value || 0;
                    proficiency.value = ProficiencyModifier.fromLevelAndRank(
                        this.actor.data.data.details.level.value,
                        rank,
                    ).modifier;
                }
            } catch (err) {
                console.log(`PF2E | Could not find martial skill for ${prof}`);
            }
        }
        data.proficiency = proficiency;
        data.attackRoll = getAttackBonus(data) + (actorData.data.abilities?.[abl]?.mod ?? 0) + proficiency.value;

        const properties = [
            // (parseInt(data.range.value) > 0) ? `${data.range.value} feet` : null,
            // CONFIG.PF2E.weaponTypes[data.weaponType.value],
            // CONFIG.PF2E.weaponGroups[data.group.value]
        ];

        if (data.group.value) {
            data.critSpecialization = {
                label: CONFIG.PF2E.weaponGroups[data.group.value],
                description: CONFIG.PF2E.weaponDescriptions[data.group.value],
            };
        }

        data.isTwohanded = !!twohandedTrait;
        data.wieldedTwoHands = !!data.hands.value;
        data.isFinesse = isFinesse;
        data.properties = properties.filter((p) => !!p);
        data.traits = traits.filter((p) => !!p);

        const map = this.calculateMap();
        data.map2 = map.map2;
        data.map3 = map.map3;
        return data;
    }

    /* -------------------------------------------- */

    _meleeChatData() {
        const data: any = duplicate(this.data.data);
        const traits = PF2EItem.traitChatData(data.traits, CONFIG.PF2E.weaponTraits);

        const isAgile = (data.traits.value || []).includes('agile');
        data.map2 = isAgile ? '-4' : '-5';
        data.map3 = isAgile ? '-8' : '-10';
        data.traits = traits.filter((p) => !!p);
        return data;
    }

    /* -------------------------------------------- */

    _consumableChatData() {
        const localize = game.i18n.localize.bind(game.i18n);
        const data: any = duplicate(this.data.data);
        data.consumableType.str = CONFIG.PF2E.consumableTypes[data.consumableType.value];
        data.properties = [
            data.consumableType.str,
            `${data.charges.value}/${data.charges.max} ${localize('PF2E.ConsumableChargesLabel')}`,
        ];
        data.hasCharges = data.charges.value >= 0;
        return data;
    }

    _treasureChatData() {
        const data: any = duplicate(this.data.data);
        return data;
    }

    /* -------------------------------------------- */

    _toolChatData() {
        const data: any = duplicate(this.data.data);
        const abl = this.actor.data.data.abilities[data.ability.value].label;
        const prof = data.proficient?.value || 0;
        const properties = [abl, CONFIG.PF2E.proficiencyLevels[prof]];
        data.properties = properties.filter((p) => p !== null);
        return data;
    }

    /* -------------------------------------------- */

    _loreChatData() {
        const data: any = duplicate(this.data.data);
        if (this.actor.data.type !== 'npc') {
            const abl = this.actor.data.data.abilities[data.ability.value].label;
            const prof = data.proficient.value || 0;
            const properties = [abl, CONFIG.PF2E.proficiencyLevels[prof]];
            data.properties = properties.filter((p) => p !== null);
        }
        return data;
    }

    /* -------------------------------------------- */

    private static traitChatData(itemTraits: ItemTraits, traitList: Record<string, string>): TraitChatEntry[] {
        let traits = parseTraits(itemTraits.value);
        const customTraits = parseTraits(itemTraits.custom);

        if (customTraits.length > 0) {
            traits = traits.concat(customTraits);
        }

        const traitChatLabels = [];

        for (const trait of traits) {
            const traitsObject = new TraitChatEntry(trait, traitList);

            traitChatLabels.push(traitsObject);
        }

        return traitChatLabels;
    }

    /* -------------------------------------------- */

    _backpackChatData() {
        const data: any = duplicate(this.data.data);
        data.properties = [];
        return data;
    }

    /* -------------------------------------------- */

    _spellChatData(rollOptions?: any) {
        const localize = game.i18n.localize.bind(game.i18n);
        const data: any = duplicate(this.data.data);

        const spellcastingEntry = this.actor.getOwnedItem(data.location.value);

        if (spellcastingEntry === null || spellcastingEntry.data.type !== 'spellcastingEntry') return {};

        const spellDC = spellcastingEntry.data.data.spelldc.dc;
        const spellAttack = spellcastingEntry.data.data.spelldc.value;

        // Spell saving throw text and DC
        data.isSave = data.spellType.value === 'save';

        if (data.isSave) {
            data.save.dc = spellDC;
        } else data.save.dc = spellAttack;
        data.save.str = data.save.value ? CONFIG.PF2E.saves[data.save.value.toLowerCase()] : '';

        // Spell attack labels
        data.damageLabel =
            data.spellType.value === 'heal' ? localize('PF2E.SpellTypeHeal') : localize('PF2E.DamageLabel');
        data.isAttack = data.spellType.value === 'attack';

        // Combine properties
        const props = [
            CONFIG.PF2E.spellLevels[data.level.value],
            `${localize('PF2E.SpellComponentsLabel')}: ${data.components.value}`,
            data.range.value ? `${localize('PF2E.SpellRangeLabel')}: ${data.range.value}` : null,
            data.target.value ? `${localize('PF2E.SpellTargetLabel')}: ${data.target.value}` : null,
            data.area.value
                ? `${localize('PF2E.SpellAreaLabel')}: ${CONFIG.PF2E.areaSizes[data.area.value]} ${
                      CONFIG.PF2E.areaTypes[data.area.areaType]
                  }`
                : null,
            data.areasize?.value ? `${localize('PF2E.SpellAreaLabel')}: ${data.areasize.value}` : null,
            data.time.value ? `${localize('PF2E.SpellTimeLabel')}: ${data.time.value}` : null,
            data.duration.value ? `${localize('PF2E.SpellDurationLabel')}: ${data.duration.value}` : null,
        ];
        data.spellLvl = (rollOptions || {}).spellLvl;
        if (data.level.value < parseInt(data.spellLvl, 10)) {
            props.push(`Heightened: +${parseInt(data.spellLvl, 10) - data.level.value}`);
        }
        data.properties = props.filter((p) => p !== null);

        const traits = PF2EItem.traitChatData(data.traits, CONFIG.PF2E.spellTraits);
        data.traits = traits.filter((p) => p);
        // Toggling this off for now
        /*     data.area = data.area.value ? {
      "label": `Area: ${CONFIG.PF2E.areaSizes[data.area.value]} ${CONFIG.PF2E.areaTypes[data.area.areaType]}`,
      "areaType": data.area.areaType,
      "size": data.area.value
    } : null; */

        return data;
    }

    /* -------------------------------------------- */

    /**
     * Prepare chat card data for items of the "Feat" type
     */
    _featChatData() {
        const data: any = duplicate(this.data.data);

        /*     let traits = [];
    if ((data.traits.value || []).length != 0) {
      traits = duplicate(data.traits.value);
      for(var i = 0 ; i < traits.length ; i++){
        traits[i] = traits[i].charAt(0).toUpperCase() + traits[i].substr(1);
      }
    } */

        // Feat properties
        const props = [
            `Level ${data.level.value || 0}`,
            data.actionType.value ? CONFIG.PF2E.actionTypes[data.actionType.value] : null,
        ];
        // if (traits.length != 0) props = props.concat(traits);

        data.properties = props.filter((p) => p);

        const traits = PF2EItem.traitChatData(data.traits, CONFIG.PF2E.featTraits);
        data.traits = traits.filter((p) => p);
        return data;
    }

    _actionChatData() {
        const data: any = duplicate(this.data.data);

        /* let traits = [];
    if ((data.traits.value || []).length != 0) {
      traits = duplicate(data.traits.value);
      for(var i = 0 ; i < traits.length ; i++){
        traits[i] = traits[i].charAt(0).toUpperCase() + traits[i].substr(1);
      }
    } */

        let associatedWeapon = null;
        if (data.weapon.value) associatedWeapon = this.actor.getOwnedItem(data.weapon.value);

        // Feat properties
        const props = [CONFIG.PF2E.actionTypes[data.actionType.value], associatedWeapon ? associatedWeapon.name : null];
        // if (traits.length != 0) props = props.concat(traits);

        data.properties = props.filter((p) => p);

        const traits = PF2EItem.traitChatData(data.traits, CONFIG.PF2E.featTraits);
        data.traits = traits.filter((p) => p);

        return data;
    }

    _conditionChatData() {
        const data: any = duplicate(this.data.data);
        data.properties = [];
        return data;
    }

    _effectChatData() {
        const data: any = duplicate(this.data.data);
        data.properties = [];
        return data;
    }

    /* -------------------------------------------- */
    /*  Roll Attacks
  /* -------------------------------------------- */

    /**
     * Roll a Weapon Attack
     * Rely upon the DicePF2e.d20Roll logic for the core implementation
     */
    rollWeaponAttack(event, multiAttackPenalty?) {
        if (this.type === 'action') {
            throw new Error('Wrong item type!');
        }
        if (this.type !== 'weapon' && this.type !== 'melee') throw new Error('Wrong item type!');

        // Prepare roll data
        // let itemData = this.data.data,
        const itemData = this.getChatData();
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
                top: event ? event.clientY - 80 : 400,
                left: window.innerWidth - 710,
            },
        });
    }

    /* -------------------------------------------- */

    /**
     * Roll Weapon Damage
     * Rely upon the DicePF2e.damageRoll logic for the core implementation
     */
    rollWeaponDamage(event, critical = false) {
        const localize = game.i18n.localize.bind(game.i18n);

        const item: ItemData = this.data;
        // Check to see if this is a damage roll for either: a weapon, a NPC attack or an action associated with a weapon.
        if (item.type !== 'weapon') throw new Error('Wrong item type!');
        const itemData = item.data;

        // Get item and actor data and format it for the damage roll
        const rollData = duplicate(this.actor.data.data) as any;
        let rollDie = itemData.damage.die;
        const abl = 'str';
        let abilityMod = rollData.abilities[abl].mod;
        let parts = [];
        const partsCritOnly = [];
        const dtype = CONFIG.PF2E.damageTypes[itemData.damage.damageType];

        // Get detailed trait information from item
        const traits = itemData.traits.value || [];
        let critTrait = '';
        let critDie = '';
        let bonusDamage = 0;
        let twohandedTrait = false;
        let twohandedDie = '';
        let thrownTrait = false;
        const len = traits.length;
        const critRegex = '(\\bdeadly\\b|\\bfatal\\b)-(d\\d+)';
        const twohandedRegex = '(\\btwo-hand\\b)-(d\\d+)';
        const thrownRegex = '(\\bthrown\\b)-(\\d+)';
        const hasThiefRacket =
            this.actor.data.items.filter((e) => e.type === 'feat' && e.name === 'Thief Racket').length > 0;
        const strikingDice = getStrikingDice(itemData);

        if (hasThiefRacket && rollData.abilities.dex.mod > abilityMod) abilityMod = rollData.abilities.dex.mod;

        // Find detailed trait information
        for (let i = 0; i < len; i++) {
            if (traits[i].match(critRegex)) {
                critTrait = traits[i].match(critRegex)[1];
                critDie = traits[i].match(critRegex)[2];
            } else if (traits[i].match(twohandedRegex)) {
                twohandedTrait = true;
                twohandedDie = traits[i].match(twohandedRegex)[2];
            } else if (traits[i].match(thrownRegex)) {
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
        } else if ((itemData.traits.value || []).includes('propulsive')) {
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
     * Roll a NPC Attack
     * Rely upon the DicePF2e.d20Roll logic for the core implementation
     */
    rollNPCAttack(event, multiAttackPenalty?) {
        if (this.type !== 'melee') throw new Error('Wrong item type!');

        // Prepare roll data
        // let itemData = this.data.data,
        const itemData = this.getChatData();
        const rollData = duplicate(this.actor.data.data) as any;
        const parts = ['@itemBonus'];
        const title = `${this.name} - Attack Roll${multiAttackPenalty > 1 ? ` (MAP ${multiAttackPenalty})` : ''}`;

        rollData.item = itemData;
        // rollData.itemBonus = getAttackBonus(itemData); // @putt1 rolling this change back as getAttackBonus does not handle NPCs correctly - hooking
        rollData.itemBonus = itemData.bonus.value;

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
    rollNPCDamage(event, critical = false) {
        const item: ItemData = this.data;
        if (item.type !== 'melee') throw new Error('Wrong item type!');

        // Get item and actor data and format it for the damage roll
        const itemData = item.data;
        const rollData = duplicate(this.actor.data.data) as any;
        let parts = [];
        const partsType = [];
        const dtype = []; // CONFIG.PF2E.damageTypes[itemData.damage.damageType];

        // If the NPC is using the updated NPC Attack data object
        if (itemData.damageRolls && typeof itemData.damageRolls === 'object') {
            Object.keys(itemData.damageRolls).forEach((key) => {
                if (itemData.damageRolls[key].damage) parts.push(itemData.damageRolls[key].damage);
                partsType.push(`${itemData.damageRolls[key].damage} ${itemData.damageRolls[key].damageType}`);
            });
        } else if (itemData.damageRolls && itemData.damageRolls.length) {
            // this can be removed once existing NPCs are migrated to use new damageRolls object (rather than an array)
            itemData.damageRolls.forEach((entry) => {
                parts.push(entry.damage);
                partsType.push(`${entry.damage} ${entry.damageType}`);
            });
        } else {
            parts = [(itemData as any).damage.die];
        }

        // Set the title of the roll
        let title = `${this.name}: ${partsType.join(', ')}`;
        if (dtype.length) title += ` (${dtype})`;

        // do nothing if no parts are provided in the damage roll
        if (parts.length === 0) {
            console.log('PF2e System | No damage parts provided in damage roll');
            parts = ['0'];
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
    rollSpellcastingEntryCheck(event) {
        // Prepare roll data
        const itemData: ItemData = this.data;
        if (itemData.type !== 'spellcastingEntry') throw new Error('Wrong item type!');
        const rollData = duplicate(this.actor.data.data);
        const modifier = itemData.data.spelldc.value;
        const parts = [modifier];
        const title = `${this.name} - Spellcasting Check`;

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
    rollSpellAttack(event, multiAttackPenalty?) {
        const item: ItemData = this.data;
        if (item.type !== 'spell') throw new Error('Wrong item type!');

        // Prepare roll data
        const itemData = item.data;
        const rollData = duplicate(this.actor.data.data);
        const spellcastingEntry = this.actor.getOwnedItem(itemData.location.value);
        if (spellcastingEntry.data.type !== 'spellcastingEntry')
            throw new Error('Spell points to location that is not a spellcasting type');

        const spellAttack = spellcastingEntry.data.data.spelldc.value;
        const parts: number[] = [spellAttack];
        const title = `${this.name} - Spell Attack Roll`;

        const map = this.calculateMap();
        if (multiAttackPenalty === 2) parts.push(map.map2);
        else if (multiAttackPenalty === 3) parts.push(map.map3);

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

    /* -------------------------------------------- */

    /**
     * Roll Spell Damage
     * Rely upon the DicePF2e.damageRoll logic for the core implementation
     */
    rollSpellDamage(event) {
        const item: ItemData = this.data;
        if (item.type !== 'spell') throw new Error('Wrong item type!');

        const localize = game.i18n.localize.bind(game.i18n);

        const button = event.currentTarget;
        const card = button.closest('*[data-spell-lvl]');
        const cardData = card ? card.dataset : {};

        // Get data
        const itemData = item.data;
        const rollData = duplicate(this.actor.data.data) as any;
        const isHeal = itemData.spellType.value === 'heal';
        const dtype = CONFIG.PF2E.damageTypes[itemData.damageType.value];

        const spellLvl = parseInt(cardData.spellLvl, 10);
        const spell = new Spell(this.data, { castingActor: this.actor, castLevel: spellLvl });
        const parts = spell.damageParts;

        // Append damage type to title
        const damageLabel = isHeal ? localize('PF2E.SpellTypeHeal') : localize('PF2E.DamageLabel');
        let title = `${this.name} - ${damageLabel}`;
        if (dtype && !isHeal) title += ` (${dtype})`;

        // Add item to roll data
        rollData.mod = rollData.abilities[spell.spellcastingEntry.ability].mod;
        rollData.item = itemData;

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

    /* -------------------------------------------- */

    /**
     * Use a consumable item
     */
    rollConsumable(ev) {
        const item: ItemData = this.data;
        if (item.type !== 'consumable') throw Error('Tried to roll consumable on a non-consumable');

        const itemData = item.data;
        // Submit the roll to chat
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

        // Deduct consumed charges from the item
        if (itemData.autoUse.value) {
            const qty = itemData.quantity;
            const chg = itemData.charges;

            // Deduct an item quantity
            if (chg.value <= 1 && qty.value > 1) {
                const options = {
                    _id: this.data._id,
                    'data.quantity.value': Math.max(qty.value - 1, 0),
                    'data.charges.value': chg.max,
                };
                this.actor.updateEmbeddedEntity('OwnedItem', options);
            }

            // Optionally destroy the item
            else if (chg.value <= 1 && qty.value <= 1 && itemData.autoDestroy.value) {
                this.actor.deleteEmbeddedEntity('OwnedItem', this.data._id);
            }

            // Deduct the remaining charges
            else {
                this.actor.updateEmbeddedEntity('OwnedItem', {
                    _id: this.data._id,
                    'data.charges.value': Math.max(chg.value - 1, 0),
                });
            }
        }
    }

    calculateMap(): { map2: number; map3: number } {
        return PF2EItem.calculateMap(this.data);
    }

    static calculateMap(item: ItemData): { map2: number; map3: number } {
        if (['melee', 'weapon'].includes(item.type)) {
            // calculate multiple attack penalty tiers
            const agile = (item.data.traits.value || []).includes('agile');
            const alternateMAP = ((item.data as any).MAP || {}).value;
            switch (alternateMAP) {
                case '1':
                    return { map2: -1, map3: -2 };
                case '2':
                    return { map2: -2, map3: -4 };
                case '3':
                    return { map2: -3, map3: -6 };
                case '4':
                    return { map2: -4, map3: -8 };
                case '5':
                    return { map2: -5, map3: -10 };
                default: {
                    if (agile) return { map2: -4, map3: -8 };
                    else return { map2: -5, map3: -10 };
                }
            }
        }
        return { map2: -5, map3: -10 };
    }

    /* -------------------------------------------- */

    /* -------------------------------------------- */

    static chatListeners(html) {
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
            let actor;
            const tokenKey = card.attr('data-token-id');
            if (tokenKey) {
                const [sceneId, tokenId] = tokenKey.split('.');
                let token;
                if (sceneId === canvas.scene._id) token = canvas.tokens.get(tokenId);
                else {
                    const scene = game.scenes.get(sceneId);
                    if (!scene) return;
                    const tokenData = scene.data.tokens.find((t) => t._id === tokenId);
                    if (tokenData) token = new Token(tokenData);
                }
                if (!token) return;
                actor = Actor.fromToken(token);
            } else actor = game.actors.get(card.attr('data-actor-id'));

            // Get the Item
            if (!actor) return;
            const itemId = card.attr('data-item-id');
            const itemData = (actor.getOwnedItem(itemId) || {}).data;
            if (itemData) {
                const item = new PF2EItem(itemData, { actor });
                // Weapon attack
                if (action === 'weaponAttack') item.rollWeaponAttack(ev);
                else if (action === 'weaponAttack2') item.rollWeaponAttack(ev, 2);
                else if (action === 'weaponAttack3') item.rollWeaponAttack(ev, 3);
                else if (action === 'weaponDamage') item.rollWeaponDamage(ev);
                else if (action === 'weaponDamageCritical') item.rollWeaponDamage(ev, true);
                else if (action === 'npcAttack') item.rollNPCAttack(ev);
                else if (action === 'npcAttack2') item.rollNPCAttack(ev, 2);
                else if (action === 'npcAttack3') item.rollNPCAttack(ev, 3);
                else if (action === 'npcDamage') item.rollNPCDamage(ev);
                else if (action === 'npcDamageCritical') item.rollNPCDamage(ev, true);
                else if (action === 'criticalDamage') item.rollWeaponDamage(ev, true);
                // Spell actions
                else if (action === 'spellAttack') item.rollSpellAttack(ev);
                else if (action === 'spellAttack2') item.rollSpellAttack(ev, 2);
                else if (action === 'spellAttack3') item.rollSpellAttack(ev, 3);
                else if (action === 'spellDamage') item.rollSpellDamage(ev);
                // Consumable usage
                else if (action === 'consume') item.rollConsumable(ev);
                else if (action === 'save') PF2EActor.rollSave(ev, item);

                return;
            }

            const strikeIndex = card.attr('data-strike-index');
            const strikeName = card.attr('data-strike-name');
            const strikeAction = actor.data.data.actions[Number(strikeIndex)];

            if (strikeAction && strikeAction.name === strikeName) {
                const opts = actor.getRollOptions(['all', 'attack-roll']);
                if (action === 'strikeAttack') strikeAction.variants[0].roll(ev, opts);
                else if (action === 'strikeAttack2') strikeAction.variants[1].roll(ev, opts);
                else if (action === 'strikeAttack3') strikeAction.variants[2].roll(ev, opts);
                else if (action === 'strikeDamage') strikeAction.damage(ev, opts);
                else if (action === 'strikeCritical') strikeAction.critical(ev, opts);
            }
        });
    }
}
