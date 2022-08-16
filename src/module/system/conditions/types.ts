import { EffectBadge } from "@item/abstract-effect/data";
import { ConditionSlug } from "@item/condition/data";

export interface FlattenedCondition {
    id: string;
    active: boolean;
    name: string;
    badge: EffectBadge | null;
    value: number | null;
    description: string;
    enrichedDescription?: string;
    img: ImagePath;
    locked: boolean;
    references: boolean;
    breakdown?: string;
    parents: ConditionReference[];
    children: ConditionReference[];
    overrides: ConditionReference[];
    overriddenBy: ConditionReference[];
    immunityFrom: ConditionReference[];
}

export interface ConditionReference {
    id:
        | {
              id: string;
              type: "status" | "condition" | "feat" | "weapon" | "armor" | "consumable" | "equipment" | "spell";
          }
        | undefined;
    name: string;
    base: ConditionSlug;
    text: string;
    enrichedText?: string;
}
