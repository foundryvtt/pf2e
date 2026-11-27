import type { ApplyDamageParams, ImmunityType, ResistanceType, WeaknessType } from "@actor/types.ts";
import {
    calculateAppliedDamage,
    type AppliedDamage,
    type Bypass,
    type DamageApplicationActor,
    type DamageInstanceData,
    type ImmunityData,
    type IWRApplicationData,
    type IWRInput,
    type ResistanceData,
    type WeaknessData,
} from "@system/damage/applied-damage.ts";
import type { DamageType } from "@system/damage/types.ts";
import { BASE_DAMAGE_TYPES_TO_CATEGORIES } from "@system/damage/values.ts";

type InstanceOptions = {
    materials?: string[];
    persistent?: boolean;
    evaluatePersistent?: boolean;
    critImmuneTotal?: number;
    precision?: number;
    splash?: number;
    expression?: string;
};

/** An evaluated, non-persistent instance unless overridden. `formalDescription` is built like `DamageInstance`'s. */
function instance(type: DamageType, total: number, options: InstanceOptions = {}): DamageInstanceData {
    const {
        materials = [],
        persistent = false,
        evaluatePersistent = false,
        critImmuneTotal = total,
        precision = 0,
        splash = 0,
        expression = "",
    } = options;
    const category = BASE_DAMAGE_TYPES_TO_CATEGORIES[type];
    return {
        type,
        total,
        persistent,
        formalDescription: new Set([
            "damage",
            `damage:type:${type}`,
            ...(category ? [`damage:category:${category}`] : []),
            ...(persistent ? ["damage:category:persistent"] : []),
            ...materials.map((m) => `damage:material:${m}`),
        ]),
        critImmuneTotal,
        options: { evaluatePersistent },
        head: { expression },
        componentTotal: (component) => (component === "precision" ? precision : splash),
    };
}

/** Unevaluated persistent damage: total 0, formula kept for the condition */
function persistentInstance(type: DamageType, expression: string): DamageInstanceData {
    return instance(type, 0, { persistent: true, expression });
}

/** The statement a simple IWR of this type matches, mirroring `IWR#describe` for the common types */
function statementFor(type: string): string {
    switch (type) {
        case "air":
        case "earth":
        case "holy":
        case "metal":
        case "unholy":
        case "water":
        case "wood":
            return `item:trait:${type}`;
        case "all-damage":
            return "damage";
        case "critical-hits":
            return "check:outcome:critical-success";
        case "energy":
        case "physical":
            return `damage:category:${type}`;
        case "precision":
            return "damage:component:precision";
        case "splash-damage":
            return "damage:component:splash";
        case "persistent-damage":
            return "damage:category:persistent";
        case "adamantine":
        case "cold-iron":
        case "dawnsilver":
        case "silver":
            return `damage:material:${type}`;
        default:
            return `damage:type:${type}`;
    }
}

function immunity(type: ImmunityType, overrides: Partial<ImmunityData> = {}): ImmunityData {
    return {
        type,
        exceptions: [],
        label: type,
        typeLabel: type,
        applicationLabel: type,
        test: (statements) => [...statements].includes(statementFor(type)),
        ...overrides,
    };
}

function weakness(type: WeaknessType, value: number, overrides: Partial<WeaknessData> = {}): WeaknessData {
    return {
        type,
        value,
        applyOnce: false,
        label: `${type} ${value}`,
        typeLabel: type,
        applicationLabel: type,
        test: (statements) => [...statements].includes(statementFor(type)),
        ...overrides,
    };
}

function resistance(type: ResistanceType, value: number, overrides: Partial<ResistanceData> = {}): ResistanceData {
    return {
        type,
        value,
        exceptions: [],
        label: `${type} ${value}`,
        typeLabel: type,
        applicationLabel: type,
        test: (statements) => [...statements].includes(statementFor(type)),
        getDoubledValue: () => value,
        ...overrides,
    };
}

function concussive(): Bypass {
    return {
        immunity: { redirect: [{ from: "piercing", to: "bludgeoning" }] },
        resistance: { redirect: [{ from: "piercing", to: "bludgeoning" }] },
    };
}

type RollBuild = {
    total?: number;
    options?: {
        increasedFrom?: number;
        degreeOfSuccess?: number | null;
    };
    bypass?: Bypass;
};

/**
 * IWR input with no immunities, weaknesses, or resistances. Every damage type affects the target.
 * `roll.total` defaults to the sum of instance totals.
 */
function iwr(
    options: Partial<Omit<IWRInput, "roll">> & {
        instances: DamageInstanceData[];
        roll?: RollBuild;
    },
): IWRInput {
    const { instances, roll = {}, ignoredResistances = [], ...overrides } = options;
    const {
        total,
        options: optionsOverrides = {},
        bypass = { immunity: { redirect: [] }, resistance: { redirect: [] } },
    } = roll;
    return {
        roll: {
            total: total ?? instances.reduce((sum, i) => sum + (i.total ?? 0), 0),
            instances,
            options: {
                ...optionsOverrides,
                bypass,
            },
        },
        ignoredResistances,
        immunities: [],
        weaknesses: [],
        resistances: [],
        isAffectedBy: () => true,
        immunityTypeLabel: (type) => type,
        resistanceTypeLabel: (type) => type,
        ...overrides,
    };
}

