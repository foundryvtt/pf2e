import { PhysicalItemPF2e } from "../physical";
import { getStrikingDice, RuneValuationData, WEAPON_VALUATION_DATA } from "../runes";
import { LocalizePF2e } from "@module/system/localize";
import {
    BaseWeaponType,
    CROSSBOW_WEAPONS,
    RANGED_WEAPON_GROUPS,
    WeaponCategory,
    WeaponData,
    WeaponGroup,
    WeaponPropertyRuneType,
    WeaponRange,
    WeaponSource,
    WeaponTrait,
} from "./data";
import { coinsToString, coinValueInCopper, combineCoins, extractPriceFromItem, toCoins } from "@item/treasure/helpers";
import { ErrorPF2e, sluggify } from "@util";
import { MaterialGradeData, MATERIAL_VALUATION_DATA } from "@item/physical/materials";
import { toBulkItem } from "@item/physical/bulk";
import { IdentificationStatus, MystifiedData } from "@item/physical/data";
import { MeleePF2e } from "@item/melee";
import { MeleeSource } from "@item/data";
import { MeleeDamageRoll } from "@item/melee/data";
import { NPCPF2e } from "@actor";
import { MAGIC_TRADITIONS } from "@item/spell/data";
import { ConsumablePF2e } from "@item";

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
        return this.data.data.baseItem;
    }

    get group(): WeaponGroup | null {
        return this.data.data.group;
    }

    get category(): WeaponCategory {
        return this.data.data.category;
    }

    get hands(): "0" | "1" | "1+" | "2" {
        const usageToHands = {
            "worn-gloves": "0",
            "held-in-one-hand": "1",
            "held-in-one-plus-hands": "1+",
            "held-in-two-hands": "2",
        } as const;
        return usageToHands[this.data.data.usage.value] ?? "1";
    }

    /** The range of this weapon, or null if a melee weapon */
    get range(): WeaponRange | null {
        return this.data.data.range;
    }

    get isSpecific(): boolean {
        return this.data.data.specific?.value ?? false;
    }

    get isMelee(): boolean {
        return this.range === null;
    }

    get isRanged(): boolean {
        return this.range !== null;
    }

    get ammo(): ConsumablePF2e | null {
        const ammo = this.actor?.items.get(this.data.data.selectedAmmoId ?? "");
        return ammo instanceof ConsumablePF2e ? ammo : null;
    }

    /** Generate a list of strings for use in predication */
    override getItemRollOptions(prefix = "weapon"): string[] {
        return super.getItemRollOptions(prefix).concat(
            Object.entries({
                [`category:${this.category}`]: true,
                [`group:${this.group}`]: !!this.group,
                [`base:${this.baseType}`]: !!this.baseType,
                [`hands:${this.hands}`]: this.hands !== "0",
                [`material:${this.material?.type}`]: !!this.material?.type,
                melee: this.isMelee,
                ranged: this.isRanged,
                magical: this.isMagical,
            })
                .filter(([_key, isTrue]) => isTrue)
                .map(([key]) => {
                    const separatedPrefix = prefix ? `${prefix}:` : "";
                    return `${separatedPrefix}${key}`;
                }),
            ...this.data.data.traits.otherTags.map((tag) => `${prefix}tag:${tag}`)
        );
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        this.data.data.category ||= "simple";
        this.data.data.group ||= null;
        this.data.data.baseItem ||= null;
        this.data.data.potencyRune.value ||= null;
        this.data.data.strikingRune.value ||= null;
        this.data.data.propertyRune1.value ||= null;
        this.data.data.propertyRune2.value ||= null;
        this.data.data.propertyRune3.value ||= null;
        this.data.data.propertyRune4.value ||= null;
        this.data.data.traits.otherTags = [];

        // Force a weapon to be ranged if it is one of a certain set of groups or has the "unqualified" thrown trait
        const traitSet = this.traits;
        const rangedWeaponGroups: readonly string[] = RANGED_WEAPON_GROUPS;
        const mandatoryRanged = rangedWeaponGroups.includes(this.group ?? "") || traitSet.has("thrown");
        if (mandatoryRanged) {
            this.data.data.range ??= 10;
            if (traitSet.has("thrown")) this.data.data.reload.value = "-";
            if (traitSet.has("combination")) this.data.data.group = "firearm";

            // Categorize this weapon as a crossbow if it is among an enumerated set of base weapons
            const crossbowWeapons: Set<string> = CROSSBOW_WEAPONS;
            if (this.group === "bow" && crossbowWeapons.has(this.baseType ?? "")) {
                this.data.data.traits.otherTags.push("crossbow");
            }
        }

        // Force a weapon to be melee if it has a thrown-N trait
        const mandatoryMelee = this.data.data.traits.value.some((trait) => /^thrown-\d+$/.test(trait));
        if (mandatoryMelee) this.data.data.range = null;

        // If the `comboMeleeUsage` flag is true, then this is a combination weapon in its melee form
        this.data.flags.pf2e.comboMeleeUsage ??= false;
        // Ensure presence of traits array on melee usage if not have been added yet
        if (this.data.data.meleeUsage) this.data.data.meleeUsage.traits ??= [];

        this.processMaterialAndRunes();
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        const systemData = this.data.data;
        const { potencyRune, strikingRune, propertyRune1, propertyRune2, propertyRune3, propertyRune4 } = systemData;
        this.data.data.runes = {
            potency: potencyRune.value ?? 0,
            striking: getStrikingDice({ strikingRune }),
            property: [propertyRune1.value, propertyRune2.value, propertyRune3.value, propertyRune4.value].filter(
                (rune): rune is WeaponPropertyRuneType => !!rune
            ),
        };
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

        // Set tags from runes
        systemData.traits.otherTags.push(...runesData.flatMap((runeData) => runeData.otherTags ?? []));

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
            CONFIG.PF2E.runes.weapon.property[systemData.propertyRune1.value ?? ""],
            CONFIG.PF2E.runes.weapon.property[systemData.propertyRune2.value ?? ""],
            CONFIG.PF2E.runes.weapon.property[systemData.propertyRune3.value ?? ""],
            CONFIG.PF2E.runes.weapon.property[systemData.propertyRune4.value ?? ""],
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
            traits,
            properties: [
                CONFIG.PF2E.weaponCategories[this.category],
                this.range ? `PF2E.TraitRangeIncrement${this.range}` : null,
            ],
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

    /** Generate a clone of this combination weapon with its melee usage overlain, or `null` if not applicable */
    toMeleeUsage(this: Embedded<WeaponPF2e>): Embedded<WeaponPF2e> | null;
    toMeleeUsage(this: WeaponPF2e): WeaponPF2e | null;
    toMeleeUsage(): Embedded<WeaponPF2e> | WeaponPF2e | null {
        const { meleeUsage } = this.data.data;
        if (!meleeUsage || this.data.flags.pf2e.comboMeleeUsage) return null;

        const overlay: DeepPartial<WeaponSource> = {
            data: {
                damage: { damageType: meleeUsage.damage.type, dice: 1, die: meleeUsage.damage.die },
                group: meleeUsage.group,
                range: null,
                traits: { value: meleeUsage.traits.concat("combination") },
            },
            flags: {
                pf2e: {
                    comboMeleeUsage: true,
                },
            },
        };
        return this.clone(overlay) as Embedded<WeaponPF2e>;
    }

    /** Generate a melee item from this weapon for use by NPCs */
    toNPCAttack(this: Embedded<WeaponPF2e>): Embedded<MeleePF2e> {
        if (!(this.actor instanceof NPCPF2e)) throw ErrorPF2e("Melee items can only be generated for NPCs");

        const damageRoll = ((): MeleeDamageRoll => {
            const weaponDamage = this.data.data.damage;
            const ability = this.range ? "dex" : "str";
            const modifier = this.actor.data.data.abilities[ability].mod;
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
