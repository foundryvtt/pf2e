import { ItemLevelData, ItemSystemData } from "@item/data/base";
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from "@item/data/non-physical";
import { Rarity } from "@module/data";
import { adjustDCByRarity, calculateDC } from "@module/dc";
import { FormulaPF2e } from ".";

export type FormulaSource = BaseNonPhysicalItemSource<"formula", FormulaSystemData>;

export class FormulaData extends BaseNonPhysicalItemData<FormulaPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/lore.svg";
}

export interface FormulaData extends Omit<FormulaSource, "effects" | "flags"> {
    type: FormulaSource["type"];
    data: FormulaSource["data"];
    readonly _source: FormulaSource;
}

type ItemUUID = `Compendium.${string}.${string}` | `Item.${string}.${string}`;

export interface CraftingFormulaData {
    uuid: CompendiumUUID;
    img: ImagePath;
    name: string;
    level?: number;
    dc?: number;
    description: string;
    price: string;
    rarity?: Rarity;
}

export class CraftingFormula implements CraftingFormulaData {
    uuid: CompendiumUUID;
    img: ImagePath;
    name: string;
    _level?: number;
    _dc?: number;
    description: string;
    price: string;
    _rarity?: Rarity;

    constructor(data: CraftingFormulaData) {
        this._dc = data.dc;
        this._level = data.level;
        this.name = data.name;
        this._rarity = data.rarity;
        this.uuid = data.uuid;
        this.description = data.description;
        this.price = data.price;
        this.img = data.img;
    }

    get dc(): number {
        return this._dc ?? adjustDCByRarity(calculateDC(this.level), this.rarity);
    }

    get level(): number {
        return this._level ?? 0;
    }

    get rarity(): Rarity {
        return this._rarity ?? "common";
    }
}

interface FormulaSystemData extends ItemSystemData, ItemLevelData {
    craftedItem: {
        uuid: ItemUUID;
    };
}