/** Damage or healing already resolved before IWR: a number, `skipIWR`, a dead target, or IWR disabled */
function resolved(finalDamage: number): IWRApplicationData {
    return { finalDamage, applications: [], persistent: [] };
}

type CalculateOptions = {
    result: IWRApplicationData | IWRInput;
    rollOptions?: Set<string>;
    final?: boolean;
    skipIWR?: boolean;
    diceAdjustment?: number;
    modifierAdjustment?: number;
    shield?: { hardness: number; hp: number } | null;
    baseActorHardness?: number;
    damageHasAdamantine?: boolean;
    materialGrade?: "low" | "standard" | "high";
    hitPoints?: { max: number; value: number; temp: number };
    sp?: { max: number; value: number } | null;
    staminaVariant?: boolean;
    thresholds?: { hp: number; segments: number }[] | null;
    immuneToDeathEffects?: boolean;
    isUndeadNPC?: boolean;
};

/**
 * Run `calculateAppliedDamage` on a mock actor with 30/30 HP, no shield, no hardness, and no stamina
 * unless overridden. A negative resolved total is healing.
 */
async function calculate(options: CalculateOptions): Promise<AppliedDamage> {
    const { result: incoming, rollOptions = new Set() } = options;
    const prepared = "finalDamage" in incoming ? null : incoming;
    const immunities = [
        ...(prepared?.immunities ?? []),
        ...(options.immuneToDeathEffects ? [immunity("death-effects")] : []),
    ];
    const isCharacter = options.sp !== null && options.sp !== undefined;
    const hasShield = options.shield !== null && options.shield !== undefined;
    const isNpc =
        options.isUndeadNPC === true ||
        (options.thresholds !== null && options.thresholds !== undefined) ||
        (hasShield && !isCharacter);
    const actor = {
        attributes: {
            hp: { sp: options.sp ?? null },
            immunities,
            resistances: prepared?.resistances ?? [],
            shield: options.shield
                ? {
                      broken: false,
                      destroyed: false,
                      hardness: options.shield.hardness,
                      hp: { value: options.shield.hp },
                      itemId: null,
                      name: "Shield",
                      raised: true,
                  }
                : null,
            weaknesses: prepared?.weaknesses ?? [],
        },
        hardness: options.baseActorHardness ?? 0,
        healingReceived: {
            diceAdjustment: options.diceAdjustment ?? 0,
            modifierAdjustment: options.modifierAdjustment ?? 0,
        },
        heldShield: null,
        hitPoints: options.hitPoints ?? { max: 30, value: 30, temp: 0 },
        iwr: prepared
            ? {
                  ignoredResistances: prepared.ignoredResistances,
                  immunities,
                  immunityTypeLabel: prepared.immunityTypeLabel,
                  isAffectedBy: prepared.isAffectedBy,
                  resistances: prepared.resistances,
                  resistanceTypeLabel: prepared.resistanceTypeLabel,
                  weaknesses: prepared.weaknesses,
              }
            : undefined,
        isOfType: (...types: string[]) =>
            types.some((type) => (type === "character" && isCharacter) || (type === "npc" && isNpc)),
        modeOfBeing: options.isUndeadNPC ? "undead" : "living",
        system: { attributes: { hp: { thresholds: options.thresholds ?? null } } },
    } as unknown as DamageApplicationActor;
    const damage: ApplyDamageParams["damage"] =
        "finalDamage" in incoming
            ? options.damageHasAdamantine
                ? ({
                      instances: [],
                      materials: new Set(["adamantine"]),
                      options: {},
                      total: incoming.finalDamage,
                  } as unknown as ApplyDamageParams["damage"])
                : incoming.finalDamage
            : (incoming.roll as ApplyDamageParams["damage"]);
    const item = (
        options.damageHasAdamantine
            ? {
                  isOfType: (type: string) => type === "weapon",
                  system: { material: { type: "adamantine", grade: options.materialGrade ?? "standard" } },
              }
            : null
    ) as ApplyDamageParams["item"];
    const variants = game.pf2e.settings.variants;
    const previousStamina = variants.stamina;
    variants.stamina = options.staminaVariant ?? false;
    const applied = await calculateAppliedDamage(actor, {
        breakdown: [],
        damage,
        final: options.final ?? false,
        item,
        outcome: null,
        rollOptions,
        shieldBlockRequest: hasShield,
        skipIWR: (options.skipIWR ?? false) || ("finalDamage" in incoming && options.damageHasAdamantine === true),
        token: { name: "Target" } as ApplyDamageParams["token"],
    }).finally(() => {
        variants.stamina = previousStamina;
    });
    if (!applied) throw new Error("Mock actor has no hit points.");
    return applied;
}

export { calculate, concussive, immunity, instance, iwr, persistentInstance, resistance, resolved, weakness };
