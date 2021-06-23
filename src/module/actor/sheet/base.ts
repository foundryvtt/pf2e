import { CharacterPF2e } from '@actor/character';
import { NPCPF2e } from '@actor/npc';
import { ItemPF2e } from '@item/base';
import { ConditionPF2e } from '@item/condition';
import { ItemDataPF2e, ItemSourcePF2e } from '@item/data';
import { isPhysicalData } from '@item/data/helpers';
import { KitPF2e } from '@item/kit';
import { PhysicalItemPF2e } from '@item/physical';
import { SpellPF2e } from '@item/spell';
import { createConsumableFromSpell, SpellConsumableTypes } from '@item/consumable/spell-consumables';
import { MagicSchool, SpellData, SpellSource, SpellSystemData } from '@item/spell/data';
import { SpellcastingEntryPF2e } from '@item/spellcasting-entry';
import {
    calculateTotalWealth,
    calculateValueOfCurrency,
    Coins,
    coinValueInCopper,
    sellAllTreasure,
    sellTreasure,
} from '@item/treasure/helpers';
import {
    TagSelectorBasic,
    TraitSelectorResistances,
    TraitSelectorSenses,
    TraitSelectorSpeeds,
    TraitSelectorWeaknesses,
} from '@module/system/trait-selector';
import { ErrorPF2e, objectHasKey, tupleHasValue } from '@module/utils';
import { LocalizePF2e } from '@system/localize';
import {
    BasicSelectorOptions,
    SelectableTagField,
    SELECTABLE_TAG_FIELDS,
    TagSelectorType,
    TAG_SELECTOR_TYPES,
} from '@system/trait-selector';
import type { ActorPF2e } from '../base';
import { SKILL_DICTIONARY } from '@actor/data/values';
import { ActorSheetDataPF2e, CoinageSummary, InventoryItem } from './data-types';
import { MoveLootPopup } from './loot/move-loot-popup';
import { AddCoinsPopup } from './popups/add-coins-popup';
import { IdentifyItemPopup } from './popups/identify-popup';
import { RemoveCoinsPopup } from './popups/remove-coins-popup';
import { ScrollWandPopup } from './popups/scroll-wand-popup';
import { ContainerPF2e } from '@item/container';
import { ActorDataPF2e } from '@actor/data';
import { CreaturePF2e } from '@actor/creature';
import { SaveString, SkillAbbreviation } from '@actor/creature/data';
import { AbilityString } from '@actor/data/base';
import { DropCanvasItemDataPF2e } from '@module/canvas/drop-canvas-data';
import { FolderPF2e } from '@module/folder';

interface SpellSheetData extends SpellData {
    spellInfo?: unknown;
    data: SpellSystemData & {
        school: {
            value: MagicSchool;
            str?: string;
        };
    };
}

/**
 * Extend the basic ActorSheet class to do all the PF2e things!
 * This sheet is an Abstract layer which is not used.
 * @category Actor
 */
export abstract class ActorSheetPF2e<TActor extends ActorPF2e> extends ActorSheet<TActor, ItemPF2e> {
    static override get defaultOptions() {
        const options = super.defaultOptions;
        return mergeObject(options, {
            classes: options.classes.concat(['pf2e', 'actor']),
            submitOnClose: false,
            scrollY: [
                '.sheet-sidebar',
                '.spellcastingEntry-list',
                '.actions-list',
                '.skills-pane',
                '.feats-pane',
                '.inventory-pane',
                '.actions-pane',
                '.spellbook-pane',
                '.skillstab-pane',
                '.pfs-pane',
                '.tab.active',
            ],
        });
    }

    override get isEditable(): boolean {
        return this.actor.canUserModify(game.user, 'update');
    }

    /** Can non-owning users loot items from this sheet? */
    get isLootSheet(): boolean {
        return false;
    }

    override getData(): ActorSheetDataPF2e<TActor> {
        // The Actor and its Items
        const actorData = this.actor.toObject(false);
        const items = deepClone(
            this.actor.items.map((item) => item.data).sort((a, b) => (a.sort || 0) - (b.sort || 0)),
        );
        (actorData as any).items = items;

        const inventoryItems = items.filter((itemData): itemData is InventoryItem => itemData.isPhysical);
        for (const itemData of inventoryItems) {
            itemData.isContainer = itemData.type === 'backpack';
            if (!itemData.isIdentified) {
                const item = this.actor.physicalItems.get(itemData._id);
                if (item) {
                    itemData.data.identification.identified = item.getMystifiedData('identified');
                }
            }
        }

        // Calculate financial and total wealth
        const coins = calculateValueOfCurrency(inventoryItems);
        const totalCoinage = ActorSheetPF2e.coinsToSheetData(coins);
        const totalCoinageGold = (coinValueInCopper(coins) / 100).toFixed(2);

        const totalWealth = calculateTotalWealth(inventoryItems);
        const totalWealthGold = (coinValueInCopper(totalWealth) / 100).toFixed(2);

        const sheetData: ActorSheetDataPF2e<TActor> = {
            cssClass: this.actor.isOwner ? 'editable' : 'locked',
            editable: this.isEditable,
            document: this.actor,
            limited: this.actor.limited,
            options: this.options,
            owner: this.actor.isOwner,
            title: this.title,
            actor: actorData,
            data: actorData.data,
            effects: actorData.effects,
            items: items,
            user: { isGM: game.user.isGM },
            isTargetFlatFooted: this.actor.getFlag(game.system.id, 'rollOptions.all.target:flatFooted'),
            isProficiencyLocked: this.actor.getFlag(game.system.id, 'proficiencyLock'),
            totalCoinage,
            totalCoinageGold,
            totalWealth,
            totalWealthGold,
        };

        this.prepareTraits(sheetData.data.traits);
        this.prepareItems(sheetData);

        return sheetData;
    }

    protected abstract prepareItems(sheetData: { actor: ActorDataPF2e }): void;

    protected findActiveList() {
        return (this.element as JQuery).find('.tab.active .directory-list');
    }

    protected static coinsToSheetData(coins: Coins): CoinageSummary {
        const denominations = ['cp', 'sp', 'gp', 'pp'] as const;
        return denominations.reduce(
            (accumulated, denomination) => ({
                ...accumulated,
                [denomination]: {
                    value: coins[denomination],
                    label: CONFIG.PF2E.currencies[denomination],
                },
            }),
            {} as CoinageSummary,
        );
    }

    protected prepareTraits(traits: any): void {
        if (traits === undefined) return;

        const map = {
            languages: CONFIG.PF2E.languages,
            dr: CONFIG.PF2E.resistanceTypes,
            di: CONFIG.PF2E.immunityTypes,
            dv: CONFIG.PF2E.weaknessTypes,
            ci: CONFIG.PF2E.immunityTypes,
            traits: CONFIG.PF2E.creatureTraits,
        };

        for (const [t, choices] of Object.entries(map)) {
            const trait = traits[t] || { value: [], selected: [] };

            if (Array.isArray(trait)) {
                // todo this is so wrong...
                (trait as any).selected = {};
                for (const entry of trait) {
                    if (typeof entry === 'object') {
                        const entryType = game.i18n.localize(choices[entry.type]);
                        if ('exceptions' in entry && entry.exceptions !== '') {
                            const exceptions = entry.exceptions;
                            (trait as any).selected[entry.type] = `${entryType} (${entry.value}) [${exceptions}]`;
                        } else {
                            let text = entryType;
                            if (entry.value !== '') text = `${text} (${entry.value})`;
                            (trait as any).selected[entry.type] = text;
                        }
                    } else {
                        (trait as any).selected[entry] = choices[entry] || String(entry);
                    }
                }
            } else if (trait.value) {
                trait.selected = Object.fromEntries(
                    (trait.value as string[])
                        .filter((key): key is keyof typeof choices => objectHasKey(choices, key))
                        .map((key) => [key, choices[key]]),
                );
            }

            // Add custom entry
            if (trait.custom) trait.selected.custom = trait.custom;
        }
    }

