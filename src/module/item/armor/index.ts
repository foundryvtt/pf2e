import { ArmorRuneValuationData, ARMOR_VALUATION_DATA } from "../runes";
import { MAGIC_TRADITIONS } from "@item/spell/data";
import { LocalizePF2e } from "@module/system/localize";
import { ArmorPropertyRuneType, ArmorTrait } from "./data";
import { coinsToString, coinValueInCopper, combineCoins, extractPriceFromItem, toCoins } from "@item/treasure/helpers";
import { sluggify } from "@util";
import { MaterialGradeData, MATERIAL_VALUATION_DATA } from "@item/physical/materials";
import { toBulkItem } from "@item/physical/bulk";
//import { IdentificationStatus, MystifiedData } from "@item/physical/data";
import { addSign } from "@util";
import { PhysicalItemPF2e } from "../physical";
import { getArmorBonus, getResiliencyBonus } from "../runes";
import { ArmorCategory, ArmorData, ArmorGroup, BaseArmorType } from "./data";

export class ArmorPF2e extends PhysicalItemPF2e {
    static override get schema(): typeof ArmorData {
        return ArmorData;
    }

    override isStackableWith(item: PhysicalItemPF2e): boolean {
        if (this.isEquipped || item.isEquipped) return false;
        return super.isStackableWith(item);
    }

    get isShield(): boolean {
        return this.data.data.armorType.value === "shield";
    }

    get isArmor(): boolean {
        return !this.isShield;
    }

    get baseType(): BaseArmorType | null {
        return this.data.data.baseItem ?? null;
    }

    get group(): ArmorGroup | null {
        return this.data.data.group.value || null;
    }

    get category(): ArmorCategory {
        return this.data.data.armorType.value;
    }

    get isSpecific(): boolean {
        return this.data.data.specific?.value ?? false;
    }

    get dexCap(): number | null {
        return this.isShield ? null : this.data.data.dex.value;
    }

    get strength(): number | null {
        return this.isShield ? null : this.data.data.strength.value;
    }

    get checkPenalty(): number | null {
        return this.isShield ? null : this.data.data.check.value;
    }

    get speedPenalty(): number {
        return this.data.data.speed.value;
    }

    get acBonus(): number {
        const potencyRune = this.isArmor && this.isInvested ? this.data.data.runes.potency : 0;
        const baseArmor = Number(this.data.data.armor.value) || 0;
        return this.isShield && this.isBroken ? 0 : baseArmor + potencyRune;
    }

    get hitPoints(): { value: number; max: number } {
        return {
            value: this.data.data.hp.value,
            max: this.data.data.maxHp.value,
        };
    }

    get hardness(): number {
        return this.data.data.hardness.value;
    }

    get brokenThreshold(): number {
        return this.data.data.brokenThreshold.value;
    }

    get isBroken(): boolean {
        return this.hitPoints.value <= this.brokenThreshold;
    }

    /** Generate a list of strings for use in predication */
    override getContextStrings(prefix = "armor"): string[] {
        return super.getContextStrings(prefix).concat(
            Object.entries({
                [`category:${this.category}`]: true,
                [`group:${this.group}`]: !!this.group,
                [`base:${this.baseType}`]: !!this.baseType,
            })
                .filter(([_key, isTrue]) => isTrue)
                .map(([key]) => {
                    const separatedPrefix = prefix ? `${prefix}:` : "";
                    return `${separatedPrefix}${key}`;
                })
        );
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        //this.data.data.modifiedPrice.value ||= this.data.data.price.value;
        this.data.data.potencyRune.value ||= null;
        this.data.data.resiliencyRune.value ||= null;
        this.data.data.propertyRune1.value ||= null;
        this.data.data.propertyRune2.value ||= null;
        this.data.data.propertyRune3.value ||= null;
        this.data.data.propertyRune4.value ||= null;

        // Add traits from potency rune
        const baseTraits = this.data.data.traits.value;
        const fromRunes: ("invested" | "abjuration")[] = this.data.data.potencyRune.value
            ? ["invested", "abjuration"]
            : [];
        const hasTraditionTraits = MAGIC_TRADITIONS.some((trait) => baseTraits.includes(trait));
        const magicTraits: "magical"[] = fromRunes.length > 0 && !hasTraditionTraits ? ["magical"] : [];
        this.data.data.traits.value = Array.from(new Set([...baseTraits, ...fromRunes, ...magicTraits]));

        this.processMaterialAndRunes();
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        const systemData = this.data.data;
        const { potencyRune, resiliencyRune, propertyRune1, propertyRune2, propertyRune3, propertyRune4 } = systemData;
        this.data.data.runes = {
            potency: potencyRune.value ?? 0,
            resilient: getResiliencyBonus({ resiliencyRune }),
            property: [propertyRune1.value, propertyRune2.value, propertyRune3.value, propertyRune4.value].filter(
                (rune): rune is ArmorPropertyRuneType => !!rune
            ),
        };
    }

