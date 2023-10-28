import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression.ts";
import {
    MaterialSheetData,
    PhysicalItemSheetData,
    PhysicalItemSheetPF2e,
    RUNE_DATA,
    WEAPON_MATERIAL_VALUATION_DATA,
    getPropertySlots,
} from "@item/physical/index.ts";
import { OneToFour } from "@module/data.ts";
import { SheetOptions, createSheetTags } from "@module/sheet/helpers.ts";
import { ErrorPF2e, htmlQueryAll, objectHasKey, setHasElement, sortStringRecord, tupleHasValue } from "@util";
import * as R from "remeda";
import { ComboWeaponMeleeUsage, WeaponPersistentDamage, WeaponPropertyRuneSlot } from "./data.ts";
import { type WeaponPF2e } from "./document.ts";
import { MANDATORY_RANGED_GROUPS, WEAPON_RANGES } from "./values.ts";

export class WeaponSheetPF2e extends PhysicalItemSheetPF2e<WeaponPF2e> {
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<WeaponSheetData> {
        const sheetData: PhysicalItemSheetData<WeaponPF2e> = await super.getData(options);
        const weapon = this.item;

        // Limit shown property-rune slots by potency rune level and a material composition of orichalcum
        const maxPropertySlots = getPropertySlots(weapon);
        const propertyRuneSlotsData = [
            [1, sheetData.data.propertyRune1],
            [2, sheetData.data.propertyRune2],
            [3, sheetData.data.propertyRune3],
            [4, sheetData.data.propertyRune4],
        ] as const;
        const lastDisplayedPropertySlot = Math.min(
            maxPropertySlots,
            propertyRuneSlotsData.findLastIndex(([, slot]) => !!slot?.value) + 2,
        );
        const propertyRuneSlots = propertyRuneSlotsData
            .filter(
                ([slotNumber, slot]) =>
                    slotNumber <= lastDisplayedPropertySlot && !(sheetData.data.specific?.value && slot.value === null),
            )
            .map(([slotNumber, slot]) => ({
                ...slot,
                name: `system.propertyRune${slotNumber}.value`,
                label: game.i18n.localize(`PF2E.PropertyRuneLabel${slotNumber}`),
                number: slotNumber,
            }));

        const fundamentalRunes = R.pick(RUNE_DATA.weapon, ["potency", "striking"]);
        const propertyRunes = Object.values(RUNE_DATA.weapon.property)
            .map((r) => ({ slug: r.slug, name: game.i18n.localize(r.name) }))
            .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));

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
            const otherWeaponTags: Record<string, string> = deepClone(CONFIG.PF2E.otherWeaponTags);
            if (weapon.hands !== "1") delete otherWeaponTags.implement;
            return createSheetTags(otherWeaponTags, sheetData.data.traits.otherTags);
        })();

        const meleeUsage = sheetData.data.meleeUsage ?? {
            group: "knife",
            damage: { type: "piercing", die: "d4" },
            traits: [],
        };

        return {
            ...sheetData,
            propertyRuneSlots,
            preciousMaterials: this.prepareMaterials(WEAPON_MATERIAL_VALUATION_DATA),
            fundamentalRunes,
            propertyRunes,
            otherTags,
            adjustedDiceHint,
            abpEnabled,
            categories: sortStringRecord(CONFIG.PF2E.weaponCategories),
            groups: sortStringRecord(CONFIG.PF2E.weaponGroups),
            baseTypes: sortStringRecord(CONFIG.PF2E.baseWeaponTypes),
            itemBonuses: CONFIG.PF2E.itemBonuses,
            damageDieFaces,
            damageDie: CONFIG.PF2E.damageDie,
            damageDice: CONFIG.PF2E.damageDice,
            conditionTypes: sortStringRecord(CONFIG.PF2E.conditionTypes),
            damageTypes: sortStringRecord(CONFIG.PF2E.damageTypes),
            weaponRanges,
            mandatoryMelee,
            mandatoryRanged,
            weaponReload: CONFIG.PF2E.weaponReload,
            weaponMAP: CONFIG.PF2E.weaponMAP,
            isBomb: weapon.group === "bomb",
            isComboWeapon,
            meleeGroups: sortStringRecord(CONFIG.PF2E.meleeWeaponGroups),
            meleeUsage,
            meleeUsageTraits: createSheetTags(CONFIG.PF2E.weaponTraits, meleeUsage.traits ?? []),
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

        // Set empty-string values to null
        formData["system.potencyRune.value"] ||= null;
        formData["system.strikingRune.value"] ||= null;
        for (const slotNumber of [1, 2, 3, 4]) {
            formData[`system.propertyRune${slotNumber}.value`] ||= null;
        }

        // Coerce a weapon range of zero to null
        formData["system.range"] ||= null;

        // Clamp damage dice to between zero and eight
        if ("system.damage.dice" in formData) {
            formData["system.damage.dice"] = Math.clamped(Number(formData["system.damage.dice"]) || 0, 0, 8);
        }

        // Seal specific magic weapon data if set to true
        const isSpecific = formData["system.specific.value"];
        if (isSpecific !== weapon.isSpecific) {
            if (isSpecific === true) {
                formData["system.specific.price"] = this.item.price.value;
                formData["system.specific.material"] = weapon.material;
                formData["system.specific.runes"] = {
                    potency: formData["system.potencyRune.value"],
                    striking: formData["system.strikingRune.value"],
                };
            } else if (isSpecific === false) {
                formData["system.specific.-=price"] = null;
                formData["system.specific.-=material"] = null;
                formData["system.specific.-=runes"] = null;
            }
        }

        // Ensure melee usage is absent if not a combination weapon
        if (weapon.system.meleeUsage && !this.item.traits.has("combination")) {
            formData["system.-=meleeUsage"] = null;
        }

        return super._updateObject(event, formData);
    }
}

interface PropertyRuneSheetSlot extends WeaponPropertyRuneSlot {
    name?: string;
    number?: OneToFour;
    label?: string;
}

interface WeaponSheetData extends PhysicalItemSheetData<WeaponPF2e> {
    propertyRuneSlots?: PropertyRuneSheetSlot[];
    preciousMaterials: MaterialSheetData;
    fundamentalRunes: Pick<typeof RUNE_DATA.weapon, "potency" | "striking">;
    propertyRunes: { slug: string; name: string }[];
    otherTags: SheetOptions;
    adjustedDiceHint: string | null;
    adjustedLevelHint: string | null;
    adjustedPriceHint: string | null;
    abpEnabled: boolean;
    categories: typeof CONFIG.PF2E.weaponCategories;
    groups: typeof CONFIG.PF2E.weaponGroups;
    baseTypes: typeof CONFIG.PF2E.baseWeaponTypes;
    itemBonuses: typeof CONFIG.PF2E.itemBonuses;
    damageDieFaces: Record<string, string>;
    damageDie: typeof CONFIG.PF2E.damageDie;
    damageDice: typeof CONFIG.PF2E.damageDice;
    conditionTypes: typeof CONFIG.PF2E.conditionTypes;
    damageTypes: typeof CONFIG.PF2E.damageTypes;
    weaponRanges: Record<number, string>;
    mandatoryMelee: boolean;
    mandatoryRanged: boolean;
    weaponReload: typeof CONFIG.PF2E.weaponReload;
    weaponMAP: typeof CONFIG.PF2E.weaponMAP;
    isBomb: boolean;
    isComboWeapon: boolean;
    meleeGroups: typeof CONFIG.PF2E.meleeWeaponGroups;
    meleeUsage: ComboWeaponMeleeUsage | undefined;
    meleeUsageTraits: SheetOptions;
}