    /**
     * Insert a spell into the spellbook object when rendering the character sheet
     * @param actorData    The Actor data being prepared
     * @param spellbook    The spellbook data being prepared
     * @param spellData        The spell data being prepared
     */
    protected prepareSpell(actorData: ActorDataPF2e, spellbook: any, spellData: SpellSheetData) {
        const heightenedLevel = spellData.data.heightenedLevel?.value;
        const castingLevel =
            heightenedLevel ?? (Number(spellData.data.level.value) < 11 ? Number(spellData.data.level.value) : 10);
        const spellcastingEntry = this.actor.items.get(spellData.data.location.value)?.data ?? null;

        // if the spellcaster entry cannot be found (maybe it was deleted?)
        if (spellcastingEntry?.type !== 'spellcastingEntry') {
            console.debug(`PF2e System | Spellcasting entry not found for spell ${spellData.name} (${spellData._id})`);
            return;
        }

        // This is needed only if we want to prepare the data model only for the levels that a spell is already prepared in setup spellbook levels for all of those to catch case where sheet only has spells of lower level prepared in higher level slot
        const tradition = spellcastingEntry.data.tradition.value;
        const isNotLevelBasedSpellcasting = tradition === 'ritual' || tradition === 'focus';

        const slots = spellcastingEntry.data.slots;
        const spellsSlotsWhereThisIsPrepared = Object.entries((slots ?? {}) as Record<any, any>)?.filter(
            (slotArr) =>
                !!Object.values(slotArr[1].prepared as any[]).find((slotSpell) => slotSpell?.id === spellData._id),
        );
        const highestSlotPrepared =
            spellsSlotsWhereThisIsPrepared
                ?.map((slot) => Number(slot[0].match(/slot(\d+)/)?.[1]))
                .reduce((acc, cur) => (cur > acc ? cur : acc), 0) ?? castingLevel;
        const normalHighestSpellLevel = Math.ceil(actorData.data.details.level.value / 2);
        const maxSpellLevelToShow = Math.min(10, Math.max(castingLevel, highestSlotPrepared, normalHighestSpellLevel));
        // Extend the Spellbook level
        for (let spellLevel = maxSpellLevelToShow; spellLevel >= 0; spellLevel--) {
            if (!isNotLevelBasedSpellcasting || spellLevel === castingLevel) {
                const slotKey = `slot${spellLevel}` as keyof typeof slots;
                spellbook[spellLevel] ??= {
                    isCantrip: spellLevel === 0,
                    isFocus: spellLevel === 11,
                    label: CONFIG.PF2E.spellLevels[spellLevel as keyof ConfigPF2e['PF2E']['spellLevels']],
                    spells: [],
                    prepared: [],
                    uses: spellcastingEntry ? Number(slots[slotKey].value) || 0 : 0,
                    slots: spellcastingEntry ? Number(slots[slotKey].max) || 0 : 0,
                    displayPrepared:
                        spellcastingEntry &&
                        spellcastingEntry.data.displayLevels &&
                        spellcastingEntry.data.displayLevels[spellLevel] !== undefined
                            ? spellcastingEntry.data.displayLevels[spellLevel]
                            : true,
                    unpreparedSpellsLabel:
                        spellcastingEntry &&
                        spellcastingEntry.data.tradition.value === 'arcane' &&
                        spellcastingEntry.data.prepared.value === 'prepared'
                            ? game.i18n.localize('PF2E.UnpreparedSpellsLabelArcanePrepared')
                            : game.i18n.localize('PF2E.UnpreparedSpellsLabel'),
                };
            }
        }

        // Add the spell to the spellbook at the appropriate level
        spellData.data.school.str = CONFIG.PF2E.magicSchools[spellData.data.school.value];
        // Add chat data
        try {
            const item = this.actor.items.get(spellData._id);
            if (item instanceof SpellPF2e) {
                spellData.spellInfo = item.getChatData();
            }
        } catch (err) {
            console.debug(
                `PF2e System | Character Sheet | Could not load chat data for spell ${spellData._id}`,
                spellData,
            );
        }

        const isSpontaneous =
            spellcastingEntry.data.prepared.value === 'spontaneous' &&
            spellcastingEntry.data.tradition.value !== 'focus';
        const signatureSpells = spellcastingEntry.data.signatureSpells?.value ?? [];
        const isCantrip = spellData.isCantrip;
        const isFocusSpell = spellData.isFocusSpell;
        const isRitual = spellData.isRitual;

        if (isSpontaneous && signatureSpells.includes(spellData._id) && !isCantrip && !isFocusSpell && !isRitual) {
            spellData.data.isSignatureSpell = true;

            for (let spellLevel = spellData.data.level.value; spellLevel <= maxSpellLevelToShow; spellLevel++) {
                if (spellbook[spellLevel].slots) {
                    spellbook[spellLevel].spells.push(spellData);
                }
            }
        } else {
            spellbook[castingLevel].spells.push(spellData);
        }
    }

    /**
     * Insert prepared spells into the spellbook object when rendering the character sheet
     * @param spellcastingEntry    The spellcasting entry data being prepared
     * @param spellbook            The spellbook data being prepared
     */
    protected preparedSpellSlots(spellcastingEntry: any, spellbook: any) {
        for (const [key, spl] of Object.entries(spellbook as Record<any, any>)) {
            if (spl.slots > 0) {
                for (let i = 0; i < spl.slots; i++) {
                    const entrySlot = ((spellcastingEntry.data.slots[`slot${key}`] || {}).prepared || {})[i] || null;

                    if (entrySlot && entrySlot.id) {
                        const item: any = this.actor.items.get(entrySlot.id);
                        if (item) {
                            const itemCopy: any = duplicate(item);
                            if (entrySlot.expended) {
                                itemCopy.expended = true;
                            } else {
                                itemCopy.expended = false;
                            }

                            spl.prepared[i] = itemCopy;
                            if (spl.prepared[i]) {
                                const school = spl.prepared[i].data.school.value;
                                // enrich data with spell school formatted string
                                if (
                                    spl.prepared[i].data &&
                                    spl.prepared[i].data.school &&
                                    spl.prepared[i].data.school.str &&
                                    objectHasKey(CONFIG.PF2E.magicSchools, school)
                                ) {
                                    spl.prepared[i].data.school.str = CONFIG.PF2E.magicSchools[school];
                                }

                                // Add chat data
                                try {
                                    spl.prepared[i].spellInfo = item.getChatData();
                                } catch (err) {
                                    console.debug(
                                        `PF2e System | Character Sheet | Could not load prepared spell ${entrySlot.id}`,
                                        item,
                                    );
                                }

                                spl.prepared[i].prepared = true;
                            }
                            // prepared spell not found
                            else {
                                spl.prepared[i] = {
                                    name: LocalizePF2e.translations.PF2E.SpellSlotEmpty,
                                    id: null,
                                    prepared: false,
                                };
                            }
                        } else {
                            // Could not find an item for ID: ${entrySlot.id}. Marking the slot as empty so it can be overwritten.
                            spl.prepared[i] = {
                                name: LocalizePF2e.translations.PF2E.SpellSlotEmpty,
                                id: null,
                                prepared: false,
                            };
                        }
                    } else {
                        // if there is no prepared spell for this slot then make it empty.
                        spl.prepared[i] = {
                            name: LocalizePF2e.translations.PF2E.SpellSlotEmpty,
                            id: null,
                            prepared: false,
                        };
                    }
                }
            }
        }
    }

    /**
     * Prepare Spell SLot
     * Saves the prepared spell slot data to the actor
     * @param spellLevel The level of the spell slot
     * @param spellSlot The number of the spell slot
     * @param spell The item details for the spell
     * @param entryId The ID of the spellcastingEntry
     */
    private allocatePreparedSpellSlot(spellLevel: number, spellSlot: number, spell: SpellSource, entryId: string) {
        if (spell.data.level.value > spellLevel) {
            console.warn(`Attempted to add level ${spell.data.level.value} spell to level ${spellLevel} spell slot.`);
            return;
        }
        if (CONFIG.debug.hooks)
            console.debug(
                `PF2e System | Updating location for spell ${spell.name} to match spellcasting entry ${entryId}`,
            );
        const key = `data.slots.slot${spellLevel}.prepared.${spellSlot}`;
        const entry = this.actor.items.get(entryId);
        if (entry) {
            const updates: any = {
                _id: entryId,
                [key]: {
                    id: spell._id,
                },
            };
            const slot = getProperty(entry, `data.data.slots.slot${spellLevel}.prepared`);
            if (slot[spellSlot] !== undefined) {
                if (slot[spellSlot].prepared !== undefined) {
                    updates[key]['-=prepared'] = null;
                }
                if (slot[spellSlot].name !== undefined) {
                    updates[key]['-=name'] = null;
                }
                if (slot[spellSlot].expended !== undefined) {
                    updates[key]['-=expended'] = null;
                }
            }
            return this.actor.updateEmbeddedDocuments('Item', [updates]);
        }
        return;
    }

