import { DC_SLUGS, SAVE_TYPES, SKILL_LONG_FORMS } from "./values";

type SaveType = typeof SAVE_TYPES[number];

type SkillLongForm = SetElement<typeof SKILL_LONG_FORMS>;

type DCSlug = SetElement<typeof DC_SLUGS>;

export { DCSlug, SaveType, SkillLongForm };
