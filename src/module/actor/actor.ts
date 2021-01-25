/* global game, CONFIG, canvas, isObjectEmpty, getProperty */
/**
 * Extend the base Actor class to implement additional logic specialized for PF2e.
 */
import { PF2CheckModifier, PF2DamageDice, PF2Modifier, PF2ModifierPredicate, ProficiencyModifier } from '../modifiers';
import { PF2eConditionManager } from '../conditions';
import { PF2Check } from '../system/rolls';
import { isCycle } from '../item/container';
import { TraitSelector5e } from '../system/trait-selector';
import { DicePF2e } from '../../scripts/dice';
import { PF2EItem } from '../item/item';
import {
    ItemData,
    ConditionData,
    ArmorData,
    PhysicalItemData,
    WeaponData,
    isPhysicalItem,
} from '../item/dataDefinitions';
import {
    CharacterData,
    NpcData,
    InitiativeData,
    DexterityModifierCapData,
    FamiliarData,
    ActorDataPF2e,
    VehicleData,
    HazardData,
} from './actorDataDefinitions';
import { PF2RuleElement, PF2RuleElements } from '../rules/rules';
import {
    PF2MultipleAttackPenalty,
    PF2RuleElementSynthetics,
    PF2Striking,
    PF2WeaponPotency,
} from '../rules/rulesDataDefinitions';
import { parseTraits } from '../traits';
import { PF2EPhysicalItem } from '../item/physical';
import { PF2RollNote } from '../notes';

export const SKILL_DICTIONARY = Object.freeze({
    acr: 'acrobatics',
    arc: 'arcana',
    ath: 'athletics',
    cra: 'crafting',
    dec: 'deception',
    dip: 'diplomacy',
    itm: 'intimidation',
    med: 'medicine',
    nat: 'nature',
    occ: 'occultism',
    prf: 'performance',
    rel: 'religion',
    soc: 'society',
    ste: 'stealth',
    sur: 'survival',
    thi: 'thievery',
});

export const SKILL_EXPANDED = Object.freeze({
    acrobatics: { ability: 'dex', shortform: 'acr' },
    arcana: { ability: 'int', shortform: 'arc' },
    athletics: { ability: 'str', shortform: 'ath' },
    crafting: { ability: 'int', shortform: 'cra' },
    deception: { ability: 'cha', shortform: 'dec' },
    diplomacy: { ability: 'cha', shortform: 'dip' },
    intimidation: { ability: 'cha', shortform: 'itm' },
    medicine: { ability: 'wis', shortform: 'med' },
    nature: { ability: 'wis', shortform: 'nat' },
    occultism: { ability: 'int', shortform: 'occ' },
    performance: { ability: 'cha', shortform: 'prf' },
    religion: { ability: 'wis', shortform: 'rel' },
    society: { ability: 'int', shortform: 'soc' },
    stealth: { ability: 'dex', shortform: 'ste' },
    survival: { ability: 'wis', shortform: 'sur' },
    thievery: { ability: 'dex', shortform: 'thi' },
});

const SUPPORTED_ROLL_OPTIONS = Object.freeze([
    'all',
    'attack-roll',
    'damage-roll',
    'saving-throw',
    'fortitude',
    'reflex',
    'will',
    'perception',
    'initiative',
    'skill-check',
]);

/**
 * @category Actor
 */
export class PF2EActor extends Actor<PF2EItem> {
    data!: ActorDataPF2e;

    constructor(data: ActorDataPF2e, options?: any) {
        if (options?.pf2e?.ready) {
            super(data, options);
        } else {
            try {
                const ready = { pf2e: { ready: true } };
                return new CONFIG.PF2E.Actor.entityClasses[data.type](data, { ...ready, ...options });
            } catch (_error) {
                super(data, options); // eslint-disable-line constructor-super
                console.warn(`Unrecognized Actor type (${data.type}): falling back to PF2EActor`);
            }
        }
    }

    /** The default sheet, token, etc. image of a newly created world actor */
    static get defaultImg() {
        const [typeName] = Object.entries(CONFIG.PF2E.Actor.entityClasses).find(
            ([_key, cls]) => cls.name === this.name,
        );
        return `systems/pf2e/icons/default-icons/${typeName}.svg`;
    }

    /**
     * Augment the basic actor data with additional dynamic data.
     */
    prepareDerivedData(): void {
        super.prepareDerivedData();

        // Synchronize the token image with the actor image, if the token does not currently have an image.
        this._prepareTokenImg();

        // Prepare character & npc data; primarily attribute and action calculation.
        const actorData = this.data;

        if ('traits' in actorData.data) {
            // TODO: Migrate trait storage format
            const map = {
                dr: CONFIG.PF2E.damageTypes,
                di: CONFIG.PF2E.damageTypes,
                dv: CONFIG.PF2E.damageTypes,
                ci: CONFIG.PF2E.conditionTypes,
                languages: CONFIG.PF2E.languages,
            };
            for (const [t, choices] of Object.entries(map)) {
                const trait = actorData.data.traits[t];
                if (trait === undefined) continue;
                if (!(trait.value instanceof Array)) {
                    trait.value = TraitSelector5e._backCompat(trait.value, choices);
                }
            }
        }
    }

    _prepareTokenImg() {
        if (game.settings.get('pf2e', 'defaultTokenSettings')) {
            if (this.data.token.img === 'icons/svg/mystery-man.svg' && this.data.token.img !== this.img) {
                this.data.token.img = this.img;
            }
        }
    }

    /* -------------------------------------------- */

