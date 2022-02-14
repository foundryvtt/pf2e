import { RuneValuationData, ARMOR_VALUATION_DATA } from "../runes";
import { MAGIC_TRADITIONS } from "@item/spell/data";
import { LocalizePF2e } from "@module/system/localize";
import { ArmorPropertyRuneType } from "./data";
import { addSign } from "@util";
import { PhysicalItemPF2e } from "../physical";
import { getArmorBonus, getResiliencyBonus, RuneParams } from "../runes";
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
        return this.data.data.category === "shield";
    }

    get isArmor(): boolean {
        return !this.isShield;
    }

    get baseType(): BaseArmorType | null {
        return this.data.data.baseItem ?? null;
    }

    get group(): ArmorGroup | null {
        return this.data.data.group || null;
    }

    get category(): ArmorCategory {
        return this.data.data.category;
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
    override getItemRollOptions(prefix = "armor"): string[] {
        return super.getItemRollOptions(prefix).concat(
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
        // this.data.data.modifiedPrice.value ||= this.data.data.price.value;
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

    override getRunesData(): RuneValuationData[] {
        const systemData = this.data.data;
        return [
            ARMOR_VALUATION_DATA.potency[systemData.potencyRune.value ?? 0],
            ARMOR_VALUATION_DATA.resilient[systemData.resiliencyRune.value ?? ""],
            CONFIG.PF2E.runes.armor.property[systemData.propertyRune1.value ?? ""],
            CONFIG.PF2E.runes.armor.property[systemData.propertyRune2.value ?? ""],
            CONFIG.PF2E.runes.armor.property[systemData.propertyRune3.value ?? ""],
            CONFIG.PF2E.runes.armor.property[systemData.propertyRune4.value ?? ""],
        ].filter((datum): datum is RuneValuationData => !!datum);
    }

    override hasRunes() {
        return (() => {
            const hasFundamentalRunes = !!this.data.data.potencyRune.value || !!this.data.data.resiliencyRune.value;
            const hasPropertyRunes = ([1, 2, 3, 4] as const)
                .map((n) => this.data.data[`propertyRune${n}` as const])
                .some((r) => !!r.value);
            const abpSetting = game.settings.get("pf2e", "automaticBonusVariant");
            return hasFundamentalRunes || (hasPropertyRunes && abpSetting === "ABPFundamentalPotency");
        })();
    }

    override isItemSpecific(): boolean {
        return this.isSpecific;
    }

    override getShouldItemKeepName() {
        return this.isSpecific || !this.baseType;
    }

    override getFormatStrings() {
        const translations = LocalizePF2e.translations.PF2E;
        return translations.Item.Armor.GeneratedName;
    }

    override getRuneParams(): RuneParams {
        const translations = LocalizePF2e.translations.PF2E;
        const systemData = this.data.data;
        const potencyRune = systemData.potencyRune.value;
        const resiliencyRune = systemData.resiliencyRune.value;
        const propertyRunes = {
            1: systemData.propertyRune1?.value ?? null,
            2: systemData.propertyRune2?.value ?? null,
            3: systemData.propertyRune3?.value ?? null,
            4: systemData.propertyRune4?.value ?? null,
        };
        const baseArmors = translations.Item.Armor.Base;
        return {
            base: this.baseType ? baseArmors[this.baseType] : this.name,
            material: this.material && game.i18n.localize(CONFIG.PF2E.preciousMaterials[this.material.type]),
            potency: potencyRune,
            resilient: resiliencyRune && game.i18n.localize(CONFIG.PF2E.armorResiliencyRunes[resiliencyRune]),
            striking: null,
            property1: propertyRunes[1] && game.i18n.localize(CONFIG.PF2E.armorPropertyRunes[propertyRunes[1]]),
            property2: propertyRunes[2] && game.i18n.localize(CONFIG.PF2E.armorPropertyRunes[propertyRunes[2]]),
            property3: propertyRunes[3] && game.i18n.localize(CONFIG.PF2E.armorPropertyRunes[propertyRunes[3]]),
            property4: propertyRunes[4] && game.i18n.localize(CONFIG.PF2E.armorPropertyRunes[propertyRunes[4]]),
        };
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
