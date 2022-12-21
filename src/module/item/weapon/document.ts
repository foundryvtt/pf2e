import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression";
import { ActorSizePF2e } from "@actor/data/size";
import { ConsumablePF2e, MeleePF2e, PhysicalItemPF2e } from "@item";
import { ItemSummaryData, MeleeSource } from "@item/data";
import { MeleeDamageRoll, NPCAttackTrait } from "@item/melee/data";
import {
    Bulk,
    CoinsPF2e,
    IdentificationStatus,
    MaterialGradeData,
    MystifiedData,
    RuneValuationData,
    WeaponPropertyRuneData,
    WEAPON_MATERIAL_VALUATION_DATA,
    WEAPON_PROPERTY_RUNES,
    WEAPON_VALUATION_DATA,
} from "@item/physical";
import { MAGIC_SCHOOLS, MAGIC_TRADITIONS } from "@item/spell/values";
import { OneToThree } from "@module/data";
import { LocalizePF2e } from "@module/system/localize";
import { ErrorPF2e, objectHasKey, setHasElement } from "@util";
import { WeaponDamage, WeaponData, WeaponMaterialData, WeaponSource } from "./data";
import {
    BaseWeaponType,
    OtherWeaponTag,
    StrikingRuneType,
    WeaponCategory,
    WeaponGroup,
    WeaponPropertyRuneType,
    WeaponRangeIncrement,
    WeaponReloadTime,
    WeaponTrait,
} from "./types";
import { CROSSBOW_WEAPONS, MANDATORY_RANGED_GROUPS, THROWN_RANGES } from "./values";

class WeaponPF2e extends PhysicalItemPF2e {
    /** Given this weapon is an alternative usage, whether it is melee or thrown */
    altUsageType: "melee" | "thrown" | null = null;

    override get isEquipped(): boolean {
        const { category, slug, traits } = this.system;
        // Make unarmed "weapons" always equipped with the exception of handwraps
        if (category === "unarmed" && slug !== "handwraps-of-mighty-blows") {
            return true;
        }

        // Allow jousting weapons to be usable when held in one hand
        return super.isEquipped || (this.handsHeld === 1 && traits.value.some((t) => /^jousting-d\d{1,2}$/.test(t)));
    }

    override isStackableWith(item: PhysicalItemPF2e): boolean {
        if (this.category === "unarmed" || !item.isOfType("weapon") || item.category === "unarmed") {
            return false;
        }

        const equippedButStackable = ["bomb", "dart"].includes(this.group ?? "");
        if ((this.isEquipped || item.isEquipped) && !equippedButStackable) return false;
        return super.isStackableWith(item);
    }

    get baseType(): BaseWeaponType | null {
        return this.system.baseItem;
    }

    get group(): WeaponGroup | null {
        return this.system.group;
    }

    get category(): WeaponCategory {
        return this.system.category;
    }

    get hands(): "0" | "1" | "1+" | "2" {
        const usageToHands = {
            worngloves: "0",
            "held-in-one-hand": "1",
            "held-in-one-plus-hands": "1+",
            "held-in-two-hands": "2",
        } as const;

        return usageToHands[this.system.usage.value] ?? "1";
    }

    /** The range increment of this weapon, or null if a melee weapon */
    get rangeIncrement(): WeaponRangeIncrement | null {
        return this.system.range;
    }

    /** The maximum range of this weapon: `null` if melee, and usually 6 * range increment if ranged */
    get maxRange(): number | null {
        return this.system.maxRange ?? (this.rangeIncrement ? this.rangeIncrement * 6 : null);
    }

    get reload(): WeaponReloadTime | null {
        return this.system.reload.value || null;
    }

    get isSpecific(): boolean {
        return this.system.specific?.value ?? false;
    }

    get isMelee(): boolean {
        return this.rangeIncrement === null;
    }

    get isRanged(): boolean {
        return this.rangeIncrement !== null;
    }

    get isThrown(): boolean {
        return this.isRanged && this.reload === "-";
    }

    /** This weapon's damage before modification by creature abilities, effects, etc. */
    get baseDamage(): WeaponDamage {
        return this.system.damage;
    }

    /** Does this weapon deal damage? */
    get dealsDamage(): boolean {
        const { baseDamage } = this;
        return baseDamage.dice > 0 || baseDamage.modifier > 0;
    }

