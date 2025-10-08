import type { ActorPF2e } from "@actor";
import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression.ts";
import { SIZE_TO_REACH } from "@actor/creature/values.ts";
import type { AttributeString } from "@actor/types.ts";
import { ATTRIBUTE_ABBREVIATIONS } from "@actor/values.ts";
import type { DatabaseDeleteCallbackOptions, DatabaseUpdateCallbackOptions } from "@common/abstract/_types.d.mts";
import type { ConsumablePF2e, MeleePF2e, ShieldPF2e } from "@item";
import { ItemProxyPF2e, PhysicalItemPF2e } from "@item";
import { createActionRangeLabel } from "@item/ability/helpers.ts";
import type { ItemSourcePF2e, MeleeSource, RawItemChatData } from "@item/base/data/index.ts";
import { addOrUpgradeTrait, performLatePreparation } from "@item/helpers.ts";
import type { NPCAttackDamage } from "@item/melee/data.ts";
import type { NPCAttackTrait } from "@item/melee/types.ts";
import type { PhysicalItemConstructionContext } from "@item/physical/document.ts";
import {
    IdentificationStatus,
    MystifiedData,
    RUNE_DATA,
    checkPhysicalItemSystemChange,
    getPropertyRuneSlots,
} from "@item/physical/index.ts";
import { MAGIC_TRADITIONS } from "@item/spell/values.ts";
import type { RangeData } from "@item/types.ts";
import type { StrikeRuleElement } from "@module/rules/rule-element/strike.ts";
import { WEAPON_UPGRADES } from "@scripts/config/usage.ts";
import { DamageCategorization } from "@system/damage/helpers.ts";
import { EnrichmentOptionsPF2e } from "@system/text-editor.ts";
import { ErrorPF2e, objectHasKey, setHasElement, sluggify, tupleHasValue } from "@util";
import * as R from "remeda";
import type { WeaponDamage, WeaponFlags, WeaponSource, WeaponSystemData } from "./data.ts";
import { processTwoHandTrait } from "./helpers.ts";
import { WeaponTraitToggles } from "./trait-toggles.ts";
import type {
    BaseWeaponType,
    OtherWeaponTag,
    WeaponCategory,
    WeaponGroup,
    WeaponRangeIncrement,
    WeaponReloadTime,
    WeaponTrait,
} from "./types.ts";
import { MANDATORY_RANGED_GROUPS, MELEE_ONLY_TRAITS, RANGED_ONLY_TRAITS, THROWN_RANGES } from "./values.ts";

class WeaponPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends PhysicalItemPF2e<TParent> {
    /** The shield to which this weapon is attached or is a part of */
    declare shield?: ShieldPF2e<TParent>;

    /** The combination weapon that is an alternate form or usage of this weapon */
    declare comboSibling?: WeaponPF2e<TParent>;

    /** The rule element that generated this weapon, if applicable */
    declare rule?: StrikeRuleElement;

    static override get validTraits(): Record<NPCAttackTrait, string> {
        return CONFIG.PF2E.npcAttackTraits;
    }

    constructor(data: PreCreate<ItemSourcePF2e>, context: WeaponConstructionContext<TParent> = {}) {
        super(data, context);
        if (context.shield) this.shield = context.shield;
    }

    /** Given this weapon is an alternative usage, whether it is melee or thrown */
    altUsageType: "melee" | "thrown" | null = null;

    override get isEquipped(): boolean {
        const { category, traits } = this.system;
        // Make unarmed "weapons" always equipped with the exception of handwraps
        if (category === "unarmed" && !traits.otherTags.includes("handwraps-of-mighty-blows")) {
            return true;
        }

        // Allow jousting weapons to be usable when held in one hand
        return super.isEquipped || (this.handsHeld === 1 && traits.value.some((t) => /^jousting-d\d{1,2}$/.test(t)));
    }

    /** Weapons may have "attached" traits instead of "attached" usages. */
    override get isAttachable(): boolean {
        return this.system.quantity > 0 && this.system.traits.value.some((t) => t.startsWith("attached"));
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
        return !!this.system.specific;
    }

