import { Progress } from './progress';
import { PhysicalItemPF2e } from '@item/physical';
import { KitPF2e } from '@item/kit';
import { KitEntryData } from '@item/kit/data';
import { MagicSchool } from '@item/spell/data';

/** Provide a best-effort sort of an object (e.g. CONFIG.PF2E.monsterTraits) */
function _sortedObject(obj: object) {
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

/**
 * @category Other
 */
class PackLoader {
    loadedPacks: object;

    constructor() {
        this.loadedPacks = {
            Actor: {},
            Item: {},
        };
    }

    async *loadPacks(entityType: string, packs: string[]) {
        if (!this.loadedPacks[entityType]) {
            this.loadedPacks[entityType] = {};
        }

        // TODO: i18n for progress bar
        const progress = new Progress({ steps: packs.length });
        for (const packId of packs) {
            let data = this.loadedPacks[entityType][packId];
            if (!data) {
                const pack = game.packs.get(packId);
                if (!pack) {
                    progress.advance('');
                    continue;
                }
                progress.advance(`Loading ${pack.metadata.label}`);
                if (pack.metadata.entity === entityType) {
                    /* eslint-disable-next-line no-await-in-loop */
                    const content = await pack.getDocuments();
                    data = { pack, content };
                    this.loadedPacks[entityType][packId] = data;
                } else {
                    continue;
                }
            } else {
                const { pack } = data;
                progress.advance(`Loading ${pack.metadata.label}`);
            }

            yield data;
        }
        progress.close('Loading complete');
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
    sorters: any;
    filters!: Record<string, Record<string, boolean>>;
    ranges: any;
    settings!: TabData<{ [key: string]: PackInfo }>;
    navigationTab!: Tabs;
    data!: TabData<object>;

    constructor(options = {}) {
        super(options);

        this.loadSettings();
        this.initCompendiumList();
        this.injectActorDirectory();
        this.hookTab();
    }

    initCompendiumList() {
        const settings = {
            action: {},
            bestiary: {},
            hazard: {},
            equipment: {},
            feat: {},
            spell: {},
        };
        let types: string[];
        for (const pack of game.packs.values()) {
            if (pack.metadata.entity === 'Item') {
                types = ['action', 'equipment', 'feat', 'spell'];
            } else if (pack.metadata.entity === 'Actor') {
                types = ['bestiary', 'hazard'];
            } else {
                continue;
            }

            for (const t of types) {
                const load = this.settings[t]?.[pack.collection]?.load ?? pack.collection.includes(t);

                settings[t][pack.collection] = {
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

    _loadedPacks(tab: string) {
        return (Object.entries(this.settings[tab] ?? []) as [string, PackInfo][]).flatMap(([collection, info]) => {
            return info.load ? [collection] : [];
        });
    }

    async loadActions() {
        console.debug('PF2e System | Compendium Browser | Started loading feats');

        const actions = {};

        for await (const { pack, content } of packLoader.loadPacks('Item', this._loadedPacks('action'))) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - Loading`);
            for (let action of content) {
                action = action.data;
                if (action.type === 'action') {
                    // update icons for any passive actions
                    if (action.data.actionType.value === 'passive') action.img = this._getActionImg('passive');
                    // record the pack the feat was read from
                    action.compendium = pack.collection;
                    actions[action._id] = action;
                }
            }
        }

        console.debug('PF2e System | Compendium Browser | Finished loading actions');

        return {
            actions,
            actionTraits: _sortedObject(CONFIG.PF2E.featTraits),
            skills: CONFIG.PF2E.skillList,
            proficiencies: CONFIG.PF2E.proficiencyLevels,
        };
    }

    async loadBestiary() {
        console.debug('PF2e System | Compendium Browser | Started loading actors');

        const bestiaryActors = {};
        const sources: Set<string> = new Set();

        for await (const { pack, content } of packLoader.loadPacks('Actor', this._loadedPacks('bestiary'))) {
            console.debug(
                `PF2e System | Compendium Browser | ${pack.metadata.label} - ${content.length} entries found`,
            );
            for (let actor of content) {
                actor = actor.data;
                if (actor.type === 'npc') {
                    // record the pack the feat was read from
                    actor.compendium = pack.collection;
                    actor.filters = {};

                    actor.filters.level = actor.data.details.level.value;
                    actor.filters.traits = actor.data.traits.traits.value;
                    actor.filters.alignment = actor.data.details.alignment.value;
                    actor.filters.actorSize = actor.data.traits.size.value;

                    // get the source of the bestiary entry ignoring page number and add it as an additional attribute on the bestiary entry
                    if (actor.data.details.source && actor.data.details.source.value) {
                        const actorSource = actor.data.details.source.value;
                        if (actorSource.includes('pg.')) {
                            actor.filters.source = actorSource.split('pg.')[0].trim();
                        } else if (actorSource.includes('page.')) {
                            actor.filters.source = actorSource.split('page.')[0].trim();
                        } else {
                            actor.filters.source = actorSource;
                        }
                    }

                    // add the source to the filter list.
                    if (actor.filters.source) {
                        sources.add(actor.filters.source);
                    }

                    // add actor to bestiaryActors object
                    bestiaryActors[actor._id] = actor;

                    // Add rarity for filtering
                    actor.filters.rarity = (() => {
                        if (actor.data.traits.rarity) return actor.data.traits.rarity.value; // TODO: only look in one place once data is fixed
                        if (actor.data.rarity) return actor.data.rarity.value;
                        return { value: 'common' };
                    })();
                }
            }
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - Loaded`);
        }

        console.debug('PF2e System | Compendium Browser | Finished loading Bestiary actors');
        return {
            bestiaryActors,
            actorSize: CONFIG.PF2E.actorSizes,
            alignment: CONFIG.PF2E.alignment,
            traits: _sortedObject(CONFIG.PF2E.monsterTraits),
            languages: _sortedObject(CONFIG.PF2E.languages),
            source: [...sources].sort(),
            rarities: CONFIG.PF2E.rarityTraits,
        };
    }

    async loadHazards() {
        console.debug('PF2e System | Compendium Browser | Started loading actors');

        const hazardActors = {};
        const sources: Set<string> = new Set();
        const rarities = Object.keys(CONFIG.PF2E.rarityTraits);

        for await (const { pack, content } of packLoader.loadPacks('Actor', this._loadedPacks('hazard'))) {
            console.debug(
                `PF2e System | Compendium Browser | ${pack.metadata.label} - ${content.length} entries found`,
            );
            for (let actor of content) {
                actor = actor.data;
                if (actor.type === 'hazard') {
                    // record the pack the hazard was read from
                    actor.compendium = pack.collection;
                    actor.filters = {};

                    actor.filters.level = actor.data.details.level;
                    actor.filters.traits = actor.data.traits.traits.value;

                    // get the source of the hazard entry ignoring page number and add it as an additional attribute on the hazard entry
                    if (actor.data.details.source && actor.data.details.source.value) {
                        const actorSource = actor.data.details.source.value;
                        if (actorSource.includes('pg.')) {
                            actor.filters.source = actorSource.split('pg.')[0].trim();
                        } else if (actorSource.includes('page.')) {
                            actor.filters.source = actorSource.split('page.')[0].trim();
                        } else {
                            actor.filters.source = actorSource;
                        }
                    }

                    actor.filters.complex = actor.data.details.isComplex ? 'complex' : 'simple';

                    // add the source to the filter list.
                    if (actor.filters.source) {
                        sources.add(actor.filters.source);
                    }

                    // add actor to bestiaryActors object
                    hazardActors[actor._id] = actor;

                    // Add rarity for filtering
                    actor.filters.rarity = (() => {
                        if (actor.data.traits.rarity) return actor.data.traits.rarity.value; // TODO: only look in one place once data is fixed
                        if (actor.data.rarity) return actor.data.rarity.value;
                        for (const rarity of rarities) {
                            const indexOfRarity = actor.data.traits.traits.value.indexOf(rarity);
                            if (indexOfRarity >= 0) return actor.data.traits.traits.value[indexOfRarity];
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
            traits: _sortedObject(CONFIG.PF2E.hazardTraits),
            source: [...sources].sort(),
            rarities: CONFIG.PF2E.rarityTraits,
        };
    }

    async loadEquipment() {
        console.debug('PF2e System | Compendium Browser | Started loading feats');

        const inventoryItems = {};

        const itemTypes = ['weapon', 'armor', 'equipment', 'consumable', 'treasure', 'backpack', 'kit'];

        for await (const { pack, content } of packLoader.loadPacks('Item', this._loadedPacks('equipment'))) {
            console.debug(
                `PF2e System | Compendium Browser | ${pack.metadata.label} - ${content.length} entries found`,
            );
            for (let item of content) {
                item = item.data;
                if (itemTypes.includes(item.type)) {
                    // record the pack the feat was read from
                    item.compendium = pack.collection;

                    // add item.type into the correct format for filtering
                    item.data.itemTypes = { value: item.type };

                    // add spell to spells array
                    inventoryItems[item._id] = item;

                    // Add rarity for filtering
                    item.data.rarity = (() => {
                        if (item.data.traits.rarity) return item.data.traits.rarity; // TODO: only look in one place once data is fixed
                        if (item.data.rarity) return item.data.rarity;
                        return { value: 'common' };
                    })();
                }
            }
        }

        console.debug('PF2e System | Compendium Browser | Finished loading inventory items');
        return {
            inventoryItems,
            armorTypes: CONFIG.PF2E.armorTypes,
            armorGroups: CONFIG.PF2E.armorGroups,
            weaponTraits: _sortedObject(CONFIG.PF2E.weaponTraits),
            // TODO: i18n
            itemTypes: {
                weapon: 'Weapons',
                armor: 'Armor',
                equipment: 'Equipment',
                consumable: 'Consumables',
                treasure: 'Treasure',
                backpack: 'Containers',
                kit: 'Kits',
            },
            rarities: CONFIG.PF2E.rarityTraits,
            weaponTypes: CONFIG.PF2E.weaponTypes,
            weaponGroups: CONFIG.PF2E.weaponGroups,
        };
    }

    async loadFeats() {
        console.debug('PF2e System | Compendium Browser | Started loading feats');

        const feats = {};
        const classes: Set<string> = new Set();
        const skills: Set<string> = new Set();
        const ancestries: Set<string> = new Set();
        const times: Set<string> = new Set();
        const ancestryList = Object.keys(CONFIG.PF2E.ancestryTraits);

        for await (const { pack, content } of packLoader.loadPacks('Item', this._loadedPacks('feat'))) {
            console.debug(
                `PF2e System | Compendium Browser | ${pack.metadata.label} - ${content.length} entries found`,
            );
            for (let feat of content) {
                feat = feat.data;
                if (feat.type === 'feat') {
                    // record the pack the feat was read from
                    feat.compendium = pack.collection;

                    // determining attributes from traits
                    if (feat.data.traits.value) {
                        // determine class feats
                        const classList = Object.keys(CONFIG.PF2E.classTraits);
                        const classIntersection = classList.filter((x) => feat.data.traits.value.includes(x));

                        if (classIntersection.length !== 0) {
                            classes.add(classIntersection.join(','));
                            feat.data.classes = { value: classIntersection };
                        }

                        if (feat.data.featType.value === 'ancestry') {
                            const ancestryIntersection = ancestryList.filter((x) => feat.data.traits.value.includes(x));

                            if (ancestryIntersection.length !== 0) {
                                ancestries.add(ancestryIntersection.join(','));
                                feat.data.ancestry = { value: ancestryIntersection };
                            }
                        }
                    }

                    // determine skill prerequisites
                    // Note: This code includes some feats, where the prerequisite has the name of a skill.
                    // I decided to include them. The code would not be worth it, to exclude a single feat
                    // (Basic Arcana)
                    {
                        const skillList = Object.keys(CONFIG.PF2E.skillList);
                        const prereqs = feat.data.prerequisites.value;
                        let prerequisitesArr: string[] = [];

                        prerequisitesArr = prereqs.map((y: { value: string }) => y.value.toLowerCase());

                        const skillIntersection = skillList.filter((x) =>
                            prerequisitesArr.some((entry) => entry.includes(x)),
                        );

                        if (skillIntersection.length !== 0) {
                            skills.add(skillIntersection.join(','));
                            feat.data.skills = { value: skillIntersection };
                        }
                    }

                    // format spell level for display
                    feat.data.level.formated = parseInt(feat.data.level.value, 10);

                    // format spell level for display
                    let time = '';
                    if (feat.data.actionType.value === 'reaction') {
                        feat.data.actionType.img = this._getActionImg('reaction');
                        time = 'reaction';
                    } else if (feat.data.actionType.value === 'free') {
                        feat.data.actionType.img = this._getActionImg('free');
                        time = 'free';
                    } else if (feat.data.actionType.value === 'passive') {
                        feat.data.actionType.img = this._getActionImg('passive');
                        time = 'passive';
                    } else if (parseInt(feat.data.actions.value, 10)) {
                        feat.data.actionType.img = this._getActionImg(feat.data.actions.value);
                        time = feat.data.actions.value.toLowerCase();
                    }

                    if (time !== '') {
                        times.add(time);
                    }

                    // add spell to spells array
                    feats[feat._id] = feat;

                    // Add rarity for filtering
                    feat.data.rarity = (() => {
                        if (feat.data.traits.rarity) return feat.data.traits.rarity; // TODO: only look in one place once data is fixed
                        if (feat.data.rarity) return feat.data.rarity;
                        return { value: 'common' };
                    })();
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

        const spells = {};
        const classes: Set<string> = new Set();
        const schools: Set<MagicSchool> = new Set();
        const times: Set<string> = new Set();
        const classList = Object.keys(CONFIG.PF2E.classTraits);

        for await (const { pack, content } of packLoader.loadPacks('Item', this._loadedPacks('spell'))) {
            console.debug(
                `PF2e System | Compendium Browser | ${pack.metadata.label} - ${content.length} entries found`,
            );
            for (let spell of content) {
                spell = spell.data;
                if (spell.type === 'spell') {
                    // record the pack the spell was read from
                    spell.compendium = pack.collection;

                    // format spell level for display
                    if (spell.data.level.value === 0) spell.data.level.formated = 'C';
                    else if (spell.data.level.value === 11) spell.data.level.formated = 'F';
                    else spell.data.level.formated = spell.data.level.value;

                    // determining classes that can use the spell
                    const classIntersection = classList.filter((x) => spell.data.traits.value.includes(x));

                    if (classIntersection.length !== 0) {
                        classes.add(classIntersection.join(','));
                        spell.data.classes = { value: classIntersection };
                    }

                    // recording casting times
                    if (spell.data.time.value !== undefined) {
                        let time = spell.data.time.value;
                        if (time.indexOf('reaction') !== -1) time = 'reaction';
                        times.add(time);
                    }

                    // format spell level for display
                    if (spell.data.time.value === 'reaction') {
                        spell.data.time.img = this._getActionImg('reaction');
                    } else if (spell.data.time.value === 'free') {
                        spell.data.time.img = this._getActionImg('free');
                    } else {
                        spell.data.time.img = this._getActionImg(spell.data.time.value);
                    }

                    // add spell to spells array
                    spells[spell._id] = spell;

                    // recording schools
                    if (spell.data.school.value !== undefined) {
                        schools.add(spell.data.school.value);
                    }

                    // Add rarity for filtering
                    spell.data.rarity = (() => {
                        if (spell.data.traits.rarity) return spell.data.traits.rarity; // TODO: only look in one place once data is fixed
                        if (spell.data.rarity) return spell.data.rarity;
                        return { value: 'common' };
                    })();
                }
            }
        }

        //  sorting and assigning better class names
        const classesObj = {};
        for (const classStr of [...classes].sort()) {
            classesObj[classStr] = CONFIG.PF2E.classTraits[classStr];
        }

        // sorting and assigning proper school names
        const schoolsObj = {};
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
            spellTraits: CONFIG.PF2E.spellOtherTraits,
        };
    }

    static override get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: [],
            template: 'systems/pf2e/templates/packs/compendium-browser.html',
            width: 800,
            height: 700,
            resizable: false, // TODO: Fix CSS scrollbar issue and remove fixed size
            tabs: [
                {
                    navSelector: '.compendium-navigation',
                    contentSelector: '.compendium-content',
                    initial: 'landing-page',
                },
            ],
        });
    }

    override get title() {
        return game.i18n.localize('PF2E.CompendiumBrowser.Title');
    }

    override activateListeners(html: JQuery) {
        super.activateListeners(html);
        this.resetFilters(html);

        html.on('click', '.clear-filters', () => {
            this.resetFilters(html);
            this.filterSpells(html.find('.tab.active li'));
        });

        // show spell card
        html.on('click', '.item-edit, .actor-edit', (ev) => {
            const entry = ev.currentTarget.closest('.spell').dataset;
            const id = entry.entryId;
            const compendium = entry.entryCompendium;
            const pack = game.packs.get(compendium);
            pack?.getDocument(id).then((spell) => {
                spell!.sheet.render(true);
            });
        });

        // make draggable
        html.find('.draggable').each((_i, li) => {
            li.setAttribute('draggable', 'true');
            li.addEventListener(
                'dragstart',
                (event) => {
                    const packName = li.dataset.entryCompendium;
                    const pack = game.packs.find((p) => p.collection === packName);
                    if (!pack) {
                        event.preventDefault();
                        return false;
                    }
                    event.dataTransfer!.setData(
                        'text/plain',
                        JSON.stringify({
                            type: pack.documentName,
                            pack: pack.collection,
                            id: li.dataset.entryId,
                        }),
                    );
                    return true;
                },
                false,
            );
        });

        // toggle visibility of filter containers
        html.on('click', '.filtercontainer h3', (ev) => {
            $(ev.target.nextElementSibling).toggle(100);
        });

        // toggle hints
        html.on('contextmenu', 'input[name=textFilter]', () => {
            html.find('.hint').toggle(100);
        });

        // sort spell list
        html.on('change', 'select[name=sortorder]', (ev) => {
            const spellList = html.find('.tab.active li');
            const byName = ev.target.value === 'true';
            const sortedList = this.sortSpells(spellList, byName);
            const ol = $(html.find('.tab.active ul'));
            ol[0].innerHTML = '';
            for (const element of sortedList) {
                ol[0].append(element);
            }
        });

        // activating or deactivating filters
        html.on('change paste', 'input[name=textFilter]', (ev) => {
            this.sorters.text = ev.target.value;
            this.filterSpells(html.find('.tab.active li'));
        });
        html.on('change', '#timefilter select', (ev) => {
            this.sorters.castingtime = ev.target.value;
            this.filterSpells(html.find('.tab.active li'));
        });

        // filters for spell level, class and school
        html.on('click', 'input[type=checkbox]', (ev) => {
            const filterType = ev.target.name.split(/-(.+)/)[0];
            const filterTarget = ev.target.name.split(/-(.+)/)[1];
            const filterValue = ev.target.checked;
            if (Object.keys(this.filters).includes(filterType)) {
                this.filters[filterType][filterTarget] = filterValue;
                this.filters[filterType] = this.clearObject(this.filters[filterType]);
            }
            this.filterSpells(html.find('.tab.active li'));
        });

        // filter for levels
        html.on('input change paste', 'input[name*=Bound]', (ev) => {
            const type = ev.target.name.split('-')[1];

            const parentDiv = ev.target.parentElement;
            const lowerBoundElement = parentDiv.querySelector('input[name*=lowerBound]');
            const upperBoundElement = parentDiv.querySelector('input[name*=upperBound]');

            this.ranges[type].lowerBound = (<HTMLInputElement>lowerBoundElement).value;
            this.ranges[type].upperBound = (<HTMLInputElement>upperBoundElement).value;

            this.filterSpells(html.find('.tab.active li'));
        });

        html.on('click', 'button.save-settings', (_ev) => {
            const formData = new FormData(html.find<HTMLFormElement>('.compendium-browser-settings form')[0]);
            for (const [t, packs] of Object.entries(this.settings) as [string, { [key: string]: PackInfo }][]) {
                for (const [key, pack] of Object.entries(packs) as [string, PackInfo][]) {
                    pack.load = formData.has(`${t}-${key}`);
                }
            }
            game.settings.set('pf2e', 'compendiumBrowserPacks', JSON.stringify(this.settings));
        });

        html.on('click', '.take-item', (_ev) => {
            const entry = _ev.currentTarget.closest('.spell').dataset;
            const id = entry.entryId;

            this.addPhysicalItemsToSelectedTokens(id);
        });
    }

    private addPhysicalItemsToSelectedTokens(id: string) {
        this.createPhysicalItemFromCompendiumId(id).then((item) => {
            if (item instanceof KitPF2e) {
                const kitItems: Record<string, KitEntryData> = item.data.data.items;
                (Object.values(kitItems) as Array<KitEntryData>).forEach((kitItem) =>
                    this.addPhysicalItemsToSelectedTokens(kitItem.id),
                );
            } else {
                const actorsToUpdate = new Set(canvas.tokens.controlled.map((token) => token.actor));

                for (const actor of actorsToUpdate) {
                    if (actor === undefined) {
                        continue;
                    }

                    const userHasPermissions = actor!.canUserModify(game.user, 'update') ?? false;
                    const actorType = actor!.data?.type ?? 'undefined';
                    const actorMayContainEquipment =
                        actorType === 'character' || actorType === 'loot' || actorType === 'npc';

                    if (item !== null && userHasPermissions && actorMayContainEquipment) {
                        actor!.createEmbeddedDocuments('Item', [item.data]);
                    } else {
                        ui.notifications.error(game.i18n.format('PF2E.ErrorMessage.NoTokenSelected'), {});
                    }
                }
            }
        });
    }

    private async createPhysicalItemFromCompendiumId(itemID: string): Promise<PhysicalItemPF2e | KitPF2e | null> {
        const pack = game.packs.get('pf2e.equipment-srd');
        if (!pack) {
            console.error('PF2e System | Compendium not found');
            return null;
        }
        const item = await pack?.getDocument(itemID);
        if (!(item instanceof PhysicalItemPF2e || item instanceof KitPF2e)) {
            console.error('PF2e System | Item from compendium not found');
            return null;
        }

        return item;
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

    async filterSpells(li: JQuery) {
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
        if (this.sorters.text !== '') {
            const searches = this.sorters.text.split(',');
            for (const search of searches) {
                if (search.indexOf(':') === -1) {
                    if (
                        !normaliseString($(element).find('.spell-name a')[0].innerHTML).includes(
                            normaliseString(search),
                        )
                    ) {
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
        if (this.sorters.castingtime !== 'null') {
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
            castingtime: 'null',
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
        html.find('.tab.browser input[name=timefilter]').val('null');
        html.find('.tab.browser input[type=checkbox]').prop('checked', false);
    }

    sortSpells(list: JQuery, byName: boolean): HTMLElement[] {
        interface LIMapping {
            value: string | number;
            li: HTMLElement;
            i: number;
        }

        const mappedList: LIMapping[] = byName
            ? list.map((i, li) => ({ value: $(li).find('.spell-name a')[0].innerHTML, li, i })).toArray()
            : list.map((i, li) => ({ value: parseInt(li.dataset.level || '-10', 10), li, i })).toArray();

        mappedList.sort((a, b) => {
            const aName = a.value;
            const bName = b.value;
            if (aName < bName) return -1;
            if (aName > bName) return 1;
            return a.i - b.i;
        });
        return mappedList.map((mapping) => mapping.li);
    }
}
