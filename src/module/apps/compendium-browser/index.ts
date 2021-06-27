import { Progress } from './progress';
import { PhysicalItemPF2e } from '@item/physical';
import { KitPF2e } from '@item/kit';
import { MagicSchool, SpellData } from '@item/spell/data';
import { ArmorPF2e, ConsumablePF2e, ContainerPF2e, EquipmentPF2e, ItemPF2e, TreasurePF2e, WeaponPF2e } from '@item';
import { coinValueInCopper, extractPriceFromItem } from '@item/treasure/helpers';
import { ErrorPF2e, tupleHasValue } from '@module/utils';
import { ActorPF2e, FamiliarPF2e } from '@actor';
import { ActionData, FeatData } from '@item/data';
import { HazardData, NPCData } from '@actor/data';
import { LocalizePF2e } from '@system/localize';

/** Provide a best-effort sort of an object (e.g. CONFIG.PF2E.monsterTraits) */
function sortedObject(obj: Record<string, unknown>) {
    return Object.fromEntries([...Object.entries(obj)].sort());
}

function normaliseString(str: string): string {
    // Normalise to NFD to separate diacritics, then remove unwanted characters and convert to lowercase
    // For now, keep only alnums; if we want smarter, we can change it later
    return str
        .normalize('NFD')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

type SortByOption = 'name' | 'level' | 'price';
type SortDirection = 'asc' | 'desc';

type InventoryItem<
    T extends WeaponPF2e | ArmorPF2e | EquipmentPF2e | ConsumablePF2e | TreasurePF2e | ContainerPF2e | KitPF2e =
        | WeaponPF2e
        | ArmorPF2e
        | EquipmentPF2e
        | ConsumablePF2e
        | TreasurePF2e
        | ContainerPF2e
        | KitPF2e,
> = T & {
    data: T['data'] & {
        compendium?: string;
        filters?: string[];
        data: T['data']['data'] & {
            itemTypes?: { value: string };
            rarity?: { value: string };
        };
    };
};

class PackLoader {
    loadedPacks: Record<'Actor' | 'Item', Record<string, ClientDocument>>;

    constructor() {
        this.loadedPacks = {
            Actor: {},
            Item: {},
        };
    }

    async *loadPacks(entityType: string, packs: string[]) {
        this.loadedPacks[entityType] ??= {};
        const translations = LocalizePF2e.translations.PF2E.CompendiumBrowser.ProgressBar;

        const progress = new Progress({ steps: packs.length });
        for await (const packId of packs) {
            let data = this.loadedPacks[entityType][packId];
            if (!data) {
                const pack = game.packs.get(packId);
                if (!pack) {
                    progress.advance('');
                    continue;
                }
                progress.advance(game.i18n.format(translations.LoadingPack, { pack: pack.metadata.label }));
                if (pack.metadata.entity === entityType) {
                    const content = await pack.getDocuments();
                    data = { pack, content };
                    this.loadedPacks[entityType][packId] = data;
                } else {
                    continue;
                }
            } else {
                const { pack } = data;
                progress.advance(game.i18n.format(translations.LoadingPack, { pack: pack.metadata.label }));
            }

            yield data;
        }
        progress.close(translations.LoadingComplete);
    }
}

const packLoader = new PackLoader();

interface PackInfo {
    load: boolean;
    name: string;
}
type TabData<T> = {
    action: T | null;
    bestiary: T | null;
    equipment: T | null;
    feat: T | null;
    hazard: T | null;
    spell: T | null;
};

export class CompendiumBrowser extends Application {
    sorters: { text: string; castingtime: string } = { text: '', castingtime: '' };
    filters!: Record<string, Record<string, boolean>>;
    ranges: Record<string, { lowerBound: number; upperBound: number }> = {};
    settings!: TabData<Record<string, PackInfo>>;
    navigationTab!: Tabs;
    data!: TabData<object>;

    /** Is the user currently dragging a document from the browser? */
    userIsDragging = false;

    constructor(options = {}) {
        super(options);

        this.loadSettings();
        this.initCompendiumList();
        this.injectActorDirectory();
        this.hookTab();
    }

    override get title() {
        return game.i18n.localize('PF2E.CompendiumBrowser.Title');
    }

    static override get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: 'compendium-browser',
            classes: [],
            template: 'systems/pf2e/templates/packs/compendium-browser.html',
            width: 800,
            height: 700,
            resizable: true,
            dragDrop: [{ dragSelector: 'ul.item-list > li.item' }],
            tabs: [
                {
                    navSelector: 'nav',
                    contentSelector: 'section.content',
                    initial: 'landing-page',
                },
            ],
        });
    }

    override async _render(force?: boolean, options?: RenderOptions) {
        await super._render(force, options);
        this.activateResultListeners();
    }

    initCompendiumList() {
        const settings: TabData<Record<string, PackInfo>> = {
            action: {},
            bestiary: {},
            hazard: {},
            equipment: {},
            feat: {},
            spell: {},
        };
        for (const pack of game.packs.values()) {
            const types = (() => {
                if (pack.metadata.entity === 'Item') {
                    return ['action', 'equipment', 'feat', 'spell'] as const;
                } else if (pack.metadata.entity === 'Actor') {
                    return ['bestiary', 'hazard'] as const;
                }
                return null;
            })();
            if (!types) continue;

            for (const packType of types) {
                const load =
                    this.settings[packType]?.[pack.collection]?.load ??
                    (pack.collection.includes(packType) ||
                        (packType === 'bestiary' && pack.collection.includes('npc-')));

                settings[packType]![pack.collection] = {
                    load,
                    name: pack.metadata.label,
                };
            }
        }

        this.settings = settings;
    }

    loadSettings() {
        this.settings = JSON.parse(game.settings.get('pf2e', 'compendiumBrowserPacks'));
        this.data = {
            action: null,
            bestiary: null,
            equipment: null,
            feat: null,
            hazard: null,
            spell: null,
        };
    }

    hookTab() {
        this.navigationTab = this._tabs[0];
        const _tabCallback = this.navigationTab.callback;
        this.navigationTab.callback = (event: any, tabs: Tabs, active: string, ...args: any[]) => {
            _tabCallback?.(event, tabs, active, ...args);
            this.loadTab(active);
        };
    }

    async openTab(tab: string) {
        await this._render(true);
        this.navigationTab.activate(tab, { triggerCallback: true });
    }

    async loadTab(tab: string) {
        if (this.data[tab]) return;
        let data: Promise<object>;

        switch (tab) {
            case 'settings':
                return;
            case 'action':
                data = this.loadActions();
                break;
            case 'equipment':
                data = this.loadEquipment();
                break;
            case 'feat':
                data = this.loadFeats();
                break;
            case 'spell':
                data = this.loadSpells();
                break;
            case 'bestiary':
                data = this.loadBestiary();
                break;
            case 'hazard':
                data = this.loadHazards();
                break;
            default:
                throw new Error(`Unknown tab ${tab}`);
        }

        this.data[tab] = await data;
        if (this.rendered) {
            this.render(true);
        }
    }

    private loadedPacks(tab: string): string[] {
        return (Object.entries(this.settings[tab] ?? []) as [string, PackInfo][]).flatMap(([collection, info]) => {
            return info.load ? [collection] : [];
        });
    }

    async loadActions() {
        console.debug('PF2e System | Compendium Browser | Started loading feats');

        const actions: Record<string, ActionData> = {};

        for await (const { pack, content } of packLoader.loadPacks('Item', this.loadedPacks('action'))) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - Loading`);
            for (const action of content) {
                const actionData = action.data;
                if (actionData.type === 'action') {
                    // update icons for any passive actions
                    if (actionData.data.actionType.value === 'passive') actionData.img = this._getActionImg('passive');
                    // record the pack the feat was read from
                    actionData.compendium = pack.collection;
                    actions[actionData._id] = actionData;
                }
            }
        }

        console.debug('PF2e System | Compendium Browser | Finished loading actions');

        return {
            actions,
            actionTraits: sortedObject(CONFIG.PF2E.featTraits),
            skills: CONFIG.PF2E.skillList,
            proficiencies: CONFIG.PF2E.proficiencyLevels,
        };
    }

    async loadBestiary() {
        console.debug('PF2e System | Compendium Browser | Started loading actors');

        const bestiaryActors: Record<string, NPCData> = {};
        const sources: Set<string> = new Set();

        for await (const { pack, content } of packLoader.loadPacks('Actor', this.loadedPacks('bestiary'))) {
            console.debug(
                `PF2e System | Compendium Browser | ${pack.metadata.label} - ${content.length} entries found`,
            );
            content.sort((actorA: ActorPF2e, actorB: ActorPF2e) =>
                actorA.name > actorB.name ? 1 : actorA.name < actorB.name ? -1 : 0,
            );
            for (const actor of content) {
                const actorData = actor.data;
                if (actorData.type === 'npc') {
                    // record the pack the feat was read from
                    actorData.compendium = pack.collection;
                    actorData.filters = {};

                    actorData.filters.level = actorData.data.details.level.value;
                    actorData.filters.traits = actorData.data.traits.traits.value;
                    actorData.filters.alignment = actorData.data.details.alignment.value;
                    actorData.filters.actorSize = actorData.data.traits.size.value;

                    // get the source of the bestiary entry ignoring page number and add it as an additional attribute on the bestiary entry
                    if (actorData.data.details.source && actorData.data.details.source.value) {
                        const actorSource = actorData.data.details.source.value;
                        if (actorSource.includes('pg.')) {
                            actorData.filters.source = actorSource.split('pg.')[0].trim();
                        } else if (actorSource.includes('page.')) {
                            actorData.filters.source = actorSource.split('page.')[0].trim();
                        } else {
                            actorData.filters.source = actorSource;
                        }
                    }

                    // add the source to the filter list.
                    if (actorData.filters.source) {
                        sources.add(actorData.filters.source);
                    }

                    // add actor to bestiaryActors object
                    bestiaryActors[actorData._id] = actorData;

                    // Add rarity for filtering
                    actorData.filters.rarity = actorData.data.traits.rarity.value;
                }
            }
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - Loaded`);
        }

        console.debug('PF2e System | Compendium Browser | Finished loading Bestiary actors');
        return {
            bestiaryActors,
            actorSize: CONFIG.PF2E.actorSizes,
            alignment: CONFIG.PF2E.alignment,
            traits: sortedObject(CONFIG.PF2E.monsterTraits),
            languages: sortedObject(CONFIG.PF2E.languages),
            source: [...sources].sort(),
            rarities: CONFIG.PF2E.rarityTraits,
        };
    }

    async loadHazards() {
        console.debug('PF2e System | Compendium Browser | Started loading actors');

        const hazardActors: Record<string, HazardData> = {};
        const sources: Set<string> = new Set();
        const rarities = Object.keys(CONFIG.PF2E.rarityTraits);

        for await (const { pack, content } of packLoader.loadPacks('Actor', this.loadedPacks('hazard'))) {
            console.debug(
                `PF2e System | Compendium Browser | ${pack.metadata.label} - ${content.length} entries found`,
            );
            content.sort((actorA: ActorPF2e, actorB: ActorPF2e) =>
                actorA.name > actorB.name ? 1 : actorA.name < actorB.name ? -1 : 0,
            );
            for (const actor of content) {
                const actorData = actor.data;
                if (actorData.type === 'hazard') {
                    // record the pack the hazard was read from
                    actorData.compendium = pack.collection;
                    actorData.filters = {};

                    actorData.filters.level = actorData.data.details.level;
                    actorData.filters.traits = actorData.data.traits.traits.value;

                    // get the source of the hazard entry ignoring page number and add it as an additional attribute on the hazard entry
                    if (actorData.data.details.source && actorData.data.details.source.value) {
                        const actorSource = actorData.data.details.source.value;
                        if (actorSource.includes('pg.')) {
                            actorData.filters.source = actorSource.split('pg.')[0].trim();
                        } else if (actorSource.includes('page.')) {
                            actorData.filters.source = actorSource.split('page.')[0].trim();
                        } else {
                            actorData.filters.source = actorSource;
                        }
                    }

                    actorData.filters.complex = actorData.data.details.isComplex ? 'complex' : 'simple';

                    // add the source to the filter list.
                    if (actorData.filters.source) {
                        sources.add(actorData.filters.source);
                    }

                    // add actor to bestiaryActors object
                    hazardActors[actorData._id] = actorData;

                    // Add rarity for filtering
                    actorData.filters.rarity = (() => {
                        if (actorData.data.traits.rarity) return actorData.data.traits.rarity.value; // TODO: only look in one place once data is fixed
                        if (actorData.data.rarity) return actorData.data.rarity.value;
                        for (const rarity of rarities) {
                            const indexOfRarity = actorData.data.traits.traits.value.indexOf(rarity);
                            if (indexOfRarity >= 0) return actorData.data.traits.traits.value[indexOfRarity];
                        }
                        return 'common';
                    })();
                }
            }
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - Loaded`);
        }

        console.debug('PF2e System | Compendium Browser | Finished loading Hazard actors');
        return {
            hazardActors,
            traits: sortedObject(CONFIG.PF2E.hazardTraits),
            source: [...sources].sort(),
            rarities: CONFIG.PF2E.rarityTraits,
        };
    }

    async loadEquipment() {
        console.debug('PF2e System | Compendium Browser | Started loading feats');

        const inventoryItems: Record<string, InventoryItem['data']> = {};

        const itemTypes = ['weapon', 'armor', 'equipment', 'consumable', 'treasure', 'backpack', 'kit'];

        for await (const { pack, content } of packLoader.loadPacks('Item', this.loadedPacks('equipment'))) {
            console.debug(
                `PF2e System | Compendium Browser | ${pack.metadata.label} - ${content.length} entries found`,
            );
            content.sort((itemA: ItemPF2e, itemB: ItemPF2e) =>
                itemA.name > itemB.name ? 1 : itemA.name < itemB.name ? -1 : 0,
            );
            for (const item of content as InventoryItem[]) {
                const itemData = item.data;
                if (item.data.type === 'treasure' && item.data.data.stackGroup.value === 'coins') continue;
                if (itemTypes.includes(itemData.type)) {
                    // record the pack the feat was read from
                    itemData.compendium = pack.collection;

                    // add item.type into the correct format for filtering
                    itemData.data.itemTypes = { value: itemData.type };
                    itemData.data.rarity = { value: itemData.data.traits.rarity.value };
                    itemData.filters = [
                        'itemTypes',
                        'rarity',
                        'level',
                        'traits',
                        'price',
                        'source',
                        'armorType',
                        'weaponType',
                        'group',
                    ];

                    // add spell to spells array
                    inventoryItems[itemData._id] = itemData;
                }
            }
        }

        console.debug('PF2e System | Compendium Browser | Finished loading inventory items');
        return {
            inventoryItems,
            armorTypes: CONFIG.PF2E.armorTypes,
            armorGroups: CONFIG.PF2E.armorGroups,
            weaponTraits: sortedObject(CONFIG.PF2E.weaponTraits),
            itemTypes: {
                weapon: game.i18n.localize('ITEM.TypeWeapon'),
                armor: game.i18n.localize('ITEM.TypeArmor'),
                equipment: game.i18n.localize('ITEM.TypeEquipment'),
                consumable: game.i18n.localize('ITEM.TypeConsumable'),
                treasure: game.i18n.localize('ITEM.TypeTreasure'),
                backpack: game.i18n.localize('ITEM.TypeBackpack'),
                kit: game.i18n.localize('ITEM.TypeKit'),
            },
            rarities: CONFIG.PF2E.rarityTraits,
            weaponTypes: CONFIG.PF2E.weaponTypes,
            weaponGroups: CONFIG.PF2E.weaponGroups,
        };
    }

    async loadFeats() {
        console.debug('PF2e System | Compendium Browser | Started loading feats');

        const feats: Record<string, FeatData> = {};
        const classes: Set<string> = new Set();
        const skills: Set<string> = new Set();
        const ancestries: Set<string> = new Set();
        const times: Set<string> = new Set();
        const ancestryList = Object.keys(CONFIG.PF2E.ancestryTraits);

        for await (const { pack, content } of packLoader.loadPacks('Item', this.loadedPacks('feat'))) {
            console.debug(
                `PF2e System | Compendium Browser | ${pack.metadata.label} - ${content.length} entries found`,
            );
            content.sort((itemA: ItemPF2e, itemB: ItemPF2e) =>
                itemA.name > itemB.name ? 1 : itemA.name < itemB.name ? -1 : 0,
            );
            for (const feat of content) {
                const featData = feat.data;
                if (featData.type === 'feat') {
                    // record the pack the feat was read from
                    featData.compendium = pack.collection;

                    // determining attributes from traits
                    if (featData.data.traits.value) {
                        // determine class feats
                        const classList = Object.keys(CONFIG.PF2E.classTraits);
                        const classIntersection = classList.filter((x) => featData.data.traits.value.includes(x));

                        if (classIntersection.length !== 0) {
                            classes.add(classIntersection.join(','));
                            featData.data.classes = { value: classIntersection };
                        }

                        if (featData.data.featType.value === 'ancestry') {
                            const ancestryIntersection = ancestryList.filter((x) =>
                                featData.data.traits.value.includes(x),
                            );

                            if (ancestryIntersection.length !== 0) {
                                ancestries.add(ancestryIntersection.join(','));
                                featData.data.ancestry = { value: ancestryIntersection };
                            }
                        }
                    }

                    // determine skill prerequisites
                    // Note: This code includes some feats, where the prerequisite has the name of a skill.
                    // I decided to include them. The code would not be worth it, to exclude a single feat
                    // (Basic Arcana)
                    {
                        const skillList = Object.keys(CONFIG.PF2E.skillList);
                        const prereqs = featData.data.prerequisites.value;
                        let prerequisitesArr: string[] = [];

                        prerequisitesArr = prereqs.map((y: { value: string }) => y.value.toLowerCase());

                        const skillIntersection = skillList.filter((x) =>
                            prerequisitesArr.some((entry) => entry.includes(x)),
                        );

                        if (skillIntersection.length !== 0) {
                            skills.add(skillIntersection.join(','));
                            featData.data.skills = { value: skillIntersection };
                        }
                    }

                    let time = '';
                    if (featData.data.actionType.value === 'reaction') {
                        featData.data.actionType.img = this._getActionImg('reaction');
                        time = 'reaction';
                    } else if (featData.data.actionType.value === 'free') {
                        featData.data.actionType.img = this._getActionImg('free');
                        time = 'free';
                    } else if (featData.data.actionType.value === 'passive') {
                        featData.data.actionType.img = this._getActionImg('passive');
                        time = 'passive';
                    } else if (parseInt(featData.data.actions.value, 10)) {
                        featData.data.actionType.img = this._getActionImg(featData.data.actions.value);
                        time = featData.data.actions.value.toLowerCase();
                    }

                    if (time !== '') {
                        times.add(time);
                    }

                    // add spell to spells array
                    feats[featData._id] = featData;

                    // Add rarity for filtering
                    featData.data.rarity = deepClone(featData.data.traits.rarity);
                }
            }
        }

        //  sorting and assigning better class names
        const classesObj = {};
        for (const classStr of [...classes].sort()) {
            classesObj[classStr] = CONFIG.PF2E.classTraits[classStr];
        }

        //  sorting and assigning better ancestry names
        const ancestryObj = {};
        for (const ancestryStr of [...ancestries].sort()) {
            ancestryObj[ancestryStr] = CONFIG.PF2E.ancestryTraits[ancestryStr];
        }

        console.debug('PF2e System | Compendium Browser | Finished loading feats');
        return {
            feats,
            featClasses: CONFIG.PF2E.classTraits,
            featSkills: CONFIG.PF2E.skillList,
            featAncestry: ancestryObj,
            featTimes: [...times].sort(),
            rarities: CONFIG.PF2E.rarityTraits,
        };
    }

    async loadSpells() {
        console.debug('PF2e System | Compendium Browser | Started loading spells');

        const spells: Record<string, SpellData> = {};
        const classes: Set<string> = new Set();
        const schools: Set<MagicSchool> = new Set();
        const times: Set<string> = new Set();
        const classList = Object.keys(CONFIG.PF2E.classTraits);

        for await (const { pack, content } of packLoader.loadPacks('Item', this.loadedPacks('spell'))) {
            console.debug(
                `PF2e System | Compendium Browser | ${pack.metadata.label} - ${content.length} entries found`,
            );
            content.sort((itemA: ItemPF2e, itemB: ItemPF2e) =>
                itemA.name > itemB.name ? 1 : itemA.name < itemB.name ? -1 : 0,
            );
            for (const spell of content) {
                const spellData = spell.data;
                if (spellData.type === 'spell') {
                    // record the pack the spell was read from
                    spellData.compendium = pack.collection;

                    // format spell level for display
                    if (spellData.data.level.value === 0) spellData.data.level.formated = 'C';
                    else if (spellData.data.level.value === 11) spellData.data.level.formated = 'F';
                    else spellData.data.level.formated = spellData.data.level.value;

                    // determining classes that can use the spell
                    const classIntersection = classList.filter((trait) => spellData.data.traits.value.includes(trait));

                    if (classIntersection.length !== 0) {
                        classes.add(classIntersection.join(','));
                        spellData.data.classes = { value: classIntersection };
                    }

                    // recording casting times
                    if (spellData.data.time.value !== undefined) {
                        let time = spellData.data.time.value;
                        if (time.indexOf('reaction') !== -1) time = 'reaction';
                        times.add(time);
                    }

                    // format spell level for display
                    if (spellData.data.time.value === 'reaction') {
                        spellData.data.time.img = this._getActionImg('reaction');
                    } else if (spellData.data.time.value === 'free') {
                        spellData.data.time.img = this._getActionImg('free');
                    } else {
                        spellData.data.time.img = this._getActionImg(spellData.data.time.value);
                    }

                    // add spell to spells array
                    spells[spellData._id] = spellData;

                    // recording schools
                    if (spellData.data.school.value !== undefined) {
                        schools.add(spellData.data.school.value);
                    }

                    // Add rarity for filtering
                    spellData.data.rarity = deepClone(spellData.data.traits.rarity);
                }
            }
        }

        //  sorting and assigning better class names
        const classesObj: Record<string, string> = {};
        for (const classStr of [...classes].sort()) {
            classesObj[classStr] = CONFIG.PF2E.classTraits[classStr];
        }

        // sorting and assigning proper school names
        const schoolsObj: Record<string, string> = {};
        for (const school of [...schools].sort()) {
            schoolsObj[school] = CONFIG.PF2E.magicSchools[school];
        }

        console.debug('PF2e System | Compendium Browser | Finished loading spells');
        return {
            classes: classesObj,
            times: [...times].sort(),
            schools: schoolsObj,
            categories: CONFIG.PF2E.spellCategories,
            traditions: CONFIG.PF2E.spellTraditions,
            spells,
            rarities: CONFIG.PF2E.rarityTraits,
            spellTraits: sortedObject({ ...CONFIG.PF2E.spellOtherTraits, ...CONFIG.PF2E.damageTraits }),
        };
    }

    /** Set the ascending/descending order of the search results */
    setSortDirection($direction: JQuery<HTMLElement>, sortBy: SortByOption, { change = false } = {}): SortDirection {
        const direction = $direction.attr('data-direction');
        if (!(direction === 'asc' || direction === 'desc')) {
            throw ErrorPF2e('No sort direction set');
        }
        const newDirection = change ? (direction === 'asc' ? 'desc' : 'asc') : direction;

        const $icon = $direction.children('i');
        const iconClass = (() => {
            const alphaNum = sortBy === 'name' ? 'alpha' : 'numeric';
            const upDown = newDirection === 'asc' ? 'up' : 'down-alt';
            return `fas fa-sort-${alphaNum}-${upDown}`;
        })();
        $icon.attr('class', iconClass);
        $direction.attr('data-direction', newDirection);

        return newDirection;
    }

    override activateListeners($html: JQuery) {
        super.activateListeners($html);
        this.resetFilters($html);

        const $controlArea = $html.find('.control-area');

        $controlArea.find('button.clear-filters').on('click', () => {
            this.resetFilters($html);
            this.filterItems($html.find('.tab.active li'));
        });

        // Toggle visibility of filter containers
        $controlArea.find('.filtercontainer h3').on('click', (event) => {
            $(event.delegateTarget).next().toggle(100);
        });

        // Toggle hints
        $controlArea.find('input[name=textFilter]').on('contextmenu', () => {
            $html.find('.hint').toggle(100);
        });

        // Sort item list
        const $sort = $controlArea.find('.tab .sortcontainer');
        const $order = $sort.find<HTMLSelectElement>('select.order');
        const $direction = $sort.find('a.direction');
        $order.on('change', () => {
            const sortBy = $order.val();
            if (!tupleHasValue(['name', 'level', 'price'] as const, sortBy)) return;

            const direction = this.setSortDirection($direction, sortBy);

            const $list = $html.find('.tab.active ul.item-list');
            this.sortResults($list, { sortBy, direction });
        });
        $direction.on('click', () => {
            const sortBy = $order.val();
            if (!tupleHasValue(['name', 'level', 'price'] as const, sortBy)) return;

            const direction = this.setSortDirection($direction, sortBy, { change: true });
            const $list = $html.find('.tab.active ul.item-list');
            this.sortResults($list, { sortBy, direction });
        });

        // Activate or deactivate filters
        $controlArea.find<HTMLInputElement>('input[name=textFilter]').on('change paste', (event) => {
            this.sorters.text = event.target.value;
            this.filterItems($html.find('.tab.active li'));
        });
        $controlArea.find<HTMLSelectElement>('.timefilter select').on('change', (event) => {
            this.sorters.castingtime = event.target.value;
            this.filterItems($html.find('.tab.active li'));
        });

        // Filters
        $controlArea.find<HTMLInputElement>('input[type=checkbox]').on('click', (event) => {
            const filterType = event.target.name.split(/-(.+)/)[0];
            const filterTarget = event.target.name.split(/-(.+)/)[1];
            const filterValue = event.target.checked;
            if (Object.keys(this.filters).includes(filterType)) {
                this.filters[filterType][filterTarget] = filterValue;
                this.filters[filterType] = this.clearObject(this.filters[filterType]);
            }
            this.filterItems($html.find('.tab.active li'));
        });

        // Filter for levels
        $controlArea.find<HTMLInputElement>('input[name*=Bound]').on('input change paste', (event) => {
            const type = event.target.name.split('-')[1] ?? '';

            const $parent = $(event.target).closest('div');
            const $lowerBound = $parent.find<HTMLInputElement>('input[name*=lowerBound]');
            const $upperBound = $parent.find<HTMLInputElement>('input[name*=upperBound]');

            this.ranges[type].lowerBound = Number($lowerBound.val());
            this.ranges[type].upperBound = Number($upperBound.val());

            this.filterItems($html.find('.tab.active li'));
        });

        $html.find<HTMLButtonElement>('button.save-settings').on('click', () => {
            const formData = new FormData($html.find<HTMLFormElement>('.compendium-browser-settings form')[0]);
            for (const [t, packs] of Object.entries(this.settings) as [string, { [key: string]: PackInfo }][]) {
                for (const [key, pack] of Object.entries(packs) as [string, PackInfo][]) {
                    pack.load = formData.has(`${t}-${key}`);
                }
            }
            game.settings.set('pf2e', 'compendiumBrowserPacks', JSON.stringify(this.settings));
        });
    }

    /** Activate click listeners on loaded actors and items */
    private activateResultListeners(): void {
        const $list = this.element.find('.tab.active ul.item-list');
        if ($list.length === 0) return;

        const $items = $list.children('li');
        if ($list.data('listeners-active')) {
            $items.children('.name').children('a').off('click');
        }

        $items
            .children('.name')
            .children('a.item-link, a.actor-link')
            .on('click', (event) => {
                const entry = $(event.currentTarget).closest('.item')[0].dataset;
                const id = entry.entryId ?? '';
                const compendium = entry.entryCompendium;
                const pack = game.packs.get(compendium ?? '');
                pack?.getDocument(id).then((document) => {
                    document!.sheet.render(true);
                });
            });

        // Add an item to selected tokens' actors' inventories
        $items.children('a.take-item').on('click', (event) => {
            const itemId = $(event.currentTarget).closest('li').attr('data-entry-id') ?? '';
            this.takePhysicalItem(itemId);
        });
        $list.data('listeners-active', true);
    }

    private async takePhysicalItem(itemId: string): Promise<void> {
        const actors: ActorPF2e[] = canvas.tokens.controlled.flatMap((token) =>
            token.actor?.isOwner && !(token.actor instanceof FamiliarPF2e) ? token.actor : [],
        );
        if (actors.length === 0 && game.user.character) actors.push(game.user.character);
        if (actors.length === 0) {
            ui.notifications.error(game.i18n.format('PF2E.ErrorMessage.NoTokenSelected'));
            return;
        }

        const item = await this.getPhysicalItem(itemId);
        if (item instanceof KitPF2e) {
            for await (const actor of actors) await item.dumpContents(actor);
        } else {
            for await (const actor of actors) await actor.createEmbeddedDocuments('Item', [item.toObject()]);
        }

        if (actors.length === 1 && game.user.character && actors[0] === game.user.character) {
            ui.notifications.info(
                game.i18n.format('PF2E.CompendiumBrowser.AddedItemToCharacter', {
                    item: item.name,
                    character: game.user.character.name,
                }),
            );
        } else {
            ui.notifications.info(game.i18n.format('PF2E.CompendiumBrowser.AddedItem', { item: item.name }));
        }
    }

    private async getPhysicalItem(itemId: string): Promise<PhysicalItemPF2e | KitPF2e> {
        const item = await game.packs.get('pf2e.equipment-srd')?.getDocument(itemId);
        if (!(item instanceof PhysicalItemPF2e || item instanceof KitPF2e)) {
            throw ErrorPF2e('Unexpected failure retrieving compendium item');
        }

        return item;
    }

    protected override _canDragStart() {
        return true;
    }

    protected override _canDragDrop() {
        return true;
    }

    /** Set drag data and lower opacity of the application window to reveal any tokens */
    protected override _onDragStart(event: ElementDragEvent): void {
        this.userIsDragging = true;
        this.element.animate({ opacity: 0.125 }, 250);

        const $item = $(event.target);
        const packName = $item.attr('data-entry-compendium');
        const itemPack = game.packs.find((pack) => pack.collection === packName);
        if (!itemPack) return;
        event.dataTransfer.setData(
            'text/plain',
            JSON.stringify({
                type: itemPack.documentName,
                pack: itemPack.collection,
                id: $item.attr('data-entry-id'),
            }),
        );

        $item.one('dragend', () => {
            this.userIsDragging = false;
            this.element.animate({ opacity: 1 }, 500);
        });
    }

    /** Simulate a drop event on the DOM element directly beneath the compendium browser */
    protected override _onDrop(event: ElementDragEvent): void {
        if (!this.userIsDragging) return;

        // Get all elements beneath the compendium browser
        const browserZIndex = Number(this.element.css('zIndex'));
        const dropCandidates = Array.from(document.body.querySelectorAll('*')).filter(
            (element): element is HTMLElement => {
                if (!(element instanceof HTMLElement) || ['compendium-browser', 'hud'].includes(element.id))
                    return false;
                const appBounds = element.getBoundingClientRect();
                const zIndex = Number(element.style.zIndex);
                if (!appBounds || zIndex > browserZIndex) return false;

                return (
                    event.clientX >= appBounds.left &&
                    event.clientX <= appBounds.right &&
                    event.clientY >= appBounds.top &&
                    event.clientY <= appBounds.bottom
                );
            },
        );

        const highestElement = dropCandidates.reduce((highest: HTMLElement | null, candidate) => {
            if (!highest) return candidate;
            return Number(candidate.style.zIndex) > Number(highest.style.zIndex) ? candidate : highest;
        }, null);

        if (highestElement) {
            const isSheet = /^actor-\w+$/.test(highestElement.id);
            const sheetForm = isSheet && highestElement.querySelector('form.editable');
            const dropTarget = isSheet && sheetForm instanceof HTMLElement ? sheetForm : highestElement;
            const newEvent = new DragEvent(event.type, {
                ...event,
                clientX: event.clientX,
                clientY: event.clientY,
                dataTransfer: new DataTransfer(),
            });
            newEvent.dataTransfer?.setData('text/plain', event.dataTransfer.getData('text/plain'));
            dropTarget.dispatchEvent(newEvent);
        }
    }

    injectActorDirectory() {
        const $html = ui.actors.element;
        if ($html.find('.bestiary-browser-btn').length > 0) return;

        // Bestiary Browser Buttons
        const bestiaryImportButton = $(
            `<button class="bestiary-browser-btn"><i class="fas fa-fire"></i> Bestiary Browser</button>`,
        );

        if (game.user.isGM) {
            $html.find('footer').append(bestiaryImportButton);
        }

        // Handle button clicks
        bestiaryImportButton.on('click', (ev) => {
            ev.preventDefault();
            this.openTab('bestiary');
        });
    }

    clearObject(obj: object) {
        return Object.fromEntries(Object.entries(obj).filter(([_key, value]) => value));
    }

    _getActionImg(action: string) {
        const img: Record<string, string> = {
            1: 'systems/pf2e/icons/actions/OneAction.webp',
            2: 'systems/pf2e/icons/actions/TwoActions.webp',
            3: 'systems/pf2e/icons/actions/ThreeActions.webp',
            '1 or 2': 'systems/pf2e/icons/actions/OneTwoActions.webp',
            '1 to 3': 'systems/pf2e/icons/actions/OneThreeActions.webp',
            '2 or 3': 'systems/pf2e/icons/actions/TwoThreeActions.webp',
            free: 'systems/pf2e/icons/actions/FreeAction.webp',
            reaction: 'systems/pf2e/icons/actions/Reaction.webp',
            passive: 'systems/pf2e/icons/actions/Passive.webp',
        };
        return img[action] ?? 'systems/pf2e/icons/actions/OneAction.webp';
    }

    override getData() {
        return mergeObject(
            {
                user: game.user,
                settings: this.settings,
            },
            this.data as object,
        );
    }

    async filterItems(li: JQuery) {
        let counter = 0;
        li.hide();
        for (const spell of li) {
            if (this.getFilterResult(spell)) {
                $(spell).show();
                counter += 1;
                if (counter % 20 === 0) {
                    // Yield to the browser to render what it has
                    /* eslint-disable-next-line no-await-in-loop */
                    await new Promise((r) => setTimeout(r, 0));
                }
            }
        }
    }

    getFilterResult(element: HTMLElement) {
        if (this.sorters.text) {
            const searches = this.sorters.text.split(',');
            for (const search of searches) {
                if (search.indexOf(':') === -1) {
                    if (!normaliseString($(element).find('.name a')[0].innerHTML).includes(normaliseString(search))) {
                        return false;
                    }
                } else {
                    const targetValue = search.split(':')[1].trim();
                    const targetStat = search.split(':')[0];
                    if (!normaliseString(element.dataset[targetStat] ?? '').includes(normaliseString(targetValue))) {
                        return false;
                    }
                }
            }
        }
        if (this.sorters.castingtime !== '') {
            const castingtime = element.dataset.time;
            if (castingtime !== this.sorters.castingtime) {
                return false;
            }
        }

        for (const filter of Object.keys(this.filters)) {
            if (Object.keys(this.filters[filter]).length > 0) {
                const filteredElements = element.dataset[filter];
                let hide = true;
                if (filteredElements) {
                    for (const e of filteredElements.split(',')) {
                        if (this.filters[filter][e.trim()] === true) {
                            hide = false;
                            break;
                        }
                    }
                }
                if (hide) return false;
            }
        }

        return this.isWithinFilteredBounds(element);
    }

    isWithinFilteredBounds(element: HTMLElement): boolean {
        const rangeIdentifiers = Object.keys(this.ranges);

        for (const range of rangeIdentifiers) {
            const lowerBound = this.ranges[range].lowerBound;
            const upperBound = this.ranges[range].upperBound;
            const filter = Number(element.dataset[range] ?? 0);

            if (filter < lowerBound || upperBound < filter) {
                return false;
            }
        }

        return true;
    }

    resetFilters(html: JQuery) {
        this.sorters = {
            text: '',
            castingtime: '',
        };

        this.filters = {
            level: {},
            complex: {},
            classes: {},
            skills: {},
            ancestry: {},
            school: {},
            category: {},
            traditions: {},
            armortype: {},
            group: {},
            traits: {},
            itemtypes: {},
            rarity: {},
            weapontype: {},
            proficiencies: {},
            actorsize: {},
            alignment: {},
            source: {},
            feattype: {},
        };

        this.ranges = {
            level: { lowerBound: -1, upperBound: 30 },
        };

        html.find('.tab.browser input[name=textFilter]').val('');
        html.find('.tab.browser input[name=timefilter]').val('');
        html.find('.tab.browser input[type=checkbox]').prop('checked', false);
    }

    sortResults(
        $list: JQuery,
        { sortBy = 'name', direction = 'asc' }: { sortBy: SortByOption; direction: SortDirection },
    ): void {
        interface LIMapping {
            value: string | number;
            element: HTMLElement;
            index: number;
        }
        const $items = $list.children('li');
        const mappedList: LIMapping[] = (() => {
            switch (sortBy) {
                case 'name': {
                    return $items
                        .map((index, element) => ({
                            value: $(element).find('.name a')[0].innerHTML,
                            element,
                            index,
                        }))
                        .toArray();
                }
                case 'level': {
                    return $items
                        .map((index, element) => ({ value: Number(element.dataset.level) || -10, element, index }))
                        .toArray();
                }
                case 'price': {
                    return $items
                        .map((index, element) => {
                            if (element.dataset.itemtypes === 'kit') {
                                const coinValues = (element.dataset.price ?? '0 gp').split(/,\s*/);
                                const total = coinValues
                                    .map((coinValue) =>
                                        coinValueInCopper(
                                            extractPriceFromItem({
                                                data: { price: { value: coinValue }, quantity: { value: 1 } },
                                            }),
                                        ),
                                    )
                                    .reduce((total, part) => total + part, 0);
                                return { value: total, element, index };
                            }
                            const price = coinValueInCopper(
                                extractPriceFromItem({
                                    data: { price: { value: element.dataset.price ?? '0 gp' }, quantity: { value: 1 } },
                                }),
                            );
                            return { value: price, element, index };
                        })
                        .toArray();
                }
            }
        })();

        mappedList.sort((entryA, entryB) => {
            if (entryA.value < entryB.value) return direction === 'asc' ? -1 : 1;
            if (entryA.value > entryB.value) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        const rows = mappedList.map((mapping) => mapping.element);
        $list.html('');
        for (const row of rows) {
            $list[0].append(row);
        }
        this.activateResultListeners();
    }
}