    override get material(): WeaponMaterialData {
        return this.system.material;
    }

    /** Does this weapon require ammunition in order to make a strike? */
    get requiresAmmo(): boolean {
        return this.isRanged && ![null, "-"].includes(this.reload);
    }

    get ammo(): Embedded<ConsumablePF2e> | null {
        const ammo = this.actor?.items.get(this.system.selectedAmmoId ?? "");
        return ammo instanceof ConsumablePF2e && ammo.quantity > 0 ? ammo : null;
    }

    get otherTags(): Set<OtherWeaponTag> {
        return new Set(this.system.traits.otherTags);
    }

    /** Generate a list of strings for use in predication */
    override getRollOptions(prefix = "weapon"): string[] {
        const delimitedPrefix = prefix ? `${prefix}:` : "";
        const damage = {
            type: this.system.damage.damageType,
            dieFaces: Number(this.system.damage.die?.replace(/^d/, "")),
        };
        const { actor } = this;
        const actorSize = actor?.system.traits.size;
        const oversized = this.category !== "unarmed" && !!actorSize?.isSmallerThan(this.size, { smallIsMedium: true });
        const isDeityFavored = !!(
            this.baseType &&
            actor?.isOfType("character") &&
            actor.deity?.favoredWeapons.includes(this.baseType)
        );
        const thrownMelee = this.isThrown && this.altUsageType === "thrown";
        // Some base weapons qualify as others for all rules purposes (e.g., a composite longbow is a longbow)
        const baseTypeRollOptions = ((): Record<string, boolean> => {
            const equivalentBases: Record<string, string | undefined> = CONFIG.PF2E.equivalentWeapons;
            const baseTypes = [this.baseType ?? [], equivalentBases[this.baseType ?? ""] ?? []].flat();
            return baseTypes.reduce((types, t) => ({ ...types, [`base:${t}`]: true }), {} as Record<string, boolean>);
        })();

        return [
            super.getRollOptions(prefix),
            Object.entries({
                [`category:${this.category}`]: true,
                [`group:${this.group}`]: !!this.group,
                ...baseTypeRollOptions,
                [`base:${this.baseType}`]: !!this.baseType,
                [`hands-held:${this.handsHeld}`]: this.isEquipped && this.handsHeld > 0,
                [`usage:hands:${this.hands}`]: this.hands !== "0",
                [`range-increment:${this.rangeIncrement}`]: !!this.rangeIncrement,
                [`reload:${this.reload}`]: !!this.reload,
                [`damage:type:${damage.type}`]: true,
                [`damage:die:faces:${damage.dieFaces}`]: true,
                [`damage-dice:${this.system.damage.dice}`]: true,
                "deity-favored": isDeityFavored,
                oversized,
                melee: this.isMelee,
                ranged: this.isRanged,
                thrown: this.isThrown,
                "thrown-melee": thrownMelee,
            })
                .filter(([_key, isTrue]) => isTrue)
                .map(([key]) => `${delimitedPrefix}${key}`),
        ]
            .flat()
            .sort();
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        const systemData = this.system;
        systemData.category ||= "simple";
        systemData.group ||= null;
        systemData.baseItem ||= null;
        systemData.bonusDamage.value ||= 0;
        systemData.splashDamage.value ||= 0;
        systemData.potencyRune.value ||= null;
        systemData.strikingRune.value ||= null;
        systemData.propertyRune1.value ||= null;
        systemData.propertyRune2.value ||= null;
        systemData.propertyRune3.value ||= null;
        systemData.propertyRune4.value ||= null;
        systemData.reload.value ||= null;
        systemData.selectedAmmoId ||= null;
        systemData.damage.die ||= null;
        systemData.damage.modifier ??= 0;
        // Alchemical bombs fake a constant damage value by having a `die` (number of faces) of "" and a `dice`
        // (number of dice) of 1, yielding "" + "1" ("1") in the roll formula. An arrest warrant has been issued.
        if (!systemData.damage.die && systemData.damage.dice > 0) {
            systemData.damage.modifier ||= systemData.damage.dice;
            systemData.damage.dice = 0;
        }

        const preciousMaterial =
            systemData.preciousMaterial.value && systemData.preciousMaterialGrade.value
                ? { type: systemData.preciousMaterial.value, grade: systemData.preciousMaterialGrade.value }
                : null;

        systemData.material = {
            base: [{ type: "steel", thickness: "thin" }], // Stand-in until this data is utilized
            precious: preciousMaterial,
        };

        ABP.cleanupRunes(this);

        const traitsArray = systemData.traits.value;
        // Thrown weapons always have a reload of "-"
        if (systemData.baseItem === "alchemical-bomb" || traitsArray.some((t) => /^thrown(?:-\d+)?$/.test(t))) {
            this.system.reload.value = "-";
        }

        // Force a weapon to be ranged if it is among a set of certain groups or has a thrown trait
        const traitSet = this.traits;
        const mandatoryRanged = setHasElement(MANDATORY_RANGED_GROUPS, systemData.group) || traitSet.has("thrown");
        if (mandatoryRanged) {
            this.system.range ??= 10;

            if (traitSet.has("combination")) this.system.group = "firearm";

            // Categorize this weapon as a crossbow if it is among an enumerated set of base weapons
            const { otherTags } = systemData.traits;
            const isCrossbow = this.group === "bow" && setHasElement(CROSSBOW_WEAPONS, this.baseType);
            if (isCrossbow && !otherTags.includes("crossbow")) {
                systemData.traits.otherTags.push("crossbow");
            }
        }

        // Force a weapon to be melee if it isn't "mandatory ranged" and has a thrown-N trait
        const mandatoryMelee = !mandatoryRanged && traitsArray.some((t) => /^thrown-\d+$/.test(t));
        if (mandatoryMelee) this.system.range = null;

        // Set whether the ammunition or weapon itself should be consumed
        systemData.reload.consume = this.isMelee ? null : this.reload !== null;

        // If the `comboMeleeUsage` flag is true, then this is a combination weapon in its melee form
        this.flags.pf2e.comboMeleeUsage ??= false;
        // Ensure presence of traits array on melee usage if not have been added yet
        if (this.system.meleeUsage) this.system.meleeUsage.traits ??= [];

        this.processMaterialAndRunes();
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();

        const systemData = this.system;
        const { potencyRune, strikingRune, propertyRune1, propertyRune2, propertyRune3, propertyRune4 } = systemData;

        const strikingDice: Map<StrikingRuneType | null, OneToThree> = new Map([
            ["striking", 1],
            ["greaterStriking", 2],
            ["majorStriking", 3],
        ]);

        this.system.runes = {
            potency: potencyRune.value ?? 0,
            striking: strikingDice.get(strikingRune.value) ?? 0,
            property: [propertyRune1.value, propertyRune2.value, propertyRune3.value, propertyRune4.value].filter(
                (rune): rune is WeaponPropertyRuneType => !!rune
            ),
            effects: [],
        };

        // Set damage dice according to striking rune
        const pcLevel = this.actor?.isOfType("character") ? this.actor.level : 0;
        this.system.damage.dice =
            this._source.system.damage.dice +
            (ABP.isEnabled ? ABP.getStrikingDice(pcLevel) : this.system.runes.striking);
    }