    prepareInitiative(
        actorData: CharacterData,
        statisticsModifiers: Record<string, PF2Modifier[]>,
        rollNotes: Record<string, PF2RollNote[]>,
    ) {
        const { data } = actorData;
        const initSkill = data.attributes?.initiative?.ability || 'perception';
        const modifiers: PF2Modifier[] = [];

        ['initiative'].forEach((key) => {
            const skillFullName = SKILL_DICTIONARY[initSkill] ?? initSkill;
            (statisticsModifiers[key] || [])
                .map((m) => duplicate(m))
                .forEach((m) => {
                    // checks if predicated rule is true with only skill name option
                    if (m.predicate && PF2ModifierPredicate.test(m.predicate, [skillFullName])) {
                        // toggles these so the predicate rule will be included when totalmodifier is calculated
                        m.enabled = true;
                        m.ignored = false;
                    }
                    modifiers.push(m);
                });
        });
        const initValues = initSkill === 'perception' ? data.attributes.perception : data.skills[initSkill];
        const skillName = game.i18n.localize(
            initSkill === 'perception' ? 'PF2E.PerceptionLabel' : CONFIG.PF2E.skills[initSkill],
        );

        const stat = new PF2CheckModifier('initiative', initValues, modifiers) as InitiativeData;
        stat.ability = initSkill;
        stat.label = game.i18n.format('PF2E.InitiativeWithSkill', { skillName });
        stat.roll = (event, options = []) => {
            const skillFullName = SKILL_DICTIONARY[stat.ability] ?? 'perception';
            // push skill name to options if not already there
            if (!options.includes(skillFullName)) {
                options.push(skillFullName);
            }
            PF2Check.roll(
                new PF2CheckModifier(data.attributes.initiative.label, data.attributes.initiative),
                { actor: this, type: 'initiative', options },
                event,
                (roll) => {
                    this._applyInitiativeRollToCombatTracker(roll);
                },
            );
        };

        data.attributes.initiative = stat;
    }

    _applyInitiativeRollToCombatTracker(roll: Roll) {
        if (roll) {
            // check that there is a combat active in this scene
            if (!game.combat) {
                ui.notifications.error('No active encounters in the Combat Tracker.');
                return;
            }

            const combatant = game.combat.turns.find((c) => c.actor.id === this._id);
            if (combatant === undefined) {
                ui.notifications.error(`No combatant found for ${this.name} in the Combat Tracker.`);
                return;
            }
            game.combat.setInitiative(combatant._id, roll.total);
        } else {
            console.log(
                'PF2e System | _applyInitiativeRollToCombatTracker | invalid roll object or roll.value mising: ',
                roll,
            );
        }
    }

    /** Obtain the first equipped armor the character has. */
    getFirstWornArmor(): ArmorData {
        return this.data.items
            .filter((item): item is ArmorData => item.type === 'armor')
            .filter((armor) => armor.data.armorType.value !== 'shield')
            .find((armor) => armor.data.equipped.value);
    }

    /** Obtain the first equipped shield the character has. */
    getFirstEquippedShield(): ArmorData {
        return this.data.items
            .filter((item): item is ArmorData => item.type === 'armor')
            .filter((armor) => armor.data.armorType.value === 'shield')
            .find((shield) => shield.data.equipped.value);
    }

    /** Convert a comma-delimited list of traits into an array of traits. */
    static traits(source: string | string[]): string[] {
        return parseTraits(source);
    }

    /* -------------------------------------------- */

    onCreateOwnedItem(child, options, userId) {
        if (!['character', 'npc', 'familiar'].includes(this.data.type)) return;
        if (!this.can(game.user, 'update')) return;
        const rules = PF2RuleElements.fromRuleElementData(child.data?.rules ?? [], child);
        const tokens = this._getTokenData();
        const actorUpdates = {};
        for (const rule of rules) {
            rule.onCreate(<CharacterData | NpcData>this.data, child, actorUpdates, Object.values(tokens));
        }
        this._updateAllTokens(actorUpdates, tokens);
    }

    onDeleteOwnedItem(child, options, userId) {
        if (!['character', 'npc', 'familiar'].includes(this.data.type)) return;
        if (!this.can(game.user, 'update')) return;
        const rules = PF2RuleElements.fromRuleElementData(child.data?.rules ?? [], child);
        const tokens = this._getTokenData();
        const actorUpdates = {};
        for (const rule of rules) {
            rule.onDelete(<CharacterData | NpcData>this.data, child, actorUpdates, Object.values(tokens));
        }
        this._updateAllTokens(actorUpdates, tokens);
    }

    /**
     * Builds an object with ID to token data mappings, for all tokens associated with this actor. The data has been
     * duplicated so it can easily be changed and used for updating the token instances.
     */
    protected _getTokenData(): Record<string, any> {
        const tokens = {};
        if (this.isToken) {
            tokens[this.token.data._id] = duplicate(canvas.tokens.get(this.token.data._id).data);
        } else {
            for (const scene of game.scenes.values()) {
                scene
                    .getEmbeddedCollection('Token')
                    .filter((token) => token.actorLink && token.actorId === this.id)
                    .map((token) => duplicate(token))
                    .forEach((token) => {
                        tokens[token._id] = token;
                    });
            }
        }
        return tokens;
    }

    async _updateAllTokens(actorUpdates: any, tokens: Record<string, any>) {
        const promises = [];
        if (actorUpdates && !isObjectEmpty(actorUpdates)) {
            promises.push(this.update(actorUpdates));
        }
        for (const scene of game.scenes.values()) {
            const local = scene
                .getEmbeddedCollection('Token')
                .filter(
                    (token) =>
                        (this.isToken && token._id === this.token.data._id) ||
                        (token.actorLink && token.actorId === this.id),
                )
                .map((token) => tokens[token._id])
                .filter((token) => !!token)
                .map((token) => {
                    if (!token.actorLink) {
                        token.actorData = token.actorData ?? {};
                        mergeObject(token.actorData, actorUpdates);
                    }
                    return token;
                });
            promises.push(scene.updateEmbeddedEntity('Token', local));
        }
        return Promise.all(promises);
    }

