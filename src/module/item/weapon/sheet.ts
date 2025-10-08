import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression.ts";
import type { FormSelectOption } from "@client/applications/forms/fields.d.mts";
import type { ItemSheetOptions } from "@item/base/sheet/sheet.ts";
import {
    type Grade,
    MATERIAL_DATA,
    type MaterialSheetData,
    type PhysicalItemSheetData,
    PhysicalItemSheetPF2e,
    RUNE_DATA,
    getPropertyRuneSlots,
} from "@item/physical/index.ts";
import { type AdjustedValue, type SheetOptions, createSheetTags, getAdjustedValue } from "@module/sheet/helpers.ts";
import { ErrorPF2e, htmlQueryAll, objectHasKey, setHasElement, sortStringRecord, tupleHasValue } from "@util";
import * as R from "remeda";
import type { ComboWeaponMeleeUsage, SpecificWeaponData, WeaponPersistentDamage } from "./data.ts";
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
            adjusted: runes.property[i] && !weapon._source.system.runes.property.includes(runes.property[i]),
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
        const meleeUsageBaseDamage = Object.entries(CONFIG.PF2E.damageDie).map(([die, label]) => ({
            label: `1${game.i18n.localize(label)}`,
            value: die,
        }));

        const specificMagicData =
            weapon._source.system.specific ?? R.pick(weapon._source.system, ["material", "runes"]);
        const ammoTypes = R.pipe(
            CONFIG.PF2E.ammoTypes,
            R.entries(),
            R.map(
                ([key, data]): foundry.applications.fields.FormSelectOption => ({
                    value: key,
                    label: game.i18n.localize(data.label),
                    group: data.weapon ? game.i18n.localize("PF2E.Item.Ammo.Groups.WeaponSpecific") : undefined,
                }),
            ),
            R.sortBy((o) => o.label),
        );

        // Add dart as a hardcoded weapon as ammo. Get a full list in the future
        ammoTypes.push({
            value: "dart",
            label: game.i18n.localize("PF2E.Weapon.Base.dart"),
            group: game.i18n.localize("PF2E.Item.Ammo.Groups.Weapons"),
        });

        // The ammo data for the currently set ammo type. Used to determine if the weapon can have capacity
        const ammoData = objectHasKey(CONFIG.PF2E.ammoTypes, this.item.system.ammo?.baseType)
            ? CONFIG.PF2E.ammoTypes[this.item.system.ammo.baseType]
            : null;

        return {
            ...sheetData,
            abpEnabled,
            adjustedDiceHint,
            ammoTypes: [{ value: "", label: game.i18n.localize("PF2E.Item.Weapon.AnyBasicAmmo") }, ...ammoTypes],
            canHaveCapacity: !ammoData?.magazine,
            baseTypes: sortStringRecord(CONFIG.PF2E.baseWeaponTypes),
            categories: CONFIG.PF2E.weaponCategories,
            conditionTypes: sortStringRecord(CONFIG.PF2E.conditionTypes),
            damageDice: CONFIG.PF2E.damageDice,
            damageDie: CONFIG.PF2E.damageDie,
            damageDieFaces,
            damageTypes: sortStringRecord(CONFIG.PF2E.damageTypes),
            expend:
                weapon.system.expend === null
                    ? null
                    : getAdjustedValue(weapon.system.expend, weapon._source.system.expend ?? 1),
            groups: sortStringRecord(CONFIG.PF2E.weaponGroups),
            isBomb: weapon.group === "bomb",
            isComboWeapon,
            itemBonuses: CONFIG.PF2E.itemBonuses,
            mandatoryMelee,
            mandatoryRanged,
            meleeGroups: sortStringRecord(CONFIG.PF2E.meleeWeaponGroups),
            meleeUsage,
            meleeUsageBaseDamage,
            meleeUsageTraits: createSheetTags(CONFIG.PF2E.weaponTraits, meleeUsage.traits ?? []),
            otherTags,
            preciousMaterials: this.getMaterialSheetData(weapon, MATERIAL_DATA.weapon),
            propertyRuneSlots,
            runeTypes: {
                ...RUNE_DATA.weapon,
                property: Object.values(RUNE_DATA.weapon.property)
                    .map((p) => ({ slug: p.slug, name: game.i18n.localize(p.name) }))
                    .sort((a, b) => a.name.localeCompare(b.name)),
            },
            grades: R.mapValues(CONFIG.PF2E.grades, (v, slug) => {
                const label = game.i18n.localize(v);
                const data = CONFIG.PF2E.weaponImprovements[slug];
                return game.i18n.format("PF2E.Item.Weapon.GradeOption", { grade: label, ...data });
            }),
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
        formData["system.splashDamage.value"] ||= 0;
        const weapon = this.item;
        // Ensure melee usage is absent if not a combination weapon
        if (weapon.system.meleeUsage && !this.item.traits.has("combination")) {
            formData["system.-=meleeUsage"] = null;
        }

        // Convert property runes to array, making sure we don't save prepared data
        // We assume that new prepared values never come before original source values
        const propertyRuneIndices = [0, 1, 2, 3] as const;
        const propertyRuneUpdates = propertyRuneIndices.flatMap((i) => {
            const key = `system.runes.property.${i}`;
            const sourceValue = weapon._source.system.runes.property[i];
            const wasAdjusted = formData[key] !== sourceValue;
            const isEventSource = event.target && "name" in event.target && event.target.name === key;
            return (wasAdjusted && !isEventSource ? sourceValue : formData[key]) ?? [];
        });
        if (propertyRuneUpdates.length > 0) {
            formData[`system.runes.property`] = propertyRuneUpdates.filter(R.isTruthy);
            for (const index of propertyRuneIndices) {
                delete formData[`system.runes.property.${index}`];
            }
        }

        // Set certain properties to null if its empty string
        const emptyIsNull = ["system.reload.value", "system.ammo.baseType"];
        for (const prop of emptyIsNull) {
            if (!formData[prop]) formData[prop] = null;
        }

        return super._updateObject(event, formData);
    }
}