    processMaterialAndRunes(): void {
        const systemData = this.system;

        // Collect all traits from the runes and apply them to the weapon
        const runesData = this.getRunesData();
        const baseTraits = systemData.traits.value;
        const hasRunes = (() => {
            const hasFundamentalRunes = !!this.system.potencyRune.value || !!this.system.strikingRune.value;
            const hasPropertyRunes = ([1, 2, 3, 4] as const)
                .map((n) => this.system[`propertyRune${n}` as const])
                .some((r) => !!r.value);
            const abpSetting = game.settings.get("pf2e", "automaticBonusVariant");
            return hasFundamentalRunes || (hasPropertyRunes && abpSetting === "ABPFundamentalPotency");
        })();
        const magicTraits: ("evocation" | "magical")[] = hasRunes ? ["evocation", "magical"] : [];
        systemData.traits.value = Array.from(new Set([...baseTraits, ...magicTraits]));

        // Set tags from runes
        systemData.traits.otherTags.push(...runesData.flatMap((runeData) => runeData.otherTags ?? []));

        // Stop here if this weapon is not a magical or precious-material item, or if it is a specific magic weapon
        const materialData = this.getMaterialData();
        if (!(this.isMagical || materialData) || this.isSpecific) return;

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
        systemData.traits.rarity = runesData
            .map((runeData) => runeData.rarity)
            .concat(materialData?.rarity ?? "common")
            .reduce((highest, rarity) => (rarityOrder[rarity] > rarityOrder[highest] ? rarity : highest), baseRarity);

        // Set the name according to the precious material and runes
        this.name = this.generateMagicName();
    }

