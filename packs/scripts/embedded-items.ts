import path from "path";
import * as fs from "fs";
import systemJSON from "system.json";
import { ActionItemSource, ItemSourcePF2e, SpellSource } from "@item/data";
import { isPhysicalData } from "@item/data/helpers";
import { sluggify } from "@util";
import { PackError } from "./packman/compendium-pack";

type DeflatedItem = DeflatedAction | DeflatedSpell;

interface DeflatedItemBase {
    _id: string;
    baseItem: ItemUUID;
    sort: number;
}

interface DeflatedAction extends DeflatedItemBase {
    system?: {
        description: ActionItemSource["system"]["description"];
    };
    type: "action";
}

interface DeflatedSpell extends DeflatedItemBase {
    system: {
        location: SpellSource["system"]["location"];
    };
    type: "spell";
}

interface ItemDeflaterParams {
    idsToNames: Map<string, Map<string, string>>;
    JSONstringifyOrder: (item: ItemSourcePF2e) => string;
    sanitizeDocument: (item: ItemSourcePF2e) => void;
}

/** A cache of ItemSource instances read from disk. This is used by both classes. */
const itemCache: Map<string, ItemSourcePF2e> = new Map();

const dataPath = path.resolve(process.cwd(), "packs/data");
const packsMetadata = systemJSON.packs as unknown as CompendiumMetadata[];

class ItemDeflater {
    #idsToNames: Map<string, Map<string, string>>;
    #JSONstringifyOrder: ItemDeflaterParams["JSONstringifyOrder"];
    #sanitizeDocument: ItemDeflaterParams["sanitizeDocument"];
    #currentBaseItem?: ItemSourcePF2e;

    constructor(params: ItemDeflaterParams) {
        this.#idsToNames = params.idsToNames;
        this.#JSONstringifyOrder = params.JSONstringifyOrder;
        this.#sanitizeDocument = params.sanitizeDocument;
    }

    process(embeddedItem: ItemSourcePF2e): ItemSourcePF2e {
        if (this.#itemEqualsPackItem(embeddedItem)) {
            if (embeddedItem.type === "action") {
                return this.#deflateAction(embeddedItem);
            } else if (embeddedItem.type === "spell") {
                return this.#deflateSpell(embeddedItem);
            }
        }
        return embeddedItem;
    }

    #deflateAction(action: ActionItemSource): ActionItemSource {
        const baseItem = this.#getBaseItemUuid(action.flags.core!.sourceId!, action.name);
        const deflated: DeflatedAction = {
            _id: action._id,
            baseItem,
            sort: action.sort,
            type: "action",
        };
        if (this.#currentBaseItem?.type === "action") {
            if (action.system.description.value !== this.#currentBaseItem.system.description.value) {
                deflated.system = {
                    description: action.system.description,
                };
            }
        }
        return deflated as unknown as ActionItemSource;
    }

    #deflateSpell(spell: SpellSource): SpellSource {
        const baseItem = this.#getBaseItemUuid(spell.flags.core!.sourceId!, spell.name);
        const deflated: DeflatedSpell = {
            _id: spell._id,
            baseItem,
            sort: spell.sort,
            system: {
                location: spell.system.location,
            },
            type: "spell",
        };

        return deflated as unknown as SpellSource;
    }

    #itemEqualsPackItem(embeddedItem: ItemSourcePF2e): boolean {
        const uuid = embeddedItem.flags?.core?.sourceId;
        if (!uuid) return false;

        const packItem = this.#itemFromCompendiumUuid(uuid);
        if (packItem) {
            this.#currentBaseItem = packItem;
            // Clone the passed source to savely mutate it
            const clone = this.#clone(embeddedItem);
            clone._id = packItem._id;
            delete (clone.system as { slug?: string }).slug;
            this.#sanitizeDocument(clone);

            // Strip type specific embedded data or data that has definitely changed
            if (clone.type === "action" && packItem.type === "action") {
                // Ignore different descriptions here. This is handled in the #deflateAction method
                clone.system.description.value = packItem.system.description.value;
            } else if (isPhysicalData(clone) && isPhysicalData(packItem)) {
                // console.log(prettyPrint(clone));
            } else if (clone.type === "spell" && packItem.type === "spell") {
                const spell = clone as DeepPartial<SpellSource>;
                delete spell.system?.location;
                if (packItem.system?.components?.focus === undefined) {
                    delete spell.system?.components?.focus;
                } else {
                    if (clone.system.components.focus === undefined) {
                        clone.system.components.focus = false;
                    }
                }
            }
            const isEqual = JSON.stringify(clone) === JSON.stringify(packItem);
            if (!isEqual && embeddedItem.type === "spell") {
                console.log(this.#JSONstringifyOrder(clone));
            }

            return JSON.stringify(clone) === JSON.stringify(packItem);
        }
        return false;
    }

    #getBaseItemUuid(uuid: string, name: string): ItemUUID {
        const packName = uuid.split(".")[2];
        return `Compendium.pf2e.${packName}.${sluggify(name)}`;
    }

    #getPackFolder(packName: string): string | null {
        const metaData = packsMetadata.find((p) => p.name === packName);
        const packFolder = metaData?.path.substring(metaData.path.lastIndexOf("/") + 1);
        return packFolder ?? null;
    }

    #clone(item: ItemSourcePF2e): ItemSourcePF2e {
        return JSON.parse(this.#JSONstringifyOrder(item)) as ItemSourcePF2e;
    }

    #itemFromCompendiumUuid(uuid: ItemUUID): ItemSourcePF2e | null {
        const cached = itemCache.get(uuid);
        if (cached) return cached;

        // "Compendium.pf2e.spells-srd.vLA0q0WOK2YPuJs6"
        const [type, system, packName, id] = uuid.split(".");
        if (type === "Compendium" && system === "pf2e" && packName && id) {
            const packFolder = this.#getPackFolder(packName);
            const itemName = this.#idsToNames.get(packName)?.get(id);
            if (itemName && packFolder) {
                const jsonPath = path.resolve(dataPath, packFolder, `${sluggify(itemName)}.json`);
                if (fs.existsSync(jsonPath)) {
                    const itemSource = JSON.parse(fs.readFileSync(jsonPath, { encoding: "utf-8" })) as ItemSourcePF2e;
                    itemCache.set(uuid, itemSource);
                    return itemSource;
                }
            }
        }
        return null;
    }
}

