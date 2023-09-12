import { Rarity } from "@module/data.ts";
import * as R from "remeda";
import { Bulk } from "./bulk.ts";
import { CoinsPF2e } from "./coins.ts";
import type { PhysicalItemPF2e } from "./document.ts";
import { getMaterialValuationData } from "./materials.ts";
import { getRuneValuationData } from "./runes.ts";

function computePrice(item: PhysicalItemPF2e): CoinsPF2e {
    const basePrice = item.price.value;
    if (item.isOfType("treasure")) return basePrice;

    // Adjust the item price according to precious material and runes
    // Base prices are not included in these cases
    // https://2e.aonprd.com/Rules.aspx?ID=731
    // https://2e.aonprd.com/Equipment.aspx?ID=380
    const materialData = getMaterialValuationData(item);
    const materialPrice = materialData?.price ?? 0;
    const heldOrStowedBulk = new Bulk({ light: item.system.bulk.heldOrStowed });
    const bulk = Math.max(Math.ceil(heldOrStowedBulk.normal), 1);
    const materialValue = materialPrice + (bulk * materialPrice) / 10;

    const runesData = getRuneValuationData(item);
    const runeValue = item.isSpecific ? 0 : runesData.reduce((sum, rune) => sum + rune.price, 0);

    const afterMaterialAndRunes = runeValue
        ? new CoinsPF2e({ gp: runeValue + materialValue })
        : basePrice.add({ gp: materialValue });
    const higher = afterMaterialAndRunes.copperValue > basePrice.copperValue ? afterMaterialAndRunes : basePrice;
    const afterShoddy = item.isShoddy ? higher.scale(0.5) : higher;

    /** Increase the price if it is larger than medium and not magical. */
    return item.isMagical ? afterShoddy : afterShoddy.adjustForSize(item.size);
}

function computeLevelRarityPrice(item: PhysicalItemPF2e): { level: number; rarity: Rarity; price: CoinsPF2e } {
    // Stop here if this weapon is not a magical or precious-material item, or if it is a specific magic weapon
    const materialData = getMaterialValuationData(item);
    const price = computePrice(item);
    if (!(item.isMagical || materialData) || item.isSpecific) {
        return { ...R.pick(item, ["level", "rarity"]), price };
    }

    const runesData = getRuneValuationData(item);
    const level = runesData
        .map((runeData) => runeData.level)
        .concat(materialData?.level ?? 0)
        .reduce((highest, level) => (level > highest ? level : highest), item.level);

    const rarityOrder = {
        common: 0,
        uncommon: 1,
        rare: 2,
        unique: 3,
    };
    const baseRarity = item.rarity;
    const rarity = runesData
        .map((runeData) => runeData.rarity)
        .concat(materialData?.rarity ?? "common")
        .reduce((highest, rarity) => (rarityOrder[rarity] > rarityOrder[highest] ? rarity : highest), baseRarity);

    return { level, rarity, price };
}

export { coinCompendiumIds } from "./coins.ts";
export { CoinsPF2e, computeLevelRarityPrice };