    async createEmbeddedEntity<I extends ItemData>(
        embeddedName: string,
        data: I,
        options?: EntityCreateOptions,
    ): Promise<I | null>;
    async createEmbeddedEntity<I extends ItemData>(
        embeddedName: string,
        data: I[],
        options?: EntityCreateOptions,
    ): Promise<I | I[] | null>;
    async createEmbeddedEntity<I extends ItemData>(
        embeddedName: string,
        data: I | I[],
        options?: EntityCreateOptions,
    ): Promise<I | I[] | null> {
        const createData = Array.isArray(data) ? data : [data];
        for (const datum of createData) {
            if (this.data.type === 'familiar' && !['condition', 'effect'].includes(datum.type)) {
                ui.notifications.error(game.i18n.localize('PF2E.FamiliarItemTypeError'));
                return null;
            } else if (
                this.data.type === 'vehicle' &&
                !['weapon', 'armor', 'equipment', 'consumable', 'treasure', 'backpack', 'kit', 'action'].includes(
                    datum.type,
                )
            ) {
                ui.notifications.error(game.i18n.localize('PF2E.vehicle.ItemTypeError'));
                return null;
            }
        }

        return super.createEmbeddedEntity(embeddedName, createData, options);
    }

    /** Compute custom stat modifiers provided by users or given by conditions. */
    protected _prepareCustomModifiers(
        actorData: CharacterData | NpcData | FamiliarData,
        rules: PF2RuleElement[],
    ): PF2RuleElementSynthetics {
        // Collect all sources of modifiers for statistics and damage in these two maps, which map ability -> modifiers.
        const statisticsModifiers: Record<string, PF2Modifier[]> = {};
        const damageDice: Record<string, PF2DamageDice[]> = {};
        const strikes: WeaponData[] = [];
        const rollNotes: Record<string, PF2RollNote[]> = {};
        const weaponPotency: Record<string, PF2WeaponPotency[]> = {};
        const striking: Record<string, PF2Striking[]> = {};
        const multipleAttackPenalties: Record<string, PF2MultipleAttackPenalty[]> = {};
        const synthetics: PF2RuleElementSynthetics = {
            damageDice,
            statisticsModifiers,
            strikes,
            rollNotes,
            weaponPotency,
            striking,
            multipleAttackPenalties,
        };

        rules.forEach((rule) => {
            try {
                rule.onBeforePrepareData(actorData, synthetics);
            } catch (error) {
                // ensure that a failing rule element does not block actor initialization
                console.error(`PF2e | Failed to execute onBeforePrepareData on rule element ${rule}.`, error);
            }
        });

        // Get all of the active conditions (from the item array), and add their modifiers.
        const conditions = actorData.items.filter(
            (i): i is ConditionData => i.flags.pf2e?.condition && i.type === 'condition' && i.data.active,
        );

        for (const [key, value] of PF2eConditionManager.getModifiersFromConditions(conditions.values())) {
            statisticsModifiers[key] = (statisticsModifiers[key] || []).concat(value);
        }

        // Character-specific custom modifiers & custom damage dice.
        if (['character', 'familiar', 'npc'].includes(actorData.type)) {
            const { data } = actorData;

            // Custom Modifiers (which affect d20 rolls and damage).
            data.customModifiers = data.customModifiers ?? {};
            for (const [statistic, modifiers] of Object.entries(data.customModifiers)) {
                statisticsModifiers[statistic] = (statisticsModifiers[statistic] || []).concat(modifiers);
            }

            // Damage Dice (which add dice to damage rolls).
            data.damageDice = data.damageDice ?? {};
            for (const [attack, dice] of Object.entries(data.damageDice)) {
                damageDice[attack] = (damageDice[attack] || []).concat(dice);
            }
        }

        return {
            statisticsModifiers,
            damageDice,
            strikes,
            rollNotes,
            weaponPotency,
            striking,
            multipleAttackPenalties,
        };
    }

    getStrikeDescription(item: WeaponData) {
        const flavor = {
            description: 'PF2E.Strike.Default.Description',
            criticalSuccess: 'PF2E.Strike.Default.CriticalSuccess',
            success: 'PF2E.Strike.Default.Success',
        };
        if (PF2EActor.traits(item?.data?.traits?.value).includes('unarmed')) {
            flavor.description = 'PF2E.Strike.Unarmed.Description';
            flavor.success = 'PF2E.Strike.Unarmed.Success';
        } else if (PF2EActor.traits(item?.data?.traits?.value).find((trait) => trait.startsWith('thrown'))) {
            flavor.description = 'PF2E.Strike.Combined.Description';
            flavor.success = 'PF2E.Strike.Combined.Success';
        } else if (item?.data?.range?.value === 'melee') {
            flavor.description = 'PF2E.Strike.Melee.Description';
            flavor.success = 'PF2E.Strike.Melee.Success';
        } else if ((item?.data?.range?.value ?? 0) > 0) {
            flavor.description = 'PF2E.Strike.Ranged.Description';
            flavor.success = 'PF2E.Strike.Ranged.Success';
        }
        return flavor;
    }

    /* -------------------------------------------- */
    /*  Rolls                                       */
    /* -------------------------------------------- */

    /**
     * Roll a Skill Check
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
     * @param skill {String}    The skill id
     */
    rollSkill(event: JQuery.Event, skillName: string) {
        const skl = this.data.data.skills[skillName];
        const rank = CONFIG.PF2E.proficiencyLevels[skl.rank];
        const parts = ['@mod', '@itemBonus'];
        const flavor = `${rank} ${CONFIG.PF2E.skills[skillName]} Skill Check`;

        // Call the roll helper utility
        DicePF2e.d20Roll({
            event,
            parts,
            data: {
                mod: skl.value - skl.item,
                itemBonus: skl.item,
            },
            title: flavor,
            speaker: ChatMessage.getSpeaker({ actor: this }),
        });
    }

