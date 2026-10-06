import { calculateAppliedDamage, type IWRInput } from "@system/damage/applied-damage.ts";
import type { DamageType } from "@system/damage/types.ts";
import { BASE_DAMAGE_TYPES_TO_CATEGORIES } from "@system/damage/values.ts";

type CalculateParams = Parameters<typeof calculateAppliedDamage>[0];
type InstanceRecord = IWRInput["roll"]["instances"][number];
type ImmunityRecord = IWRInput["immunities"][number];
type WeaknessRecord = IWRInput["weaknesses"][number];
type ResistanceRecord = IWRInput["resistances"][number];

type InstanceOptions = {
    materials?: string[];
    persistent?: boolean;
    evaluatePersistent?: boolean;
    critImmuneTotal?: number;
    precision?: number;
    splash?: number;
    expression?: string | null;
};

/** An evaluated, non-persistent instance unless overridden. `formalDescription` is built like `DamageInstance`'s. */
function instance(type: DamageType, total: number, options: InstanceOptions = {}): InstanceRecord {
    const {
        materials = [],
        persistent = false,
        evaluatePersistent = false,
        critImmuneTotal = total,
        precision = 0,
        splash = 0,
        expression = null,
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
        head: { expression: expression ?? "" },
        componentTotal: (component) => (component === "precision" ? precision : splash),
    };
}

/** Unevaluated persistent damage: total 0, formula kept for the condition */
function persistentInstance(type: DamageType, expression: string): InstanceRecord {
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

type Bypass = NonNullable<IWRInput["roll"]["options"]["bypass"]>;
type Redirects = {
    immunities: Bypass["immunity"]["redirect"];
    resistances: Bypass["resistance"]["redirect"];
};

function concussive(): Redirects {
    return {
        immunities: [{ from: "piercing", to: "bludgeoning" }],
        resistances: [{ from: "piercing", to: "bludgeoning" }],
    };
}

type RollBuild = {
    total?: number;
    increasedFrom?: number;
    degreeOfSuccess?: number | null;
    ignoredResistances?: ResistanceRecord[];
    irRedirects?: Redirects;
};

/**
 * IWR input with no immunities, weaknesses, or resistances. Every damage type affects the target.
 * `roll.total` defaults to the sum of instance totals.
 */
function iwr(
    options: Partial<Omit<IWRInput, "roll" | "ignoredResistances">> & {
        instances: InstanceRecord[];
        roll?: RollBuild;
    },
): IWRInput {
    const { instances, roll = {}, ...overrides } = options;
    const {
        total,
        increasedFrom,
        degreeOfSuccess,
        ignoredResistances = [],
        irRedirects = { immunities: [], resistances: [] },
    } = roll;
    return {
        roll: {
            total: total ?? instances.reduce((sum, i) => sum + (i.total ?? 0), 0),
            instances,
            options: {
                increasedFrom,
                degreeOfSuccess,
                bypass: {
                    immunity: { redirect: irRedirects.immunities },
                    resistance: { redirect: irRedirects.resistances },
                },
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
function bypass(finalDamage: number, persistent: InstanceRecord[] = []): CalculateParams["result"] {
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
