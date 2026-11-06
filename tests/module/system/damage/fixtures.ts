import {
    applyIWRToInput,
    calculateAppliedDamage,
    type AppliedDamage,
    type Bypass,
    type CalculateAppliedDamageParams,
    type DamageInstanceRecord,
    type ImmunityRecord,
    type IWRApplicationData,
    type IWRInput,
    type ResistanceRecord,
    type WeaknessRecord,
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
function instance(type: DamageType, total: number, options: InstanceOptions = {}): DamageInstanceRecord {
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
function persistentInstance(type: DamageType, expression: string): DamageInstanceRecord {
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
        instances: DamageInstanceRecord[];
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

/**
 * Run `calculateAppliedDamage` against a target with 30/30 HP, no shield, no hardness, and no stamina.
 * `isDamage` follows the actor's rule: healing only for a negative resolved total.
 */
function calculate(
    options: Partial<Omit<CalculateAppliedDamageParams, "result">> & {
        result: IWRApplicationData | IWRInput;
    },
): AppliedDamage {
    const { result: incoming, rollOptions = new Set(), ...rest } = options;
    const result = "finalDamage" in incoming ? incoming : applyIWRToInput(incoming, rollOptions);
    return calculateAppliedDamage({
        rollOptions,
        isDamage: !("finalDamage" in incoming && incoming.finalDamage < 0),
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
        ...rest,
        result,
    });
}

export { calculate, concussive, immunity, instance, iwr, persistentInstance, resistance, resolved, weakness };
