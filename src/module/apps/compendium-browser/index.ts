import { Progress } from "./progress";
import { PhysicalItemPF2e } from "@item/physical";
import { KitPF2e } from "@item/kit";
import { MagicSchool } from "@item/spell/data";
import { coinValueInCopper, extractPriceFromItem } from "@item/treasure/helpers";
import { ErrorPF2e, tupleHasValue } from "@module/utils";
import { ActorPF2e, FamiliarPF2e } from "@actor";
import { LocalizePF2e } from "@system/localize";

/** Provide a best-effort sort of an object (e.g. CONFIG.PF2E.monsterTraits) */
function sortedObject(obj: Record<string, unknown>) {
    return Object.fromEntries([...Object.entries(obj)].sort());
}

function sortedIndexByName(index: Record<string, CompendiumIndexData>): Record<string, CompendiumIndexData> {
    const sorted: Record<string, CompendiumIndexData> = {};
    Object.values(index)
        .sort((entryA, entryB) => (entryA.name > entryB.name ? 1 : entryA.name < entryB.name ? -1 : 0))
        .forEach((entry) => {
            sorted[entry._id] = entry;
        });
    return sorted;
}

/** Ensure all index fields are present in the index data */
function hasAllIndexFields(data: CompendiumIndexData, indexFields: string[]): boolean {
    for (const field of indexFields) {
        if (getProperty(data, field) === undefined) {
            return false;
        }
    }
    return true;
}

