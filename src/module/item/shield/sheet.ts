import { ItemSheetOptions } from "@item/base/sheet/sheet.ts";
import {
    Coins,
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
        const shield = this.item;

        const isSpecificShield = shield.isSpecific;
        const weaponRunes = shield.system.traits.integrated?.runes;
        const hasPotencyRune = !!weaponRunes?.potency;
        const slotIndexes = ((): number[] => {
            if (!hasPotencyRune) return [];
            if (isSpecificShield) return weaponRunes.property.map((_p, index) => index);
            return shield.system.material.type === "orichalcum" ? [0, 1, 2, 3] : [0, 1, 2];
        })();
        const propertyRuneSlots = slotIndexes.map((i) => ({
            slug: weaponRunes?.property[i] ?? null,
            disabled:
                !weaponRunes?.potency ||
                ((i === 3 || weaponRunes.potency < 3) && i > 0 && (!weaponRunes.property[i - 1] || !isSpecificShield)),
            readOnly: isSpecificShield,
        }));
        const materialData = shield.isBuckler
            ? MATERIAL_DATA.shield.buckler
            : shield.isTowerShield
              ? MATERIAL_DATA.shield.towerShield
              : MATERIAL_DATA.shield.shield;

        return {
            ...sheetData,
            baseHardness: shield._source.system.hardness,
            basePrice: new Coins(shield._source.system.price.value),
            baseTypes: sortStringRecord(CONFIG.PF2E.baseShieldTypes),
            canChangeMaterial: !shield.isSpecific || !!shield.system.material.type,
            preciousMaterials: this.getMaterialSheetData(shield, materialData),
            propertyRuneSlots,
            reinforcing: R.mapToObj(REINFORCING_RUNE_LOC_PATHS, (value, index) => [index, value]),
            weaponRunes: weaponRunes ? RUNE_DATA.weapon : null,
            grades: R.mapValues(CONFIG.PF2E.grades, (v) => game.i18n.localize(v)),
        };
    }

    override activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);
        const html = $html[0];
        htmlQuery(html, "input[data-action=toggle-specific")?.addEventListener("change", () => {
            const newValue: SpecificShieldData | null = this.item.system.specific
                ? null
                : fu.deepClone({
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
        const propertyRuneUpdates = propertyRuneIndices.flatMap(
            (i) => formData[`system.traits.integrated.runes.property.${i}`] ?? [],
        );
        if (propertyRuneUpdates.length > 0) {
            formData[`system.traits.integrated.runes.property`] = propertyRuneUpdates.filter(R.isTruthy);
            for (const index of propertyRuneIndices) {
                delete formData[`system.traits.integrated.runes.property.${index}`];
            }
        }

        return super._updateObject(event, formData);
    }
}

interface ShieldSheetData extends PhysicalItemSheetData<ShieldPF2e> {
    baseHardness: number;
    basePrice: Coins;
    baseTypes: Record<BaseShieldType, string>;
    canChangeMaterial: boolean;
    preciousMaterials: MaterialSheetData;
    propertyRuneSlots: {
        slug: WeaponPropertyRuneType | null;
        disabled: boolean;
        readOnly: boolean;
    }[];
    reinforcing: Record<number, string | null>;
    weaponRunes: typeof RUNE_DATA.weapon | null;
    grades: Record<string, string>;
}

export { ShieldSheetPF2e };
