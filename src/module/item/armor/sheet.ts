import { ARMOR_MATERIAL_VALUATION_DATA, CoinsPF2e, PhysicalItemSheetData, PhysicalItemSheetPF2e } from "@item/physical";
import { createSheetTags } from "@module/sheet/helpers";
import { LocalizePF2e } from "@system/localize";
import { ArmorPF2e, ArmorPropertyRuneSlot } from ".";
import { OneToFour, OneToThree } from "@module/data";
import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression";

class ArmorSheetPF2e extends PhysicalItemSheetPF2e<ArmorPF2e> {
    override async getData(options?: Partial<DocumentSheetOptions>) {
        interface PropertyRuneSheetSlot extends ArmorPropertyRuneSlot {
            name?: string;
            number?: OneToFour;
            label?: string;
        }
        // Armor property runes

        const sheetData: PhysicalItemSheetData<ArmorPF2e> & {
            propertyRuneSlots?: PropertyRuneSheetSlot[];
        } = await super.getData(options);

        const ABPVariant = game.settings.get("pf2e", "automaticBonusVariant");
        const abpEnabled = ABP.isEnabled(this.actor);

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
        const hintText = abpEnabled ? "PF2E.Item.Armor.FromABP" : "PF2E.Item.Armor.FromMaterialAndRunes";
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
        const armorPropertyRunes = Object.fromEntries(
            Object.entries(CONFIG.PF2E.runes.armor.property)
                .map(([slug, data]): [string, string] => [slug, game.i18n.localize(data.name)])
                .sort((runeA, runeB) => runeA[1].localeCompare(runeB[1]))
        );

        return {
            ...sheetData,
            hasDetails: true,
            hasSidebar: true,
            preciousMaterials: this.prepareMaterials(ARMOR_MATERIAL_VALUATION_DATA),
            armorPotencyRunes: CONFIG.PF2E.armorPotencyRunes,
            armorResiliencyRunes: CONFIG.PF2E.armorResiliencyRunes,
            armorPropertyRunes,
            otherTags: createSheetTags(CONFIG.PF2E.otherArmorTags, sheetData.data.traits.otherTags),
            adjustedPriceHint,
            adjustedLevelHint,
            abpEnabled,
            baseLevel: baseData.system.level.value,
            rarity: baseData.system.traits.rarity,
            basePrice: new CoinsPF2e(baseData.system.price.value),
            categories: CONFIG.PF2E.armorTypes,
            groups: CONFIG.PF2E.armorGroups,
            baseTypes: LocalizePF2e.translations.PF2E.Item.Armor.Base,
            bulkTypes: CONFIG.PF2E.bulkTypes,
        };
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const armor = this.item;

        formData["system.potencyRune.value"] ||= null;
        formData["system.resiliencyRune.value"] ||= null;
        for (const slotNumber of [1, 2, 3, 4]) {
            formData[`system.propertyRune${slotNumber}.value`] ||= null;
        }

        const isSpecific = formData["system.specific.value"];
        if (isSpecific !== armor.isSpecific) {
            if (isSpecific === true) {
                formData["system.price.value"] = this.item.price.value;
                formData["system.specific.price"] = this.item.price.value;
                formData["system.specific.material"] = armor.material;
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

        return super._updateObject(event, formData);
    }
}

export { ArmorSheetPF2e };
