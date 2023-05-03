import {
    ARMOR_MATERIAL_VALUATION_DATA,
    CoinsPF2e,
    PhysicalItemSheetData,
    PhysicalItemSheetPF2e,
    PreparedMaterials,
    getPropertySlots,
} from "@item/physical/index.ts";
import { SheetOptions, createSheetTags } from "@module/sheet/helpers.ts";
import { ArmorCategory, ArmorGroup, ArmorPF2e, BaseArmorType } from "./index.ts";

class ArmorSheetPF2e extends PhysicalItemSheetPF2e<ArmorPF2e> {
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<ArmorSheetData> {
        const sheetData = await super.getData(options);

        // Armor property runes
        const maxPropertySlots = getPropertySlots(this.item);
        const propertyRuneSlots: Record<`propertyRuneSlots${number}`, boolean> = {};
        for (const slot of [1, 2, 3, 4]) {
            if (slot <= maxPropertySlots) {
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
            categories: CONFIG.PF2E.armorCategories,
            groups: CONFIG.PF2E.armorGroups,
            baseTypes: CONFIG.PF2E.baseArmorTypes,
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
