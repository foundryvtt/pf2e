import { ActorPF2e } from "@actor";
import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression.ts";
import { SIZE_TO_REACH } from "@actor/creature/values.ts";
import { AttributeString } from "@actor/types.ts";
import { ATTRIBUTE_ABBREVIATIONS } from "@actor/values.ts";
import { ConsumablePF2e, MeleePF2e, PhysicalItemPF2e } from "@item";
import { createActionRangeLabel } from "@item/ability/helpers.ts";
import { ItemSummaryData, MeleeSource } from "@item/base/data/index.ts";
import { NPCAttackDamage, NPCAttackTrait } from "@item/melee/data.ts";
import {
    IdentificationStatus,
    MystifiedData,
    RUNE_DATA,
    getPropertySlots,
    prunePropertyRunes,
} from "@item/physical/index.ts";
import { MAGIC_SCHOOLS, MAGIC_TRADITIONS } from "@item/spell/values.ts";
import { RangeData } from "@item/types.ts";
import { OneToThree } from "@module/data.ts";
import { UserPF2e } from "@module/user/index.ts";
import { DamageCategorization } from "@system/damage/helpers.ts";
import { ErrorPF2e, objectHasKey, setHasElement, sluggify, tupleHasValue } from "@util";
import * as R from "remeda";
import type { WeaponDamage, WeaponFlags, WeaponSource, WeaponSystemData } from "./data.ts";
import { WeaponTraitToggles } from "./helpers.ts";
import type {
    BaseWeaponType,
    OtherWeaponTag,
    StrikingRuneType,
    WeaponCategory,
    WeaponGroup,
    WeaponRangeIncrement,
    WeaponReloadTime,
    WeaponTrait,
} from "./types.ts";
import { CROSSBOW_WEAPONS, MANDATORY_RANGED_GROUPS, THROWN_RANGES } from "./values.ts";

class WeaponPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
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

    override isStackableWith(item: PhysicalItemPF2e<TParent>): boolean {
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

    /** The default attribute used in attack rolls */
    get defaultAttribute(): AttributeString {
        return this.system.attribute ?? (this.isRanged ? "dex" : "str");
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

    /** The maximum range of this weapon: `null` if melee, and usually 6 * range increment if ranged */
    get maxRange(): number | null {
        return this.system.maxRange ?? (this.system.range ? this.system.range * 6 : null);
    }

    /** A single object containing range increment and maximum */
    get range(): RangeData | null {
        const rangeIncrement = this.system.range;
        const maxRange = this.system.maxRange; // A specified maximum in place of a range increment

        return maxRange
            ? { increment: null, max: maxRange }
            : rangeIncrement
            ? { increment: rangeIncrement, max: rangeIncrement * 6 }
            : null;
    }

    get reload(): WeaponReloadTime | null {
        return this.system.reload.value || null;
    }

    override get isSpecific(): boolean {
        return this.system.specific?.value ?? false;
    }

    get isMelee(): boolean {
        return !this.isRanged;
    }

    get isRanged(): boolean {
        return !!this.system.range;
    }

    /** Whether the weapon in its current usage is thrown: a thrown-only weapon or a thrown usage of a melee weapon */
    get isThrown(): boolean {
        return this.isRanged && (this.baseType === "alchemical-bomb" || this.system.traits.value.includes("thrown"));
    }

    /** Whether the weapon is _can be_ thrown: a thrown-only weapon or one that has a throwable usage */
    get isThrowable(): boolean {
        return (
            this.isThrown ||
            this.system.traits.value.some((t) => t.startsWith("thrown")) ||
            !!this.system.meleeUsage?.traits.some((t) => t.startsWith("thrown"))
        );
    }

    get isOversized(): boolean {
        return (
            this.category !== "unarmed" &&
            !!this.parent?.system.traits?.size.isSmallerThan(this.size, { smallIsMedium: true })
        );
    }

    /** This weapon's damage before modification by creature abilities, effects, etc. */
    get baseDamage(): WeaponDamage {
        return {
            ...deepClone(this.system.damage),
            // Damage types from trait toggles are not applied as data mutations so as to delay it for rule elements to
            // add options
            damageType:
                this.system.traits.toggles.versatile.selection ??
                this.system.traits.toggles.modular.selection ??
                this.system.damage.damageType,
        };
    }

    /** Does this weapon deal damage? */
    get dealsDamage(): boolean {
        const { baseDamage } = this;
        return (
            baseDamage.dice > 0 ||
            baseDamage.modifier > 0 ||
            this.system.splashDamage.value > 0 ||
            !!baseDamage.persistent?.number
        );
    }

    /** Does this weapon require ammunition in order to make a strike? */
    get requiresAmmo(): boolean {
        return this.isRanged && !this.isThrown && ![null, "-"].includes(this.reload);
    }

    get ammo(): ConsumablePF2e<ActorPF2e> | WeaponPF2e<ActorPF2e> | null {
        const ammo = this.actor?.items.get(this.system.selectedAmmoId ?? "");
        return ammo?.isOfType("consumable", "weapon") && ammo.quantity > 0 ? ammo : null;
    }

    get otherTags(): Set<OtherWeaponTag> {
        return new Set(this.system.traits.otherTags);
    }

    /** Whether this weapon can serve as ammunition for another weapon */
    isAmmoFor(weapon: WeaponPF2e): boolean {
        return this.system.usage.canBeAmmo && !weapon.system.traits.value.includes("repeating");
    }

    /** Generate a list of strings for use in predication */
    override getRollOptions(prefix = this.type): string[] {
        const { baseDamage } = this;
        const damage = {
            category: DamageCategorization.fromDamageType(baseDamage.damageType),
            type: baseDamage.damageType,
            dice: {
                number: baseDamage.die ? baseDamage.dice : 0,
                faces: Number(baseDamage.die?.replace(/^d/, "")),
            },
        };
        const { actor } = this;
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
        const { persistent } = this.system.damage;
        const propertyRunes = R.mapToObj(this.system.runes.property, (p) => [`rune:property:${sluggify(p)}`, true]);

        // Ammunition
        const ammunitionRollOptions = ((ammunition: ConsumablePF2e | WeaponPF2e | null) => {
            const rollOptions: Record<string, boolean> = {};
            if (ammunition) {
                rollOptions[`ammo:id:${ammunition.id}`] = true;
                rollOptions[`ammo:slug:${ammunition.slug}`] = true;
                rollOptions[`ammo:level:${ammunition.level}`] = true;
                rollOptions[`ammo:material:type:${ammunition.material.type}`] = !!ammunition.material.type;
                rollOptions[`ammo:material:grade:${ammunition.material.grade}`] = !!ammunition.material.grade;
                for (const trait of ammunition.traits) {
                    rollOptions[`ammo:trait:${trait}`] = true;
                }
            }
            return rollOptions;
        })(this.ammo);

        // Get the bulk of a single unit of this weapon
        const bulk = ((): string => {
            const unitBulk = this.bulk.times(1 / this.quantity);
            return unitBulk.isNegligible ? "negligible" : unitBulk.isLight ? "light" : unitBulk.toString();
        })();
        const rangeIncrement = this.range?.increment;

        return [
            super.getRollOptions(prefix),
            Object.entries({
                [`category:${this.category}`]: true,
                [`group:${this.group}`]: !!this.group,
                ...baseTypeRollOptions,
                [`base:${this.baseType}`]: !!this.baseType,
                [`bulk:${bulk}`]: true,
                [`hands-held:${this.handsHeld}`]: this.isEquipped && this.handsHeld > 0,
                [`usage:hands:${this.hands}`]: this.hands !== "0",
                [`range-increment:${rangeIncrement}`]: !!rangeIncrement,
                [`reload:${this.reload}`]: !!this.reload,
                [`damage:type:${damage.type}`]: true,
                [`damage:category:${damage.category}`]: !!damage.category,
                [`damage:die:number:${damage.dice.number}`]: !!damage.dice.faces,
                [`damage:die:faces:${damage.dice.faces}`]: !!damage.dice.faces,
                [`damage-dice:${damage.dice.number}`]: !!damage.dice.faces,
                [`damage:persistent:${persistent?.type}`]: !!persistent,
                "deity-favored": isDeityFavored,
                oversized: this.isOversized,
                melee: this.isMelee,
                ranged: this.isRanged,
                thrown: this.isThrown,
                "thrown-melee": thrownMelee,
                ...propertyRunes,
                ...ammunitionRollOptions,
            })
                .filter(([, isTrue]) => isTrue)
                .map(([key]) => `${prefix}:${key}`),
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
        systemData.graspingAppendage = ["fist", "claw"].includes(this.baseType ?? "")
            ? true
            : this.category === "unarmed"
            ? !!systemData.graspingAppendage
            : false;

        if (!setHasElement(ATTRIBUTE_ABBREVIATIONS, systemData.attribute)) {
            systemData.attribute = null;
        }

        const reloadValue = (systemData.reload.value ||= null);
        systemData.reload.label = reloadValue
            ? game.i18n.format("PF2E.Item.Weapon.Reload.LabelN", {
                  value: CONFIG.PF2E.weaponReload[reloadValue],
              })
            : null;

        systemData.selectedAmmoId ||= null;
        systemData.damage.die ||= null;
        systemData.damage.modifier ??= 0;
        // Some weapons fake a constant damage value by having a `die` (number of faces) of "" and a `dice`
        // (number of dice) of 1, yielding "" + "1" ("1") in the roll formula.
        if (!systemData.damage.die && systemData.damage.dice > 0) {
            systemData.damage.modifier ||= systemData.damage.dice;
        }

        // Thrown weapons always have a reload of "-" or 0
        if (this.isThrown && !tupleHasValue(["-", "0"], this.system.reload.value)) {
            this.system.reload.value = "-";
        }

        if (systemData.category === "unarmed" && !systemData.traits.value.includes("unarmed")) {
            systemData.traits.value.push("unarmed");
        }

        // Force a weapon to be ranged if it is among a set of certain groups or has a thrown trait
        const traitSet = this.traits;
        const mandatoryRanged = setHasElement(MANDATORY_RANGED_GROUPS, systemData.group) || traitSet.has("thrown");
        if (mandatoryRanged) {
            this.system.range ??= 10;

            // Categorize this weapon as a crossbow if it is among an enumerated set of base weapons
            const { otherTags } = systemData.traits;
            const isCrossbow = this.group === "bow" && setHasElement(CROSSBOW_WEAPONS, this.baseType);
            if (isCrossbow && !otherTags.includes("crossbow")) {
                systemData.traits.otherTags.push("crossbow");
            }
        }

        // Ensure presence of traits array on melee usage if not have been added yet
        if (this.system.meleeUsage) {
            this.system.meleeUsage.traits ??= [];
            this.system.meleeUsage.traitToggles ??= { modular: null, versatile: null };
        }

        // Lazy-load toggleable traits
        systemData.traits.toggles = new WeaponTraitToggles(this);

        // Ensure unarmed attacks always have the unarmed trait
        const traitsArray = systemData.traits.value;
        if (systemData.category === "unarmed" && !traitsArray.includes("unarmed")) {
            systemData.traits.value.push("unarmed");
        }

        // Force a weapon to be melee if it isn't "mandatory ranged" and has a thrown-N trait
        const mandatoryMelee = !mandatoryRanged && traitsArray.some((t) => /^thrown-\d+$/.test(t));
        if (mandatoryMelee) this.system.range = null;

        // Whether the ammunition or weapon itself should be consumed
        systemData.reload.consume = this.isMelee ? null : this.reload !== null;

        // Whether the weapon is also usable as ammunition: set from source since parent prepares initial (clean) usage
        // object
        systemData.usage.canBeAmmo = this._source.system.usage.canBeAmmo ?? false;

        // If the `comboMeleeUsage` flag is true, then this is a combination weapon in its melee form
        this.flags.pf2e.comboMeleeUsage ??= false;

        this.prepareRunes();

        // Add traits from fundamental runes
        const baseTraits = this.system.traits.value;
        const { runes } = this.system;
        const hasRunes = runes.potency > 0 || runes.striking > 0 || runes.property.length > 0;
        const magicTraits: ("evocation" | "magical")[] = baseTraits.some((t) => setHasElement(MAGIC_TRADITIONS, t))
            ? ["evocation"]
            : hasRunes
            ? ["evocation", "magical"]
            : [];
        this.system.traits.value = R.uniq([baseTraits, magicTraits].flat()).sort();

        this.flags.pf2e.attackItemBonus = this.system.runes.potency || this.system.bonus.value || 0;
    }

    private prepareRunes(): void {
        ABP.cleanupRunes(this);

        const { potencyRune, strikingRune, propertyRune1, propertyRune2, propertyRune3, propertyRune4 } = this.system;
        const strikingRuneDice: Map<StrikingRuneType | null, OneToThree> = new Map([
            ["striking", 1],
            ["greaterStriking", 2],
            ["majorStriking", 3],
        ]);

        // Derived rune data structure
        const runes = (this.system.runes = {
            potency: potencyRune.value ?? 0,
            striking: strikingRuneDice.get(strikingRune.value) ?? 0,
            property: prunePropertyRunes(
                [propertyRune1.value, propertyRune2.value, propertyRune3.value, propertyRune4.value],
                RUNE_DATA.weapon.property,
            ),
            effects: [],
        });

        // Limit property rune slots
        const maxPropertySlots = getPropertySlots(this);
        runes.property.length = Math.min(runes.property.length, maxPropertySlots);

        // Set damage dice according to striking rune
        // Only increase damage dice from ABP if the dice number is 1
        // Striking Rune: "A striking rune [...], increasing the weapon damage dice it deals to two instead of one"
        // Devastating Attacks: "At 4th level, your weapon and unarmed Strikes deal two damage dice instead of one."
        const { actor } = this;
        const inherentDiceNumber = this.system.damage.die ? this._source.system.damage.dice : 0;
        const strikingDice = ABP.isEnabled(actor) ? ABP.getStrikingDice(actor?.level ?? 0) : this.system.runes.striking;
        this.system.damage.dice =
            inherentDiceNumber === 1 && !this.flags.pf2e.battleForm
                ? inherentDiceNumber + strikingDice
                : this.system.damage.dice;
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        if (this.system.usage.canBeAmmo && !this.isThrowable) {
            this.system.usage.canBeAmmo = false;
        }
    }

    /** Add the rule elements of this weapon's linked ammunition to its own list */
    override prepareSiblingData(): void {
        super.prepareSiblingData();
        // Set the default label to the ammunition item's name
        const ammoRules = this.ammo?.system.rules.map((r) => ({ label: this.ammo?.name, ...deepClone(r) })) ?? [];
        this.system.rules.push(...ammoRules);
    }

    override async getChatData(
        this: WeaponPF2e<ActorPF2e>,
        htmlOptions: EnrichmentOptions = {},
    ): Promise<ItemSummaryData> {
        const traits = this.traitChatData(CONFIG.PF2E.weaponTraits);
        const chatData = await super.getChatData();
        const rangeLabel = createActionRangeLabel(this.range);
        const properties = R.compact([
            CONFIG.PF2E.weaponCategories[this.category],
            this.system.reload.label,
            rangeLabel,
        ]);

        return this.processChatData(htmlOptions, {
            ...chatData,
            traits,
            properties,
        });
    }

    override getMystifiedData(status: IdentificationStatus, { source = false } = {}): MystifiedData {
        const mystifiedData = super.getMystifiedData(status);
        if (source) mystifiedData.name = this._source.name;
        return mystifiedData;
    }

    override generateUnidentifiedName({ typeOnly = false }: { typeOnly?: boolean } = { typeOnly: false }): string {
        const base = this.baseType ? CONFIG.PF2E.baseWeaponTypes[this.baseType] : null;
        const group = this.group ? CONFIG.PF2E.weaponGroups[this.group] : null;
        const itemType = game.i18n.localize(base ?? group ?? "TYPES.Item.weapon");

        return typeOnly ? itemType : game.i18n.format("PF2E.identification.UnidentifiedItem", { item: itemType });
    }

    /**
     * Get the "alternative usages" of a weapon: melee (in the case of combination weapons) and thrown (in the case
     * of thrown melee weapons)
     * @param [options.recurse=true] Whether to get the alternative usages of alternative usages
     */
    getAltUsages(options?: { recurse?: boolean }): this[];
    getAltUsages({ recurse = true } = {}): WeaponPF2e<TParent>[] {
        const meleeUsage = this.toMeleeUsage();

        return [
            this.toThrownUsage() ?? [],
            meleeUsage ?? [],
            // Some combination weapons have a melee usage that is throwable
            recurse ? meleeUsage?.toThrownUsage() ?? [] : [],
        ].flat();
    }

    override clone(
        data: Record<string, unknown> | undefined,
        context: Omit<WeaponCloneContext, "save"> & { save: true },
    ): Promise<this>;
    override clone(data?: Record<string, unknown>, context?: Omit<WeaponCloneContext, "save"> & { save?: false }): this;
    override clone(data?: Record<string, unknown>, context?: WeaponCloneContext): this | Promise<this>;
    override clone(data?: Record<string, unknown>, context?: WeaponCloneContext): this | Promise<this> {
        const clone = super.clone(data, context);
        if (context?.altUsage && clone instanceof WeaponPF2e) {
            clone.altUsageType = context.altUsage;
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

        const traitToggles = {
            module: { selection: meleeUsage.traitToggles.modular },
            versatile: { selection: meleeUsage.traitToggles.versatile },
        };

        const overlay: DeepPartial<WeaponSource> = {
            system: {
                damage: { damageType: meleeUsage.damage.type, dice: 1, die: meleeUsage.damage.die },
                group: meleeUsage.group,
                range: null,
                reload: { value: null },
                traits: { value: meleeUsage.traits.concat("combination"), toggles: traitToggles },
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
    toNPCAttacks(this: WeaponPF2e<ActorPF2e>, { keepId = false } = {}): MeleePF2e<ActorPF2e>[] {
        const { actor } = this;
        if (!actor.isOfType("npc")) throw ErrorPF2e("Melee items can only be generated for NPCs");

        const baseDamage = ((): NPCAttackDamage => {
            const weaponDamage = this.baseDamage;
            const ability = this.range?.increment && !this.isThrown ? "dex" : "str";
            const actorLevel = actor.system.details.level.base;
            // Use the base dice if damage is fixed
            const dice = this.flags.pf2e.fixedAttack
                ? weaponDamage.dice
                : [1, 2, 3, 4].reduce((closest, dice) =>
                      Math.abs(dice - Math.round((actorLevel + 2) / 4)) <
                      Math.abs(closest - Math.round((actorLevel + 2) / 4))
                          ? dice
                          : closest,
                  );

            // Approximate weapon specialization
            const constant = ((): string => {
                const fromAbility = actor.abilities[ability].mod;
                // Use the base modifier if damage is fixed
                const totalModifier = this.flags.pf2e.fixedAttack
                    ? weaponDamage.modifier
                    : fromAbility + (actor.level > 1 ? dice : 0);
                const sign = totalModifier < 0 ? "-" : "+";
                return totalModifier === 0 ? "" : [sign, Math.abs(totalModifier)].join("");
            })();

            return {
                damage: weaponDamage.die ? `${dice}${weaponDamage.die}${constant}` : dice.toString(),
                damageType: weaponDamage.damageType,
                category: null,
            };
        })();
        const fromPropertyRunes = this.system.runes.property
            .flatMap((r) => RUNE_DATA.weapon.property[r].damage?.dice ?? [])
            .map(
                (d): NPCAttackDamage => ({
                    damage: `${d.diceNumber}${d.dieSize}`,
                    damageType: d.damageType ?? baseDamage.damageType,
                    category: d.category ?? null,
                }),
            );

        const reachTraitToNPCReach = {
            tiny: null,
            sm: "reach-10",
            med: "reach-10",
            lg: "reach-15",
            huge: "reach-20",
            grg: "reach-25",
        } as const;

        const toAttackTraits = (traits: WeaponTrait[]): NPCAttackTrait[] => {
            const { increment: rangeIncrement, max: maxRange } = this.range ?? {};
            const newTraits: NPCAttackTrait[] = traits
                .flatMap((t) =>
                    t === "reach"
                        ? reachTraitToNPCReach[this.size] ?? []
                        : t === "thrown" && setHasElement(THROWN_RANGES, rangeIncrement)
                        ? (`thrown-${rangeIncrement}` as const)
                        : t,
                )
                .filter(
                    // Omitted traits include ...
                    (t) =>
                        // Creature traits
                        !(t in CONFIG.PF2E.creatureTraits) &&
                        // Magical school and tradition traits
                        !setHasElement(MAGIC_TRADITIONS, t) &&
                        !setHasElement(MAGIC_SCHOOLS, t) &&
                        // Thrown(-N) trait on melee attacks with thrown melee weapons
                        !(t.startsWith("thrown") && !this.isThrown) &&
                        // Finesse trait on thrown attacks with thrown melee weapons
                        !(["grapple", "finesse", "shove", "trip"].includes(t) && this.isRanged) &&
                        // Brutal trait on melee attacks
                        !(t === "brutal" && this.isMelee) &&
                        // Combination trait on melee or thrown attacks with combination weapons
                        !(t === "combination" && (this.isMelee || this.isThrown)) &&
                        // Critical fusion trait on thrown attacks with melee usage of combination weapons
                        !(t === "critical-fusion" && this.isThrown) &&
                        // Other traits always excluded
                        !["artifact", "cursed"].includes(t),
                );

            if (rangeIncrement && !this.isThrown) {
                const prefix = maxRange === rangeIncrement * 6 ? "range-increment" : "range";
                newTraits.push(`${prefix}-${rangeIncrement}` as `range-increment-${WeaponRangeIncrement}`);
            }

            const sizeToReach = SIZE_TO_REACH[actor.size];
            if (this.isMelee && sizeToReach !== 5 && !newTraits.some((t) => t.startsWith("reach"))) {
                newTraits.push(`reach-${sizeToReach}`);
            }

            const reloadTrait = `reload-${this.reload}`;
            if (objectHasKey(CONFIG.PF2E.npcAttackTraits, reloadTrait)) {
                newTraits.push(reloadTrait);
            }

            return newTraits.sort();
        };

        const persistentDamage = ((): NPCAttackDamage | never[] => {
            const { persistent } = this.system.damage;
            if (!persistent) return [];
            const formula = persistent.faces
                ? `${persistent.number}d${persistent.faces}`
                : persistent.number.toString();
            return {
                damage: formula,
                damageType: persistent.type,
                category: "persistent",
            };
        })();

        const splashDamage: NPCAttackDamage | never[] = this.system.splashDamage.value
            ? {
                  damage: this.system.splashDamage.value.toString(),
                  damageType: this.system.damage.damageType,
                  category: "splash",
              }
            : [];

        const source: PreCreate<MeleeSource> = {
            _id: keepId ? this.id : null,
            name: this._source.name,
            type: "melee",
            system: {
                slug: this.slug ?? sluggify(this._source.name),
                weaponType: { value: this.isMelee ? "melee" : "ranged" },
                bonus: {
                    // Unless there is a fixed attack modifier, give an attack bonus approximating a high-threat NPC
                    value: this.flags.pf2e.fixedAttack || Math.round(1.5 * this.actor.level + 7),
                },
                damageRolls: [baseDamage, splashDamage, fromPropertyRunes, persistentDamage]
                    .flat()
                    .reduce(
                        (rolls: Record<string, NPCAttackDamage>, roll) => mergeObject(rolls, { [randomID()]: roll }),
                        {},
                    ),
                traits: {
                    value: toAttackTraits(this.system.traits.value),
                },
                rules: deepClone(this._source.system.rules),
            },
            flags: { pf2e: { linkedWeapon: this.id } },
        };

        const attack = new MeleePF2e(source, { parent: this.actor });
        // Melee items retrieve these during `prepareSiblingData`, but if the attack is from a Strike rule element,
        // there will be no inventory weapon from which to pull the data.
        attack.category = this.category;
        attack.group = this.group;
        attack.baseType = this.baseType;

        return [attack, ...this.getAltUsages({ recurse: false }).flatMap((u) => u.toNPCAttacks())];
    }

    /** Consume a unit of ammunition used by this weapon */
    async consumeAmmo(): Promise<void> {
        const { ammo } = this;
        if (ammo?.isOfType("consumable")) {
            return ammo.consume();
        } else if (ammo?.isOfType("weapon")) {
            if (!ammo.system.usage.canBeAmmo) {
                throw ErrorPF2e("attempted to consume weapon not usable as ammunition");
            }
            await ammo.update({ "system.quantity": Math.max(ammo.quantity - 1, 0) });
        }
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentUpdateContext<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        const traits = changed.system?.traits ?? {};
        if ("value" in traits && Array.isArray(traits.value)) {
            traits.value = traits.value.filter((t) => t in CONFIG.PF2E.weaponTraits);
        }
        if (changed.system?.group !== undefined) {
            changed.system.group ||= null;
        }

        return super._preUpdate(changed, options, user);
    }

    /** Remove links to this weapon from NPC attacks */
    protected override _onDelete(options: DocumentModificationContext<TParent>, userId: string): void {
        super._onDelete(options, userId);

        if (game.user.id === userId) {
            const updates =
                this.actor?.itemTypes.melee
                    .filter((a) => a.flags.pf2e.linkedWeapon === this.id)
                    .map((a) => ({ _id: a.id, "flags.pf2e.-=linkedWeapon": null })) ?? [];
            this.actor?.updateEmbeddedDocuments("Item", updates);
        }
    }
}

interface WeaponPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    flags: WeaponFlags;
    readonly _source: WeaponSource;
    system: WeaponSystemData;

    get traits(): Set<WeaponTrait>;
}

interface WeaponCloneContext extends DocumentCloneContext {
    /** If this clone is an alternative usage, the type */
    altUsage?: "melee" | "thrown";
}

export { WeaponPF2e };