    /**
     * Roll a Recovery Check
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
     * @param skill {String}    The skill id
     */
    rollRecovery(event: JQuery.Event) {
        if (this.data.type !== 'character') {
            throw Error('Recovery rolls are only applicable to characters');
        }

        const dying = this.data.data.attributes.dying.value;
        // const wounded = this.data.data.attributes.wounded.value; // not needed currently as the result is currently not automated
        const recoveryMod = getProperty(this.data.data.attributes, 'dying.recoveryMod') || 0;
        const recoveryDc = 10 + recoveryMod;
        const flatCheck = new Roll('1d20').roll();
        const dc = recoveryDc + dying;
        let result = '';

        if (flatCheck.total === 20 || flatCheck.total >= dc + 10) {
            result = `${game.i18n.localize('PF2E.CritSuccess')} ${game.i18n.localize('PF2E.Recovery.critSuccess')}`;
        } else if (flatCheck.total === 1 || flatCheck.total <= dc - 10) {
            result = `${game.i18n.localize('PF2E.CritFailure')} ${game.i18n.localize('PF2E.Recovery.critFailure')}`;
        } else if (flatCheck.result >= dc) {
            result = `${game.i18n.localize('PF2E.Success')} ${game.i18n.localize('PF2E.Recovery.success')}`;
        } else {
            result = `${game.i18n.localize('PF2E.Failure')} ${game.i18n.localize('PF2E.Recovery.failure')}`;
        }
        const rollingDescription = game.i18n.format('PF2E.Recovery.rollingDescription', { dc, dying });

        const message = `
      ${rollingDescription}.
      <div class="dice-roll">
        <div class="dice-formula" style="padding: 0 10px; word-break: normal;">
          <span style="font-size: 12px; font-weight: 400;">
            ${result}
          </span>
        </div>
      </div>
      `;

        flatCheck.toMessage(
            {
                speaker: ChatMessage.getSpeaker({ actor: this }),
                flavor: message,
            },
            {
                rollMode: game.settings.get('core', 'rollMode'),
            },
        );

        // No automated update yet, not sure if Community wants that.
        // return this.update({[`data.attributes.dying.value`]: dying}, [`data.attributes.wounded.value`]: wounded});
    }

    /* -------------------------------------------- */

    /**
     * Roll a Lore (Item) Skill Check
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
     * @param skill {String}    The skill id
     */
    rollLoreSkill(event: JQuery.Event, item: PF2EItem) {
        const { data } = item;
        if (data.type !== 'lore') {
            throw Error('Can only roll lore skills using lore items');
        }

        const parts = ['@mod', '@itemBonus'];
        const flavor = `${item.name} Skill Check`;

        let rollMod: number = 0;
        let itemBonus: number = 0;
        if (item.actor && item.actor.data && item.actor.data.type === 'character') {
            const rank = data.data.proficient?.value || 0;
            const proficiency = ProficiencyModifier.fromLevelAndRank(this.data.data.details.level.value, rank).modifier;
            const modifier = this.data.data.abilities.int.mod;

            itemBonus = Number((data.data.item || {}).value || 0);
            rollMod = modifier + proficiency;
        } else if (item.actor && item.actor.data && item.actor.data.type === 'npc') {
            rollMod = data.data.mod.value;
        }

        // Call the roll helper utility
        DicePF2e.d20Roll({
            event,
            parts,
            data: {
                mod: rollMod,
                itemBonus,
            },
            title: flavor,
            speaker: ChatMessage.getSpeaker({ actor: this }),
        });
    }

    /* -------------------------------------------- */
    /**
     * Roll a Save Check
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
     * @param skill {String}    The skill id
     */
    rollSave(event: JQuery.Event, saveName: string) {
        const save = this.data.data.saves[saveName];
        const parts = ['@mod', '@itemBonus'];
        const flavor = `${CONFIG.PF2E.saves[saveName]} Save Check`;

        // Call the roll helper utility
        DicePF2e.d20Roll({
            event,
            parts,
            data: {
                mod: save.value - (save.item ?? 0),
                itemBonus: save.item ?? 0,
            },
            title: flavor,
            speaker: ChatMessage.getSpeaker({ actor: this }),
        });
    }

    /**
     * Roll an Ability Check
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
     * @param skill {String}    The skill id
     */
    rollAbility(event: JQuery.Event, abilityName: string) {
        const skl = this.data.data.abilities[abilityName];
        const parts = ['@mod'];
        const flavor = `${CONFIG.PF2E.abilities[abilityName]} Check`;

        // Call the roll helper utility
        DicePF2e.d20Roll({
            event,
            parts,
            data: { mod: skl.mod },
            title: flavor,
            speaker: ChatMessage.getSpeaker({ actor: this }),
        });
    }

    /* -------------------------------------------- */

    /**
     * Roll a Attribute Check
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
     * @param skill {String}    The skill id
     */
    rollAttribute(event: JQuery.Event, attributeName: string) {
        const skl = this.data.data.attributes[attributeName];
        const parts = ['@mod', '@itemBonus'];
        const flavor = `${CONFIG.PF2E.attributes[attributeName]} Check`;
        // Call the roll helper utility
        DicePF2e.d20Roll({
            event,
            parts,
            data: {
                mod: skl.value - (skl.item ?? 0),
                itemBonus: skl.item,
            },
            title: flavor,
            speaker: ChatMessage.getSpeaker({ actor: this }),
        });
    }

    /* -------------------------------------------- */

    /**
     * Apply rolled dice damage to the token or tokens which are currently controlled.
     * This allows for damage to be scaled by a multiplier to account for healing, critical hits, or resistance
     *
     * @param {JQuery} roll    The chat entry which contains the roll data
     * @param {Number} multiplier   A damage multiplier to apply to the rolled damage.
     * @return {Promise}
     */
    static async applyDamage(
        roll: JQuery,
        multiplier: number,
        attribute: string = 'attributes.hp',
        modifier: number = 0,
    ) {
        if (canvas.tokens.controlled.length > 0) {
            const value = Math.floor(parseFloat(roll.find('.dice-total').text()) * multiplier) + modifier;
            const messageSender = roll.find('.message-sender').text();
            const flavorText = roll.find('.flavor-text').text();
            const shieldFlavor =
                attribute === 'attributes.shield'
                    ? game.i18n.localize('PF2E.UI.applyDamage.shieldActive')
                    : game.i18n.localize('PF2E.UI.applyDamage.shieldInActive');
            for (const t of canvas.tokens.controlled) {
                const appliedResult =
                    value > 0
                        ? game.i18n.localize('PF2E.UI.applyDamage.damaged') + value
                        : game.i18n.localize('PF2E.UI.applyDamage.healed') + value * -1;
                const modifiedByGM = modifier !== 0 ? `Modified by GM: ${modifier < 0 ? '-' : '+'}${modifier}` : '';
                const by = game.i18n.localize('PF2E.UI.applyDamage.by');
                const hitpoints = game.i18n.localize('PF2E.HitPointsHeader').toLowerCase();
                const message = `
          <div class="dice-roll">
          <div class="dice-result">
            <div class="dice-tooltip dmg-tooltip" style="display: none;">
              <div class="dice-formula" style="background: 0;">
                <span>${flavorText}, ${by} ${messageSender}</span>
                <span>${modifiedByGM}</span>
              </div>
            </div>
            <div class="dice-total" style="padding: 0 10px; word-break: normal;">
              <span style="font-size: 12px; font-style:oblique; font-weight: 400; line-height: 15px;">
                ${t.name} ${shieldFlavor} ${appliedResult} ${hitpoints}.
              </span>
            </div>
          </div>
          </div>
          `;

                t.actor.modifyTokenAttribute(attribute, value * -1, true, true).then(() => {
                    ChatMessage.create({
                        user: game.user._id,
                        speaker: { alias: t.name },
                        content: message,
                        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                    });
                });
            }
        } else {
            ui.notifications.error(game.i18n.localize('PF2E.UI.errorTargetToken'));
            return false;
        }
        return true;
    }

