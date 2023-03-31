import { CONDITION_SLUGS } from "./values";

type ConditionSlug = SetElement<typeof CONDITION_SLUGS>;
type DetectionConditionType = Extract<ConditionSlug, "hidden" | "observed" | "undetected" | "unnoticed">;
type ConditionKey = ConditionSlug | `persistent-damage-${string}`;

export { DetectionConditionType, ConditionSlug, ConditionKey };
