import { PRECIOUS_MATERIAL_GRADES, PRECIOUS_MATERIAL_TYPES } from "@item/physical/values";
import { PreciousMaterialGrade } from "@item/physical/types";
import { MaterialValuationData, MATERIAL_VALUATION_DATA } from "@item/physical/materials";
import { PhysicalItemSheetPF2e } from "@item/physical/sheet";
import { PhysicalItemSheetData } from "@item/sheet/data-types";
import { CoinsPF2e } from "@item/physical/helpers";
import { OneToFour, OneToThree } from "@module/data";
import { objectHasKey, setHasElement } from "@util";
import { LocalizePF2e } from "@system/localize";
import { WeaponPF2e } from ".";
import { WeaponPropertyRuneSlot } from "./data";
import { createSheetTags } from "@module/sheet/helpers";
import { RANGED_WEAPON_GROUPS, WEAPON_RANGES } from "./values";

export class WeaponSheetPF2e extends PhysicalItemSheetPF2e<WeaponPF2e> {
    override async getData() {
        interface PropertyRuneSheetSlot extends WeaponPropertyRuneSlot {
            name?: string;
            number?: OneToFour;
            label?: string;
        }
        const sheetData: PhysicalItemSheetData<WeaponPF2e> & {
            propertyRuneSlots?: PropertyRuneSheetSlot[];
        } = await super.getData();

        const ABPVariant = game.settings.get("pf2e", "automaticBonusVariant");
        // Limit shown property-rune slots by potency rune level and a material composition of orichalcum
        const potencyRuneValue = ABPVariant === "ABPFundamentalPotency" ? 4 : sheetData.data.potencyRune.value ?? 0;
        const propertyRuneSlots = [
            [1, sheetData.data.propertyRune1],
            [2, sheetData.data.propertyRune2],
            [3, sheetData.data.propertyRune3],
            [4, sheetData.data.propertyRune4],
        ] as const;
        sheetData.propertyRuneSlots = propertyRuneSlots
            .filter(
                ([slotNumber, slot], idx) =>
                    (slotNumber <= potencyRuneValue || sheetData.data.preciousMaterial.value === "orichalcum") &&
                    (slotNumber === 1 || !!sheetData.data[`propertyRune${idx as OneToThree}` as const]?.value) &&
                    !(sheetData.data.specific?.value && slot.value === null)
            )
            .map(([slotNumber, slot]) => ({
                ...slot,
                name: `data.propertyRune${slotNumber}.value`,
                label: game.i18n.localize(`PF2E.PropertyRuneLabel${slotNumber}`),
                number: slotNumber,
            }));

        // Weapons have derived level, price, and traits: base data is shown for editing
        const baseData = this.item.toObject();
        sheetData.data.traits.rarity = baseData.data.traits.rarity;
        const hintText = LocalizePF2e.translations.PF2E.Item.Weapon.FromMaterialAndRunes;
        const adjustedLevelHint =
            this.item.level !== baseData.data.level.value
                ? game.i18n.format(hintText, {
                      property: game.i18n.localize("PF2E.LevelLabel"),
                      value: this.item.level,
                  })
                : null;
        const adjustedPriceHint = (() => {
            const basePrice = new CoinsPF2e(baseData.data.price.value).scale(baseData.data.quantity).copperValue;
            const derivedPrice = this.item.assetValue.copperValue;
            return basePrice !== derivedPrice
                ? game.i18n.format(hintText, {
                      property: game.i18n.localize("PF2E.PriceLabel"),
                      value: this.item.price.value.toString(),
                  })
                : null;
        })();

        type MaterialSheetData = MaterialValuationData & {
            [key in keyof MaterialValuationData]:
                | null
                | (MaterialValuationData[key] & {
                      label?: string;
                  } & {
                      [key in PreciousMaterialGrade]: { label?: string; selected?: boolean } | null;
                  });
        };

        const preciousMaterials: Partial<MaterialSheetData> = deepClone(MATERIAL_VALUATION_DATA);
        delete preciousMaterials[""];
        delete preciousMaterials["dragonhide"];
        delete preciousMaterials["grisantian-pelt"];
        const { material } = this.item;
        for (const materialKey of PRECIOUS_MATERIAL_TYPES) {
            const materialData = preciousMaterials[materialKey];
            if (materialData) {
                materialData.label = game.i18n.localize(CONFIG.PF2E.preciousMaterials[materialKey]);
                for (const gradeKey of PRECIOUS_MATERIAL_GRADES) {
                    const grade = materialData[gradeKey];
                    if (grade) {
                        grade.label = game.i18n.localize(CONFIG.PF2E.preciousMaterialGrades[gradeKey]);
                        grade.selected =
                            material.precious?.type === materialKey && material.precious?.grade === gradeKey;
                    }
                }
            }
        }

        const groups = Object.fromEntries(
            Object.entries(CONFIG.PF2E.weaponGroups)
                .map(([slug, localizeKey]): [string, string] => [slug, game.i18n.localize(localizeKey)])
                .sort((damageA, damageB) => damageA[1].localeCompare(damageB[1]))
        );

        const damageTypes = Object.fromEntries(
            Object.entries(CONFIG.PF2E.damageTypes)
                .map(([slug, localizeKey]): [string, string] => [slug, game.i18n.localize(localizeKey)])
                .sort((damageA, damageB) => damageA[1].localeCompare(damageB[1]))
        );

        const weaponPropertyRunes = Object.fromEntries(
            Object.entries(CONFIG.PF2E.runes.weapon.property)
                .map(([slug, data]): [string, string] => [slug, game.i18n.localize(data.name)])
                .sort((runeA, runeB) => runeA[1].localeCompare(runeB[1]))
        );

        const traitSet = this.item.traits;
        const isComboWeapon = traitSet.has("combination");

        const weaponRanges = Array.from(WEAPON_RANGES).reduce(
            (ranges: Record<number, string>, range) => ({
                ...ranges,
                [range]: game.i18n.format("PF2E.WeaponRangeN", { range: range }),
            }),
            {}
        );
        const rangedOnlyTraits = ["combination", "thrown", "volley-20", "volley-30", "volley-50"] as const;
        const mandatoryRanged =
            setHasElement(RANGED_WEAPON_GROUPS, this.item.group) ||
            rangedOnlyTraits.some((trait) => traitSet.has(trait));
        const mandatoryMelee = sheetData.data.traits.value.some((trait) => /^thrown-\d+$/.test(trait));

        const meleeUsage = sheetData.data.meleeUsage ?? {
            group: "knife",
            damage: { type: "piercing", die: "d4" },
            traits: [],
        };
        const abpEnabled = game.settings.get("pf2e", "automaticBonusVariant") !== "noABP";

        return {
            ...sheetData,
            preciousMaterials,
            weaponPotencyRunes: CONFIG.PF2E.weaponPotencyRunes,
            weaponStrikingRunes: CONFIG.PF2E.weaponStrikingRunes,
            weaponPropertyRunes,
            traits: createSheetTags(CONFIG.PF2E.weaponTraits, sheetData.item.data.traits),
            otherTags: createSheetTags(CONFIG.PF2E.otherWeaponTags, sheetData.item.data.traits.otherTags),
            adjustedLevelHint,
            adjustedPriceHint,
            abpEnabled,
            baseLevel: baseData.data.level.value,
            baseRarity: baseData.data.traits.rarity,
            basePrice: new CoinsPF2e(baseData.data.price.value),
            categories: CONFIG.PF2E.weaponCategories,
            groups,
            baseTypes: LocalizePF2e.translations.PF2E.Weapon.Base,
            itemBonuses: CONFIG.PF2E.itemBonuses,
            damageDie: CONFIG.PF2E.damageDie,
            damageDice: CONFIG.PF2E.damageDice,
            conditionTypes: CONFIG.PF2E.conditionTypes,
            damageTypes,
            weaponRanges,
            mandatoryMelee,
            mandatoryRanged,
            weaponReload: CONFIG.PF2E.weaponReload,
            weaponMAP: CONFIG.PF2E.weaponMAP,
            bulkTypes: CONFIG.PF2E.bulkTypes,
            sizes: CONFIG.PF2E.actorSizes,
            isBomb: this.item.group === "bomb",
            isComboWeapon,
            meleeGroups: CONFIG.PF2E.meleeWeaponGroups,
            meleeUsage,
            meleeUsageTraits: createSheetTags(CONFIG.PF2E.weaponTraits, meleeUsage.traits ?? []),
        };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        $html.find("i.fa-info-circle.small[title]").tooltipster({
            maxWidth: 275,
            position: "right",
            theme: "crb-hover",
            contentAsHTML: true,
        });
        $html.find("i.fa-info-circle.large[title]").tooltipster({
            maxWidth: 400,
            theme: "crb-hover",
            contentAsHTML: true,
        });

        const $otherTagsHint = $html.find("i.other-tags-hint");
        $otherTagsHint.tooltipster({
            maxWidth: 350,
            theme: "crb-hover",
            content: game.i18n.localize($otherTagsHint.attr("title") ?? ""),
        });
    }