    /**
     * Apply rolled dice damage to the token or tokens which are currently controlled.
     * This allows for damage to be scaled by a multiplier to account for healing, critical hits, or resistance
     *
     * @return {Promise}
     */
    static async rollSave(ev, item) {
        if (canvas.tokens.controlled.length > 0) {
            for (const t of canvas.tokens.controlled) {
                const actor = t.actor;
                const save = $(ev.currentTarget).attr('data-save');
                const itemTraits = item?.data?.data?.traits?.value;

                if (actor.data.data.saves[save]?.roll) {
                    let opts = actor.getRollOptions(['all', 'saving-throw', save]);
                    if (itemTraits) {
                        opts = opts.concat(itemTraits);
                    }
                    actor.data.data.saves[save].roll(ev, opts);
                } else {
                    actor.rollSave(ev, save);
                }
            }
        } else {
            ui.notifications.error(game.i18n.localize('PF2E.UI.errorTargetToken'));
            return false;
        }
        return true;
    }

    /**
     * Set initiative for the combatant associated with the selected token or tokens with the rolled dice total.
     * @param {JQuery} roll    The chat entry which contains the roll data
     */
    static async setCombatantInitiative(roll: JQuery) {
        const skillRolled = roll.find('.flavor-text').text();
        const valueRolled = parseFloat(roll.find('.dice-total').text());
        const promises = [];
        for (const t of canvas.tokens.controlled) {
            if (!game.combat) {
                ui.notifications.error('No active encounters in the Combat Tracker.');
                return;
            }

            const combatant = game.combat.getCombatantByToken(t.id);
            if (combatant === undefined) {
                ui.notifications.error("You haven't added this token to the Combat Tracker.");
                return;
            }

            // Kept separate from modifier checks above in case of enemies using regular character sheets (or pets using NPC sheets)
            let value = valueRolled;
            if (!combatant.actor.hasPlayerOwner) {
                value += 0.5;
            }
            const message = `
      <div class="dice-roll">
      <div class="dice-result">
        <div class="dice-tooltip" style="display: none;">
            <div class="dice-formula" style="background: 0;">
              <span style="font-size: 10px;">${skillRolled} <span style="font-weight: bold;">${valueRolled}</span></span>
            </div>
        </div>
        <div class="dice-total" style="padding: 0 10px; word-break: normal;">
          <span style="font-size: 12px; font-style:oblique; font-weight: 400;">${combatant.name}'s Initiative is now ${value}!</span>
        </div>
      </div>
      </div>
      `;
            ChatMessage.create({
                user: game.user._id,
                speaker: { alias: t.name },
                content: message,
                whisper: ChatMessage.getWhisperRecipients('GM'),
                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            });

            promises.push(game.combat.setInitiative(combatant._id, value));
        }

        await Promise.all(promises);
    }

    /* -------------------------------------------- */
    /* Owned Item Management
  /* -------------------------------------------- */

    async _setShowUnpreparedSpells(entryId: string, spellLevel: number) {
        if (!entryId || !spellLevel) {
            // TODO: Consider throwing an error on null inputs in the future.
            return;
        }

        const spellcastingEntry = this.getOwnedItem(entryId);
        if (spellcastingEntry === null || spellcastingEntry.data.type !== 'spellcastingEntry') {
            return;
        }

        if (
            spellcastingEntry.data.data?.prepared?.value === 'prepared' &&
            spellcastingEntry.data.data?.showUnpreparedSpells?.value === false
        ) {
            if (CONFIG.debug.hooks === true) {
                console.log(`PF2e DEBUG | Updating spellcasting entry ${entryId} set showUnpreparedSpells to true.`);
            }

            const currentLvlToDisplay = {};
            currentLvlToDisplay[spellLevel] = true;
            await this.updateEmbeddedEntity('OwnedItem', {
                _id: entryId,
                'data.showUnpreparedSpells.value': true,
                'data.displayLevels': currentLvlToDisplay,
            });
        }
    }

    /** @override */
    updateEmbeddedEntity(
        embeddedName: string,
        updateData: EntityUpdateData,
        options?: EntityUpdateOptions,
    ): Promise<this['data']>;
    updateEmbeddedEntity(
        embeddedName: string,
        updateData: EntityUpdateData[],
        options?: EntityUpdateOptions,
    ): Promise<this['data'] | this['data'][]>;
    updateEmbeddedEntity(
        embeddedName: string,
        updateData: EntityUpdateData | EntityUpdateData[],
        options?: EntityUpdateOptions,
    ): Promise<this['data'] | this['data'][]>;
    async updateEmbeddedEntity(
        embeddedName: string,
        data: EntityUpdateData | EntityUpdateData[],
        options = {},
    ): Promise<this['data'] | this['data'][]> {
        const updateData = Array.isArray(data) ? data : [data];
        for (const datum of updateData) {
            const item = this.items.get(datum._id);
            if (item instanceof PF2EPhysicalItem) {
                await PF2EPhysicalItem.updateIdentificationData(item.data, datum);
            }
        }

        return super.updateEmbeddedEntity(embeddedName, updateData, options);
    }

