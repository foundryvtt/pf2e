import { OneToFour } from "@module/data";

type DieFaceCount = 4 | 6 | 8 | 10 | 12 | 20;
type DiceExpression = `${OneToFour | ""}d${DieFaceCount}`;

interface EffectBadgeCounter {
    type: "counter";
    value: number;
    labels?: string[];
}

// currently unused until specifices can be figured out
interface EffectBadgeValue {
    type?: "value";
    value: number | DiceExpression;
}

type EffectBadge = EffectBadgeCounter | EffectBadgeValue;

export { EffectBadge };
