import { MAGIC_TRADITIONS } from "@item/spell/data";
import { LocalizePF2e } from "@module/system/localize";
import { addSign } from "@util";
import { PhysicalItemPF2e } from "../physical";
import { getResiliencyBonus } from "../runes";
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

        // Add traits from potency rune
        const baseTraits = this.data.data.traits.value;
        const fromRunes: ("invested" | "abjuration")[] = this.data.data.potencyRune.value
            ? ["invested", "abjuration"]
            : [];
        const hasTraditionTraits = MAGIC_TRADITIONS.some((trait) => baseTraits.includes(trait));
        const magicTraits: "magical"[] = fromRunes.length > 0 && !hasTraditionTraits ? ["magical"] : [];
        this.data.data.traits.value = Array.from(new Set([...baseTraits, ...fromRunes, ...magicTraits]));
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        const systemData = this.data.data;
        const { potencyRune, resiliencyRune, propertyRune1, propertyRune2, propertyRune3, propertyRune4 } = systemData;
        this.data.data.runes = {
            potency: potencyRune.value ?? 0,
            resilient: getResiliencyBonus({ resiliencyRune }),
            property: [propertyRune1.value, propertyRune2.value, propertyRune3.value, propertyRune4.value].filter(
                (rune): rune is string => !!rune
            ),
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
        const translations = LocalizePF2e.translations.PF2E;
        const properties = [
            this.isArmor ? CONFIG.PF2E.armorTypes[this.category] : CONFIG.PF2E.weaponCategories.martial,
            `${addSign(this.acBonus)} ${translations.ArmorArmorLabel}`,
            this.isArmor ? `${data.dex.value || 0} ${translations.ArmorDexLabel}` : null,
            this.isArmor ? `${data.check.value || 0} ${translations.ArmorCheckLabel}` : null,
            this.speedPenalty ? `${data.speed.value || 0} ${translations.ArmorSpeedLabel}` : null,
        ];

        return this.processChatData(htmlOptions, {
            ...super.getChatData(),
            traits: this.traitChatData(CONFIG.PF2E.armorTraits),
            properties,
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
