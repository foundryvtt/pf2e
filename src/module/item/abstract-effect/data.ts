interface EffectBadgeCounter {
    type: "counter";
    value: number;
    labels?: string[];
}

// currently unused until specifices can be figured out
interface EffectBadgeValue {
    type?: "value";
    value: number | string;
}

type EffectBadge = EffectBadgeCounter | EffectBadgeValue;

type TimeUnit = "rounds" | "minutes" | "hours" | "days";

export { TimeUnit, EffectBadge };