    processMaterialAndRunes(): void {
        const systemData = this.data.data;

        // Collect all traits from the runes and apply them to the armor
        const runesData = this.getRunesData();
        const baseTraits = systemData.traits.value;
        const traitsFromRunes = runesData.flatMap((datum: { traits: readonly ArmorTrait[] }) => datum.traits);
        const hasTraditionTraits = MAGIC_TRADITIONS.some((trait) => baseTraits.concat(traitsFromRunes).includes(trait));
        const magicTraits: "magical"[] = traitsFromRunes.length > 0 && !hasTraditionTraits ? ["magical"] : [];
        systemData.traits.value = Array.from(new Set([...baseTraits, ...traitsFromRunes, ...magicTraits]));

        // Stop here if this armor is not a magical or precious-material item, or if it is a specific magic armor
        const materialData = this.getMaterialData();
        const basePrice = extractPriceFromItem(this.data, 1);
        if (!(this.isMagical || materialData) || this.isSpecific) {
            //set price and name to base
            //systemData.modifiedPrice.value = coinsToString(basePrice);
            return;
        }
        // Adjust the armor price according to precious material and runes
        // https://2e.aonprd.com/Rules.aspx?ID=731
        const materialPrice = materialData?.price ?? 0;
        const bulk = materialPrice && Math.max(Math.ceil(toBulkItem(this.data).bulk.normal), 1);
        const materialValue = toCoins("gp", materialPrice + (bulk * materialPrice) / 10);
        const runeValue = runesData.reduce((sum, rune) => sum + rune.price, 0);
        const withRunes = extractPriceFromItem({
            data: { quantity: { value: 1 }, price: { value: `${runeValue} gp` } },
        });
        const modifiedPrice = combineCoins(withRunes, materialValue);

        const highestPrice =
            coinValueInCopper(modifiedPrice) > coinValueInCopper(basePrice) ? modifiedPrice : basePrice;
        systemData.price.value = coinsToString(highestPrice);

        const baseLevel = this.level;
        systemData.level.value = runesData
            .map((runeData) => runeData.level)
            .concat(materialData?.level ?? 0)
            .reduce((highest, level) => (level > highest ? level : highest), baseLevel);

        const rarityOrder = {
            common: 0,
            uncommon: 1,
            rare: 2,
            unique: 3,
        };
        const baseRarity = this.rarity;
        systemData.traits.rarity.value = runesData
            .map((runeData) => runeData.rarity)
            .concat(materialData?.rarity ?? "common")
            .reduce((highest, rarity) => (rarityOrder[rarity] > rarityOrder[highest] ? rarity : highest), baseRarity);
        // Set the name according to the precious material and runes
        this.data.name = this.generateMagicName();
    }

    getRunesData(): ArmorRuneValuationData[] {
        const systemData = this.data.data;
        return [
            ARMOR_VALUATION_DATA.potency[systemData.potencyRune.value ?? 0],
            ARMOR_VALUATION_DATA.resilient[systemData.resiliencyRune.value ?? ""],
            CONFIG.PF2E.runes.armor.property[systemData.propertyRune1.value ?? ""],
            CONFIG.PF2E.runes.armor.property[systemData.propertyRune2.value ?? ""],
            CONFIG.PF2E.runes.armor.property[systemData.propertyRune3.value ?? ""],
            CONFIG.PF2E.runes.armor.property[systemData.propertyRune4.value ?? ""],
        ].filter((datum): datum is ArmorRuneValuationData => !!datum);
    }

    getMaterialData(): MaterialGradeData | null {
        const material = this.material;
        return MATERIAL_VALUATION_DATA[material?.type ?? ""][material?.grade ?? "low"];
    }