    get isMelee(): boolean {
        return !this.isRanged;
    }

    get isRanged(): boolean {
        return !!this.system.range;
    }

    /** Whether the weapon in its current usage is thrown: a thrown-only weapon or a thrown usage of a melee weapon */
    get isThrown(): boolean {
        const isThrownBaseType = tupleHasValue(CONFIG.PF2E.thrownBaseWeapons, this.baseType);
        return this.isRanged && (isThrownBaseType || this.system.traits.value.includes("thrown"));
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
            !!this.parent?.system.traits?.size?.isSmallerThan(this.size, { smallIsMedium: true })
        );
    }

    /** This weapon's damage before modification by creature abilities, effects, etc. */
    get baseDamage(): WeaponDamage {
        return {
            ...fu.deepClone(this.system.damage),
            // Damage types from trait toggles are not applied as data mutations so as to delay it for rule elements to
            // add options
            damageType:
                this.system.traits.toggles.versatile.selected ??
                this.system.traits.toggles.modular.selected ??
                this.system.damage.damageType,
        };
    }

    /** Does this weapon deal damage? */
    get dealsDamage(): boolean {
        const baseDamage = this.baseDamage;
        return (
            baseDamage.dice > 0 ||
            baseDamage.modifier > 0 ||
            this.system.splashDamage.value > 0 ||
            !!baseDamage.persistent?.number
        );
    }

    get ammo(): ConsumablePF2e<ActorPF2e> | WeaponPF2e<ActorPF2e> | null {
        const ammo = this.actor?.items.get(this.system.selectedAmmoId ?? "");
        return ammo?.isOfType("consumable", "weapon") ? ammo : null;
    }

    get otherTags(): Set<OtherWeaponTag> {
        return new Set(this.system.traits.otherTags);
    }

    override acceptsSubitem(candidate: PhysicalItemPF2e): boolean {
        if (candidate === this) return false;

        if (candidate.isOfType("weapon")) {
            return (
                candidate.system.traits.value.some((t) => t === "attached-to-crossbow-or-firearm") &&
                ["crossbow", "firearm"].includes(this.group ?? "") &&
                !this.isAttachable &&
                !this.system.traits.value.includes("combination") &&
                !this.subitems.some((i) => i.isOfType("weapon"))
            );
        }

        const usage = candidate.system.usage;
        if (this.system.grade && usage.type === "installed" && usage.value in WEAPON_UPGRADES) {
            return true;
        }

        return false;
    }

    override isStackableWith(item: PhysicalItemPF2e): boolean {
        if (this.category === "unarmed" || !item.isOfType("weapon") || item.category === "unarmed") {
            return false;
        }

        const equippedButStackable = ["bomb", "dart"].includes(this.group ?? "");
        if ((this.isEquipped || item.isEquipped) && !equippedButStackable) return false;
        return super.isStackableWith(item);
    }

    /** Whether this weapon can serve as ammunition for another weapon */
    isAmmoFor(weapon: WeaponPF2e): boolean {
        return this.system.usage.canBeAmmo && !weapon.system.traits.value.includes("repeating");
    }

    /** Generate a list of strings for use in predication */
    override getRollOptions(prefix = this.type, options?: { includeGranter?: boolean }): string[] {
        const { actor, baseDamage } = this;
        const damage = {
            category: DamageCategorization.fromDamageType(baseDamage.damageType),
            type: baseDamage.damageType,
            dice: {
                number: baseDamage.die ? baseDamage.dice : 0,
                faces: Number(baseDamage.die?.replace(/^d/, "")),
            },
        };
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

        const rollOptions = super.getRollOptions(prefix, options);
        rollOptions.push(
            ...Object.entries({
                [`category:${this.category}`]: true,
                [`group:${this.group ?? "none"}`]: true,
                ...baseTypeRollOptions,
                [`base:${this.baseType}`]: !!this.baseType,
                [`bulk:${bulk}`]: true,
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
                .filter((e) => !!e[1])
                .map((e) => `${prefix}:${e[0]}`),
        );

        if (this.comboSibling) {
            const usagePrefix = this.comboSibling.isRanged ? "ranged-usage" : "melee-usage";
            rollOptions.push(...this.comboSibling.getRollOptions(`${prefix}:${usagePrefix}`));
        }

        return rollOptions;
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        this.system.category ||= "simple";
        this.system.group ||= null;
        this.system.baseItem ||= null;
        this.system.splashDamage.value ||= 0;
        this.system.graspingAppendage = ["fist", "claw"].includes(this.baseType ?? "")
            ? true
            : this.category === "unarmed"
              ? !!this.system.graspingAppendage
              : false;

        if (this.system.attribute && !ATTRIBUTE_ABBREVIATIONS.has(this.system.attribute)) {
            this.system.attribute = null;
        }

        const reloadValue = (this.system.reload.value ||= null);
        this.system.reload.label = reloadValue
            ? game.i18n.format("PF2E.Item.Weapon.Reload.LabelN", {
                  value: CONFIG.PF2E.weaponReload[reloadValue],
              })
            : null;

        this.system.selectedAmmoId ||= null;
        this.system.damage.die ||= null;
        this.system.damage.modifier ??= 0;
        // Some weapons fake a constant damage value by having a `die` (number of faces) of "" and a `dice`
        // (number of dice) of 1, yielding "" + "1" ("1") in the roll formula.
        if (!this.system.damage.die && this.system.damage.dice > 0) {
            this.system.damage.modifier ||= this.system.damage.dice;
        }

        // Thrown weapons always have a reload of "-" or 0
        if (this.isThrown && !tupleHasValue(["-", "0"], this.system.reload.value)) {
            this.system.reload.value = "-";
        }

        const traits = this.system.traits;
        if (this.system.category === "unarmed" && !traits.value.includes("unarmed")) {
            traits.value.push("unarmed");
        }

        // Ensure handwraps have otherTags set
        if (
            this.system.slug === "handwraps-of-mighty-blows" &&
            !traits.otherTags.includes("handwraps-of-mighty-blows")
        ) {
            traits.otherTags.push("handwraps-of-mighty-blows");
        }

        // Force a weapon to be ranged if it is among a set of certain groups or has a thrown trait
        const mandatoryRanged =
            (this.system.group && MANDATORY_RANGED_GROUPS.has(this.system.group)) ||
            (["combination", "thrown"] as const).some((t) => traits.value.includes(t));
        if (mandatoryRanged) this.system.range ??= 10;

        // Ensure presence of traits array on melee usage if not have been added yet
        if (this.system.meleeUsage) {
            this.system.meleeUsage.traits ??= [];
            this.system.meleeUsage.traitToggles ??= { modular: null, versatile: null };
        }

        // Lazy-load toggleable traits
        this.system.traits.toggles = new WeaponTraitToggles(this);

        // Force a weapon to be melee if it isn't "mandatory ranged" and has a thrown-N trait
        const mandatoryMelee = !mandatoryRanged && traits.value.some((t) => /^thrown-{1,3}$/.test(t));
        if (mandatoryMelee) this.system.range = null;

        // Final sweep: remove any non-sensical trait that may throw off later automation
        if (this.isMelee) {
            traits.value = traits.value.filter((t) => !RANGED_ONLY_TRAITS.has(t) && !t.startsWith("volley"));
        } else {
            traits.value = traits.value.filter((t) => !MELEE_ONLY_TRAITS.has(t) && !t.startsWith("thrown-"));
        }

        // Whether the ammunition or weapon itself should be consumed
        this.system.reload.consume = this.isMelee ? null : this.reload !== null;

        // Whether the weapon is also usable as ammunition: set from source since parent prepares initial (clean) usage
        // object
        this.system.usage.canBeAmmo = this._source.system.usage.canBeAmmo ?? false;

        this.flags.pf2e.comboMeleeUsage ??= false;
        this.flags.pf2e.damageFacesUpgraded = false;

        // Prepare and limit runes
        ABP.cleanupRunes(this);
        const runes = this.system.runes;
        runes.effects = [];
        // @todo remove after switch to data model
        if (!Array.isArray(runes.property)) {
            runes.property = [];
            this._source.system.runes.property = [];
        }
        runes.property.length = Math.min(runes.property.length, getPropertyRuneSlots(this));
        this.prepareTraits();

        // Set damage dice according to striking rune or grade
        // Only increase damage dice from ABP if the dice number is 1
        // Striking Rune: "A striking rune [...], increasing the weapon damage dice it deals to two instead of one"
        // Devastating Attacks: "At 4th level, your weapon and unarmed Strikes deal two damage dice instead of one."
        const actor = this.actor;
        const inherentDiceNumber = this.system.damage.die ? this._source.system.damage.dice : 0;
        const strikingDice = ABP.isEnabled(actor) ? ABP.getStrikingDice(actor?.level ?? 0) : this.system.runes.striking;
        const gradeData = CONFIG.PF2E.weaponImprovements[this.system.grade ?? "commercial"];
        this.system.damage.dice =
            inherentDiceNumber === 1 && !this.flags.pf2e.battleForm
                ? Math.max(gradeData.dice, inherentDiceNumber + strikingDice)
                : this.system.damage.dice;

        if (this.system.usage.canBeAmmo && !this.isThrowable) {
            this.system.usage.canBeAmmo = false;
        }

        // Initialize expend value. Valid expend values depend on the reload value
        if (this.isRanged && !this.isThrown && this.reload !== null) {
            const isDoubleBarrel = this.system.traits.toggles.doubleBarrel.selected;
            const minValue = isDoubleBarrel ? 2 : 1;
            this.system.expend = Math.max(minValue, this.system.expend ?? 1);
        } else {
            this.system.expend = null;
        }
    }

    private prepareTraits(): void {
        // Get SF2e grade. For PF2e this resolves as commercial, which is equal to no runes.
        const { traits, runes } = this.system;
        const gradeData = CONFIG.PF2E.weaponImprovements[this.system.grade ?? "commercial"];

        // Determine if this weapon uses runes or CTASEUP and clear the opposing data
        const isSF2e = traits.value.some((v) => ["tech", "analog"].includes(v));
        if (!isSF2e) this.system.grade = null;
        this.system.grade = isSF2e ? (this.system.grade ?? "commercial") : null;
        if (traits.value.includes("tech") || traits.value.includes("consumable")) runes.potency = runes.striking = 0;

        // Add traits from fundamental runes
        const hasRunes = runes.potency > 0 || runes.striking > 0 || runes.property.length > 0;
        const magicTrait =
            hasRunes && !traits.value.some((t) => t === "magical" || setHasElement(MAGIC_TRADITIONS, t))
                ? "magical"
                : null;
        if (magicTrait) traits.value.push(magicTrait);

        // Add traits from weapon grade
        if (gradeData.tracking) addOrUpgradeTrait(traits, `tracking-${gradeData.tracking}`);
        const highestTracking = traits.config.tracking || 0;

        traits.value = R.unique(traits.value).sort();
        this.flags.pf2e.attackItemBonus = Math.max(runes.potency, highestTracking, this.system.bonus.value, 0);
    }

    /** Add the rule elements of this weapon's linked ammunition to its own list */
    override prepareSiblingData(): void {
        super.prepareSiblingData();

        // Set the default label to the ammunition item's name
        const ammoRules = this.ammo?.system.rules.map((r) => ({ label: this.ammo?.name, ...fu.deepClone(r) })) ?? [];
        this.system.rules.push(...ammoRules);
    }

    override onPrepareSynthetics(): void {
        super.onPrepareSynthetics();

        const traits = this.system.traits;
        traits.toggles.applyChanges();

        // Upgrade dice faces if a two-hand trait is present and applicable
        processTwoHandTrait(this);
    }

    override async getChatData(
        this: WeaponPF2e<ActorPF2e>,
        htmlOptions: EnrichmentOptionsPF2e = {},
    ): Promise<RawItemChatData> {
        const traits = this.traitChatData(CONFIG.PF2E.weaponTraits);
        const chatData = await super.getChatData();
        const rangeLabel = createActionRangeLabel(this.range);
        const properties = [CONFIG.PF2E.weaponCategories[this.category], this.system.reload.label, rangeLabel].filter(
            R.isTruthy,
        );

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
        const baseWeaponTypes: Record<string, string | undefined> = CONFIG.PF2E.baseWeaponTypes;
        const baseShieldTypes: Record<string, string | undefined> = CONFIG.PF2E.baseShieldTypes;
        const base = this.baseType ? (baseWeaponTypes[this.baseType] ?? baseShieldTypes[this.baseType] ?? null) : null;
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

        const altUsages: WeaponPF2e<TParent>[] = [
            this.toThrownUsage() ?? [],
            meleeUsage ?? [],
            // Some combination weapons have a melee usage that is throwable
            recurse ? (meleeUsage?.toThrownUsage() ?? []) : [],
        ].flat();

        // Apply late prep procedures to all alt usages
        for (const weapon of altUsages) {
            performLatePreparation(weapon as WeaponPF2e<NonNullable<TParent>>);
        }

        return altUsages;
    }

    override clone(data?: Record<string, unknown>, context?: WeaponCloneContext): this {
        const clone = super.clone(data, context);
        if (context?.altUsage && clone instanceof WeaponPF2e) {
            clone.altUsageType = context.altUsage;
            const comboSibling = this.system.traits.value.includes("combination") ? this : this.comboSibling;
            if (comboSibling) clone.comboSibling = comboSibling;
        }

        return clone;
    }

    /** Generate a clone of this thrown melee weapon with its thrown usage overlain, or `null` if not applicable */
    private toThrownUsage(): this | null {
        const traits = this._source.system.traits.value;
        const thrownTrait = traits.find((t) => /^thrown-\d{1,3}$/.test(t));
        if (this.isRanged || !thrownTrait) return null;

        const range = Number(/(\d{1,3})$/.exec(thrownTrait)?.at(1)) as WeaponRangeIncrement;
        const newTraits = fu.deepClone(traits);
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
        const meleeUsage = this.system.meleeUsage;
        if (!meleeUsage || this.flags.pf2e.comboMeleeUsage) return null;

        const traitToggles = {
            module: { selected: meleeUsage.traitToggles.modular },
            versatile: { selected: meleeUsage.traitToggles.versatile },
        };

        const overlay: DeepPartial<WeaponSource> = {
            system: {
                damage: { damageType: meleeUsage.damage.type, dice: 1, die: meleeUsage.damage.die },
                group: meleeUsage.group,
                range: null,
                reload: { value: null },
                traits: { value: [...meleeUsage.traits], toggles: traitToggles },
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
    toNPCAttacks(this: WeaponPF2e<NonNullable<TParent>>, { keepId = false } = {}): MeleePF2e<NonNullable<TParent>>[] {
        const actor = this.actor;
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
            .flatMap((r) => RUNE_DATA.weapon.property[r].damage?.additional ?? [])
            .map((additional): NPCAttackDamage => {
                const [category = null, damage] =
                    "diceNumber" in additional
                        ? [additional.category, `${additional.diceNumber}${additional.dieSize}`]
                        : [additional.damageCategory, additional.modifier.toString()];
                const damageType = additional.damageType ?? baseDamage.damageType;
                return { damage, damageType, category };
            });

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
                        ? (reachTraitToNPCReach[this.size] ?? [])
                        : t === "thrown" && setHasElement(THROWN_RANGES, rangeIncrement)
                          ? (`thrown-${rangeIncrement}` as const)
                          : t,
                )
                .filter(
                    // Omitted traits include ...
                    (t) =>
                        // Creature traits (unless coming from a Strike RE)
                        (["holy", "unholy"].includes(t) || !!this.rule || !(t in CONFIG.PF2E.creatureTraits)) &&
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

            if (traits.some((t) => setHasElement(MAGIC_TRADITIONS, t))) {
                newTraits.push("magical");
            }

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

            return R.unique(newTraits).sort();
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
                bonus: {
                    // Unless there is a fixed attack modifier, give an attack bonus approximating a high-threat NPC
                    value: this.flags.pf2e.fixedAttack || Math.round(1.5 * this.actor.level + 7),
                },
                damageRolls: [baseDamage, splashDamage, fromPropertyRunes, persistentDamage]
                    .flat()
                    .reduce(
                        (rolls: Record<string, NPCAttackDamage>, roll) =>
                            fu.mergeObject(rolls, { [fu.randomID()]: roll }),
                        {},
                    ),
                traits: {
                    value: toAttackTraits(this.system.traits.value),
                },
                rules: fu.deepClone(this._source.system.rules),
            },
            flags: { pf2e: { linkedWeapon: this.id } },
        };

        const attack = new ItemProxyPF2e(source, { parent: this.actor }) as MeleePF2e<NonNullable<TParent>>;
        // Melee items retrieve these during `prepareSiblingData`, but if the attack is from a Strike rule element,
        // there will be no inventory weapon from which to pull the data.
        attack.category = this.category;
        attack.group = this.group;
        attack.baseType = this.baseType;

        return [attack, ...this.getAltUsages({ recurse: false }).flatMap((u) => u.toNPCAttacks())];
    }

    /** Consume a unit of ammunition used by this weapon */
    async consumeAmmo(): Promise<void> {
        const ammo = this.ammo;
        if (this.system.expend && ammo?.isOfType("consumable")) {
            return ammo.consume(this.system.expend);
        } else if (ammo?.isOfType("weapon")) {
            if (!ammo.system.usage.canBeAmmo) {
                throw ErrorPF2e("attempted to consume weapon not usable as ammunition");
            }
            await ammo.update({ "system.quantity": Math.max(ammo.quantity - 1, 0) });
        }
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        if (!changed.system) return super._preUpdate(changed, options, user);

        const traits = changed.system.traits ?? {};
        if (Array.isArray(traits.value)) {
            traits.value = traits.value.filter((t) => t in CONFIG.PF2E.weaponTraits);
        }

        // Clear runes or grade based on tech/analog traits
        try {
            const result = await checkPhysicalItemSystemChange(this, changed);
            if (result === "sf2e") {
                changed.system.runes = { potency: 0, striking: 0, property: [] };
                changed.system.grade ??= this._source.system.grade ?? "commercial";
            } else if (result === "pf2e") {
                changed.system.grade = null;
            }
        } catch {
            return false;
        }

        for (const key of ["group", "range", "selectedAmmoId"] as const) {
            if (changed.system[key] !== undefined) {
                changed.system[key] ||= null;
            }
        }

        if (changed.system.damage) {
            // Clamp `dice` to between 0 and 14
            if (changed.system.damage.dice !== undefined) {
                changed.system.damage.dice = Math.clamp(Number(changed.system.damage.dice) || 0, 0, 14);
            }

            // Null out empty `die`
            if (changed.system.damage.die !== undefined) {
                changed.system.damage.die ||= null;
            }
        }

        // Ensure expend stays a valid value (simpler once we have data models), and set it when swapping to a ranged weapon
        const reload = changed.system.reload?.value ?? this._source.system.reload.value;
        const isThrown = (traits?.value ?? this._source.system.traits.value)?.includes("thrown");
        const isRanged =
            setHasElement(MANDATORY_RANGED_GROUPS, changed.system.group ?? this.system.group) ||
            !!("range" in changed.system ? changed.system.range : this._source.system.range);
        const mustHaveExpend = isRanged && !isThrown && reload !== null;
        changed.system.expend = mustHaveExpend
            ? Math.max(1, changed.system.expend ?? this._source.system.expend ?? 1)
            : null;

        return super._preUpdate(changed, options, user);
    }

    /** Remove links to this weapon from NPC attacks */
    protected override _onDelete(options: DatabaseDeleteCallbackOptions, userId: string): void {
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

interface WeaponConstructionContext<TParent extends ActorPF2e | null> extends PhysicalItemConstructionContext<TParent> {
    shield?: ShieldPF2e<TParent>;
}

interface WeaponCloneContext extends DocumentCloneContext {
    /** If this clone is an alternative usage, the type */
    altUsage?: "melee" | "thrown";
}

export { WeaponPF2e };
