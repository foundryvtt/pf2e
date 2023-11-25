import { ItemSheetOptions } from "@item/base/sheet/base.ts";
import {
    CoinsPF2e,
    MATERIAL_DATA,
    MaterialSheetData,
    PhysicalItemSheetData,
    PhysicalItemSheetPF2e,
    RUNE_DATA,
} from "@item/physical/index.ts";
import { WeaponPropertyRuneType } from "@item/weapon/types.ts";
import { htmlQuery, sortStringRecord } from "@util";
import * as R from "remeda";
import { SpecificShieldData } from "./data.ts";
import type { ShieldPF2e } from "./document.ts";
import { BaseShieldType } from "./types.ts";
import { REINFORCING_RUNE_LOC_PATHS } from "./values.ts";

class ShieldSheetPF2e extends PhysicalItemSheetPF2e<ShieldPF2e> {
    override async getData(options?: Partial<ItemSheetOptions>): Promise<ShieldSheetData> {
        const sheetData = await super.getData(options);
        const { item } = this;

        const weaponRunes = item.system.traits.integrated?.runes;
        const slotsArray = item.system.material.type === "orichalcum" ? [0, 1, 2, 3] : [0, 1, 2];
        const propertyRuneSlots = slotsArray.map((i) => ({
            slug: weaponRunes?.property[i] ?? null,
            enabled: !!weaponRunes?.potency && weaponRunes.potency > i && (i === 0 || !!weaponRunes.property[i - i]),
        }));
        const materialData = item.isBuckler
            ? MATERIAL_DATA.shield.buckler
            : item.isTowerShield
              ? MATERIAL_DATA.shield.towerShield
              : MATERIAL_DATA.shield.shield;

        return {
            ...sheetData,
            baseHardness: item._source.system.hardness,
            basePrice: new CoinsPF2e(item._source.system.price.value),
            baseTypes: sortStringRecord(CONFIG.PF2E.baseShieldTypes),
            preciousMaterials: this.prepareMaterials(materialData),
            propertyRuneSlots,
            reinforcing: R.mapToObj.indexed(REINFORCING_RUNE_LOC_PATHS, (value, index) => [index, value]),
            weaponRunes: weaponRunes ? RUNE_DATA.weapon : null,
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];

        htmlQuery(html, "input[data-action=toggle-specific")?.addEventListener("change", () => {
            const newValue: SpecificShieldData | null = this.item.system.specific
                ? null
                : deepClone({
                      ...R.pick(this.item._source.system, ["material", "runes"]),
                      integrated: this.item._source.system.traits.integrated
                          ? { runes: this.item._source.system.traits.integrated.runes }
                          : null,
                  });

            this.item.update({ "system.specific": newValue });
        });
    }

    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const propertyRuneIndices = [0, 1, 2, 3] as const;
        const propertyRuneUpdates = propertyRuneIndices.map(
            (i) => formData[`system.traits.integrated.runes.property.${i}`] || null,
        );
        if (propertyRuneUpdates.length > 0) {
            formData[`system.traits.integrated.runes.property`] = R.compact(propertyRuneUpdates);
            for (const index of propertyRuneIndices) {
                delete formData[`system.traits.integrated.runes.property.${index}`];
            }
        }

        return super._updateObject(event, formData);
    }
}

interface ShieldSheetData extends PhysicalItemSheetData<ShieldPF2e> {
    baseHardness: number;
    basePrice: CoinsPF2e;
    baseTypes: Record<BaseShieldType, string>;
    preciousMaterials: MaterialSheetData;
    propertyRuneSlots: {
        slug: WeaponPropertyRuneType | null;
        enabled: boolean;
    }[];
    reinforcing: Record<number, string | null>;
    weaponRunes: object | null;
}

export { ShieldSheetPF2e };
