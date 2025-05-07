/** Duration units for affliction and effect */
const DURATION_UNITS: Readonly<Record<string, number>> = {
    rounds: 6,
    minutes: 60,
    hours: 3600,
    days: 86400,
};

const EFFECT_TIME_UNITS = ["rounds", "minutes", "hours", "days"] as const;

export { DURATION_UNITS, EFFECT_TIME_UNITS };
