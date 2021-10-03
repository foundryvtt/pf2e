import { PhysicalItemPF2e } from "../physical";
import { RuneValuationData, WEAPON_VALUATION_DATA } from "../runes";
import { LocalizePF2e } from "@module/system/localize";
import { BaseWeaponType, WeaponCategory, WeaponData, WeaponGroup, WeaponTrait } from "./data";
import { coinsToString, coinValueInCopper, combineCoins, extractPriceFromItem, toCoins } from "@item/treasure/helpers";
import { ErrorPF2e, sluggify } from "@module/utils";
import { MaterialGradeData, MATERIAL_VALUATION_DATA } from "@item/physical/materials";
import { toBulkItem } from "@item/physical/bulk";
import { IdentificationStatus, MystifiedData } from "@item/physical/data";
import { MeleePF2e } from "@item/melee";
import { MeleeSource } from "@item/data";
import { MeleeDamageRoll } from "@item/melee/data";
import { NPCPF2e } from "@actor";
import { AbilityString } from "@actor/data";
import { MAGIC_TRADITIONS } from "@item/spell/data";

export class WeaponPF2e extends PhysicalItemPF2e {
    static override get schema(): typeof WeaponData {
        return WeaponData;
    }

    override isStackableWith(item: PhysicalItemPF2e): boolean {
        const equippedButStackable = ["bomb", "dart"].includes(this.group ?? "");
        if ((this.isEquipped || item.isEquipped) && !equippedButStackable) return false;
        return super.isStackableWith(item);
    }

    get baseType(): BaseWeaponType | null {
        return this.data.data.baseItem ?? null;
    }

    get group(): WeaponGroup | null {
        return this.data.data.group.value || null;
    }

    get category(): WeaponCategory {
        return this.data.data.weaponType.value;
    }

    get ability(): AbilityString {
        return this.data.data.ability.value;
    }

    get isSpecific(): boolean {
        return this.data.data.specific?.value ?? false;
    }

    get isRanged(): boolean {
        const range = this.data.data.range.value.trim();
        return !!range && Number.isInteger(Number(range));
    }

    get isMelee(): boolean {
        return !this.isRanged || !["axe", "club", "hammer", "knife", "spear"].includes(this.group ?? "");
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        this.data.data.weaponType.value ||= "simple";
        this.data.data.potencyRune.value ||= null;
        this.data.data.strikingRune.value ||= null;
        this.data.data.propertyRune1.value ||= null;
        this.data.data.propertyRune2.value ||= null;
        this.data.data.propertyRune3.value ||= null;
        this.data.data.propertyRune4.value ||= null;

        this.processMaterialAndRunes();
    }