    /* -------------------------------------------- */

    /**
     * Handle how changes to a Token attribute bar are applied to the Actor.
     * This allows for game systems to override this behavior and deploy special logic.
     * @param {string} attribute    The attribute path
     * @param {number} value        The target attribute value
     * @param {boolean} isDelta     Whether the number represents a relative change (true) or an absolute change (false)
     * @param {boolean} isBar       Whether the new value is part of an attribute bar, or just a direct value
     */
    async modifyTokenAttribute(
        attribute: string,
        value: number,
        isDelta: boolean = false,
        isBar: boolean = true,
    ): Promise<this> {
        if (value === undefined || value === null || Number.isNaN(value)) {
            return Promise.reject();
        }

        if (['attributes.shield', 'attributes.hp'].includes(attribute)) {
            const updateActorData = {};
            let updateShieldData;
            if (attribute === 'attributes.shield') {
                const shield = this.getFirstEquippedShield();
                if (shield) {
                    let shieldHitPoints = shield.data.hp.value;
                    if (isDelta && value < 0) {
                        // shield block
                        value = Math.min(shield.data.hardness.value + value, 0); // value is now a negative modifier (or zero), taking into account hardness
                        if (value < 0) {
                            attribute = 'attributes.hp'; // update the actor's hit points after updating the shield
                            shieldHitPoints = Math.clamped(shield.data.hp.value + value, 0, shield.data.maxHp.value);
                        }
                    } else {
                        shieldHitPoints = Math.clamped(value, 0, shield.data.maxHp.value);
                    }
                    shield.data.hp.value = shieldHitPoints; // ensure the shield item has the correct state in prepareData() on the first pass after Actor#update
                    updateActorData['data.attributes.shield.value'] = shieldHitPoints;
                    // actor update is necessary to properly refresh the token HUD resource bar
                    updateShieldData = {
                        _id: shield._id,
                        data: { hp: { value: shieldHitPoints } }, // unfolding is required when update is forced regardless of diff
                    };
                } else if (isDelta) {
                    attribute = 'attributes.hp'; // actor has no shield, apply the specified delta value to actor instead
                }
            }

            if (attribute === 'attributes.hp') {
                const { hp, sp } = this.data.data.attributes;
                if (isDelta) {
                    if (value < 0) {
                        const { update, delta } = this._calculateHealthDelta({ hp, sp, delta: value });
                        value = delta;
                        for (const [k, v] of Object.entries(update)) {
                            updateActorData[k] = v;
                        }
                    }
                    value = Math.clamped(Number(hp.value) + value, 0, hp.max);
                }
                value = Math.clamped(value, 0, hp.max);
                updateActorData['data.attributes.hp.value'] = value;
            }

            return this.update(updateActorData).then(() => {
                if (updateShieldData) {
                    // this will trigger a second prepareData() call, but is necessary for persisting the shield state
                    this.updateOwnedItem(updateShieldData, { diff: false });
                }
                return this;
            });
        }
        return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
    }

    /**
     * Moves an item to another actor's inventory.
     * @param targetActor Instance of actor to be receiving the item.
     * @param item        Instance of the item being transferred.
     * @param quantity    Number of items to move.
     * @param containerId Id of the container that will contain the item.
     */
    async transferItemToActor(
        targetActor: PF2EActor,
        item: PF2EItem,
        quantity: number,
        containerId: string,
    ): Promise<PF2EPhysicalItem> {
        if (!(item instanceof PF2EPhysicalItem)) {
            throw Error('Only physical items (with quantities) can be transfered between actors');
        }

        // Loot transfers can be performed by non-owners when a GM is online */
        const isPlayerLootTransfer = (source: PF2EActor, target: PF2EActor): boolean => {
            const bothAreOwned = source.hasPerm(game.user, 'owner') && target.hasPerm(game.user, 'owner');
            const sourceIsOwnedOrLoot = source.hasPerm(game.user, 'owner') || source.data.type === 'loot';
            const targetIsOwnedOrLoot = target.hasPerm(game.user, 'owner') || target.data.type === 'loot';
            return !bothAreOwned && sourceIsOwnedOrLoot && targetIsOwnedOrLoot;
        };
        if (isPlayerLootTransfer(this, targetActor)) {
            const source = { tokenId: this.token?.id, actorId: this.id, itemId: item.id };
            const target = { tokenId: targetActor.token?.id, actorId: targetActor.id };
            const LootTransfer: {
                new (sourceId: typeof source, targetId: typeof target, quantity: number, containerId: string): {
                    request(): Promise<void>;
                };
            } = require('./loot').LootTransfer;
            const lootTransfer = new LootTransfer(source, target, quantity, containerId);
            await lootTransfer.request();

            return null;
        }

        if (!this.can(game.user, 'update')) {
            ui.notifications.error(game.i18n.localize('PF2E.ErrorMessage.CantMoveItemSource'));
            return null;
        }
        if (!targetActor.can(game.user, 'update')) {
            ui.notifications.error(game.i18n.localize('PF2E.ErrorMessage.CantMoveItemDestination'));
            return null;
        }

        // Limit the amount of items transfered to how many are actually available.
        const sourceItemQuantity = Number(item.data.data.quantity.value);
        quantity = Math.min(quantity, sourceItemQuantity);

        // Remove the item from the source if we are transferring all of it; otherwise, subtract the appropriate number.
        const newItemQuantity = sourceItemQuantity - quantity;
        const hasToRemoveFromSource = newItemQuantity < 1;

        if (hasToRemoveFromSource) {
            await this.deleteEmbeddedEntity('OwnedItem', item._id);
        } else {
            const update = { _id: item._id, 'data.quantity.value': newItemQuantity };
            await this.updateEmbeddedEntity('OwnedItem', update);
        }

        const newItemData = duplicate(item.data);
        newItemData.data.quantity.value = quantity;
        newItemData.data.equipped.value = false;
        if ('invested' in newItemData.data && typeof newItemData.data.invested.value === 'boolean') {
            newItemData.data.invested.value = false;
        }

        const result = await targetActor.createOwnedItem(newItemData);
        const itemInTargetActor = targetActor.getOwnedItem(result._id) as PF2EPhysicalItem;

        return PF2EActor.stashOrUnstash(targetActor, async () => itemInTargetActor, containerId);
    }

