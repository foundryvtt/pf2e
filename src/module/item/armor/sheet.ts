import { PhysicalItemSheetPF2e } from "@item/physical/sheet";
import { LocalizePF2e } from "@system/localize";
import { getPropertySlots } from "../runes";
import { ArmorPF2e } from ".";
import { coinValueInCopper, extractPriceFromItem } from "@item/treasure/helpers";

export class ArmorSheetPF2e extends PhysicalItemSheetPF2e<ArmorPF2e> {
    override async getData() {
        const sheetData = await super.getData();

        // Armor property runes
        const totalSlots = getPropertySlots(sheetData.item);
        const propertyRuneSlots: Record<`propertyRuneSlots${number}`, boolean> = {};
        for (const slot of [1, 2, 3, 4]) {
            if (totalSlots >= slot) {
                propertyRuneSlots[`propertyRuneSlots${slot}`] = true;
            }
        }

        // Armors have derived level, price, and traits: base data is shown for editing
        const baseData = this.item.toObject();
        sheetData.data.traits.rarity = baseData.data.traits.rarity;
        const hintText = LocalizePF2e.translations.PF2E.Item.Armor.FromMaterialAndRunes;
        const adjustedLevelHint =
            this.item.level !== baseData.data.level.value
                ? game.i18n.format(hintText, {
                      property: game.i18n.localize("PF2E.LevelLabel"),
                      value: this.item.level,
                  })
                : null;
        const adjustedPriceHint = (() => {
            const basePrice = coinValueInCopper(extractPriceFromItem(baseData));
            const derivedPrice = coinValueInCopper(extractPriceFromItem(sheetData.item));
            return basePrice !== derivedPrice
                ? game.i18n.format(hintText, {
                      property: game.i18n.localize("PF2E.PriceLabel"),
                      value: this.item.price,
                  })
                : null;
        })();

        return {
            ...sheetData,
            armorPotencyRunes: CONFIG.PF2E.armorPotencyRunes,
            armorResiliencyRunes: CONFIG.PF2E.armorResiliencyRunes,
            armorPropertyRunes: CONFIG.PF2E.armorPropertyRunes,
            categories: CONFIG.PF2E.armorTypes,
            groups: CONFIG.PF2E.armorGroups,
            baseTypes: LocalizePF2e.translations.PF2E.Item.Armor.Base,
            bulkTypes: CONFIG.PF2E.bulkTypes,
            preciousMaterials: CONFIG.PF2E.preciousMaterials,
            preciousMaterialGrades: CONFIG.PF2E.preciousMaterialGrades,
            sizes: CONFIG.PF2E.actorSizes,
            traits: this.prepareOptions(CONFIG.PF2E.armorTraits, sheetData.item.data.traits, { selectedOnly: true }),
            ...propertyRuneSlots,
            adjustedLevelHint,
            adjustedPriceHint,
        };
    }
}
