import { calculateAppliedDamage, type IWRInput } from "@system/damage/iwr.ts";
import type { DamageType } from "@system/damage/types.ts";
import { BASE_DAMAGE_TYPES_TO_CATEGORIES } from "@system/damage/values.ts";

type CalculateParams = Parameters<typeof calculateAppliedDamage>[0];
type InstanceSnapshot = IWRInput["roll"]["instances"][number];
type ImmunityRecord = IWRInput["immunities"][number];
type WeaknessRecord = IWRInput["weaknesses"][number];
type ResistanceRecord = IWRInput["resistances"][number];

/** An evaluated, non-persistent instance unless overridden. `formalDescription` is built like `DamageInstance`'s. */
function instance(
    type: DamageType,
    total: number,
    options: Partial<Omit<InstanceSnapshot, "type" | "total" | "formalDescription">> & { materials?: string[] } = {},
): InstanceSnapshot {
    const { materials = [], ...overrides } = options;
    const persistent = overrides.persistent ?? false;
    const category = BASE_DAMAGE_TYPES_TO_CATEGORIES[type];
    return {
        type,
        total,
        persistent,
        evaluatePersistent: false,
        formalDescription: new Set([
            "damage",
            `damage:type:${type}`,
            ...(category ? [`damage:category:${category}`] : []),
            ...(persistent ? ["damage:category:persistent"] : []),
            ...materials.map((m) => `damage:material:${m}`),
        ]),
        critImmuneTotal: total,
        precision: 0,
        splash: 0,
        expression: null,
        ...overrides,
    };
}

/** Unevaluated persistent damage: total 0, formula kept for the condition */
function persistentInstance(type: DamageType, expression: string): InstanceSnapshot {
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

function immunity(type: ImmunityRecord["type"], overrides: Partial<ImmunityRecord> = {}): ImmunityRecord {
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

function weakness(
    type: WeaknessRecord["type"],
    value: number,
    overrides: Partial<WeaknessRecord> = {},
): WeaknessRecord {
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

function resistance(
    type: ResistanceRecord["type"],
    value: number,
    overrides: Partial<ResistanceRecord> = {},
): ResistanceRecord {
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

function concussive(): IWRInput["roll"]["irRedirects"] {
    return {
        immunities: [{ from: "piercing", to: "bludgeoning" }],
        resistances: [{ from: "piercing", to: "bludgeoning" }],
    };
}

/**
 * IWR input with no IWR, no bypass, and every damage type affecting the target.
 * Roll total defaults to the sum of instance totals.
 */
function iwr(
    options: Partial<Omit<IWRInput, "roll">> & {
        instances: InstanceSnapshot[];
        roll?: Partial<Omit<IWRInput["roll"], "instances">>;
    },
): IWRInput {
    const { instances, roll = {}, ...overrides } = options;
    return {
        roll: {
            total: instances.reduce((sum, i) => sum + i.total, 0),
            instances,
            ignoredResistances: [],
            irRedirects: { immunities: [], resistances: [] },
            ...roll,
        },
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
function bypass(
    finalDamage: number,
    persistent: { type: DamageType; expression: string }[] = [],
): CalculateParams["result"] {
    return { finalDamage, applications: [], persistent };
}

/**
 * Run `calculateAppliedDamage` against a target with 30/30 HP, no shield, no hardness, and no stamina.
 * `isDamage` follows the actor's rule: healing only for a negative resolved total.
 */
function calculate(
    options: Partial<CalculateParams> & Pick<CalculateParams, "result">,
): ReturnType<typeof calculateAppliedDamage> {
    const { result } = options;
    return calculateAppliedDamage({
        rollOptions: new Set(),
        isDamage: !("finalDamage" in result && result.finalDamage < 0),
        final: false,
        diceAdjustment: 0,
        modifierAdjustment: 0,
        shield: null,
        baseActorHardness: 0,
        damageHasAdamantine: false,
        materialGrade: "standard",
        hitPoints: { max: 30, value: 30, temp: 0 },
        sp: null,
        staminaVariant: false,
        thresholds: null,
        immuneToDeathEffects: false,
        isUndeadNPC: false,
        ...options,
    });
}

export { bypass, calculate, concussive, immunity, instance, iwr, persistentInstance, resistance, weakness };
