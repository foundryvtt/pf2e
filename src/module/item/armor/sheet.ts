import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression.ts";
import { ItemSheetOptions } from "@item/base/sheet/sheet.ts";
import {
    Coins,
    Grade,
    MATERIAL_DATA,
    MaterialSheetData,
    PhysicalItemSheetData,
    PhysicalItemSheetPF2e,
    RUNE_DATA,
    getPropertyRuneSlots,
} from "@item/physical/index.ts";
import { SheetOptions, createSheetTags } from "@module/sheet/helpers.ts";
import { sortStringRecord } from "@util";
import * as R from "remeda";
import type { ArmorCategory, ArmorGroup, ArmorPF2e, BaseArmorType, SpecificArmorData } from "./index.ts";

class ArmorSheetPF2e extends PhysicalItemSheetPF2e<ArmorPF2e> {
    override async getData(options?: Partial<ItemSheetOptions>): Promise<ArmorSheetData> {
        const sheetData = await super.getData(options);
        const armor = this.item;

        const adjustedBulkHint = armor.isEquipped || !armor.actor ? null : "PF2E.Item.Armor.UnequippedHint";

        // Armor property runes
        // Limit shown property-rune slots by potency rune level and a material composition of orichalcum
        const runes = armor.system.runes;
        const propertyRuneSlots = Array.fromRange(
            armor.isSpecific ? runes.property.length : getPropertyRuneSlots(armor),
        ).map((i) => ({
            slug: runes.property[i] ?? null,
            label: RUNE_DATA.armor.property[runes.property[i]]?.name ?? null,
            disabled: i > 0 && !runes.property[i - 1],
        }));

        const specificMagicData = armor._source.system.specific ?? R.pick(armor._source.system, ["material", "runes"]);

        return {
            ...sheetData,
            abpEnabled: ABP.isEnabled(this.actor),
            adjustedBulkHint,
            basePrice: new Coins(armor._source.system.price.value),
            baseTypes: sortStringRecord(CONFIG.PF2E.baseArmorTypes),
            categories: CONFIG.PF2E.armorCategories,
            groups: sortStringRecord(CONFIG.PF2E.armorGroups),
            otherTags: createSheetTags(CONFIG.PF2E.otherArmorTags, sheetData.data.traits.otherTags),
            preciousMaterials: this.getMaterialSheetData(armor, MATERIAL_DATA.armor),
            propertyRuneSlots,
            runeTypes: {
                ...RUNE_DATA.armor,
                property: Object.values(RUNE_DATA.armor.property)
                    .map((p) => ({ slug: p.slug, name: game.i18n.localize(p.name) }))
                    .sort((a, b) => a.name.localeCompare(b.name)),
            },
            grades: R.mapValues(CONFIG.PF2E.grades, (v, slug) => {
                const label = game.i18n.localize(v);
                const data = CONFIG.PF2E.armorImprovements[slug];
                return game.i18n.format("PF2E.Item.Armor.GradeOption", { grade: label, ...data });
            }),
            specificMagicData,
        };
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        if (formData["system.acBonus"] === null) {
            formData["system.acBonus"] = 0;
        }

        const propertyRuneIndices = [0, 1, 2, 3] as const;
        const propertyRuneUpdates = propertyRuneIndices.flatMap((i) => formData[`system.runes.property.${i}`] ?? []);
        if (propertyRuneUpdates.length > 0) {
            formData[`system.runes.property`] = propertyRuneUpdates.filter(R.isTruthy);
            for (const index of propertyRuneIndices) {
                delete formData[`system.runes.property.${index}`];
            }
        }

        return super._updateObject(event, formData);
    }
}

interface ArmorSheetData extends PhysicalItemSheetData<ArmorPF2e> {
    abpEnabled: boolean;
    basePrice: Coins;
    baseTypes: Record<BaseArmorType, string>;
    categories: Record<ArmorCategory, string>;
    groups: Record<ArmorGroup, string>;
    otherTags: SheetOptions;
    preciousMaterials: MaterialSheetData;
    propertyRuneSlots: PropertyRuneSheetSlot[];
    runeTypes: Omit<typeof RUNE_DATA.armor, "property"> & { property: { slug: string; name: string }[] };
    grades: Record<Grade, string>;
    specificMagicData: SpecificArmorData;
}

interface PropertyRuneSheetSlot {
    slug: string | null;
    label: string | null;
    disabled: boolean;
}

export { ArmorSheetPF2e };