    override computeAdjustedPrice(): CoinsPF2e | null {
        const materialData = this.getMaterialData();
        if (!(this.isMagical || materialData) || this.isSpecific) return null;

        // Adjust the weapon price according to precious material and runes
        // Base Prices are not included in these cases
        // https://2e.aonprd.com/Rules.aspx?ID=731
        // https://2e.aonprd.com/Equipment.aspx?ID=380
        const runesData = this.getRunesData();
        const materialPrice = materialData?.price ?? 0;
        const heldOrStowedBulk = new Bulk({ light: this.system.bulk.heldOrStowed });
        const bulk = Math.max(Math.ceil(heldOrStowedBulk.normal), 1);
        const materialValue = materialPrice + (bulk * materialPrice) / 10;
        const runeValue = runesData.reduce((sum, rune) => sum + rune.price, 0);
        const modifiedPrice = new CoinsPF2e({ gp: runeValue + materialValue });
        return modifiedPrice;
    }

    getRunesData(): RuneValuationData[] {
        const systemData = this.system;
        const propertyRuneData: Record<string, WeaponPropertyRuneData | undefined> = CONFIG.PF2E.runes.weapon.property;
        return [
            WEAPON_VALUATION_DATA.potency[systemData.potencyRune.value ?? 0],
            WEAPON_VALUATION_DATA.striking[systemData.strikingRune.value ?? ""],
            propertyRuneData[systemData.propertyRune1.value ?? ""],
            propertyRuneData[systemData.propertyRune2.value ?? ""],
            propertyRuneData[systemData.propertyRune3.value ?? ""],
            propertyRuneData[systemData.propertyRune4.value ?? ""],
        ].filter((datum): datum is RuneValuationData => !!datum);
    }

    getMaterialData(): MaterialGradeData | null {
        const material = this.material;
        const materialData = WEAPON_MATERIAL_VALUATION_DATA[material.precious?.type ?? ""];
        return materialData?.[material.precious?.grade ?? "low"] ?? null;
    }

    override async getChatData(
        this: Embedded<WeaponPF2e>,
        htmlOptions: EnrichHTMLOptions = {}
    ): Promise<ItemSummaryData> {
        const traits = this.traitChatData(CONFIG.PF2E.weaponTraits);
        const chatData = await super.getChatData();
        return this.processChatData(htmlOptions, {
            ...chatData,
            traits,
            properties: [
                CONFIG.PF2E.weaponCategories[this.category],
                this.rangeIncrement ? `PF2E.TraitRangeIncrement${this.rangeIncrement}` : null,
            ],
        });
    }

    /** Generate a weapon name base on precious-material composition and runes */
    generateMagicName(): string {
        const translations = LocalizePF2e.translations.PF2E;
        const baseWeapons = translations.Weapon.Base;

        const storedName = this._source.name;
        if (this.isSpecific || !this.baseType || storedName !== baseWeapons[this.baseType]) return this.name;

        const systemData = this.system;

        const potencyRune = systemData.potencyRune.value;
        const strikingRune = systemData.strikingRune.value;
        const propertyRunes = {
            1: systemData.propertyRune1?.value ?? null,
            2: systemData.propertyRune2?.value ?? null,
            3: systemData.propertyRune3?.value ?? null,
            4: systemData.propertyRune4?.value ?? null,
        };
        const { material } = this;
        const params = {
            base: this.baseType ? baseWeapons[this.baseType] : this.name,
            material: material.precious && game.i18n.localize(CONFIG.PF2E.preciousMaterials[material.precious.type]),
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
            return key && formatStrings[key];
        })();

