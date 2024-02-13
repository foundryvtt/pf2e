import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression.ts";
import { ItemSheetOptions } from "@item/base/sheet/sheet.ts";
import {
    MATERIAL_DATA,
    MaterialSheetData,
    PhysicalItemSheetData,
    PhysicalItemSheetPF2e,
    RUNE_DATA,
    getPropertyRuneSlots,
} from "@item/physical/index.ts";
import { SheetOptions, createSheetTags } from "@module/sheet/helpers.ts";
import { ErrorPF2e, htmlQueryAll, objectHasKey, setHasElement, sortStringRecord, tupleHasValue } from "@util";
import * as R from "remeda";
import { ComboWeaponMeleeUsage, SpecificWeaponData, WeaponPersistentDamage } from "./data.ts";
import type { WeaponPF2e } from "./document.ts";
import { MANDATORY_RANGED_GROUPS, WEAPON_RANGES } from "./values.ts";

export class WeaponSheetPF2e extends PhysicalItemSheetPF2e<WeaponPF2e> {
    protected override get validTraits(): Record<string, string> {
        return CONFIG.PF2E.weaponTraits;
    }

    override async getData(options?: Partial<ItemSheetOptions>): Promise<WeaponSheetData> {
        const sheetData = await super.getData(options);
        const weapon = this.item;

        // Limit shown property-rune slots by potency rune level and a material composition of orichalcum
        const runes = weapon.system.runes;
        const propertyRuneSlots = Array.fromRange(
            weapon.isSpecific ? runes.property.length : getPropertyRuneSlots(weapon),
        ).map((i) => ({
            slug: runes.property[i] ?? null,
            label: RUNE_DATA.weapon.property[runes.property[i]]?.name ?? null,
            disabled: i > 0 && !runes.property[i - 1],
        }));

        // Weapons have derived damage dice, level, price, and traits: base data is shown for editing
        const abpEnabled = ABP.isEnabled(this.actor);
        const hintText = abpEnabled ? "PF2E.Item.Weapon.FromABP" : "PF2E.Item.Weapon.FromMaterialAndRunes";

        const adjustedDiceHint =
            weapon.system.damage.dice !== weapon._source.system.damage.dice
                ? game.i18n.format(game.i18n.localize(hintText), {
                      property: game.i18n.localize("PF2E.Item.Weapon.Damage.DiceNumber"),
                      value: weapon.system.damage.dice,
                  })
                : null;

        const damageDieFaces = Object.fromEntries(
            Object.entries(CONFIG.PF2E.damageDie)
                .map(([num, label]): [number, string] => [Number(num.replace("d", "")), label])
                .sort(([numA], [numB]) => numA - numB),
        );

        const traitSet = weapon.traits;
        const isComboWeapon = traitSet.has("combination");

        const weaponRanges = Array.from(WEAPON_RANGES).reduce(
            (ranges: Record<number, string>, range) => ({
                ...ranges,
                [range]: game.i18n.format("PF2E.WeaponRangeN", { range: range }),
            }),
            {},
        );
        const rangedOnlyTraits = ["combination", "thrown", "volley-20", "volley-30", "volley-50"] as const;
        const mandatoryRanged =
            setHasElement(MANDATORY_RANGED_GROUPS, weapon.group) ||
            rangedOnlyTraits.some((trait) => traitSet.has(trait));
        const mandatoryMelee = sheetData.data.traits.value.some((trait) => /^thrown-\d+$/.test(trait));

        // Restrict the Implement tag to one-handed weapons
        const otherTags = ((): SheetOptions => {
            const otherWeaponTags: Record<string, string> = fu.deepClone(CONFIG.PF2E.otherWeaponTags);
            if (weapon.hands !== "1") delete otherWeaponTags.implement;
            return createSheetTags(otherWeaponTags, sheetData.data.traits.otherTags);
        })();

        const meleeUsage = sheetData.data.meleeUsage ?? {
            group: "knife",
            damage: { type: "piercing", die: "d4" },
            traits: [],
        };

        const specificMagicData =
            weapon._source.system.specific ?? R.pick(weapon._source.system, ["material", "runes"]);

        return {
            ...sheetData,
            abpEnabled,
            adjustedDiceHint,
            baseTypes: sortStringRecord(CONFIG.PF2E.baseWeaponTypes),
            categories: sortStringRecord(CONFIG.PF2E.weaponCategories),
            conditionTypes: sortStringRecord(CONFIG.PF2E.conditionTypes),
            damageDice: CONFIG.PF2E.damageDice,
            damageDie: CONFIG.PF2E.damageDie,
            damageDieFaces,
            damageTypes: sortStringRecord(CONFIG.PF2E.damageTypes),
            groups: sortStringRecord(CONFIG.PF2E.weaponGroups),
            isBomb: weapon.group === "bomb",
            isComboWeapon,
            itemBonuses: CONFIG.PF2E.itemBonuses,
            mandatoryMelee,
            mandatoryRanged,
            meleeGroups: sortStringRecord(CONFIG.PF2E.meleeWeaponGroups),
            meleeUsage,
            meleeUsageTraits: createSheetTags(CONFIG.PF2E.weaponTraits, meleeUsage.traits ?? []),
            otherTags,
            preciousMaterials: this.getMaterialSheetData(weapon, MATERIAL_DATA.weapon),
            propertyRuneSlots,
            runeTypes: RUNE_DATA.weapon,
            specificMagicData,
            weaponMAP: CONFIG.PF2E.weaponMAP,
            weaponRanges,
            weaponReload: CONFIG.PF2E.weaponReload,
        };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        type InputOrSelect = HTMLInputElement | HTMLSelectElement;
        const pdElements = htmlQueryAll<InputOrSelect>(html, "[data-action=update-persistent]");
        for (const element of pdElements) {
            element.addEventListener("change", async (event): Promise<void> => {
                if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement)) {
                    throw ErrorPF2e("Unexpected error updating persistent damage data");
                }

                const diceNumber = Number(pdElements.find((e) => e.dataset.persistentField === "number")?.value) || 0;
                const dieFaces = Number(pdElements.find((e) => e.dataset.persistentField === "faces")?.value);

                const baseDamageType = this.item.system.damage.damageType;
                const damageType =
                    pdElements.find((e) => e.dataset.persistentField === "type")?.value || baseDamageType;

                if (!(typeof diceNumber === "number" && typeof dieFaces === "number" && damageType)) {
                    throw ErrorPF2e("Unexpected error updating persistent damage data");
                }

                // If the user changed the number to zero directly, wipe the entire persistent damage object
                const maybeDiceNumber = Math.trunc(Math.abs(Number(event.target.value) || 0));
                if (event.target.dataset.persistentField === "number" && maybeDiceNumber === 0) {
                    await this.item.update({ "system.damage.persistent": null });
                } else if (objectHasKey(CONFIG.PF2E.damageTypes, damageType)) {
                    const damage: WeaponPersistentDamage = {
                        number: Math.trunc(Math.abs(diceNumber)) || 1,
                        faces: tupleHasValue([4, 6, 8, 10, 12] as const, dieFaces) ? dieFaces : null,
                        type: damageType,
                    };
                    await this.item.update({ "system.damage.persistent": damage });
                }
            });
        }
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const weapon = this.item;

        formData["system.bonusDamage.value"] ||= 0;
        formData["system.splashDamage.value"] ||= 0;

        // Coerce a weapon range of zero to null
        formData["system.range"] ||= null;

        // Clamp damage dice to between zero and eight
        if ("system.damage.dice" in formData) {
            formData["system.damage.dice"] = Math.clamped(Number(formData["system.damage.dice"]) || 0, 0, 12);
        }

        // Ensure melee usage is absent if not a combination weapon
        if (weapon.system.meleeUsage && !this.item.traits.has("combination")) {
            formData["system.-=meleeUsage"] = null;
        }

        const propertyRuneIndices = [0, 1, 2, 3] as const;
        const propertyRuneUpdates = propertyRuneIndices.flatMap((i) => formData[`system.runes.property.${i}`] ?? []);
        if (propertyRuneUpdates.length > 0) {
            formData[`system.runes.property`] = R.compact(propertyRuneUpdates);
            for (const index of propertyRuneIndices) {
                delete formData[`system.runes.property.${index}`];
            }
        }

        return super._updateObject(event, formData);
    }
}

