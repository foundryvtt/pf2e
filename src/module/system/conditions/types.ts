import { EffectBadge } from "@item/abstract-effect/data";

interface FlattenedCondition {
    id: string;
    active: boolean;
    name: string;
    type: "condition";
    slug: string;
    badge: EffectBadge | null;
    value: number | null;
    description: string;
    enrichedDescription?: string;
    img: ImageFilePath;
    isIdentified: boolean;
    isLocked: boolean;
    references: boolean;
    breakdown?: string;
    temporary: boolean;
    parents: ConditionReference[];
    children: ConditionReference[];
    overrides: ConditionReference[];
    overriddenBy: ConditionReference[];
}

interface ConditionReference {
    id: { id: string; type: string } | undefined;
    name: string;
    base: string;
    text: string;
    enrichedText?: string;
}

export { ConditionReference, FlattenedCondition };
