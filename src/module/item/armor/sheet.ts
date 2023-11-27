import { ItemSheetOptions } from "@item/base/sheet/base.ts";
import {
    CoinsPF2e,
    MATERIAL_DATA,
    MaterialSheetData,
    PhysicalItemSheetData,
    PhysicalItemSheetPF2e,
    RUNE_DATA,
    getPropertySlots,
} from "@item/physical/index.ts";
import { SheetOptions, createSheetTags } from "@module/sheet/helpers.ts";
import * as R from "remeda";
import type { ArmorCategory, ArmorGroup, ArmorPF2e, BaseArmorType } from "./index.ts";

class ArmorSheetPF2e extends PhysicalItemSheetPF2e<ArmorPF2e> {
    override async getData(options?: Partial<ItemSheetOptions>): Promise<ArmorSheetData> {
        const sheetData = await super.getData(options);

        // Armor property runes
        const maxPropertySlots = getPropertySlots(this.item);
        const propertyRuneSlots: Record<`propertyRuneSlots${number}`, boolean> = {};
        for (const slot of [1, 2, 3, 4]) {
            if (slot <= maxPropertySlots) {
                propertyRuneSlots[`propertyRuneSlots${slot}`] = true;
            }
        }

        const fundamentalRunes = R.pick(RUNE_DATA.armor, ["potency", "resilient"]);
        const propertyRunes = Object.values(RUNE_DATA.armor.property)
            .map((r) => ({ slug: r.slug, name: game.i18n.localize(r.name) }))
            .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));

        return {
            ...sheetData,
            rarity: this.item._source.system.traits.rarity,
            fundamentalRunes,
            propertyRunes,
            categories: CONFIG.PF2E.armorCategories,
            groups: CONFIG.PF2E.armorGroups,
            baseTypes: CONFIG.PF2E.baseArmorTypes,
            preciousMaterials: this.prepareMaterials(MATERIAL_DATA.armor),
            ...propertyRuneSlots,
            otherTags: createSheetTags(CONFIG.PF2E.otherArmorTags, sheetData.data.traits.otherTags),
            basePrice: new CoinsPF2e(this.item._source.system.price.value),
        };
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        formData["system.potencyRune.value"] ||= null;
        formData["system.resiliencyRune.value"] ||= null;
        if (formData["system.acBonus"] === null) {
            formData["system.acBonus"] = 0;
        }
        for (const slotNumber of [1, 2, 3, 4]) {
            formData[`system.propertyRune${slotNumber}.value`] ||= null;
        }

        return super._updateObject(event, formData);
    }
}

interface ArmorSheetData extends PhysicalItemSheetData<ArmorPF2e> {
    categories: Record<ArmorCategory, string>;
    groups: Record<ArmorGroup, string>;
    baseTypes: Record<BaseArmorType, string>;
    preciousMaterials: MaterialSheetData;
    fundamentalRunes: Pick<typeof RUNE_DATA.armor, "potency" | "resilient">;
    propertyRunes: { slug: string; name: string }[];
    otherTags: SheetOptions;
    basePrice: CoinsPF2e;
}

export { ArmorSheetPF2e };