interface PropertyRuneSheetSlot {
    slug: string | null;
    label: string | null;
    adjusted: boolean;
    disabled: boolean;
}

interface WeaponSheetData extends PhysicalItemSheetData<WeaponPF2e> {
    abpEnabled: boolean;
    adjustedDiceHint: string | null;
    adjustedLevelHint: string | null;
    ammoTypes: foundry.applications.fields.FormSelectOption[];
    canHaveCapacity: boolean;
    baseTypes: typeof CONFIG.PF2E.baseWeaponTypes;
    categories: typeof CONFIG.PF2E.weaponCategories;
    conditionTypes: typeof CONFIG.PF2E.conditionTypes;
    damageDice: typeof CONFIG.PF2E.damageDice;
    damageDie: typeof CONFIG.PF2E.damageDie;
    damageDieFaces: Record<string, string>;
    damageTypes: typeof CONFIG.PF2E.damageTypes;
    expend: AdjustedValue | null;
    groups: typeof CONFIG.PF2E.weaponGroups;
    isBomb: boolean;
    isComboWeapon: boolean;
    itemBonuses: typeof CONFIG.PF2E.itemBonuses;
    mandatoryMelee: boolean;
    mandatoryRanged: boolean;
    meleeGroups: typeof CONFIG.PF2E.meleeWeaponGroups;
    meleeUsage: ComboWeaponMeleeUsage | undefined;
    meleeUsageBaseDamage: FormSelectOption[];
    meleeUsageTraits: SheetOptions;
    otherTags: SheetOptions;
    preciousMaterials: MaterialSheetData;
    propertyRuneSlots: PropertyRuneSheetSlot[];
    runeTypes: Omit<typeof RUNE_DATA.weapon, "property"> & { property: { slug: string; name: string }[] };
    grades: Record<Grade, string>;
    specificMagicData: SpecificWeaponData;
    weaponMAP: typeof CONFIG.PF2E.weaponMAP;
    weaponRanges: Record<number, string>;
    weaponReload: typeof CONFIG.PF2E.weaponReload;
}
