import { DAMAGE_CATEGORIES, DAMAGE_DIE_FACES, DAMAGE_TYPES } from "./values";

type DamageCategory = SetElement<typeof DAMAGE_CATEGORIES>;
type DamageDieSize = SetElement<typeof DAMAGE_DIE_FACES>;
type DamageType = SetElement<typeof DAMAGE_TYPES>;

export { DamageCategory, DamageDieSize, DamageType };