    /**
     * Moves an item into the inventory into or out of a container.
     * @param actor       Actor whose inventory should be edited.
     * @param getItem     Lambda returning the item.
     * @param containerId Id of the container that will contain the item.
     */
    static async stashOrUnstash<ItemType extends PF2EPhysicalItem = PF2EPhysicalItem>(
        actor: PF2EActor,
        getItem: () => Promise<ItemType>,
        containerId: string,
    ): Promise<ItemType> {
        const item = await getItem();
        if (!item) return null;

        if (containerId) {
            const physicalItemsData = actor.data.items.filter(isPhysicalItem) as PhysicalItemData[];
            if (!isCycle(item.id, containerId, physicalItemsData)) {
                return item.update({
                    'data.containerId.value': containerId,
                    'data.equipped.value': false,
                });
            }
            return item;
        }
        await item.update({ 'data.containerId.value': '' });

        return item;
    }

    /**
     * Handle how changes to a Token attribute bar are applied to the Actor.
     * This allows for game systems to override this behavior and deploy special logic.
     */
    _calculateHealthDelta(args: {
        hp: { value: number; temp: number };
        sp: { value: number; temp: number };
        delta: number;
    }) {
        const update = {};
        const { hp, sp } = args;
        let { delta } = args;
        if (hp.temp + delta >= 0) {
            update['data.attributes.hp.temp'] = hp.temp + delta;
            delta = 0;
        } else {
            update['data.attributes.hp.temp'] = 0;
            delta = hp.temp + delta;
        }
        if (game.settings.get('pf2e', 'staminaVariant') > 0 && delta < 0) {
            if (sp.value + delta >= 0) {
                update['data.attributes.sp.value'] = sp.value + delta;
                delta = 0;
            } else {
                update['data.attributes.sp.value'] = 0;
                delta = sp.value + delta;
            }
        }
        return {
            update,
            delta,
        };
    }

    static getActionGraphics(actionType: string, actionCount?: number): { imageUrl: string; actionGlyph: string } {
        let actionImg: number | string = 0;
        if (actionType === 'action') actionImg = actionCount ?? 1;
        else if (actionType === 'reaction') actionImg = 'reaction';
        else if (actionType === 'free') actionImg = 'free';
        else if (actionType === 'passive') actionImg = 'passive';
        const graphics = {
            1: { imageUrl: 'systems/pf2e/icons/actions/OneAction.png', actionGlyph: 'A' },
            2: { imageUrl: 'systems/pf2e/icons/actions/TwoActions.png', actionGlyph: 'D' },
            3: { imageUrl: 'systems/pf2e/icons/actions/ThreeActions.png', actionGlyph: 'T' },
            free: { imageUrl: 'systems/pf2e/icons/actions/FreeAction.png', actionGlyph: 'F' },
            reaction: { imageUrl: 'systems/pf2e/icons/actions/Reaction.png', actionGlyph: 'R' },
            passive: { imageUrl: 'systems/pf2e/icons/actions/Passive.png', actionGlyph: '' },
        };
        const actionGraphics = graphics[actionImg] ?? { imageUrl: 'icons/svg/mystery-man.svg', actionGlyph: '' };
        return {
            imageUrl: actionGraphics.imageUrl,
            actionGlyph: actionGraphics.actionGlyph,
        };
    }

    /**
     * Adds a custom modifier that will be included when determining the final value of a stat. The
     * name parameter must be unique for the custom modifiers for the specified stat, or it will be
     * ignored.
     */
    async addCustomModifier(
        stat: string,
        name: string,
        value: number,
        type: string,
        predicate?: { all?: string[]; any?: string[]; not?: string[] },
        damageType?: string,
        damageCategory?: string,
    ) {
        // TODO: Consider adding another 'addCustomModifier' function in the future which takes a full PF2Modifier object,
        // similar to how addDamageDice operates.
        if (!['character', 'npc', 'familiar'].includes(this.data.type)) {
            throw Error('Custom modifiers only work for characters, NPCs, and familiars');
        }

        const customModifiers = duplicate(this.data.data.customModifiers ?? {});
        if (!(customModifiers[stat] ?? []).find((m) => m.name === name)) {
            const modifier = new PF2Modifier(name, value, type);
            if (damageType) {
                modifier.damageType = damageType;
            }
            if (damageCategory) {
                modifier.damageCategory = damageCategory;
            }
            modifier.custom = true;

            // modifier predicate
            modifier.predicate = predicate ?? {};
            if (!(modifier.predicate instanceof PF2ModifierPredicate)) {
                modifier.predicate = new PF2ModifierPredicate(modifier.predicate);
            }
            modifier.ignored = !modifier.predicate.test([]);

            customModifiers[stat] = (customModifiers[stat] ?? []).concat([modifier]);
            await this.update({ 'data.customModifiers': customModifiers });
        }
    }

    /** Removes a custom modifier by name. */
    async removeCustomModifier(stat: string, modifier: number | string) {
        if (!['character', 'npc', 'familiar'].includes(this.data.type)) {
            throw Error('Custom modifiers only work for characters, NPCs, and familiars');
        }

        const customModifiers = duplicate(this.data.data.customModifiers ?? {});
        if (typeof modifier === 'number' && customModifiers[stat] && customModifiers[stat].length > modifier) {
            customModifiers[stat].splice(modifier, 1);
            await this.update({ 'data.customModifiers': customModifiers });
        } else if (typeof modifier === 'string' && customModifiers[stat]) {
            customModifiers[stat] = customModifiers[stat].filter((m) => m.name !== modifier);
            await this.update({ 'data.customModifiers': customModifiers });
        } else {
            throw Error('Custom modifiers can only be removed by name (string) or index (number)');
        }
    }