    /** Generate a armor name base on precious-material composition and runes */
    generateMagicName(): string {
        const sluggifiedName = sluggify(this.data._source.name);
        if (this.isSpecific || sluggifiedName !== this.baseType) return this.data.name;

        const systemData = this.data.data;
        const translations = LocalizePF2e.translations.PF2E;

        const baseArmors = translations.Item.Armor.Base;
        const potencyRune = systemData.potencyRune.value;
        const resiliencyRune = systemData.resiliencyRune.value;
        const propertyRunes = {
            1: systemData.propertyRune1?.value ?? null,
            2: systemData.propertyRune2?.value ?? null,
            3: systemData.propertyRune3?.value ?? null,
            4: systemData.propertyRune4?.value ?? null,
        };
        const params = {
            base: this.baseType ? baseArmors[this.baseType] : this.name,
            material: this.material && game.i18n.localize(CONFIG.PF2E.preciousMaterials[this.material.type]),
            potency: potencyRune,
            resilient: resiliencyRune && game.i18n.localize(CONFIG.PF2E.armorResiliencyRunes[resiliencyRune]),
            property1: propertyRunes[1] && game.i18n.localize(CONFIG.PF2E.armorPropertyRunes[propertyRunes[1]]),
            property2: propertyRunes[2] && game.i18n.localize(CONFIG.PF2E.armorPropertyRunes[propertyRunes[2]]),
            property3: propertyRunes[3] && game.i18n.localize(CONFIG.PF2E.armorPropertyRunes[propertyRunes[3]]),
            property4: propertyRunes[4] && game.i18n.localize(CONFIG.PF2E.armorPropertyRunes[propertyRunes[4]]),
        };

        const formatStrings = translations.Item.Armor.GeneratedName;
        // Construct a localization key from the armor material and runes
        const formatString = (() => {
            const potency = params.potency && "Potency";
            const resilient = params.resilient && "Resilient";
            const properties = params.property4
                ? "FourProperties"
                : params.property3
                ? "ThreeProperties"
                : params.property2
                ? "TwoProperties"
                : params.property1
                ? "OneProperty"
                : null;
            const material = params.material && "Material";
            const key = ([potency, resilient, properties, material]
                .filter((keyPart): keyPart is string => !!keyPart)
                .join("") || null) as keyof typeof formatStrings | null;
            key;
            return key && formatStrings[key];
        })();

        return formatString ? game.i18n.format(formatString, params) : this.name;
    }

    override prepareActorData(this: Embedded<ArmorPF2e>): void {
        if (this.isArmor && this.isEquipped) {
            const traits = this.traits;
            for (const [trait, domain] of [
                ["bulwark", "reflex"],
                ["flexible", "skill-check"],
                ["noisy", "skill-check"],
            ] as const) {
                if (traits.has(trait)) {
                    const checkOptions = (this.actor.rollOptions[domain] ??= {});
                    checkOptions[`self:armor:trait:${trait}`] = true;
                }
            }
        }
    }

    override getChatData(this: Embedded<ArmorPF2e>, htmlOptions: EnrichHTMLOptions = {}): Record<string, unknown> {
        const data = this.data.data;
        const localize = game.i18n.localize.bind(game.i18n);
        const properties = [
            CONFIG.PF2E.armorTypes[this.category],
            this.group ? CONFIG.PF2E.armorGroups[this.group] : null,
            `${addSign(getArmorBonus(data))} ${localize("PF2E.ArmorArmorLabel")}`,
            `${data.dex.value || 0} ${localize("PF2E.ArmorDexLabel")}`,
            `${data.check.value || 0} ${localize("PF2E.ArmorCheckLabel")}`,
            `${data.speed.value || 0} ${localize("PF2E.ArmorSpeedLabel")}`,
            data.equipped.value ? localize("PF2E.ArmorEquippedLabel") : null,
        ].filter((property) => property);

        return this.processChatData(htmlOptions, {
            ...data,
            properties,
            traits: this.traitChatData(CONFIG.PF2E.armorTraits),
        });
    }

    override generateUnidentifiedName({ typeOnly = false }: { typeOnly?: boolean } = { typeOnly: false }): string {
        const translations = LocalizePF2e.translations.PF2E;
        const base = this.baseType ? translations.Item.Armor.Base[this.baseType] : null;
        const group = this.group ? CONFIG.PF2E.armorGroups[this.group] : null;
        const fallback = this.isShield ? "PF2E.ArmorTypeShield" : "ITEM.TypeArmor";

        const itemType = game.i18n.localize(base ?? group ?? fallback);

        if (typeOnly) return itemType;

        const formatString = LocalizePF2e.translations.PF2E.identification.UnidentifiedItem;
        return game.i18n.format(formatString, { item: itemType });
    }
}

export interface ArmorPF2e {
    readonly data: ArmorData;
}