class ItemInflater {
    process(embeddedItem: ItemSourcePF2e | DeflatedItem): ItemSourcePF2e {
        if (!this.#isDeflated(embeddedItem)) {
            return embeddedItem;
        }

        if (embeddedItem.type === "action") {
            return this.#inflateAction(embeddedItem);
        } else if (embeddedItem.type === "spell") {
            return this.#inflateSpell(embeddedItem);
        }

        return embeddedItem;
    }

    #inflateAction(action: DeflatedAction): ActionItemSource {
        const baseItem = this.#itemFromCompendiumUuid(action.baseItem) as ActionItemSource;
        baseItem._id = action._id;
        baseItem.sort = action.sort;
        if (action.system?.description) {
            baseItem.system.description = action.system.description;
        }
        return baseItem;
    }

    #inflateSpell(spell: DeflatedSpell): SpellSource {
        const baseItem = this.#itemFromCompendiumUuid(spell.baseItem) as SpellSource;
        baseItem._id = spell._id;
        baseItem.sort = spell.sort;
        baseItem.system.location = spell.system.location;
        return baseItem;
    }

    #isDeflated(embeddedItem: ItemSourcePF2e | DeflatedItem): embeddedItem is DeflatedItem {
        return "baseItem" in embeddedItem;
    }

    #getPackFolder(packName: string): string | null {
        const metaData = packsMetadata.find((p) => p.name === packName);
        const packFolder = metaData?.path.substring(metaData.path.lastIndexOf("/") + 1);
        return packFolder ?? null;
    }

    #clone(item: ItemSourcePF2e): ItemSourcePF2e {
        return JSON.parse(JSON.stringify(item)) as ItemSourcePF2e;
    }

    #itemFromCompendiumUuid(uuid: ItemUUID): ItemSourcePF2e {
        const cached = itemCache.get(uuid);
        if (cached) return this.#clone(cached);

        const [type, system, packName, itemName] = uuid.split(".");
        if (type === "Compendium" && system === "pf2e" && packName && itemName) {
            const packFolder = this.#getPackFolder(packName);
            if (itemName && packFolder) {
                const jsonPath = path.resolve(dataPath, packFolder, `${itemName}.json`);
                if (fs.existsSync(jsonPath)) {
                    const itemSource = JSON.parse(fs.readFileSync(jsonPath, { encoding: "utf-8" })) as ItemSourcePF2e;
                    // Restore UUID flag
                    const sourceId = `Compendium.pf2e.${packName}.${itemSource._id}` as ItemUUID;
                    if (itemSource.flags) {
                        if (itemSource.flags.core) {
                            itemSource.flags.core.sourceId = sourceId;
                        } else {
                            itemSource.flags.core = {
                                sourceId,
                            };
                        }
                    } else {
                        itemSource.flags = {
                            core: {
                                sourceId,
                            },
                        };
                    }

                    itemCache.set(uuid, itemSource);
                    return this.#clone(itemSource);
                }
            }
        }
        throw PackError(`Target item with UUID ${uuid} doesn't exsist!`);
    }
}

export { ItemDeflater, ItemInflater };
