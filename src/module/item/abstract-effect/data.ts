interface EffectBadgeCounter {
    type: "counter";
    value: number;
    label?: string;
    labels?: string[];
}

// currently unused until specifices can be figured out
interface EffectBadgeValue {
    type?: "value";
    value: number | string;
}

interface EffectBadgeFormula {
    type: "formula";
    value: string;
    evaluate?: boolean;
}

type EffectBadge = EffectBadgeCounter | EffectBadgeValue | EffectBadgeFormula;

type TimeUnit = "rounds" | "minutes" | "hours" | "days";

export { TimeUnit, EffectBadge };