        return formatString ? game.i18n.format(formatString, params) : this.name;
    }

    override getMystifiedData(status: IdentificationStatus, { source = false } = {}): MystifiedData {
        const mystifiedData = super.getMystifiedData(status);
        if (source) mystifiedData.name = this._source.name;
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

    /**
     * Get the "alternative usages" of a weapon: melee (in the case of combination weapons) and thrown (in the case
     * of thrown melee weapons)
     * @param [options.recurse=true] Whether to get the alternative usages of alternative usages
     */
    getAltUsages(options?: { recurse?: boolean }): this[];
    getAltUsages({ recurse = true } = {}): WeaponPF2e[] {
        const meleeUsage = this.toMeleeUsage();

        return [
            this.toThrownUsage() ?? [],
            meleeUsage ?? [],
            // Some combination weapons have a melee usage that is throwable
            recurse ? meleeUsage?.toThrownUsage() ?? [] : [],
        ].flat();
    }

    override clone<T extends this>(
        data: DocumentUpdateData<this> | undefined,
        options: Omit<WeaponCloneOptions, "save"> & { save: true }
    ): Promise<T>;
    override clone<T extends this>(
        data?: DocumentUpdateData<this>,
        options?: Omit<WeaponCloneOptions, "save"> & { save?: false }
    ): T;
    override clone<T extends this>(data?: DocumentUpdateData<this>, options?: WeaponCloneOptions): T | Promise<T>;
    override clone(data?: DocumentUpdateData<this>, options?: WeaponCloneOptions): this | Promise<this> {
        const clone = super.clone(data, options);
        if (options?.altUsage && clone instanceof WeaponPF2e) {
            clone.altUsageType = options.altUsage;
        }

        return clone;
    }

    /** Generate a clone of this thrown melee weapon with its thrown usage overlain, or `null` if not applicable */
    private toThrownUsage(): this | null {
        const traits = this._source.system.traits.value;
        const thrownTrait = traits.find((t) => /^thrown-\d{1,3}$/.test(t));
        if (this.isRanged || !thrownTrait) return null;

        const range = Number(/(\d{1,3})$/.exec(thrownTrait)!.at(1)) as WeaponRangeIncrement;
        const newTraits = deepClone(traits);
        newTraits.splice(newTraits.indexOf(thrownTrait), 1, "thrown");
        const overlay: DeepPartial<WeaponSource> = {
            system: {
                range,
                traits: { value: newTraits },
            },
        };

        return this.clone(overlay, { keepId: true, altUsage: "thrown" });
    }

    /** Generate a clone of this combination weapon with its melee usage overlain, or `null` if not applicable */
    private toMeleeUsage(): this | null {
        const { meleeUsage } = this.system;
        if (!meleeUsage || this.flags.pf2e.comboMeleeUsage) return null;

        const overlay: DeepPartial<WeaponSource> = {
            system: {
                damage: { damageType: meleeUsage.damage.type, dice: 1, die: meleeUsage.damage.die },
                group: meleeUsage.group,
                range: null,
                reload: { value: null },
                traits: { value: meleeUsage.traits.concat("combination") },
                selectedAmmoId: null,
            },
            flags: {
                pf2e: {
                    comboMeleeUsage: true,
                },
            },
        };
        return this.clone(overlay, { keepId: true, altUsage: "melee" });
    }

    /** Generate a melee item from this weapon for use by NPCs */
    toNPCAttacks(this: Embedded<WeaponPF2e>): Embedded<MeleePF2e>[] {
        const { actor } = this;
        if (!actor.isOfType("npc")) throw ErrorPF2e("Melee items can only be generated for NPCs");

        const baseDamage = ((): MeleeDamageRoll => {
            const weaponDamage = this.baseDamage;
            const ability = this.rangeIncrement && !this.isThrown ? "dex" : "str";
            const actorLevel = actor.system.details.level.base;
            const dice = [1, 2, 3, 4].reduce((closest, dice) =>
                Math.abs(dice - Math.round((actorLevel + 2) / 4)) < Math.abs(closest - Math.round((actorLevel + 2) / 4))
                    ? dice
                    : closest
            );

            // Approximate weapon specialization
            const constant = ((): string => {
                const fromAbility = actor.abilities[ability].mod;
                const totalModifier = fromAbility + (actor.level > 1 ? dice : 0);
                const sign = totalModifier < 0 ? "-" : "+";
                return totalModifier === 0 ? "" : [sign, Math.abs(totalModifier)].join("");
            })();

            return {
                damage: weaponDamage.die ? `${dice}${weaponDamage.die}${constant}` : dice.toString(),
                damageType: weaponDamage.damageType,
            };
        })();
        const fromPropertyRunes = this.system.runes.property
            .flatMap((r) => WEAPON_PROPERTY_RUNES[r].damage?.dice ?? [])
            .map(
                (d): MeleeDamageRoll => ({
                    damage: `${d.diceNumber}${d.dieSize}`,
                    damageType: d.damageType ?? baseDamage.damageType,
                })
            );

        const npcReach = {
            tiny: null,
            sm: "reach-10",
            med: "reach-10",
            lg: "reach-15",
            huge: "reach-20",
            grg: "reach-25",
        } as const;

        const toAttackTraits = (traits: WeaponTrait[]): NPCAttackTrait[] => {
            const newTraits: NPCAttackTrait[] = traits
                .flatMap((t) =>
                    t === "reach"
                        ? npcReach[this.size] ?? []
                        : t === "thrown" && setHasElement(THROWN_RANGES, this.rangeIncrement)
                        ? (`thrown-${this.rangeIncrement}` as const)
                        : t
                )
                .filter(
                    // Omitted traits include ...
                    (t) =>
                        // Creature traits
                        !(t in CONFIG.PF2E.creatureTraits) &&
                        // Magic school and tradition traits
                        !setHasElement(MAGIC_TRADITIONS, t) &&
                        !setHasElement(MAGIC_SCHOOLS, t) &&
                        // Thrown(-N) trait on melee attacks with thrown melee weapons
                        !(t.startsWith("thrown") && !this.isThrown) &&
                        // Finesse trait on thrown attacks with thrown melee weapons
                        !(t === "finesse" && this.isRanged) &&
                        // Brutal trait on melee attacks
                        !(t === "brutal" && this.isMelee) &&
                        // Combination trait on melee or thrown attacks with combination weapons
                        !(t === "combination" && (this.isMelee || this.isThrown)) &&
                        // Critical fusion trait on thrown attacks with melee usage of combination weapons
                        !(t === "critical-fusion" && this.isThrown)
                );
            if (this.isRanged && !this.isThrown) {
                newTraits.push(`range-increment-${this.rangeIncrement!}`);
            }

            const actorSize = new ActorSizePF2e({ value: actor.size });
            if (actorSize.isLargerThan("med") && !newTraits.some((t) => t.startsWith("reach"))) {
                actorSize.decrement();
                newTraits.push(...[npcReach[actorSize.value] ?? []].flat());
            }

            const reloadTrait = `reload-${this.reload}`;
            if (objectHasKey(CONFIG.PF2E.npcAttackTraits, reloadTrait)) {
                newTraits.push(reloadTrait);
            }

            return newTraits.sort();
        };

        const source: PreCreate<MeleeSource> = {
            name: this._source.name,
            type: "melee",
            system: {
                weaponType: { value: this.isMelee ? "melee" : "ranged" },
                bonus: {
                    // Give an attack bonus approximating a high-threat NPC
                    value: Math.round(1.5 * this.actor.level + 7),
                },
                damageRolls: [baseDamage, fromPropertyRunes]
                    .flat()
                    .reduce(
                        (rolls: Record<string, MeleeDamageRoll>, roll) => mergeObject(rolls, { [randomID()]: roll }),
                        {}
                    ),
                traits: {
                    value: toAttackTraits(this.system.traits.value),
                },
                rules: deepClone(this._source.system.rules),
            },
            flags: { pf2e: { linkedWeapon: this.id } },
        };

        return [
            new MeleePF2e(source, { parent: this.actor }) as Embedded<MeleePF2e>,
            ...this.getAltUsages({ recurse: false }).flatMap((u) => u.toNPCAttacks()),
        ];
    }
}

interface WeaponPF2e {
    readonly data: WeaponData;

    get traits(): Set<WeaponTrait>;
}

interface WeaponCloneOptions {
    save?: boolean;
    keepId?: boolean;
    /** If this clone is an alternative usage, the type */
    altUsage?: "melee" | "thrown";
}

export { WeaponPF2e };