function normaliseString(str: string): string {
    // Normalise to NFD to separate diacritics, then remove unwanted characters and convert to lowercase
    // For now, keep only alnums; if we want smarter, we can change it later
    return str
        .normalize("NFD")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

type SortByOption = "name" | "level" | "price";
type SortDirection = "asc" | "desc";

class PackLoader {
    loadedPacks: {
        Actor: Record<string, { pack: CompendiumCollection; index: CompendiumIndex } | undefined>;
        Item: Record<string, { pack: CompendiumCollection; index: CompendiumIndex } | undefined>;
    } = { Actor: {}, Item: {} };

    async *loadPacks(entityType: "Actor" | "Item", packs: string[], indexFields: string[]) {
        this.loadedPacks[entityType] ??= {};
        const translations = LocalizePF2e.translations.PF2E.CompendiumBrowser.ProgressBar;

        const progress = new Progress({ steps: packs.length });
        for await (const packId of packs) {
            let data = this.loadedPacks[entityType][packId];
            if (!data) {
                const pack = game.packs.get(packId);
                if (!pack) {
                    progress.advance("");
                    continue;
                }
                progress.advance(game.i18n.format(translations.LoadingPack, { pack: pack.metadata.label }));
                if (pack.metadata.entity === entityType) {
                    const index = await pack.getIndex({ fields: indexFields });
                    const firstResult = index.contents[0] ?? {};
                    // Every result should have the 'data' property otherwise the indexFields were wrong for that pack
                    if (firstResult.data) {
                        data = { pack, index };
                        this.loadedPacks[entityType][packId] = data;
                    } else {
                        continue;
                    }
                } else {
                    continue;
                }
            } else {
                const { pack } = data;
                progress.advance(game.i18n.format(translations.LoadingPack, { pack: pack?.metadata.label ?? "" }));
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
type TabName = "action" | "bestiary" | "equipment" | "feat" | "hazard" | "spell" | "settings";
type TabData<T> = Record<TabName, T | null>;

export class CompendiumBrowser extends Application {
    sorters: { text: string; castingtime: string } = { text: "", castingtime: "" };
    filters!: Record<string, Record<string, boolean>>;
    ranges: Record<string, { lowerBound: number; upperBound: number }> = {};
    settings!: Omit<TabData<Record<string, PackInfo | undefined>>, "settings">;
    navigationTab!: Tabs;
    data!: TabData<Record<string, unknown> | null>;

    /** Is the user currently dragging a document from the browser? */
    private userIsDragging = false;

    /** An initial filter to be applied upon loading a tab */
    private initialFilter: string | null = null;

    npcIndex = [
        "img",
        "data.details.level.value",
        "data.details.alignment.value",
        "data.details.source.value",
        "data.traits",
    ];

    hazardIndex = ["img", "data.details.level.value", "data.details.isComplex", "data.traits"];

    /** The combined index for hazards and NPCs */
    hazardNPCIndex: string[];

    constructor(options = {}) {
        super(options);

        this.loadSettings();
        this.initCompendiumList();
        this.injectActorDirectory();
        this.hookTab();

        this.hazardNPCIndex = [...new Set([...this.npcIndex, ...this.hazardIndex])];
    }

    override get title() {
        return game.i18n.localize("PF2E.CompendiumBrowser.Title");
    }

    static override get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "compendium-browser",
            classes: [],
            template: "systems/pf2e/templates/packs/compendium-browser.html",
            width: 800,
            height: 700,
            resizable: true,
            dragDrop: [{ dragSelector: "ul.item-list > li.item" }],
            tabs: [
                {
                    navSelector: "nav",
                    contentSelector: "section.content",
                    initial: "landing-page",
                },
            ],
        });
    }

    override async _render(force?: boolean, options?: RenderOptions) {
        await super._render(force, options);
        this.activateResultListeners();
    }

    /** Reset initial filtering */
    override async close(options?: { force?: boolean }): Promise<void> {
        this.initialFilter = null;
        await super.close(options);
    }

    private initCompendiumList() {
        const settings: Omit<TabData<Record<string, PackInfo | undefined>>, "settings"> = {
            action: {},
            bestiary: {},
            hazard: {},
            equipment: {},
            feat: {},
            spell: {},
        };

        // NPCs and Hazards are all loaded by default other packs can be set here.
        const loadDefault: Record<string, boolean | undefined> = {
            "pf2e.actionspf2e": true,
            "pf2e.equipment-srd": true,
            "pf2e.ancestryfeatures": true,
            "pf2e.classfeatures": true,
            "pf2e.feats-srd": true,
            "pf2e.spells-srd": true,
        };

        for (const pack of game.packs) {
            const types = new Set(pack.index.map((entry) => entry.type));
            if (types.size === 0) continue;

            if (types.has("npc")) {
                const load = this.settings.bestiary?.[pack.collection]?.load ?? true;
                settings.bestiary![pack.collection] = {
                    load,
                    name: pack.metadata.label,
                };
            }
            if (types.has("hazard")) {
                const load = this.settings.hazard?.[pack.collection]?.load ?? true;
                settings.hazard![pack.collection] = {
                    load,
                    name: pack.metadata.label,
                };
            }

            if (types.has("action")) {
                const load = this.settings.action?.[pack.collection]?.load ?? !!loadDefault[pack.collection];
                settings.action![pack.collection] = {
                    load,
                    name: pack.metadata.label,
                };
            } else if (
                ["weapon", "armor", "equipment", "consumable", "treasure", "backpack", "kit"].some((type) =>
                    types.has(type)
                )
            ) {
                const load = this.settings.equipment?.[pack.collection]?.load ?? !!loadDefault[pack.collection];
                settings.equipment![pack.collection] = {
                    load,
                    name: pack.metadata.label,
                };
            } else if (types.has("feat")) {
                const load = this.settings.feat?.[pack.collection]?.load ?? !!loadDefault[pack.collection];
                settings.feat![pack.collection] = {
                    load,
                    name: pack.metadata.label,
                };
            } else if (types.has("spell")) {
                const load = this.settings.spell?.[pack.collection]?.load ?? !!loadDefault[pack.collection];
                settings.spell![pack.collection] = {
                    load,
                    name: pack.metadata.label,
                };
            }
        }

        for (const tab of ["action", "bestiary", "equipment", "feat", "hazard", "spell"] as const) {
            settings[tab] = Object.fromEntries(
                Object.entries(settings[tab]!).sort(([_collectionA, dataA], [_collectionB, dataB]) => {
                    return (dataA?.name ?? "") > (dataB?.name ?? "") ? 1 : -1;
                })
            );
        }

        this.settings = settings;
    }

    loadSettings() {
        this.settings = JSON.parse(game.settings.get("pf2e", "compendiumBrowserPacks"));
        this.data = {
            action: null,
            bestiary: null,
            equipment: null,
            feat: null,
            hazard: null,
            spell: null,
            settings: null,
        };
    }

    hookTab() {
        this.navigationTab = this._tabs[0];
        const tabCallback = this.navigationTab.callback;
        this.navigationTab.callback = async (event: JQuery.TriggeredEvent | null, tabs: Tabs, active: TabName) => {
            tabCallback?.(event, tabs, active);
            await this.loadTab(active);
        };
    }

    async openTab(tab: TabName, filter: string | null = null): Promise<void> {
        this.initialFilter = filter;
        await this._render(true);
        this.initialFilter = filter; // Reapply in case of a double-render (need to track those down)
        this.navigationTab.activate(tab, { triggerCallback: true });
    }

    async loadTab(tab: TabName): Promise<void> {
        if (this.data[tab]) return;
        const data = await (async (): Promise<Record<string, unknown> | null> => {
            switch (tab) {
                case "settings":
                    return null;
                case "action":
                    return await this.loadActions();
                case "equipment":
                    return await this.loadEquipment();
                case "feat":
                    return await this.loadFeats();
                case "spell":
                    return await this.loadSpells();
                case "bestiary":
                    return await this.loadBestiary();
                case "hazard":
                    return await this.loadHazards();
                default:
                    throw ErrorPF2e(`Unknown tab "${tab}"`);
            }
        })();

        if (data) this.data[tab] = data;
        if (this.rendered) this.render(true);
    }

    private loadedPacks(tab: TabName): string[] {
        if (tab === "settings") return [];
        return Object.entries(this.settings[tab] ?? []).flatMap(([collection, info]) => {
            return info ? [collection] : [];
        });
    }

    async loadActions() {
        console.debug("PF2e System | Compendium Browser | Started loading feats");

        const actions: Record<string, CompendiumIndexData> = {};
        const indexFields = ["img", "data.actionType.value"];

        for await (const { pack, index } of packLoader.loadPacks("Item", this.loadedPacks("action"), indexFields)) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - Loading`);
            for (const actionData of index) {
                if (actionData.type === "action") {
                    if (!hasAllIndexFields(actionData, indexFields)) {
                        console.warn(
                            `Action '${actionData.name}' does not have all required data fields. Consider unselecting pack '${pack.metadata.label}' in the compendium browser settings.`
                        );
                        continue;
                    }
                    // update icons for any passive actions
                    if (actionData.data.actionType.value === "passive") actionData.img = this._getActionImg("passive");
                    // record the pack the feat was read from
                    actionData.compendium = pack.collection;
                    actions[actionData._id] = actionData;
                }
            }
        }

        console.debug("PF2e System | Compendium Browser | Finished loading actions");

        return {
            actions: sortedIndexByName(actions),
            actionTraits: sortedObject(CONFIG.PF2E.featTraits),
            skills: CONFIG.PF2E.skillList,
            proficiencies: CONFIG.PF2E.proficiencyLevels,
        };
    }

    async loadBestiary() {
        console.debug("PF2e System | Compendium Browser | Started loading actors");

        const bestiaryActors: Record<string, CompendiumIndexData> = {};
        const sources: Set<string> = new Set();
        const indexFields = this.hazardNPCIndex;

        for await (const { pack, index } of packLoader.loadPacks("Actor", this.loadedPacks("bestiary"), indexFields)) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - ${index.size} entries found`);
            for (const actorData of index) {
                if (actorData.type === "npc") {
                    if (!hasAllIndexFields(actorData, this.npcIndex)) {
                        console.warn(
                            `Actor '${actorData.name}' does not have all required data fields. Consider unselecting pack '${pack.metadata.label}' in the compendium browser settings.`
                        );
                        continue;
                    }
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
                        if (actorSource.includes("pg.")) {
                            actorData.filters.source = actorSource.split("pg.")[0].trim();
                        } else if (actorSource.includes("page.")) {
                            actorData.filters.source = actorSource.split("page.")[0].trim();
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

        console.debug("PF2e System | Compendium Browser | Finished loading Bestiary actors");
        return {
            bestiaryActors: sortedIndexByName(bestiaryActors),
            actorSize: CONFIG.PF2E.actorSizes,
            alignment: CONFIG.PF2E.alignment,
            traits: sortedObject(CONFIG.PF2E.monsterTraits),
            languages: sortedObject(CONFIG.PF2E.languages),
            source: [...sources].sort(),
            rarities: CONFIG.PF2E.rarityTraits,
        };
    }

    async loadHazards() {
        console.debug("PF2e System | Compendium Browser | Started loading actors");

        const hazardActors: Record<string, CompendiumIndexData> = {};
        const sources: Set<string> = new Set();
        const rarities = Object.keys(CONFIG.PF2E.rarityTraits);
        const indexFields = this.hazardNPCIndex;

        for await (const { pack, index } of packLoader.loadPacks("Actor", this.loadedPacks("hazard"), indexFields)) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - ${index.size} entries found`);
            for (const actorData of index) {
                if (actorData.type === "hazard") {
                    if (!hasAllIndexFields(actorData, this.hazardIndex)) {
                        console.warn(
                            `Hazard '${actorData.name}' does not have all required data fields. Consider unselecting pack '${pack.metadata.label}' in the compendium browser settings.`
                        );
                        continue;
                    }
                    // record the pack the hazard was read from
                    actorData.compendium = pack.collection;
                    actorData.filters = {};

                    actorData.filters.level = actorData.data.details.level.value;
                    actorData.filters.traits = actorData.data.traits.traits.value;

                    // get the source of the hazard entry ignoring page number and add it as an additional attribute on the hazard entry
                    if (actorData.data.details.source && actorData.data.details.source.value) {
                        const actorSource = actorData.data.details.source.value;
                        if (actorSource.includes("pg.")) {
                            actorData.filters.source = actorSource.split("pg.")[0].trim();
                        } else if (actorSource.includes("page.")) {
                            actorData.filters.source = actorSource.split("page.")[0].trim();
                        } else {
                            actorData.filters.source = actorSource;
                        }
                    }

                    actorData.filters.complex = actorData.data.details.isComplex ? "complex" : "simple";

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
                        return "common";
                    })();
                }
            }
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - Loaded`);
        }

        console.debug("PF2e System | Compendium Browser | Finished loading Hazard actors");
        return {
            hazardActors: sortedIndexByName(hazardActors),
            traits: sortedObject(CONFIG.PF2E.hazardTraits),
            source: [...sources].sort(),
            rarities: CONFIG.PF2E.rarityTraits,
        };
    }

    async loadEquipment() {
        console.debug("PF2e System | Compendium Browser | Started loading feats");

        const inventoryItems: Record<string, CompendiumIndexData> = {};
        const itemTypes = ["weapon", "armor", "equipment", "consumable", "treasure", "backpack", "kit"];
        // Define index fields for different types of equipment
        const kitFields = ["img", "data.price.value", "data.traits"];
        const baseFields = [...kitFields, "data.stackGroup.value", "data.level.value"];
        const armorFields = [...baseFields, "data.armorType.value", "data.group.value"];
        const weaponFields = [...baseFields, "data.weaponType.value", "data.group.value"];
        const indexFields = [...new Set([...armorFields, ...weaponFields])];

        for await (const { pack, index } of packLoader.loadPacks("Item", this.loadedPacks("equipment"), indexFields)) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - ${index.size} entries found`);
            for (const itemData of index) {
                if (itemData.type === "treasure" && itemData.data.stackGroup.value === "coins") continue;
                if (itemTypes.includes(itemData.type)) {
                    let skip = false;
                    if (itemData.type === "weapon") {
                        if (!hasAllIndexFields(itemData, weaponFields)) skip = true;
                    } else if (itemData.type === "armor") {
                        if (!hasAllIndexFields(itemData, armorFields)) skip = true;
                    } else if (itemData.type === "kit") {
                        if (!hasAllIndexFields(itemData, kitFields)) skip = true;
                    } else {
                        if (!hasAllIndexFields(itemData, baseFields)) skip = true;
                    }
                    if (skip) {
                        console.warn(
                            `Item '${itemData.name}' does not have all required data fields. Consider unselecting pack '${pack.metadata.label}' in the compendium browser settings.`
                        );
                        continue;
                    }

                    // record the pack the feat was read from
                    itemData.compendium = pack.collection;

                    // add item.type into the correct format for filtering
                    itemData.data.itemTypes = { value: itemData.type };
                    itemData.data.rarity = { value: itemData.data.traits.rarity.value };
                    itemData.filters = [
                        "itemTypes",
                        "rarity",
                        "level",
                        "traits",
                        "price",
                        "source",
                        "armorType",
                        "weaponType",
                        "group",
                    ];

                    // add spell to spells array
                    inventoryItems[itemData._id] = itemData;
                }
            }
        }

        console.debug("PF2e System | Compendium Browser | Finished loading inventory items");
        return {
            inventoryItems: sortedIndexByName(inventoryItems),
            armorTypes: CONFIG.PF2E.armorTypes,
            armorGroups: CONFIG.PF2E.armorGroups,
            weaponTraits: sortedObject(CONFIG.PF2E.weaponTraits),
            itemTypes: {
                weapon: game.i18n.localize("ITEM.TypeWeapon"),
                armor: game.i18n.localize("ITEM.TypeArmor"),
                equipment: game.i18n.localize("ITEM.TypeEquipment"),
                consumable: game.i18n.localize("ITEM.TypeConsumable"),
                treasure: game.i18n.localize("ITEM.TypeTreasure"),
                backpack: game.i18n.localize("ITEM.TypeBackpack"),
                kit: game.i18n.localize("ITEM.TypeKit"),
            },
            rarities: CONFIG.PF2E.rarityTraits,
            weaponTypes: CONFIG.PF2E.weaponTypes,
            weaponGroups: CONFIG.PF2E.weaponGroups,
        };
    }

    async loadFeats() {
        console.debug("PF2e System | Compendium Browser | Started loading feats");

        const feats: Record<string, CompendiumIndexData> = {};
        const classes: Set<string> = new Set();
        const skills: Set<string> = new Set();
        const ancestries: Set<string> = new Set();
        const times: Set<string> = new Set();
        const ancestryList = Object.keys(CONFIG.PF2E.ancestryTraits);
        const indexFields = [
            "img",
            "data.prerequisites.value",
            "data.actionType.value",
            "data.actions.value",
            "data.featType.value",
            "data.level.value",
            "data.traits",
        ];

        for await (const { pack, index } of packLoader.loadPacks("Item", this.loadedPacks("feat"), indexFields)) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - ${index.size} entries found`);
            for (const featData of index) {
                if (featData.type === "feat") {
                    if (!hasAllIndexFields(featData, indexFields)) {
                        console.warn(
                            `Feat '${featData.name}' does not have all required data fields. Consider unselecting pack '${pack.metadata.label}' in the compendium browser settings.`
                        );
                        continue;
                    }
                    // record the pack the feat was read from
                    featData.compendium = pack.collection;

                    // determining attributes from traits
                    if (featData.data.traits.value) {
                        // determine class feats
                        const classList = Object.keys(CONFIG.PF2E.classTraits);
                        const classIntersection = classList.filter((x) => featData.data.traits.value.includes(x));

                        if (classIntersection.length !== 0) {
                            classes.add(classIntersection.join(","));
                            featData.data.classes = { value: classIntersection };
                        }

                        if (featData.data.featType.value === "ancestry") {
                            const ancestryIntersection = ancestryList.filter((x) =>
                                featData.data.traits.value.includes(x)
                            );

                            if (ancestryIntersection.length !== 0) {
                                ancestries.add(ancestryIntersection.join(","));
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
                        prerequisitesArr = prereqs.map((prerequisite: { value: string }) =>
                            prerequisite?.value ? prerequisite.value.toLowerCase() : ""
                        );

                        const skillIntersection = skillList.filter((x) =>
                            prerequisitesArr.some((entry) => entry.includes(x))
                        );

                        if (skillIntersection.length !== 0) {
                            skills.add(skillIntersection.join(","));
                            featData.data.skills = { value: skillIntersection };
                        }
                    }

                    let time = "";
                    if (featData.data.actionType.value === "reaction") {
                        featData.data.actionType.img = this._getActionImg("reaction");
                        time = "reaction";
                    } else if (featData.data.actionType.value === "free") {
                        featData.data.actionType.img = this._getActionImg("free");
                        time = "free";
                    } else if (featData.data.actionType.value === "passive") {
                        featData.data.actionType.img = this._getActionImg("passive");
                        time = "passive";
                    } else if (featData.data.actions.value) {
                        // _getActionImg handles action counts as strings because they’re specified as strings in spells (which can take "1 to 3" actions, e.g. Heal)
                        featData.data.actionType.img = this._getActionImg(featData.data.actions.value.toString());
                        time = featData.data.actions.value.toString();
                    }

                    if (time !== "") {
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
        const classesObj: Record<string, string | undefined> = {};
        for (const classStr of [...classes].sort()) {
            const classTraits: Record<string, string | undefined> = CONFIG.PF2E.classTraits;
            classesObj[classStr] = classTraits[classStr];
        }

        //  sorting and assigning better ancestry names
        const ancestryObj: Record<string, string | undefined> = {};
        for (const ancestryStr of [...ancestries].sort()) {
            const ancestryTraits: Record<string, string | undefined> = CONFIG.PF2E.ancestryTraits;
            ancestryObj[ancestryStr] = ancestryTraits[ancestryStr];
        }

        console.debug("PF2e System | Compendium Browser | Finished loading feats");
        return {
            feats: sortedIndexByName(feats),
            featClasses: CONFIG.PF2E.classTraits,
            featSkills: CONFIG.PF2E.skillList,
            featAncestry: ancestryObj,
            featTimes: [...times].sort(),
            rarities: CONFIG.PF2E.rarityTraits,
        };
    }

    async loadSpells() {
        console.debug("PF2e System | Compendium Browser | Started loading spells");

        const spells: Record<string, CompendiumIndexData> = {};
        const classes: Set<string> = new Set();
        const schools: Set<MagicSchool> = new Set();
        const times: Set<string> = new Set();
        const classList = Object.keys(CONFIG.PF2E.classTraits);
        const indexFields = [
            "img",
            "data.level.value",
            "data.category.value",
            "data.traditions.value",
            "data.time",
            "data.school.value",
            "data.traits",
        ];

        for await (const { pack, index } of packLoader.loadPacks("Item", this.loadedPacks("spell"), indexFields)) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - ${index.size} entries found`);
            for (const spellData of index) {
                if (spellData.type === "spell") {
                    if (!hasAllIndexFields(spellData, indexFields)) {
                        console.warn(
                            `Item '${spellData.name}' does not have all required data fields. Consider unselecting pack '${pack.metadata.label}' in the compendium browser settings.`
                        );
                        continue;
                    }
                    // Set category of cantrips to "cantrip" until migration can be done
                    if (spellData.data.traits.value.includes("cantrip")) {
                        spellData.data.category.value = "cantrip";
                    }

                    // record the pack the spell was read from
                    spellData.compendium = pack.collection;

                    // format spell level for display
                    if (spellData.data.level.value === 0) spellData.data.level.formated = "C";
                    else if (spellData.data.level.value === 11) spellData.data.level.formated = "F";
                    else spellData.data.level.formated = spellData.data.level.value;

                    // determining classes that can use the spell
                    const classIntersection = classList.filter((trait) => spellData.data.traits.value.includes(trait));

                    if (classIntersection.length !== 0) {
                        classes.add(classIntersection.join(","));
                        spellData.data.classes = { value: classIntersection };
                    }

                    // recording casting times
                    if (spellData.data.time.value !== undefined) {
                        let time = spellData.data.time.value;
                        if (time.indexOf("reaction") !== -1) time = "reaction";
                        times.add(time);
                    }

                    // format spell level for display
                    if (spellData.data.time.value === "reaction") {
                        spellData.data.time.img = this._getActionImg("reaction");
                    } else if (spellData.data.time.value === "free") {
                        spellData.data.time.img = this._getActionImg("free");
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
        const classesObj: Record<string, string | undefined> = {};
        for (const classStr of [...classes].sort()) {
            const classTraits: Record<string, string | undefined> = CONFIG.PF2E.classTraits;
            classesObj[classStr] = classTraits[classStr];
        }

        // sorting and assigning proper school names
        const schoolsObj: Record<string, string | undefined> = {};
        for (const school of [...schools].sort()) {
            schoolsObj[school] = CONFIG.PF2E.magicSchools[school];
        }

        console.debug("PF2e System | Compendium Browser | Finished loading spells");
        return {
            spells: sortedIndexByName(spells),
            classes: classesObj,
            times: [...times].sort(),
            schools: schoolsObj,
            categories: CONFIG.PF2E.spellCategories,
            traditions: CONFIG.PF2E.magicTraditions,
            rarities: CONFIG.PF2E.rarityTraits,
            spellTraits: sortedObject({ ...CONFIG.PF2E.spellOtherTraits, ...CONFIG.PF2E.damageTraits }),
        };
    }

    /** Set the ascending/descending order of the search results */
    setSortDirection($direction: JQuery<HTMLElement>, sortBy: SortByOption, { change = false } = {}): SortDirection {
        const direction = $direction.attr("data-direction");
        if (!(direction === "asc" || direction === "desc")) {
            throw ErrorPF2e("No sort direction set");
        }
        const newDirection = change ? (direction === "asc" ? "desc" : "asc") : direction;

        const $icon = $direction.children("i");
        const iconClass = (() => {
            const alphaNum = sortBy === "name" ? "alpha" : "numeric";
            const upDown = newDirection === "asc" ? "up" : "down-alt";
            return `fas fa-sort-${alphaNum}-${upDown}`;
        })();
        $icon.attr("class", iconClass);
        $direction.attr("data-direction", newDirection);

        return newDirection;
    }

    override activateListeners($html: JQuery) {
        super.activateListeners($html);
        this.resetFilters();

        const $controlArea = $html.find(".control-area");

        $controlArea.find("button.clear-filters").on("click", () => {
            this.resetFilters();
            this.filterItems($html.find(".tab.active li"));
        });

        // Toggle visibility of filter containers
        $controlArea.find(".filtercontainer h3").on("click", (event) => {
            $(event.delegateTarget).next().toggle(100);
        });

        // Toggle hints
        $controlArea.find("input[name=textFilter]").on("contextmenu", () => {
            $html.find(".hint").toggle(100);
        });

        // Sort item list
        const $sortContainer = $controlArea.find(".sortcontainer");
        const $orderSelects = $sortContainer.find<HTMLSelectElement>("select.order");
        const $directionButtons = $sortContainer.find("a.direction");
        $orderSelects.on("change", (event) => {
            const $order = $(event.target);
            const $direction = $order.next("a.direction");
            const sortBy = $order.val();
            if (!tupleHasValue(["name", "level", "price"] as const, sortBy)) return;

            const direction = this.setSortDirection($direction, sortBy);

            const $list = $html.find(".tab.active ul.item-list");
            this.sortResults($list, { sortBy, direction });
        });
        $directionButtons.on("click", (event) => {
            const $direction = $(event.delegateTarget);
            const $order = $direction.prev("select.order");
            const sortBy = $order.val();
            if (!tupleHasValue(["name", "level", "price"] as const, sortBy)) return;

            const direction = this.setSortDirection($direction, sortBy, { change: true });
            const $list = $html.find(".tab.active ul.item-list");
            this.sortResults($list, { sortBy, direction });
        });

        // Activate or deactivate filters
        $controlArea.find<HTMLInputElement>("input[name=textFilter]").on("change paste", (event) => {
            this.sorters.text = event.target.value;
            this.filterItems($html.find(".tab.active li"));
        });
        $controlArea.find<HTMLSelectElement>(".timefilter select").on("change", (event) => {
            this.sorters.castingtime = event.target.value;
            this.filterItems($html.find(".tab.active li"));
        });

        // Filters
        $controlArea.find<HTMLInputElement>("input[type=checkbox]").on("click", (event) => {
            const filterType = event.target.name.split(/-(.+)/)[0];
            const filterTarget = event.target.name.split(/-(.+)/)[1];
            const filterValue = event.target.checked;
            if (Object.keys(this.filters).includes(filterType)) {
                this.filters[filterType][filterTarget] = filterValue;
                this.filters[filterType] = this.clearObject(this.filters[filterType]);
            }
            this.filterItems($html.find(".tab.active li"));
        });

        // Filter for levels
        $controlArea.find<HTMLInputElement>("input[name*=Bound]").on("input change paste", (event) => {
            const type = event.target.name.split("-")[1] ?? "";

            const $parent = $(event.target).closest("div");
            const $lowerBound = $parent.find<HTMLInputElement>("input[name*=lowerBound]");
            const $upperBound = $parent.find<HTMLInputElement>("input[name*=upperBound]");

            this.ranges[type].lowerBound = Number($lowerBound.val());
            this.ranges[type].upperBound = Number($upperBound.val());

            this.filterItems($html.find(".tab.active li"));
        });

        $html.find<HTMLButtonElement>("button.save-settings").on("click", () => {
            const formData = new FormData($html.find<HTMLFormElement>(".compendium-browser-settings form")[0]);
            for (const [t, packs] of Object.entries(this.settings) as [string, { [key: string]: PackInfo }][]) {
                for (const [key, pack] of Object.entries(packs) as [string, PackInfo][]) {
                    pack.load = formData.has(`${t}-${key}`);
                }
            }
            game.settings.set("pf2e", "compendiumBrowserPacks", JSON.stringify(this.settings));
        });

        // Pre-filter list if requested
        if (this.initialFilter) {
            const $activeControlArea = $html.find(".tab.active .control-area");
            const $filter = $activeControlArea.find(`input[type="checkbox"][name=${this.initialFilter}]`);
            $filter.trigger("click");
        }
    }

    /** Activate click listeners on loaded actors and items */
    private activateResultListeners(): void {
        const $list = this.element.find(".tab.active ul.item-list");
        if ($list.length === 0) return;

        const $items = $list.children("li");
        if ($list.data("listeners-active")) {
            $items.children(".name").children("a").off("click");
        }

        $items
            .children(".name")
            .children("a.item-link, a.actor-link")
            .on("click", (event) => {
                const entry = $(event.currentTarget).closest(".item")[0].dataset;
                const id = entry.entryId ?? "";
                const compendium = entry.entryCompendium;
                const pack = game.packs.get(compendium ?? "");
                pack?.getDocument(id).then((document) => {
                    document!.sheet.render(true);
                });
            });

        // Add an item to selected tokens' actors' inventories
        $items.children("a.take-item").on("click", (event) => {
            const itemId = $(event.currentTarget).closest("li").attr("data-entry-id") ?? "";
            this.takePhysicalItem(itemId);
        });
        $list.data("listeners-active", true);
    }

    private async takePhysicalItem(itemId: string): Promise<void> {
        const actors: ActorPF2e[] = canvas.tokens.controlled.flatMap((token) =>
            token.actor?.isOwner && !(token.actor instanceof FamiliarPF2e) ? token.actor : []
        );
        if (actors.length === 0 && game.user.character) actors.push(game.user.character);
        if (actors.length === 0) {
            ui.notifications.error(game.i18n.format("PF2E.ErrorMessage.NoTokenSelected"));
            return;
        }

        const item = await this.getPhysicalItem(itemId);
        if (item instanceof KitPF2e) {
            for await (const actor of actors) await item.dumpContents(actor);
        } else {
            for await (const actor of actors) await actor.createEmbeddedDocuments("Item", [item.toObject()]);
        }

        if (actors.length === 1 && game.user.character && actors[0] === game.user.character) {
            ui.notifications.info(
                game.i18n.format("PF2E.CompendiumBrowser.AddedItemToCharacter", {
                    item: item.name,
                    character: game.user.character.name,
                })
            );
        } else {
            ui.notifications.info(game.i18n.format("PF2E.CompendiumBrowser.AddedItem", { item: item.name }));
        }
    }

    private async getPhysicalItem(itemId: string): Promise<PhysicalItemPF2e | KitPF2e> {
        const item = await game.packs.get("pf2e.equipment-srd")?.getDocument(itemId);
        if (!(item instanceof PhysicalItemPF2e || item instanceof KitPF2e)) {
            throw ErrorPF2e("Unexpected failure retrieving compendium item");
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
        const packName = $item.attr("data-entry-compendium");
        const itemPack = game.packs.find((pack) => pack.collection === packName);
        if (!itemPack) return;
        event.dataTransfer.setData(
            "text/plain",
            JSON.stringify({
                type: itemPack.documentName,
                pack: itemPack.collection,
                id: $item.attr("data-entry-id"),
            })
        );

        $item.one("dragend", () => {
            this.userIsDragging = false;
            this.element.animate({ opacity: 1 }, 500);
        });
    }

    /** Simulate a drop event on the DOM element directly beneath the compendium browser */
    protected override _onDrop(event: ElementDragEvent): void {
        if (!this.userIsDragging) return;

        // Get all elements beneath the compendium browser
        const browserZIndex = Number(this.element.css("zIndex"));
        const dropCandidates = Array.from(document.body.querySelectorAll("*")).filter(
            (element): element is HTMLElement => {
                if (!(element instanceof HTMLElement) || ["compendium-browser", "hud"].includes(element.id))
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
            }
        );

        const highestElement = dropCandidates.reduce((highest: HTMLElement | null, candidate) => {
            if (!highest) return candidate;
            return Number(candidate.style.zIndex) > Number(highest.style.zIndex) ? candidate : highest;
        }, null);

        if (highestElement) {
            const isSheet = /^actor-\w+$/.test(highestElement.id);
            const sheetForm = isSheet && highestElement.querySelector("form.editable");
            const dropTarget = isSheet && sheetForm instanceof HTMLElement ? sheetForm : highestElement;
            const newEvent = new DragEvent(event.type, {
                ...event,
                clientX: event.clientX,
                clientY: event.clientY,
                dataTransfer: new DataTransfer(),
            });
            newEvent.dataTransfer?.setData("text/plain", event.dataTransfer.getData("text/plain"));
            dropTarget.dispatchEvent(newEvent);
        }
    }

    injectActorDirectory() {
        const $html = ui.actors.element;
        if ($html.find(".bestiary-browser-btn").length > 0) return;

        // Bestiary Browser Buttons
        const bestiaryImportButton = $(
            `<button class="bestiary-browser-btn"><i class="fas fa-fire"></i> Bestiary Browser</button>`
        );

        if (game.user.isGM) {
            $html.find("footer").append(bestiaryImportButton);
        }

        // Handle button clicks
        bestiaryImportButton.on("click", (ev) => {
            ev.preventDefault();
            this.openTab("bestiary");
        });
    }

    clearObject(obj: object) {
        return Object.fromEntries(Object.entries(obj).filter(([_key, value]) => value));
    }

    _getActionImg(action: string) {
        const img: Record<string, string> = {
            1: "systems/pf2e/icons/actions/OneAction.webp",
            2: "systems/pf2e/icons/actions/TwoActions.webp",
            3: "systems/pf2e/icons/actions/ThreeActions.webp",
            "1 or 2": "systems/pf2e/icons/actions/OneTwoActions.webp",
            "1 to 3": "systems/pf2e/icons/actions/OneThreeActions.webp",
            "2 or 3": "systems/pf2e/icons/actions/TwoThreeActions.webp",
            free: "systems/pf2e/icons/actions/FreeAction.webp",
            reaction: "systems/pf2e/icons/actions/Reaction.webp",
            passive: "systems/pf2e/icons/actions/Passive.webp",
        };
        return img[action] ?? "systems/pf2e/icons/actions/OneAction.webp";
    }

    override getData() {
        return {
            user: game.user,
            ...this.data,
            settings: this.settings,
        };
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
            const searches = this.sorters.text.split(",");
            for (const search of searches) {
                if (search.indexOf(":") === -1) {
                    if (!normaliseString($(element).find(".name a")[0].innerHTML).includes(normaliseString(search))) {
                        return false;
                    }
                } else {
                    const targetValue = search.split(":")[1].trim();
                    const targetStat = search.split(":")[0];
                    if (!normaliseString(element.dataset[targetStat] ?? "").includes(normaliseString(targetValue))) {
                        return false;
                    }
                }
            }
        }
        if (this.sorters.castingtime !== "") {
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
                    for (const e of filteredElements.split(",")) {
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

    private resetFilters() {
        this.sorters = {
            text: "",
            castingtime: "",
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

        const $controlAreas = this.element.find(".tab .control-area");
        $controlAreas.find("input[name=textFilter]").val("");
        $controlAreas.find("input[name=timefilter]").val("");
        $controlAreas.find("input[type=checkbox]:checked").prop("checked", false);
    }

    sortResults(
        $list: JQuery,
        { sortBy = "name", direction = "asc" }: { sortBy: SortByOption; direction: SortDirection }
    ): void {
        interface LIMapping {
            value: string | number;
            element: HTMLElement;
            index: number;
        }
        const $items = $list.children("li");
        const mappedList: LIMapping[] = (() => {
            switch (sortBy) {
                case "name": {
                    return $items
                        .map((index, element) => ({
                            value: $(element).find(".name a")[0].innerHTML,
                            element,
                            index,
                        }))
                        .toArray();
                }
                case "level": {
                    return $items
                        .map((index, element) => {
                            const levelString = element.dataset.level?.trim() || "0";
                            return { value: Number(levelString), element, index };
                        })
                        .toArray();
                }
                case "price": {
                    return $items
                        .map((index, element) => {
                            if (element.dataset.itemtypes === "kit") {
                                const coinValues = (element.dataset.price ?? "0 gp").split(/,\s*/);
                                const total = coinValues
                                    .map((coinValue) =>
                                        coinValueInCopper(
                                            extractPriceFromItem({
                                                data: { price: { value: coinValue }, quantity: { value: 1 } },
                                            })
                                        )
                                    )
                                    .reduce((total, part) => total + part, 0);
                                return { value: total, element, index };
                            }
                            const price = coinValueInCopper(
                                extractPriceFromItem({
                                    data: { price: { value: element.dataset.price ?? "0 gp" }, quantity: { value: 1 } },
                                })
                            );
                            return { value: price, element, index };
                        })
                        .toArray();
                }
            }
        })();

        mappedList.sort((entryA, entryB) => {
            if (entryA.value < entryB.value) return direction === "asc" ? -1 : 1;
            if (entryA.value > entryB.value) return direction === "asc" ? 1 : -1;
            return 0;
        });
        const rows = mappedList.map((mapping) => mapping.element);
        $list.html("");
        for (const row of rows) {
            $list[0].append(row);
        }
        this.activateResultListeners();
    }
}