    /**
     * Adds a Dexterity modifier cap to AC. The cap with the lowest value will automatically be applied.
     *
     * @param {DexterityModifierCapData} dexCap
     */
    async addDexterityModifierCap(dexCap: DexterityModifierCapData) {
        if (!['character', 'npc', 'familiar'].includes(this.data.type)) {
            throw Error('Custom dexterity caps only work for characters, NPCs, and familiars');
        }
        if (dexCap.value === undefined || typeof dexCap.value !== 'number') {
            throw new Error('numeric value is mandatory');
        }
        if (dexCap.source === undefined || typeof dexCap.source !== 'string') {
            throw new Error('source of cap is mandatory');
        }

        await this.update({ 'data.attributes.dexCap': (this.data.data.attributes.dexCap ?? []).concat(dexCap) });
    }

    /**
     * Removes a previously added Dexterity modifier cap to AC.
     */
    async removeDexterityModifierCap(source: string) {
        if (!['character', 'npc', 'familiar'].includes(this.data.type)) {
            throw Error('Custom dexterity caps only work for characters, NPCs, and familiars');
        }
        if (!source) {
            throw new Error('source of cap is mandatory');
        }

        // Dexcap may not exist / be unset if no custom dexterity caps have been added before.
        if (this.data.data.attributes.dexCap) {
            const updated = this.data.data.attributes.dexCap.filter((cap) => cap.source !== source);
            await this.update({ 'data.attributes.dexCap': updated });
        }
    }

    /** Adds custom damage dice. */
    async addDamageDice(param: PF2DamageDice) {
        if (!['character', 'npc', 'familiar'].includes(this.data.type)) {
            throw Error('Custom damage dice only work for characters, NPCs, and familiars');
        }

        const damageDice = duplicate(this.data.data.damageDice ?? {});
        if (!(damageDice[param.selector] ?? []).find((d) => d.name === param.name)) {
            // Default new dice to apply to all damage rolls, and ensure we mark this as a custom damage dice source.
            param.selector = param?.selector ?? 'damage';
            param.custom = true;

            // The damage dice constructor performs some basic validations for us, like checking that the
            // name and selector are both defined.
            const dice = new PF2DamageDice(param);

            damageDice[param.selector] = (damageDice[param.selector] ?? []).concat([dice]);
            await this.update({ 'data.damageDice': damageDice });
        }
    }

    /** Removes damage dice by name. */
    async removeDamageDice(selector: string, dice: number | string) {
        if (!['character', 'npc', 'familiar'].includes(this.data.type)) {
            throw Error('Custom damage dice only work for characters, NPCs, and familiars');
        }

        const damageDice = duplicate(this.data.data.damageDice ?? {});
        if (typeof dice === 'number' && damageDice[selector] && damageDice[selector].length > dice) {
            damageDice[selector].splice(dice, 1);
            await this.update({ 'data.damageDice': damageDice });
        } else if (typeof dice === 'string' && damageDice[selector]) {
            damageDice[selector] = damageDice[selector].filter((d) => d.name !== dice);
            await this.update({ 'data.damageDice': damageDice });
        } else {
            throw Error('Dice can only be removed by name (string) or index (number)');
        }
    }

    /** Toggle the given roll option (swapping it from true to false, or vice versa). */
    async toggleRollOption(rollName: string, optionName: string) {
        if (!SUPPORTED_ROLL_OPTIONS.includes(rollName) && !this.data.data.skills[rollName]) {
            throw new Error(`${rollName} is not a supported roll`);
        }
        const flag = `rollOptions.${rollName}.${optionName}`;
        return this.setFlag(game.system.id, flag, !this.getFlag(game.system.id, flag));
    }

    /** Set the given roll option. */
    async setRollOption(rollName: string, optionName: string, enabled: boolean) {
        if (!SUPPORTED_ROLL_OPTIONS.includes(rollName) && !this.data.data.skills[rollName]) {
            throw new Error(`${rollName} is not a supported roll`);
        }
        const flag = `rollOptions.${rollName}.${optionName}`;
        return this.setFlag(game.system.id, flag, !!enabled);
    }

    /** Unset (i.e., delete entirely) the given roll option. */
    async unsetRollOption(rollName: string, optionName: string) {
        const flag = `rollOptions.${rollName}.${optionName}`;
        return this.unsetFlag(game.system.id, flag);
    }

    /** Enable the given roll option for thie given roll name. */
    async enableRollOption(rollName: string, optionName: string) {
        return this.setRollOption(rollName, optionName, true);
    }

    /** Disable the given roll option for the given roll name. */
    async disableRollOption(rollName: string, optionName: string) {
        return this.setRollOption(rollName, optionName, false);
    }

    /** Obtain roll options relevant to rolls of the given types (for use in passing to the `roll` functions on statistics). */
    getRollOptions(rollNames: string[]): string[] {
        return PF2EActor.getRollOptions(this.data.flags, rollNames);
    }

    static getRollOptions(flags: BaseEntityData['flags'], rollNames: string[]): string[] {
        const flag: Record<string, Record<string, boolean>> = flags[game.system.id]?.rollOptions ?? {};
        return rollNames
            .flatMap((rollName) =>
                // convert flag object to array containing the names of all fields with a truthy value
                Object.entries(flag[rollName] ?? {}).reduce(
                    (opts, [key, value]) => opts.concat(value ? key : []),
                    [] as string[],
                ),
            )
            .reduce((unique, option) => {
                // ensure option entries are unique
                return unique.includes(option) ? unique : unique.concat(option);
            }, [] as string[]);
    }

    getAbilityMod(ability: string): number {
        return this.data.data.abilities[ability].mod;
    }

    get level(): number {
        return this.data.data.details.level.value;
    }
}

export class PF2EHazard extends PF2EActor {
    data!: HazardData;
}
export class PF2EVehicle extends PF2EActor {
    data!: VehicleData;
}

export type TokenPF2e = Token<PF2EActor>;
export type UserPF2e = User<PF2EActor>;