interface PropertyRuneSheetSlot {
    slug: string | null;
    label: string | null;
    disabled: boolean;
}

interface WeaponSheetData extends PhysicalItemSheetData<WeaponPF2e> {
    abpEnabled: boolean;
    adjustedDiceHint: string | null;
    adjustedLevelHint: string | null;
    adjustedPriceHint: string | null;
    baseTypes: typeof CONFIG.PF2E.baseWeaponTypes;
    categories: typeof CONFIG.PF2E.weaponCategories;
    conditionTypes: typeof CONFIG.PF2E.conditionTypes;
    damageDice: typeof CONFIG.PF2E.damageDice;
    damageDie: typeof CONFIG.PF2E.damageDie;
    damageDieFaces: Record<string, string>;
    damageTypes: typeof CONFIG.PF2E.damageTypes;
    groups: typeof CONFIG.PF2E.weaponGroups;
    isBomb: boolean;
    isComboWeapon: boolean;
    itemBonuses: typeof CONFIG.PF2E.itemBonuses;
    mandatoryMelee: boolean;
    mandatoryRanged: boolean;
    meleeGroups: typeof CONFIG.PF2E.meleeWeaponGroups;
    meleeUsage: ComboWeaponMeleeUsage | undefined;
    meleeUsageTraits: SheetOptions;
    otherTags: SheetOptions;
    preciousMaterials: MaterialSheetData;
    propertyRuneSlots: PropertyRuneSheetSlot[];
    runeTypes: typeof RUNE_DATA.weapon;
    specificMagicData: SpecificWeaponData;
    weaponMAP: typeof CONFIG.PF2E.weaponMAP;
    weaponRanges: Record<number, string>;
    weaponReload: typeof CONFIG.PF2E.weaponReload;
}
