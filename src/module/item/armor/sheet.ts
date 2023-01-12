import {
    ARMOR_MATERIAL_VALUATION_DATA,
    CoinsPF2e,
    getPropertySlots,
    PhysicalItemSheetData,
    PhysicalItemSheetPF2e,
    PreparedMaterials,
} from "@item/physical";
import { createSheetTags, SheetOptions } from "@module/sheet/helpers";
import { LocalizePF2e } from "@system/localize";
import { ArmorCategory, ArmorGroup, ArmorPF2e, BaseArmorType } from ".";

class ArmorSheetPF2e extends PhysicalItemSheetPF2e<ArmorPF2e> {
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<ArmorSheetData> {
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
            hasSidebar: true,
            armorPotencyRunes: CONFIG.PF2E.armorPotencyRunes,
            armorResiliencyRunes: CONFIG.PF2E.armorResiliencyRunes,
            armorPropertyRunes: CONFIG.PF2E.armorPropertyRunes,
            categories: CONFIG.PF2E.armorTypes,
            groups: CONFIG.PF2E.armorGroups,
            baseTypes: LocalizePF2e.translations.PF2E.Item.Armor.Base,
            bulkTypes: CONFIG.PF2E.bulkTypes,
            preciousMaterials: this.prepareMaterials(ARMOR_MATERIAL_VALUATION_DATA),
            ...propertyRuneSlots,
            otherTags: createSheetTags(CONFIG.PF2E.otherArmorTags, sheetData.data.traits.otherTags),
            basePrice: new CoinsPF2e(this.item._source.system.price.value),
        };
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        formData["system.potencyRune.value"] ||= null;
        formData["system.resiliencyRune.value"] ||= null;
        for (const slotNumber of [1, 2, 3, 4]) {
            formData[`system.propertyRune${slotNumber}.value`] ||= null;
        }

        return super._updateObject(event, formData);
    }
}

interface ArmorSheetData extends PhysicalItemSheetData<ArmorPF2e> {
    armorPotencyRunes: ConfigPF2e["PF2E"]["armorPotencyRunes"];
    armorResiliencyRunes: ConfigPF2e["PF2E"]["armorResiliencyRunes"];
    armorPropertyRunes: ConfigPF2e["PF2E"]["armorPropertyRunes"];
    categories: Record<ArmorCategory, string>;
    groups: Record<ArmorGroup, string>;
    baseTypes: Record<BaseArmorType, string>;
    bulkTypes: ConfigPF2e["PF2E"]["bulkTypes"];
    preciousMaterials: PreparedMaterials;
    otherTags: SheetOptions;
    basePrice: CoinsPF2e;
}

export { ArmorSheetPF2e };
