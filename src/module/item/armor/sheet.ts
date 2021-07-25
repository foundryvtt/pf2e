import { PRECIOUS_MATERIAL_GRADES, PRECIOUS_MATERIAL_TYPES } from '@item/data/values';
import { PreciousMaterialGrade } from '@item/physical/data';
import { MaterialValuationData, MATERIAL_VALUATION_DATA } from '@item/physical/materials';
import { PhysicalItemSheetPF2e } from '@item/physical/sheet';
import { ItemSheetDataPF2e } from '@item/sheet/data-types';
import { coinValueInCopper, extractPriceFromItem } from '@item/treasure/helpers';
import { OneToFour, OneToThree } from '@module/data';
import { objectHasKey } from '@module/utils';
import { ArmorPF2e } from '.';
import { LocalizePF2e } from '@system/localize';
import { ArmorPropertyRuneSlot } from './data';

export class ArmorSheetPF2e extends PhysicalItemSheetPF2e<ArmorPF2e> {
    override getData() {
        interface PropertyRuneSheetSlot extends ArmorPropertyRuneSlot {
            name?: string;
            number?: OneToFour;
            label?: string;
        }
        const sheetData: ItemSheetDataPF2e<ArmorPF2e> & {
            propertyRuneSlots?: PropertyRuneSheetSlot[];
        } = super.getData();

        // Limit shown property-rune slots by potency rune level and a material composition of orichalcum
        const potencyRuneValue = sheetData.data.potencyRune.value ?? 0;
        const propertyRuneSlots = [
            [1, sheetData.data.propertyRune1],
            [2, sheetData.data.propertyRune2],
            [3, sheetData.data.propertyRune3],
            [4, sheetData.data.propertyRune4],
        ] as const;
        sheetData.propertyRuneSlots = propertyRuneSlots
            .filter(
                ([slotNumber, slot], idx) =>
                    (slotNumber <= potencyRuneValue || sheetData.data.preciousMaterial.value === 'orichalcum') &&
                    (slotNumber === 1 || !!sheetData.data[`propertyRune${idx as OneToThree}` as const]?.value) &&
                    !(sheetData.data.specific?.value && slot.value === null),
            )
            .map(([slotNumber, slot]) => ({
                ...slot,
                name: `data.propertyRune${slotNumber}.value`,
                label: game.i18n.localize(`PF2E.PropertyRuneLabel${slotNumber}`),
                number: slotNumber,
            }));

        // Armors have derived traits and price: base data is shown for editing
        const baseData = this.item.toObject();
        sheetData.data.traits.rarity.value = baseData.data.traits.rarity.value;
        const hasModifiedPrice =
            coinValueInCopper(extractPriceFromItem(sheetData.item)) !==
            coinValueInCopper(extractPriceFromItem(baseData));

        type MaterialSheetData = MaterialValuationData &
            {
                [key in keyof MaterialValuationData]:
                    | null
                    | (MaterialValuationData[key] & {
                          label?: string;
                      } & {
                              [key in PreciousMaterialGrade]: { label?: string; selected?: boolean } | null;
                          });
            };

        const preciousMaterials: Partial<MaterialSheetData> = deepClone(MATERIAL_VALUATION_DATA);
        delete preciousMaterials[''];
        delete preciousMaterials['warpglass'];
        for (const materialKey of PRECIOUS_MATERIAL_TYPES) {
            const materialData = preciousMaterials[materialKey];
            if (materialData) {
                materialData.label = game.i18n.localize(CONFIG.PF2E.preciousMaterials[materialKey]);
                for (const gradeKey of PRECIOUS_MATERIAL_GRADES) {
                    const grade = materialData[gradeKey];
                    if (grade) {
                        grade.label = game.i18n.localize(CONFIG.PF2E.preciousMaterialGrades[gradeKey]);
                        grade.selected =
                            this.item.material?.type === materialKey && this.item.material.grade === gradeKey;
                    }
                }
            }
        }

        return {
            ...sheetData,
            preciousMaterials,
            armorPotencyRunes: CONFIG.PF2E.armorPotencyRunes,
            armorResiliencyRunes: CONFIG.PF2E.armorResiliencyRunes,
            armorPropertyRunes: CONFIG.PF2E.armorPropertyRunes,
            traits: this.prepareOptions(CONFIG.PF2E.armorTraits, sheetData.item.data.traits, { selectedOnly: true }),
            baseTraits: this.prepareOptions(CONFIG.PF2E.armorTraits, baseData.data.traits, { selectedOnly: true }),
            hasModifiedPrice,
            categories: CONFIG.PF2E.armorTypes,
            baseLevel: baseData.data.level.value,
            baseTypes: LocalizePF2e.translations.PF2E.Item.Armor.Base,
            baseRarity: baseData.data.traits.rarity.value,
            basePrice: baseData.data.price.value,
            groups: CONFIG.PF2E.armorGroups,
            itemBonuses: CONFIG.PF2E.itemBonuses,
            bulkTypes: CONFIG.PF2E.bulkTypes,
            preciousMaterialGrades: CONFIG.PF2E.preciousMaterialGrades,
            sizes: CONFIG.PF2E.actorSizes,
        };
    }

    override activateListeners($html: JQuery) {
        super.activateListeners($html);
        $('i.fa-info-circle[title]').tooltipster({
            animation: 'fade',
            maxWidth: 400,
            theme: 'crb-hover',
            contentAsHTML: true,
        });
    }

    /** Seal the material and runes when a armor is marked as specific */
    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const armor = this.item;
        // Set empty-string values to null
        for (const slotNumber of [1, 2, 3, 4]) {
            formData[`data.propertyRune${slotNumber}.value`] ||= null;
        }

        // Process precious-material selection
        if (typeof formData['preciousMaterial'] === 'string') {
            const typeGrade = formData['preciousMaterial'].split('-');
            const isValidSelection =
                objectHasKey(CONFIG.PF2E.preciousMaterials, typeGrade[0] ?? '') &&
                objectHasKey(CONFIG.PF2E.preciousMaterialGrades, typeGrade[1] ?? '');
            if (isValidSelection) {
                formData['data.preciousMaterial.value'] = typeGrade[0];
                formData['data.preciousMaterialGrade.value'] = typeGrade[1];
            } else {
                formData['data.preciousMaterial.value'] = null;
                formData['data.preciousMaterialGrade.value'] = null;
            }

            // Seal specific magic armor data if set to true
            const isSpecific = formData['data.specific.value'];
            if (isSpecific !== armor.isSpecific) {
                if (isSpecific === true) {
                    formData['data.specific.material'] = armor.material;
                    formData['data.specific.runes'] = {
                        potency: formData['data.potencyRune.value'],
                        striking: formData['data.strikingRune.value'],
                    };
                } else if (isSpecific === false) {
                    formData['data.specific.-=material'] = null;
                    formData['data.specific.-=runes'] = null;
                }
            }

            delete formData['preciousMaterial'];
        }
        super._updateObject(event, formData);
    }
}
