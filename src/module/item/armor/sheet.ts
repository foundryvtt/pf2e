import { PhysicalItemSheetPF2e } from "@item/physical/sheet";
import { LocalizePF2e } from "@system/localize";
import { getPropertySlots } from "../runes";
import { ArmorPF2e } from ".";
import { createSheetTags } from "@module/sheet/helpers";

export class ArmorSheetPF2e extends PhysicalItemSheetPF2e<ArmorPF2e> {
    override async getData(options?: Partial<DocumentSheetOptions>) {
        const sheetData = await super.getData(options);

        // Armor property runes
        const totalSlots = getPropertySlots(this.item);
        const propertyRuneSlots: Record<`propertyRuneSlots${number}`, boolean> = {};
        for (const slot of [1, 2, 3, 4]) {
            if (totalSlots >= slot) {
                propertyRuneSlots[`propertyRuneSlots${slot}`] = true;
            }
        }

        return {
            ...sheetData,
            hasDetails: true,
            armorPotencyRunes: CONFIG.PF2E.armorPotencyRunes,
            armorResiliencyRunes: CONFIG.PF2E.armorResiliencyRunes,
            armorPropertyRunes: CONFIG.PF2E.armorPropertyRunes,
            categories: CONFIG.PF2E.armorTypes,
            groups: CONFIG.PF2E.armorGroups,
            baseTypes: LocalizePF2e.translations.PF2E.Item.Armor.Base,
            bulkTypes: CONFIG.PF2E.bulkTypes,
            preciousMaterials: CONFIG.PF2E.preciousMaterials,
            preciousMaterialGrades: CONFIG.PF2E.preciousMaterialGrades,
            ...propertyRuneSlots,
            traits: createSheetTags(CONFIG.PF2E.armorTraits, sheetData.data.traits),
            otherTags: createSheetTags(CONFIG.PF2E.otherArmorTags, sheetData.data.traits.otherTags),
        };
    }
}
