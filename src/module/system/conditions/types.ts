import { EffectBadge } from "@item/abstract-effect/data";

interface FlattenedCondition {
    id: string;
    active: boolean;
    name: string;
    badge: EffectBadge | null;
    value: number | null;
    description: string;
    enrichedDescription?: string;
    img: ImageFilePath;
    unidentified: boolean;
    locked: boolean;
    references: boolean;
    breakdown?: string;
    parents: ConditionReference[];
    children: ConditionReference[];
    overrides: ConditionReference[];
    overriddenBy: ConditionReference[];
    immunityFrom: ConditionReference[];
}

interface ConditionReference {
    id: { id: string; type: string } | undefined;
    name: string;
    base: string;
    text: string;
    enrichedText?: string;
}

export { ConditionReference, FlattenedCondition };