    /**
     * Remove Spell Slot
     * Removes the spell from the saved spell slot data for the actor
     * @param spellLevel The level of the spell slot
     * @param spellSlot The number of the spell slot
     */
    private async removePreparedSpellSlot(spellLevel: number, spellSlot: number, entryId: string): Promise<void> {
        if (CONFIG.debug.hooks === true)
            console.debug(
                `PF2e System | Updating spellcasting entry ${entryId} to remove spellslot ${spellSlot} for spell level ${spellLevel}`,
            );
        const key = `data.slots.slot${spellLevel}.prepared.${spellSlot}`;
        await this.actor.updateEmbeddedDocuments('Item', [
            {
                _id: entryId,
                [key]: {
                    name: 'Empty Slot (drag spell here)',
                    id: null,
                    prepared: false,
                },
            },
        ]);
    }

    /**
     * Sets the expended state of a  Spell Slot
     * Marks the slot as expended which is reflected in the UI
     * @param spellLevel The level of the spell slot
     * @param spellSlot The number of the spell slot
     */
    private async setExpendedPreparedSpellSlot(
        spellLevel: number,
        spellSlot: number,
        entryId: string,
        isExpended: boolean,
    ) {
        const key = `data.slots.slot${spellLevel}.prepared.${spellSlot}.expended`;
        this.actor.updateEmbeddedDocuments('Item', [
            {
                _id: entryId,
                [key]: isExpended,
            },
        ]);
    }

