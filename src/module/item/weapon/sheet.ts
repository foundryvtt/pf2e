import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression";
import {
    CoinsPF2e,
    PhysicalItemSheetData,
    PhysicalItemSheetPF2e,
    WEAPON_MATERIAL_VALUATION_DATA,
} from "@item/physical";
import { OneToFour, OneToThree } from "@module/data";
import { createSheetTags, SheetOptions } from "@module/sheet/helpers";
import { LocalizePF2e } from "@system/localize";
import { setHasElement } from "@util";
import { WeaponPropertyRuneSlot } from "./data";
import { type WeaponPF2e } from "./document";
import { MANDATORY_RANGED_GROUPS, WEAPON_RANGES } from "./values";

export class WeaponSheetPF2e extends PhysicalItemSheetPF2e<WeaponPF2e> {
    override async getData(options?: Partial<DocumentSheetOptions>) {
        interface PropertyRuneSheetSlot extends WeaponPropertyRuneSlot {
            name?: string;
            number?: OneToFour;
            label?: string;
        }
        const sheetData: PhysicalItemSheetData<WeaponPF2e> & {
            propertyRuneSlots?: PropertyRuneSheetSlot[];
        } = await super.getData(options);

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
                name: `system.propertyRune${slotNumber}.value`,
                label: game.i18n.localize(`PF2E.PropertyRuneLabel${slotNumber}`),
                number: slotNumber,
            }));

        // Weapons have derived damage dice, level, price, and traits: base data is shown for editing
        const baseData = this.item.toObject();
        sheetData.data.traits.rarity = baseData.system.traits.rarity;
        const hintText = ABP.isEnabled
            ? LocalizePF2e.translations.PF2E.Item.Weapon.FromABP
            : LocalizePF2e.translations.PF2E.Item.Weapon.FromMaterialAndRunes;

        const adjustedDiceHint =
            this.item.system.damage.dice !== baseData.system.damage.dice
                ? game.i18n.format(hintText, {
                      property: game.i18n.localize("PF2E.Item.Weapon.Damage.DiceNumber"),
                      value: this.item.system.damage.dice,
                  })
                : null;

        const adjustedLevelHint =
            this.item.level !== baseData.system.level.value
                ? game.i18n.format(hintText, {
                      property: game.i18n.localize("PF2E.LevelLabel"),
                      value: this.item.level,
                  })
                : null;
        const adjustedPriceHint = (() => {
            const basePrice = new CoinsPF2e(baseData.system.price.value).scale(baseData.system.quantity).copperValue;
            const derivedPrice = this.item.assetValue.copperValue;
            return basePrice !== derivedPrice
                ? game.i18n.format(hintText, {
                      property: game.i18n.localize("PF2E.PriceLabel"),
                      value: this.item.price.value.toString(),
                  })
                : null;
        })();

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
            setHasElement(MANDATORY_RANGED_GROUPS, this.item.group) ||
            rangedOnlyTraits.some((trait) => traitSet.has(trait));
        const mandatoryMelee = sheetData.data.traits.value.some((trait) => /^thrown-\d+$/.test(trait));

        // Restrict the Implement tag to one-handed weapons
        const otherTags = ((): SheetOptions => {
            const otherWeaponTags: Record<string, string> = deepClone(CONFIG.PF2E.otherWeaponTags);
            if (this.item.hands !== "1") delete otherWeaponTags.implement;
            return createSheetTags(otherWeaponTags, sheetData.data.traits.otherTags);
        })();

        const meleeUsage = sheetData.data.meleeUsage ?? {
            group: "knife",
            damage: { type: "piercing", die: "d4" },
            traits: [],
        };
        const abpEnabled = game.settings.get("pf2e", "automaticBonusVariant") !== "noABP";

        return {
            ...sheetData,
            hasDetails: true,
            hasSidebar: true,
            preciousMaterials: this.prepareMaterials(WEAPON_MATERIAL_VALUATION_DATA),
            weaponPotencyRunes: CONFIG.PF2E.weaponPotencyRunes,
            weaponStrikingRunes: CONFIG.PF2E.weaponStrikingRunes,
            weaponPropertyRunes,
            otherTags,
            adjustedDiceHint,
            adjustedLevelHint,
            adjustedPriceHint,
            abpEnabled,
            baseDice: baseData.system.damage.dice,
            baseLevel: baseData.system.level.value,
            rarity: baseData.system.traits.rarity,
            basePrice: new CoinsPF2e(baseData.system.price.value),
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
                formData["system.price.value"] = this.item.price.value;
                formData["system.specific.price"] = this.item.price.value;
                formData["system.specific.material"] = weapon.material;
                formData["system.specific.runes"] = {
                    potency: formData["system.potencyRune.value"],
                    striking: formData["system.strikingRune.value"],
                };
            } else if (isSpecific === false) {
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