    /** Seal the material and runes when a weapon is marked as specific */
    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const weapon = this.item;
        formData["data.potencyRune.value"] ||= 0;
        // Set empty-string values and zeroes to null
        for (const slotNumber of [1, 2, 3, 4]) {
            formData[`data.propertyRune${slotNumber}.value`] ||= null;
        }

        // Coerce a weapon range of zero to null
        formData["data.range"] ||= null;

        // Process precious-material selection
        if (typeof formData["preciousMaterial"] === "string") {
            const typeGrade = formData["preciousMaterial"].split("-");
            const isValidSelection =
                objectHasKey(CONFIG.PF2E.preciousMaterials, typeGrade[0] ?? "") &&
                objectHasKey(CONFIG.PF2E.preciousMaterialGrades, typeGrade[1] ?? "");
            if (isValidSelection) {
                formData["data.preciousMaterial.value"] = typeGrade[0];
                formData["data.preciousMaterialGrade.value"] = typeGrade[1];
            } else {
                formData["data.preciousMaterial.value"] = null;
                formData["data.preciousMaterialGrade.value"] = null;
            }

            delete formData["preciousMaterial"];
        }

        // Seal specific magic weapon data if set to true
        const isSpecific = formData["data.specific.value"];
        if (isSpecific !== weapon.isSpecific) {
            if (isSpecific === true) {
                formData["data.price.value"] = this.item.price.value;
                formData["data.specific.price"] = this.item.price.value;
                formData["data.specific.material"] = weapon.material;
                formData["data.specific.runes"] = {
                    potency: formData["data.potencyRune.value"],
                    striking: formData["data.strikingRune.value"],
                };
            } else if (isSpecific === false) {
                formData["data.specific.-=material"] = null;
                formData["data.specific.-=runes"] = null;
            }
        }

        // Ensure melee usage is absent if not a combination weapon
        if (weapon.data.data.meleeUsage && !this.item.traits.has("combination")) {
            formData["data.-=meleeUsage"] = null;
        }

        return super._updateObject(event, formData);
    }
}