    /** Save any open tinyMCE editor before closing */
    override async close(options: { force?: boolean } = {}): Promise<void> {
        const editors = Object.values(this.editors).filter((editor) => editor.active);
        for (const editor of editors) {
            editor.options.save_onsavecallback();
        }
        await super.close(options);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers
    /* -------------------------------------------- */

    override activateListeners(html: JQuery): void {
        super.activateListeners(html);

        // Pad field width
        html.find('[data-wpad]').each((_i, e) => {
            const text = e.tagName === 'INPUT' ? (e as HTMLInputElement).value : e.innerText;
            const w = (text.length * Number(e?.getAttribute('data-wpad'))) / 2;
            e.setAttribute('style', `flex: 0 0 ${w}px`);
        });

        // Item summaries
        html.find('.item .item-name h4').on('click', (event) => {
            this.onItemSummary(event);
        });

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return;

        /* -------------------------------------------- */
        /*  Attributes, Skills, Saves and Traits
        /* -------------------------------------------- */

        // Roll Save Checks
        html.find('.save-name').on('click', (event) => {
            event.preventDefault();
            const save = $(event.currentTarget).parents('[data-save]')[0].getAttribute('data-save') as SaveString;
            if (this.actor.data.data.saves[save]?.roll) {
                const options = this.actor.getRollOptions(['all', 'saving-throw', save]);
                this.actor.data.data.saves[save].roll({ event, options });
            } else {
                this.actor.rollSave(event, save);
            }
        });

        // Roll Attribute Checks
        html.find('.roll-init').on('click', (event) => {
            event.preventDefault();
            if (
                'initiative' in this.actor.data.data.attributes &&
                'roll' in this.actor.data.data.attributes.initiative
            ) {
                const checkType = this.actor.data.data.attributes.initiative.ability as unknown as SkillAbbreviation;
                const options = this.actor.getRollOptions(
                    ['all', 'initiative'].concat(SKILL_DICTIONARY[checkType] ?? checkType),
                );
                this.actor.data.data.attributes.initiative.roll({ event, options });
            }
        });

        html.find('.attribute-name').on('click', (event) => {
            event.preventDefault();
            const attribute = event.currentTarget.parentElement?.getAttribute('data-attribute') || '';
            const isSecret = event.currentTarget.getAttribute('data-secret');
            if (this.actor.data.data.attributes[attribute]?.roll) {
                const options = this.actor.getRollOptions(['all', attribute]);
                if (isSecret) {
                    options.push('secret');
                }
                this.actor.data.data.attributes[attribute].roll({ event, options });
            } else {
                this.actor.rollAttribute(event, attribute);
            }
        });

        // Roll Ability Checks
        html.find('.ability-name').on('click', (event) => {
            event.preventDefault();
            const ability = event.currentTarget.parentElement?.getAttribute('data-ability') as AbilityString;
            if (ability) {
                this.actor.rollAbility(event, ability);
            }
        });

        // Roll Skill Checks
        html.find('.skill-name.rollable, .skill-score.rollable').on('click', (event) => {
            const skill = event.currentTarget.parentElement?.getAttribute('data-skill') as
                | SkillAbbreviation
                | undefined;
            if (!skill) {
                return;
            }
            if (this.actor.data.data.skills[skill]?.roll) {
                const options = this.actor.getRollOptions(['all', 'skill-check', SKILL_DICTIONARY[skill] ?? skill]);
                this.actor.data.data.skills[skill].roll({ event, options });
            } else {
                this.actor.rollSkill(event, skill);
            }
        });

        // Remove Spell Slot
        html.find('.item-unprepare').on('click', (event) => {
            const spellLvl = Number($(event.currentTarget).parents('.item').attr('data-spell-lvl') ?? 0);
            const slotId = Number($(event.currentTarget).parents('.item').attr('data-slot-id') ?? 0);
            const entryId = $(event.currentTarget).parents('.item').attr('data-entry-id') ?? '';
            this.removePreparedSpellSlot(spellLvl, slotId, entryId);
        });

        // Set Expended Status of Spell Slot
        html.find('.item-toggle-prepare').on('click', (event) => {
            const slotId = Number($(event.currentTarget).parents('.item').attr('data-slot-id') ?? 0);
            const spellLvl = Number($(event.currentTarget).parents('.item').attr('data-spell-lvl') ?? 0);
            const entryId = $(event.currentTarget).parents('.item').attr('data-entry-id') ?? '';
            const expendedState = ((): boolean => {
                const expendedString = $(event.currentTarget).parents('.item').attr('data-expended-state') ?? '';
                return expendedString !== 'true';
            })();
            this.setExpendedPreparedSpellSlot(spellLvl, slotId, entryId, expendedState);
        });

        // Toggle equip
        html.find('.item-toggle-equip').on('click', (event) => {
            const f = $(event.currentTarget);
            const itemId = f.parents('.item').attr('data-item-id') ?? '';
            const active = f.hasClass('active');
            this.actor.updateEmbeddedDocuments('Item', [{ _id: itemId, 'data.equipped.value': !active }]);
        });

        // Trait Selector
        html.find('.trait-selector').on('click', (event) => this.onTraitSelector(event));

        html.find('.add-coins-popup button').on('click', (event) => this.onAddCoinsPopup(event));

        html.find('.remove-coins-popup button').on('click', (event) => this.onRemoveCoinsPopup(event));

        html.find('.sell-all-treasure button').on('click', (event) => this.onSellAllTreasure(event));

        // Feat Browser
        html.find('.feat-browse').on('click', () => game.pf2e.compendiumBrowser.openTab('feat'));

        // Action Browser
        html.find('.action-browse').on('click', () => game.pf2e.compendiumBrowser.openTab('action'));

        // Spell Browser
        html.find('.spell-browse').on('click', () => game.pf2e.compendiumBrowser.openTab('spell'));

        // Inventory Browser
        html.find('.inventory-browse').on('click', () => game.pf2e.compendiumBrowser.openTab('equipment'));

        // Spell Create
        html.find('.spell-create').on('click', (event) => this.onClickCreateItem(event));

        // Add Spellcasting Entry
        html.find('.spellcasting-create').on('click', (event) => this.createSpellcastingEntry(event));

        // Remove Spellcasting Entry
        html.find('.spellcasting-remove').on('click', (event) => this.removeSpellcastingEntry(event));

        // toggle visibility of filter containers
        html.find('.hide-container-toggle').on('click', (event) => {
            $(event.target)
                .parent()
                .siblings()
                .toggle(100, () => {});
        });

        /* -------------------------------------------- */
        /*  Inventory                                   */
        /* -------------------------------------------- */

        // Create New Item
        html.find('.item-create').on('click', (event) => this.onClickCreateItem(event));

        html.find('.item-toggle-container').on('click', (event) => this.toggleContainer(event));

        // Sell treasure item
        html.find('.item-sell-treasure').on('click', (event) => {
            const itemId = $(event.currentTarget).parents('.item').attr('data-item-id') ?? '';
            sellTreasure(this.actor, itemId);
        });

        // Update Inventory Item
        html.find('.item-edit').on('click', (event) => {
            const itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
            const item = this.actor.items.get(itemId ?? '');
            if (item) {
                item.sheet.render(true);
            }
        });

        // Toggle identified
        html.find('.item-toggle-identified').on('click', (event) => {
            const f = $(event.currentTarget);
            const itemId = f.parents('.item').attr('data-item-id') ?? '';
            const identified = f.hasClass('identified');
            if (identified) {
                const item = this.actor.items.get(itemId);
                if (!(item instanceof PhysicalItemPF2e)) {
                    throw ErrorPF2e(`${itemId} is not a physical item.`);
                }
                item.setIdentificationStatus('unidentified');
            } else {
                const item = this.actor.items.get(itemId);
                if (item instanceof PhysicalItemPF2e) {
                    new IdentifyItemPopup(item).render(true);
                }
            }
        });

        // Delete Inventory Item
        html.find('.item-delete').on('click', (event) => this.onClickDeleteItem(event));

        // Increase Item Quantity
        html.find('.item-increase-quantity').on('click', (event) => {
            const itemId = $(event.currentTarget).parents('.item').attr('data-item-id') ?? '';
            const item = this.actor.items.get(itemId);
            if (!(item instanceof PhysicalItemPF2e)) {
                throw new Error('PF2e System | Tried to update quantity on item that does not have quantity');
            }
            this.actor.updateEmbeddedDocuments('Item', [
                {
                    _id: itemId,
                    'data.quantity.value': Number(item.data.data.quantity.value) + 1,
                },
            ]);
        });

        // Decrease Item Quantity
        html.find('.item-decrease-quantity').on('click', (event) => {
            const li = $(event.currentTarget).parents('.item');
            const itemId = li.attr('data-item-id') ?? '';
            const item = this.actor.items.get(itemId);
            if (!(item instanceof PhysicalItemPF2e)) {
                throw new Error('Tried to update quantity on item that does not have quantity');
            }
            if (Number(item.data.data.quantity.value) > 0) {
                this.actor.updateEmbeddedDocuments('Item', [
                    {
                        _id: itemId,
                        'data.quantity.value': Number(item.data.data.quantity.value) - 1,
                    },
                ]);
            }
        });

        // Toggle Spell prepared value
        html.find('.item-prepare').on('click', (event) => {
            const itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
            const item = this.actor.items.get(itemId ?? '');
            if (!(item instanceof SpellPF2e)) {
                throw new Error('Tried to update prepared on item that does not have prepared');
            }
            item.update({ 'data.prepared.value': !item.data.data.prepared.value });
        });

        // Item Rolling
        html.find('[data-item-id].item .item-image').on('click', (event) => this.onItemRoll(event));

        // Update Item Bonus on an actor.item input
        html.find<HTMLInputElement>('.focus-pool-input').on('change', async (event) => {
            event.preventDefault();
            const itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id') ?? '';
            const focusPool = Math.clamped(Number(event.target.value), 0, 3);
            const item = this.actor.items.get(itemId);
            if (!item) return;
            let focusPoints = getProperty(item?.data ?? {}, 'data.focus.points') || 0;
            focusPoints = Math.clamped(focusPoints, 0, focusPool);
            await item.update({
                'data.focus.points': focusPoints,
                'data.focus.pool': focusPool,
            });
        });

        // Update Item Bonus on an actor.item input
        html.find<HTMLInputElement>('.item-value-input').on('change', async (event) => {
            event.preventDefault();

            let itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
            if (!itemId) {
                itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id');
            }

            await this.actor.updateEmbeddedDocuments('Item', [
                {
                    _id: itemId ?? '',
                    'data.item.value': Number(event.target.value),
                },
            ]);
        });

        // Update Item Name
        html.find<HTMLInputElement>('.item-name-input').on('change', async (event) => {
            const itemId = event.target.attributes['data-item-id']?.value ?? '';
            await this.actor.updateEmbeddedDocuments('Item', [{ _id: itemId, name: event.target.value }]);
        });

        // Update used slots for Spell Items
        html.find<HTMLInputElement>('.spell-slots-input').on('change', async (event) => {
            event.preventDefault();

            const $input = $(event.target);
            const itemId = $input.closest('.item, .section').attr('data-item-id') ?? '';
            const spellcastingEntry = this.actor.items.get(itemId);
            if (!(spellcastingEntry instanceof SpellcastingEntryPF2e)) throw ErrorPF2e('Spellcasting entry not found');

            const slotLevel = Number($input.closest('.item, .section').attr('data-level') ?? 0);
            const slots = spellcastingEntry.data.data.slots;
            const slot = slots[`slot${slotLevel}` as keyof typeof slots];
            const newValue = Math.clamped(Number($input.val()), 0, slot.max);

            await spellcastingEntry.update({ [`data.slots.slot${slotLevel}.value`]: newValue });
        });

        // Update max slots for Spell Items
        html.find<HTMLInputElement>('.spell-max-input').on('change', async (event) => {
            event.preventDefault();

            const itemId = $(event.currentTarget).parents('.item, .section').attr('data-item-id') ?? '';
            const slotLvl = Number($(event.currentTarget).parents('.item, .section').attr('data-level')) || 0;
            await this.actor.updateEmbeddedDocuments('Item', [
                {
                    _id: itemId,
                    [`data.slots.slot${slotLvl}.max`]: Number(event.target.value),
                },
            ]);
        });

        // Modify select element
        html.find<HTMLSelectElement>('.ability-select').on('change', async (event) => {
            event.preventDefault();

            const itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id') ?? '';
            await this.actor.updateEmbeddedDocuments('Item', [
                {
                    _id: itemId,
                    'data.ability.value': event.target.value,
                },
            ]);
        });

        // Update max slots for Spell Items
        html.find('.prepared-toggle').on('click', async (event) => {
            event.preventDefault();

            const itemId = $(event.currentTarget).parents('.item-container').attr('data-container-id') ?? '';
            const itemToEdit = this.actor.items.get(itemId)?.data;
            if (itemToEdit?.type !== 'spellcastingEntry')
                throw new Error('Tried to toggle prepared spells on a non-spellcasting entry');
            const bool = !(itemToEdit.data.showUnpreparedSpells || {}).value;

            await this.actor.updateEmbeddedDocuments('Item', [
                {
                    _id: itemId ?? '',
                    'data.showUnpreparedSpells.value': bool,
                },
            ]);
        });

        html.find('.level-prepared-toggle').on('click', async (event) => {
            event.preventDefault();

            const parentNode = $(event.currentTarget).parents('.spellbook-header');
            const itemId = parentNode.attr('data-item-id') ?? '';
            const lvl = Number(parentNode.attr('data-level') ?? '');
            if (!Number.isInteger(lvl)) {
                return;
            }

            const itemToEdit = this.actor.items.get(itemId)?.data;
            if (itemToEdit?.type !== 'spellcastingEntry')
                throw new Error('Tried to toggle prepared spells on a non-spellcasting entry');
            const currentDisplayLevels = itemToEdit.data.displayLevels || {};
            currentDisplayLevels[lvl] = currentDisplayLevels[lvl] === undefined ? false : !currentDisplayLevels[lvl];
            await this.actor.updateEmbeddedDocuments('Item', [
                {
                    _id: itemId,
                    'data.displayLevels': currentDisplayLevels,
                },
            ]);
            this.render();
        });

        // Select all text in an input field on focus
        html.find<HTMLInputElement>('input[type=text], input[type=number]').on('focus', (event) => {
            event.currentTarget.select();
        });
    }

    async onClickDeleteItem(event: JQuery.ClickEvent | JQuery.ContextMenuEvent): Promise<void> {
        const li = $(event.currentTarget).closest('.item');
        const itemId = li.attr('data-item-id') ?? '';
        const item = this.actor.items.get(itemId);

        if (item instanceof ConditionPF2e && item.fromSystem) {
            const references = li.find('.condition-references');

            const deleteCondition = async (): Promise<void> => {
                this.actor.decreaseCondition(item, { forceRemove: true });
            };

            if (event.ctrlKey) {
                deleteCondition();
                return;
            }

            const content = await renderTemplate('systems/pf2e/templates/actors/delete-condition-dialog.html', {
                question: game.i18n.format('PF2E.DeleteConditionQuestion', { condition: item.name }),
                ref: references.html(),
            });
            new Dialog({
                title: game.i18n.localize('PF2E.DeleteConditionTitle'),
                content,
                buttons: {
                    Yes: {
                        icon: '<i class="fa fa-check"></i>',
                        label: 'Yes',
                        callback: deleteCondition,
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: 'Cancel',
                    },
                },
                default: 'Yes',
            }).render(true);
        } else if (item instanceof ItemPF2e) {
            const deleteItem = async (): Promise<void> => {
                await item.delete();
                if (item.type === 'lore') {
                    // normalize skill name to lower-case and dash-separated words
                    const skill = item.name.toLowerCase().replace(/\s+/g, '-');
                    // remove derived skill data
                    await this.actor.update({ [`data.skills.-=${skill}`]: null });
                } else {
                    // clean up any individually targeted modifiers to attack and damage
                    await this.actor.update({
                        [`data.customModifiers.-=${itemId}-attack`]: null,
                        [`data.customModifiers.-=${itemId}-damage`]: null,
                    });
                }
                li.slideUp(200, () => this.render(false));
            };
            if (event.ctrlKey) {
                deleteItem();
                return;
            }

            const content = await renderTemplate('systems/pf2e/templates/actors/delete-item-dialog.html', {
                name: item.name,
            });
            new Dialog({
                title: 'Delete Confirmation',
                content,
                buttons: {
                    Yes: {
                        icon: '<i class="fa fa-check"></i>',
                        label: 'Yes',
                        callback: deleteItem,
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: 'Cancel',
                    },
                },
                default: 'Yes',
            }).render(true);
        } else {
            throw ErrorPF2e('Item not found');
        }
    }

    protected override _canDragStart(selector: string): boolean {
        if (this.isLootSheet) return true;
        return super._canDragStart(selector);
    }

    protected override _canDragDrop(selector: string): boolean {
        if (this.isLootSheet) return true;
        return super._canDragDrop(selector);
    }

    /** Add support for dropping actions and toggles */
    protected override _onDragStart(event: ElementDragEvent): void {
        const $li = $(event.currentTarget);

        const baseDragData = {
            actorId: this.actor.id,
            sceneId: canvas.scene?.id ?? null,
            tokenId: this.actor.token?.id ?? null,
        };

        // Dragging ...
        const supplementalData = (() => {
            const actionIndex = $li.attr('data-action-index');
            const toggleProperty = $li.attr('data-toggle-property');
            const toggleLabel = $li.attr('data-toggle-label');

            // ... an action?
            if (actionIndex) {
                return {
                    type: 'Action',
                    index: Number(actionIndex),
                };
            }
            // ... a toggle?
            if (toggleProperty) {
                return {
                    type: 'Toggle',
                    property: toggleProperty,
                    label: toggleLabel,
                };
            }

            // ... something else?
            return null;
        })();

        return supplementalData
            ? event.dataTransfer.setData(
                  'text/plain',
                  JSON.stringify({
                      ...baseDragData,
                      ...supplementalData,
                  }),
              )
            : super._onDragStart(event);
    }

    /** Handle a drop event for an existing Owned Item to sort that item */
    protected override async _onSortItem(event: ElementDragEvent, itemData: ItemSourcePF2e): Promise<ItemPF2e[]> {
        const dropSlotType = $(event.target).parents('.item').attr('data-item-type');
        const dropContainerType = $(event.target).parents('.item-container').attr('data-container-type');
        const item = this.actor.items.get(itemData._id);
        if (!item) return [];

        // if they are dragging onto another spell, it's just sorting the spells
        // or moving it from one spellcastingEntry to another
        if (itemData.type === 'spell') {
            if (dropSlotType === 'spellLevel') {
                const { itemId, level } = $(event.target).closest('.item').data();

                if (typeof itemId === 'string' && typeof level === 'number') {
                    if (this.moveSpell(itemData, itemId, level)) {
                        return this.actor.updateEmbeddedDocuments('Item', [itemData]);
                    }
                }
            } else if (dropSlotType === 'spell') {
                const sourceId = itemData._id;
                const dropId = $(event.target).parents('.item').attr('data-item-id') ?? '';
                const target = this.actor.items.get(dropId);
                if (target instanceof SpellPF2e && sourceId !== dropId) {
                    const source: any = this.actor.items.get(sourceId);
                    const sourceLevel = source.data.data.heightenedLevel?.value ?? source.data.data.level.value;
                    const sourceLocation = source.data.data.location.value;
                    const targetLevel = target.data.data.heightenedLevel?.value ?? target.data.data.level.value;
                    const targetLocation = target.data.data.location.value;

                    if (sourceLevel === targetLevel && sourceLocation === targetLocation) {
                        const siblings: any[] = this.actor.items.filter(
                            (i: ItemPF2e) =>
                                i.data.type === 'spell' &&
                                i.data.data.level.value === sourceLevel &&
                                i.data.data.location.value === sourceLocation,
                        );
                        const sortBefore = source.data.sort >= target.data.sort;
                        source.sortRelative({ target, siblings, sortBefore });
                    } else {
                        if (this.moveSpell(itemData, targetLocation, targetLevel)) {
                            return this.actor.updateEmbeddedDocuments('Item', [itemData]);
                        }
                    }
                }
            } else if (dropSlotType === 'spellSlot') {
                if (CONFIG.debug.hooks) console.debug('PF2e System | ***** spell dropped on a spellSlot *****');
                const dropId = Number($(event.target).parents('.item').attr('data-item-id'));
                const spellLvl = Number($(event.target).parents('.item').attr('data-spell-lvl'));
                const entryId = $(event.target).parents('.item').attr('data-entry-id') ?? '';

                if (Number.isInteger(dropId) && Number.isInteger(spellLvl) && entryId) {
                    const allocated = this.allocatePreparedSpellSlot(spellLvl, dropId, itemData, entryId);
                    if (allocated) return allocated;
                }
            } else if (dropContainerType === 'spellcastingEntry') {
                // if the drop container target is a spellcastingEntry then check if the item is a spell and if so update its location.
                // if the dragged item is a spell and is from the same actor
                if (CONFIG.debug.hooks)
                    console.debug('PF2e System | ***** spell from same actor dropped on a spellcasting entry *****');

                const dropId = $(event.target).parents('.item-container').attr('data-container-id');
                return dropId ? [await item.update({ 'data.location.value': dropId })] : [];
            }
        } else if (itemData.type === 'spellcastingEntry') {
            // target and source are spellcastingEntries and need to be sorted
            if (dropContainerType === 'spellcastingEntry') {
                const sourceId = itemData._id;
                const dropId = $(event.target).parents('.item-container').attr('data-container-id') ?? '';
                const source = this.actor.items.get(sourceId);
                const target = this.actor.items.get(dropId);

                if (source && target && source.id !== target.id) {
                    const siblings = this.actor.itemTypes.spellcastingEntry;
                    const sortBefore = source.data.sort >= target.data.sort;
                    source.sortRelative({ target, siblings, sortBefore });
                    return [target];
                }
            }
        }

        const container = $(event.target).closest('[data-item-is-container="true"]');
        const containerId = container[0]?.dataset?.itemId?.trim();
        if (item instanceof PhysicalItemPF2e && (containerId || (item.isInContainer && !containerId))) {
            await this.actor.stashOrUnstash(item, containerId);
            return [item];
        }

        return super._onSortItem(event, itemData);
    }

    protected override async _onDropItemCreate(itemData: ItemSourcePF2e | ItemSourcePF2e[]): Promise<ItemPF2e[]> {
        const itemsData = Array.isArray(itemData) ? itemData : [itemData];
        const includesABCItems = itemsData.some((datum) => ['ancestry', 'background', 'class'].includes(datum.type));
        if (this.actor.type !== 'character' && includesABCItems) {
            // ignore these. they should get handled in the derived class
            ui.notifications.error(game.i18n.localize('PF2E.ItemNotSupportedOnActor'));
            return [];
        }
        return super._onDropItemCreate(itemData);
    }

    async onDropItem(data: DropCanvasItemDataPF2e) {
        return await this._onDropItem({ preventDefault(): void {} } as ElementDragEvent, data);
    }

    /** Extend the base _onDropItem method to handle dragging spells onto spell slots. */
    protected override async _onDropItem(event: ElementDragEvent, data: DropCanvasItemDataPF2e): Promise<ItemPF2e[]> {
        event.preventDefault();

        const item = await ItemPF2e.fromDropData(data);
        if (!item) return [];
        const itemData = item.toObject();

        const actor = this.actor;
        const isSameActor = data.actorId === actor.id || (actor.isToken && data.tokenId === actor.token?.id);
        if (isSameActor) return this._onSortItem(event, itemData);

        const sourceItemId = data.data?._id;
        if (data.actorId && isPhysicalData(itemData) && typeof sourceItemId === 'string') {
            await this.moveItemBetweenActors(
                event,
                data.actorId,
                data.tokenId ?? '',
                actor.id,
                actor.token?.id ?? '',
                sourceItemId,
            );
            return [item];
        }

        // get the item type of the drop target
        const dropSlotType = $(event.target).closest('.item').attr('data-item-type');
        const dropContainerType =
            this.actor.type === 'loot'
                ? 'actorInventory'
                : $(event.target).parents('.item-container').attr('data-container-type');

        // otherwise they are dragging a new spell onto their sheet.
        // we still need to put it in the correct spellcastingEntry
        if (itemData.type === 'spell') {
            if (dropSlotType === 'spellSlot' || dropContainerType === 'spellcastingEntry') {
                const dropId = $(event.target).parents('.item-container').attr('data-item-id');
                if (typeof dropId !== 'string') {
                    throw ErrorPF2e('Unexpected error while adding spell to spellcastingEntry');
                }
                itemData.data.location.value = dropId;
                this.actor._setShowUnpreparedSpells(dropId, itemData.data.level?.value);
                return this.actor.createEmbeddedDocuments('Item', [itemData]);
            } else if (dropSlotType === 'spellLevel') {
                const { itemId, level } = $(event.target).closest('.item').data();

                if (typeof itemId === 'string' && typeof level === 'number') {
                    this.moveSpell(itemData, itemId, level);
                    return this.actor.createEmbeddedDocuments('Item', [itemData]);
                }
            } else if (dropSlotType === 'spell') {
                const { containerId } = $(event.target).closest('.item-container').data();
                const { spellLvl } = $(event.target).closest('.item').data();

                if (typeof containerId === 'string' && typeof spellLvl === 'number') {
                    this.moveSpell(itemData, containerId, spellLvl);
                    return this.actor.createEmbeddedDocuments('Item', [itemData]);
                }
            } else if (dropContainerType === 'actorInventory' && itemData.data.level.value > 0) {
                const popup = new ScrollWandPopup(
                    this.actor,
                    {},
                    async (heightenedLevel, itemType, spellData) => {
                        const consumableType =
                            itemType == 'wand' ? SpellConsumableTypes.Wand : SpellConsumableTypes.Scroll;

                        const item = await createConsumableFromSpell(consumableType, spellData, heightenedLevel);
                        return this._onDropItemCreate(item);
                    },
                    itemData,
                );
                popup.render(true);
                return [item];
            } else {
                return [];
            }
        } else if (itemData.type === 'spellcastingEntry') {
            // spellcastingEntry can only be created. drag & drop between actors not allowed
            return [];
        } else if (item instanceof KitPF2e) {
            item.dumpContents(this.actor);
            return [item];
        } else if (itemData.type === 'condition' && itemData.flags.pf2e?.condition) {
            const value = data.value;
            if (typeof value === 'number' && itemData.data.value.isValued) {
                itemData.data.value.value = value;
            }
            const token = actor.token?.object
                ? actor.token.object
                : canvas.tokens.controlled.find((canvasToken) => canvasToken.actor?.id === actor.id);

            if (!actor.canUserModify(game.user, 'update')) {
                const translations = LocalizePF2e.translations.PF2E;
                ui.notifications.error(translations.ErrorMessage.NoUpdatePermission);
                return [];
            } else if (token) {
                const condition = await game.pf2e.ConditionManager.addConditionToToken(itemData, token);
                return condition ? [condition] : [];
            } else {
                await actor.increaseCondition(itemData.data.slug);
                return [item];
            }
        } else if (itemData.type === 'effect' && data && 'level' in data) {
            const level = data.level;
            if (typeof level === 'number' && level >= 0) {
                itemData.data.level.value = level;
            }
        }

        if (isPhysicalData(itemData)) {
            const containerId =
                $(event.target).closest('[data-item-is-container="true"]').attr('data-item-id')?.trim() || null;
            const container = this.actor.itemTypes.backpack.find((container) => container.id === containerId);
            if (container) {
                itemData.data.containerId.value = containerId;
            }
        }
        return this._onDropItemCreate(itemData);
    }

    protected override async _onDropFolder(
        _event: ElementDragEvent,
        data: DropCanvasData<'Folder', FolderPF2e>,
    ): Promise<ItemPF2e[]> {
        if (!(this.actor.isOwner && data.documentName === 'Item')) return [];
        const folder = (await FolderPF2e.fromDropData(data)) as FolderPF2e<ItemPF2e> | undefined;
        if (!folder) return [];
        const itemSources = folder.flattenedContents.map((item) => item.toObject());
        return this._onDropItemCreate(itemSources);
    }

    /**
     * Moves an item between two actors' inventories.
     * @param event         Event that fired this method.
     * @param sourceActorId ID of the actor who originally owns the item.
     * @param targetActorId ID of the actor where the item will be stored.
     * @param itemId           ID of the item to move between the two actors.
     */
    async moveItemBetweenActors(
        event: ElementDragEvent,
        sourceActorId: string,
        sourceTokenId: string,
        targetActorId: string,
        targetTokenId: string,
        itemId: string,
    ): Promise<void> {
        const sourceActor = sourceTokenId ? game.actors.tokens[sourceTokenId] : game.actors.get(sourceActorId);
        const targetActor = targetTokenId ? game.actors.tokens[targetTokenId] : game.actors.get(targetActorId);
        const item = sourceActor?.items?.get(itemId);

        if (!sourceActor || !targetActor) {
            return Promise.reject(new Error('PF2e System | Unexpected missing actor(s)'));
        }
        if (!(item instanceof PhysicalItemPF2e)) {
            return Promise.reject(new Error('PF2e System | Missing or invalid item'));
        }

        const container = $(event.target).parents('[data-item-is-container="true"]');
        const containerId = container[0] !== undefined ? container[0].dataset.itemId?.trim() : undefined;
        const sourceItemQuantity = Number(item.data.data.quantity.value);
        // If more than one item can be moved, show a popup to ask how many to move
        if (sourceItemQuantity > 1) {
            const popup = new MoveLootPopup(sourceActor, { maxQuantity: sourceItemQuantity }, (quantity) => {
                sourceActor.transferItemToActor(targetActor, item, quantity, containerId);
            });

            popup.render(true);
        } else {
            sourceActor.transferItemToActor(targetActor, item, 1, containerId);
        }
    }

    private moveSpell(spellData: SpellSource, targetLocation: string, targetLevel: number): boolean {
        // todo: this function should receive the spell, not the data
        const spell = new SpellPF2e(spellData, { parent: this.actor });
        const spellcastingEntryId = spellData.data.location.value;
        const heightenedLevel = spellData.data.heightenedLevel?.value ?? spell.level;
        if (spellcastingEntryId === targetLocation && heightenedLevel === targetLevel) {
            return false;
        }

        const spellcastingEntry = this.actor.items.get(targetLocation);
        if (!(spellcastingEntry instanceof SpellcastingEntryPF2e)) {
            throw ErrorPF2e(`SpellcastingEntry ${targetLocation} not found in actor ${this.actor.id}`);
        }

        spellData.data.location.value = targetLocation;

        if (!spell.isCantrip && !spell.isFocusSpell && !spell.isRitual) {
            if (spellcastingEntry.isSpontaneous || spellcastingEntry.isInnate) {
                spellData.data.heightenedLevel = { value: Math.max(spell.level, targetLevel) };
            }
        }

        return true;
    }

    /**
     * Handle rolling of an item from the Actor sheet, obtaining the Item instance and dispatching to it's roll method
     */
    private onItemRoll(event: JQuery.ClickEvent) {
        event.preventDefault();
        const itemId = $(event.currentTarget).parents('.item').attr('data-item-id');
        const item = this.actor.items.get(itemId ?? '');
        item?.toChat(event);
    }

    /**
     * Handles expanding and contracting the item summary,
     * delegating the populating of the item summary to renderItemSummary()
     */
    protected onItemSummary(event: JQuery.ClickEvent) {
        event.preventDefault();

        const li = $(event.currentTarget).parent().parent();
        this.toggleItemSummary(li);
    }

    /**
     * Triggers toggling the visibility of an item summary element,
     * delegating the populating of the item summary to renderItemSummary()
     */
    async toggleItemSummary(li: JQuery, options: { instant?: boolean } = {}) {
        const itemId = li.attr('data-item-id');
        const itemType = li.attr('data-item-type');

        if (itemType === 'spellSlot') return;

        const item = this.actor.items.get(itemId ?? '');
        if (!item) return;

        if (item.data.type === 'spellcastingEntry' || item.data.type === 'condition') return;

        // Toggle summary
        if (li.hasClass('expanded')) {
            const summary = li.children('.item-summary');
            if (options.instant) {
                summary.remove();
            } else {
                summary.slideUp(200, () => summary.remove());
            }
        } else {
            const chatData = item.getChatData({ secrets: this.actor.isOwner });
            const div = $('<div class="item-summary"/>');
            await this.renderItemSummary(div, item, chatData);
            li.append(div);
            if (!options.instant) {
                div.hide().slideDown(200);
            }
        }

        li.toggleClass('expanded');
    }

    /**
     * Called when an item summary is expanded and needs to be filled out.
     */
    protected async renderItemSummary(div: JQuery, item: Embedded<ItemPF2e>, chatData: any) {
        const template = 'systems/pf2e/templates/actors/item-summary.html';
        const isCreature = this.actor instanceof CreaturePF2e;
        const result = await renderTemplate(template, { actor: this.actor, item: item.data, chatData, isCreature });
        div.append(result);
    }

    /** Opens an item container */
    private toggleContainer(event: JQuery.ClickEvent) {
        const itemId = $(event.currentTarget).parents('.item').data('item-id');
        const item = this.actor.items.get(itemId);
        if (!(item instanceof ContainerPF2e)) return;

        const isCollapsed = item.data.data.collapsed.value ?? false;
        item.update({ 'data.collapsed.value': !isCollapsed });
    }

    /** Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset */
    private onClickCreateItem(event: JQuery.ClickEvent) {
        event.preventDefault();
        const header = event.currentTarget;
        const data: any = duplicate(header.dataset);
        data.img = `systems/pf2e/icons/default-icons/${data.type}.svg`;

        if (data.type === 'feat') {
            const featTypeString = game.i18n.localize(`PF2E.FeatType${data.featType.capitalize()}`);
            data.name = `${game.i18n.localize('PF2E.NewLabel')} ${featTypeString}`;
            mergeObject(data, { 'data.featType.value': data.featType });
        } else if (data.type === 'action') {
            const newLabel = game.i18n.localize('PF2E.NewLabel');
            const actionTypeLabel = game.i18n.localize(`PF2E.ActionType${data.actionType.capitalize()}`);
            data.name = `${newLabel} ${actionTypeLabel}`;
            mergeObject(data, { 'data.actionType.value': data.actionType });
        } else if (data.type === 'melee') {
            data.name = game.i18n.localize(`PF2E.NewPlaceholders.${data.type.capitalize()}`);
            mergeObject(data, { 'data.weaponType.value': data.actionType });
        } else if (data.type === 'spell') {
            data.level = Number(data.level);
            // for prepared spellcasting entries, set showUnpreparedSpells to true to avoid the confusion of nothing appearing to happen.
            this.actor._setShowUnpreparedSpells(data.location, data.level);

            const newLabel = game.i18n.localize('PF2E.NewLabel');
            const levelLabel = game.i18n.localize(`PF2E.SpellLevel${data.level}`);
            const spellLabel = data.level > 0 ? game.i18n.localize('PF2E.SpellLabel') : '';
            data.name = `${newLabel} ${levelLabel} ${spellLabel}`;
            mergeObject(data, {
                'data.level.value': data.level,
                'data.location.value': data.location,
            });
            // Show the spellbook pages if you're adding a new spell
            const currentLvlToDisplay: Record<number, boolean> = {};
            currentLvlToDisplay[data.level] = true;
            this.actor.updateEmbeddedDocuments('Item', [
                {
                    _id: data.location,
                    'data.showUnpreparedSpells.value': true,
                    'data.displayLevels': currentLvlToDisplay,
                },
            ]);
        } else if (data.type === 'lore') {
            data.name =
                this.actor.type === 'npc'
                    ? game.i18n.localize('PF2E.SkillLabel')
                    : game.i18n.localize('PF2E.NewPlaceholders.Lore');
        } else {
            data.name = game.i18n.localize(`PF2E.NewPlaceholders.${data.type.capitalize()}`);
        }

        this.actor.createEmbeddedDocuments('Item', [data]);
    }

    /** Handle creating a new spellcasting entry for the actor */
    private createSpellcastingEntry(event: JQuery.ClickEvent) {
        event.preventDefault();

        let magicTradition = 'arcane';
        let spellcastingType = 'innate';

        // Render modal dialog
        const template = 'systems/pf2e/templates/actors/spellcasting-dialog.html';
        const title = game.i18n.localize('PF2E.SpellcastingTypeLabel');
        const dialogOptions = {
            width: 300,
            top: event.clientY - 80,
            left: window.innerWidth - 710,
        };
        const dialogData = {
            magicTradition,
            magicTraditions: CONFIG.PF2E.magicTraditions,
            spellcastingType,
            spellcastingTypes: CONFIG.PF2E.preparationType,
        };
        renderTemplate(template, dialogData).then((dlg) => {
            new Dialog(
                {
                    title,
                    content: dlg,
                    buttons: {
                        create: {
                            label: game.i18n.localize('PF2E.CreateLabelUniversal'),
                            callback: (html: JQuery) => {
                                // if ( onClose ) onClose(html, parts, data);
                                let name = '';
                                magicTradition = `${html.find('[name="magicTradition"]').val()}`;
                                if (magicTradition === 'ritual') {
                                    spellcastingType = '';
                                    name = game.i18n.localize(CONFIG.PF2E.magicTraditions[magicTradition]);
                                } else if (magicTradition === 'focus') {
                                    spellcastingType = '';
                                    name = [
                                        game.i18n.localize(CONFIG.PF2E.magicTraditions[magicTradition]),
                                        game.i18n.localize('PF2E.SpellLabelPlural'),
                                    ].join(' ');
                                } else {
                                    spellcastingType = `${html.find('[name="spellcastingType"]').val()}`;
                                    const preparationType = game.i18n.localize(
                                        CONFIG.PF2E.preparationType[spellcastingType],
                                    );
                                    const tradition = game.i18n.localize(CONFIG.PF2E.magicTraditions[magicTradition]);
                                    name = game.i18n.format('PF2E.SpellCastingFormat', {
                                        preparationType,
                                        tradition,
                                    });
                                }

                                // Define new spellcasting entry
                                const actor = this.actor;
                                if (!(actor instanceof CharacterPF2e || actor instanceof NPCPF2e)) return;
                                const actorAbilities = actor.data.data.abilities;

                                const candidateAbilities = ['int', 'wis', 'cha'] as const;
                                const bestAbility = (() => {
                                    if (spellcastingType === 'innate') return 'cha';

                                    return candidateAbilities.reduce((abilityA, abilityB) =>
                                        actorAbilities[abilityA].value > actorAbilities[abilityB].value
                                            ? abilityA
                                            : abilityB,
                                    );
                                })();
                                const spellcastingEntity = {
                                    ability: { value: bestAbility },
                                    spelldc: { value: 0, dc: 0, mod: 0 },
                                    tradition: { value: magicTradition },
                                    prepared: { value: spellcastingType },
                                    showUnpreparedSpells: { value: true },
                                };

                                const data = {
                                    name,
                                    type: 'spellcastingEntry',
                                    data: spellcastingEntity,
                                };

                                this.actor.createEmbeddedDocuments('Item', [data] as unknown as ItemDataPF2e[]);
                            },
                        },
                    },
                    default: 'create',
                },
                dialogOptions,
            ).render(true);
        });
    }

    /**
     * Handle removing an existing spellcasting entry for the actor
     */
    private removeSpellcastingEntry(event: JQuery.ClickEvent): void {
        event.preventDefault();

        const li = $(event.currentTarget).parents('.item');
        const itemId = li.attr('data-container-id') ?? '';
        const item = this.actor.items.get(itemId);
        if (!item) {
            return;
        }

        // Render confirmation modal dialog
        renderTemplate('systems/pf2e/templates/actors/delete-spellcasting-dialog.html').then((html) => {
            new Dialog({
                title: 'Delete Confirmation',
                content: html,
                buttons: {
                    Yes: {
                        icon: '<i class="fa fa-check"></i>',
                        label: 'Yes',
                        callback: async () => {
                            console.debug('PF2e System | Deleting Spell Container: ', item.name);
                            // Delete all child objects
                            const itemsToDelete: string[] = [];
                            for (const item of this.actor.itemTypes.spell) {
                                if (item.data.data.location.value === itemId) {
                                    itemsToDelete.push(item.id);
                                }
                            }
                            // Delete item container
                            itemsToDelete.push(item.id);
                            await this.actor.deleteEmbeddedDocuments('Item', itemsToDelete);

                            li.slideUp(200, () => this.render(false));
                        },
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: 'Cancel',
                    },
                },
                default: 'Yes',
            }).render(true);
        });
    }

    private onAddCoinsPopup(event: JQuery.ClickEvent) {
        event.preventDefault();
        new AddCoinsPopup(this.actor, {}).render(true);
    }

    private onRemoveCoinsPopup(event: JQuery.ClickEvent) {
        event.preventDefault();
        new RemoveCoinsPopup(this.actor, {}).render(true);
    }

    private onSellAllTreasure(event: JQuery.ClickEvent) {
        event.preventDefault();
        // Render confirmation modal dialog
        renderTemplate('systems/pf2e/templates/actors/sell-all-treasure-dialog.html').then((html) => {
            new Dialog({
                title: game.i18n.localize('PF2E.SellAllTreasureTitle'),
                content: html,
                buttons: {
                    Yes: {
                        icon: '<i class="fa fa-check"></i>',
                        label: 'Yes',
                        callback: async () => {
                            console.debug('PF2e System | Selling all treasure: ', this.actor);
                            sellAllTreasure(this.actor);
                        },
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: 'Cancel',
                    },
                },
                default: 'Yes',
            }).render(true);
        });
    }

    protected onTraitSelector(event: JQuery.ClickEvent) {
        event.preventDefault();
        const $anchor = $(event.currentTarget);
        const selectorType = $anchor.attr('data-trait-selector') ?? '';
        if (!tupleHasValue(TAG_SELECTOR_TYPES, selectorType)) {
            throw ErrorPF2e(`Unrecognized trait selector type "${selectorType}"`);
        }
        if (selectorType === 'basic') {
            const objectProperty = $anchor.attr('data-property') ?? '';
            const configTypes = ($anchor.attr('data-config-types') ?? '')
                .split(',')
                .map((type) => type.trim())
                .filter((tag): tag is SelectableTagField => tupleHasValue(SELECTABLE_TAG_FIELDS, tag));
            this.tagSelector('basic', {
                objectProperty,
                configTypes,
            });
        } else {
            this.tagSelector(selectorType);
        }
    }

    /** Construct and render a tag selection menu */
    protected tagSelector(selectorType: Exclude<TagSelectorType, 'basic'>, options?: FormApplicationOptions): void;
    protected tagSelector(selectorType: 'basic', options: BasicSelectorOptions): void;
    protected tagSelector(
        selectorType: TagSelectorType,
        options: FormApplicationOptions | BasicSelectorOptions = {},
    ): void {
        if (selectorType === 'basic' && 'objectProperty' in options) {
            new TagSelectorBasic(this.object, options).render(true);
        } else if (selectorType === 'basic') {
            throw ErrorPF2e('Insufficient options provided to render basic tag selector');
        } else {
            const TagSelector = {
                resistances: TraitSelectorResistances,
                senses: TraitSelectorSenses,
                'speed-types': TraitSelectorSpeeds,
                weaknesses: TraitSelectorWeaknesses,
            }[selectorType];
            new TagSelector(this.object, options).render(true);
        }
    }

    /** Prevent `ActorSheet#_getSubmitData` from preventing the submission of updates to overridden values */
    protected override _getSubmitData(updateData: Record<string, unknown> = {}): Record<string, unknown> {
        const overrides = this.actor.overrides;
        let submitData: Record<string, unknown>;
        try {
            this.actor.overrides = {};
            submitData = super._getSubmitData(updateData);
        } finally {
            this.actor.overrides = overrides;
        }

        for (const propertyPath of Object.keys(submitData)) {
            const update = submitData[propertyPath];
            if (typeof update === 'number') {
                submitData[propertyPath] = this.getIntendedChange(propertyPath, update);
            }
        }

        return submitData;
    }

    protected override async _onSubmit(
        event: Event,
        options: OnSubmitFormOptions = {},
    ): Promise<Record<string, unknown>> {
        // Limit HP value to data.attributes.hp.max value
        if (!(event.currentTarget instanceof HTMLInputElement)) {
            return super._onSubmit(event, options);
        }

        const $target = $(event.currentTarget ?? {});
        if ($target.attr('name') === 'data.attributes.hp.value') {
            $target.attr({
                value: Math.clamped(
                    parseInt($target.attr('value') ?? '0', 10),
                    0,
                    this.actor.data.data.attributes.hp?.max ?? 0,
                ),
            });
        }

        return super._onSubmit(event, options);
    }

    /**
     * A user edits numeric values on actor sheets that are frequently modified by data preparation: we should be able
     * to infer the intended change by adding the difference between their update and the prepared value to the
     * underlying base value.
     */
    protected getIntendedChange(propertyPath: string, update: number): number {
        const base = getProperty(this.actor.data._source, propertyPath);
        const prepared = getProperty(this.actor.data, propertyPath);

        return typeof base === 'number' && typeof prepared === 'number' ? base + (update - prepared) : update;
    }

    /** Hide the sheet-config button unless there is more than one sheet option. */
    protected override _getHeaderButtons(): ApplicationHeaderButton[] {
        const buttons = super._getHeaderButtons();
        const sheetButton = buttons.find((button) => button.class === 'configure-sheet');
        const hasMultipleSheets = Object.keys(CONFIG.Actor.sheetClasses[this.actor.type]).length > 1;
        if (!hasMultipleSheets && sheetButton) {
            buttons.splice(buttons.indexOf(sheetButton), 1);
        }
        return buttons;
    }

    /** Override of inner render function to maintain item summary state */
    protected override async _renderInner(data: Record<string, unknown>, options: RenderOptions) {
        // Identify which item summaries are expanded currently
        const expandedItemElements = this.element.find('.item.expanded[data-item-id]');
        const openItemIds = new Set(expandedItemElements.map((_i, el) => el.dataset.itemId));

        const result = await super._renderInner(data, options);

        // Re-open hidden item summaries
        const promises = new Array<Promise<unknown>>();
        for (const elementId of openItemIds) {
            promises.push(this.toggleItemSummary(result.find(`.item[data-item-id=${elementId}]`), { instant: true }));
        }

        await Promise.allSettled(promises);
        return result;
    }
}