    processMaterialAndRunes(): void {
        const systemData = this.data.data;

        // Collect all traits from the runes and apply them to the weapon
        const runesData = this.getRunesData();
        const baseTraits = systemData.traits.value;
        const traitsFromRunes = runesData.flatMap((datum: { traits: readonly WeaponTrait[] }) => datum.traits);
        const hasTraditionTraits = MAGIC_TRADITIONS.some((trait) => baseTraits.concat(traitsFromRunes).includes(trait));
        const magicTraits: "magical"[] = traitsFromRunes.length > 0 && !hasTraditionTraits ? ["magical"] : [];
        systemData.traits.value = Array.from(new Set([...baseTraits, ...traitsFromRunes, ...magicTraits]));

        // Stop here if this weapon is not a magical or precious-material item, or if it is a specific magic weapon
        const materialData = this.getMaterialData();
        if (!(this.isMagical || materialData) || this.isSpecific) return;

        // Adjust the weapon price according to precious material and runes
        // https://2e.aonprd.com/Rules.aspx?ID=731
        const materialPrice = materialData?.price ?? 0;
        const bulk = materialPrice && Math.max(Math.ceil(toBulkItem(this.data).bulk.normal), 1);
        const materialValue = toCoins("gp", materialPrice + (bulk * materialPrice) / 10);
        const runeValue = runesData.reduce((sum, rune) => sum + rune.price, 0);
        const withRunes = extractPriceFromItem({
            data: { quantity: { value: 1 }, price: { value: `${runeValue} gp` } },
        });
        const modifiedPrice = combineCoins(withRunes, materialValue);

        const basePrice = extractPriceFromItem(this.data, 1);
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

    getRunesData(): RuneValuationData[] {
        const systemData = this.data.data;
        return [
            WEAPON_VALUATION_DATA.potency[systemData.potencyRune.value ?? 0],
            WEAPON_VALUATION_DATA.striking[systemData.strikingRune.value ?? ""],
            WEAPON_VALUATION_DATA.property[systemData.propertyRune1.value ?? ""],
            WEAPON_VALUATION_DATA.property[systemData.propertyRune2.value ?? ""],
            WEAPON_VALUATION_DATA.property[systemData.propertyRune3.value ?? ""],
            WEAPON_VALUATION_DATA.property[systemData.propertyRune4.value ?? ""],
        ].filter((datum): datum is RuneValuationData => !!datum);
    }

    getMaterialData(): MaterialGradeData | null {
        const material = this.material;
        return MATERIAL_VALUATION_DATA[material?.type ?? ""][material?.grade ?? "low"];
    }

    override getChatData(this: Embedded<WeaponPF2e>, htmlOptions: EnrichHTMLOptions = {}): Record<string, unknown> {
        const traits = this.traitChatData(CONFIG.PF2E.weaponTraits);

        return this.processChatData(htmlOptions, {
            ...super.getChatData(),
            group: this.group ? CONFIG.PF2E.weaponGroups[this.group] : null,
            traits,
        });
    }

    /** Generate a weapon name base on precious-material composition and runes */
    generateMagicName(): string {
        const sluggifiedName = sluggify(this.data._source.name);
        if (this.isSpecific || sluggifiedName !== this.baseType) return this.data.name;

        const systemData = this.data.data;
        const translations = LocalizePF2e.translations.PF2E;

        const baseWeapons = translations.Weapon.Base;
        const potencyRune = systemData.potencyRune.value;
        const strikingRune = systemData.strikingRune.value;
        const propertyRunes = {
            1: systemData.propertyRune1?.value ?? null,
            2: systemData.propertyRune2?.value ?? null,
            3: systemData.propertyRune3?.value ?? null,
            4: systemData.propertyRune4?.value ?? null,
        };
        const params = {
            base: this.baseType ? baseWeapons[this.baseType] : this.name,
            material: this.material && game.i18n.localize(CONFIG.PF2E.preciousMaterials[this.material.type]),
            potency: potencyRune,
            striking: strikingRune && game.i18n.localize(CONFIG.PF2E.weaponStrikingRunes[strikingRune]),
            property1: propertyRunes[1] && game.i18n.localize(CONFIG.PF2E.weaponPropertyRunes[propertyRunes[1]]),
            property2: propertyRunes[2] && game.i18n.localize(CONFIG.PF2E.weaponPropertyRunes[propertyRunes[2]]),
            property3: propertyRunes[3] && game.i18n.localize(CONFIG.PF2E.weaponPropertyRunes[propertyRunes[3]]),
            property4: propertyRunes[4] && game.i18n.localize(CONFIG.PF2E.weaponPropertyRunes[propertyRunes[4]]),
        };
        const formatStrings = translations.Item.Weapon.GeneratedName;
        // Construct a localization key from the weapon material and runes
        const formatString = (() => {
            const potency = params.potency && "Potency";
            const striking = params.striking && "Striking";
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
            const key = ([potency, striking, properties, material]
                .filter((keyPart): keyPart is string => !!keyPart)
                .join("") || null) as keyof typeof formatStrings | null;
            key;
            return key && formatStrings[key];
        })();

        return formatString ? game.i18n.format(formatString, params) : this.name;
    }

    override getMystifiedData(status: IdentificationStatus, { source = false } = {}): MystifiedData {
        const mystifiedData = super.getMystifiedData(status);
        if (source) mystifiedData.name = this.data._source.name;
        return mystifiedData;
    }

    override generateUnidentifiedName({ typeOnly = false }: { typeOnly?: boolean } = { typeOnly: false }): string {
        const translations = LocalizePF2e.translations.PF2E;
        const base = this.baseType ? translations.Weapon.Base[this.baseType] : null;
        const group = this.group ? CONFIG.PF2E.weaponGroups[this.group] : null;
        const fallback = "ITEM.TypeWeapon";
        const itemType = game.i18n.localize(base ?? group ?? fallback);

        if (typeOnly) return itemType;

        const formatString = LocalizePF2e.translations.PF2E.identification.UnidentifiedItem;
        return game.i18n.format(formatString, { item: itemType });
    }

    /** Generate a melee item from this weapon for use by NPCs */
    toMelee(this: Embedded<WeaponPF2e>): Embedded<MeleePF2e> {
        if (!(this.actor instanceof NPCPF2e)) throw ErrorPF2e("Melee items can only be generated for NPCs");

        const damageRoll = ((): MeleeDamageRoll => {
            const weaponDamage = this.data.data.damage;
            const modifier = ((): number => {
                const weaponAbility = this.data.data.ability.value;
                const abilityMod = this.actor.data.data.abilities[weaponAbility].mod;
                return abilityMod;
            })();
            const actorLevel = this.actor.level;
            const dice = [1, 2, 3, 4].reduce((closest, dice) =>
                Math.abs(dice - Math.round(actorLevel / 4)) < Math.abs(closest - Math.round(actorLevel / 4))
                    ? dice
                    : closest
            );
            const constant = modifier > 0 ? ` + ${modifier}` : modifier < 0 ? ` - ${-1 * modifier}` : "";
            return {
                damage: `${dice}${weaponDamage.die}${constant}`,
                damageType: weaponDamage.damageType,
            };
        })();
        const source: PreCreate<MeleeSource> = {
            name: this.name,
            type: "melee",
            data: {
                bonus: {
                    // Give an attack bonus approximating a high-threat NPC
                    value: Math.ceil((this.actor.level * 3) / 2) - 1,
                },
                damageRolls: {
                    [randomID()]: damageRoll,
                },
                weaponType: { value: this.isMelee ? "melee" : "ranged" },
            },
        };

        return new MeleePF2e(source, { parent: this.actor }) as Embedded<MeleePF2e>;
    }
}

export interface WeaponPF2e {
    readonly data: WeaponData;

    get traits(): Set<WeaponTrait>;
}
