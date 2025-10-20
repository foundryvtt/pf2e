import type { SkillSlug } from "@actor/types.ts";
import { RARITIES, type Rarity, type ZeroToFour } from "./data.ts";
import fields = foundry.data.fields;

class RarityField extends fields.StringField<Rarity, Rarity, true, false, true> {
    constructor() {
        super({ required: true, nullable: false, choices: RARITIES, initial: "common" });
    }
}

class ProficiencyRankField extends fields.NumberField<ZeroToFour, ZeroToFour, true, false, true> {
    constructor() {
        super({
            min: 0,
            max: 4,
            integer: true,
            required: true,
            nullable: false,
            initial: 0,
        });
    }
}

class PublicationField extends fields.SchemaField<
    PublicationSchema,
    fields.SourceFromSchema<PublicationSchema>,
    fields.ModelPropsFromSchema<PublicationSchema>,
    true,
    false,
    true
> {
    constructor() {
        super({
            title: new fields.StringField({ required: true, nullable: false, initial: "" }),
            authors: new fields.StringField({ required: true, nullable: false, initial: "" }),
            license: new fields.StringField({
                required: true,
                nullable: false,
                choices: ["OGL", "ORC"],
                initial: "OGL",
            }),
            remaster: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        });
    }
}

/** Schema definition for an actor's sourcebook */
type PublicationSchema = {
    title: fields.StringField<string, string, true, false, true>;
    authors: fields.StringField<string, string, true, false, true>;
    license: fields.StringField<"ORC" | "OGL", "ORC" | "OGL", true, false, true>;
    remaster: fields.BooleanField;
};

const SKILL_ABBREVIATIONS = [
    "acr",
    "arc",
    "ath",
    "cra",
    "dec",
    "dip",
    "itm",
    "med",
    "nat",
    "occ",
    "prf",
    "rel",
    "soc",
    "ste",
    "sur",
    "thi",
];

/**
 * A function to generate choices for data models that include both old and new skill slugs, for compatibility purposes.
 * @todo: remove once migrations are functional for structural changes
 */
function getCompatSkills(): SkillSlug[] {
    return [...SKILL_ABBREVIATIONS, ...Object.keys(CONFIG.PF2E.skills)] as unknown as SkillSlug[];
}

export { getCompatSkills, ProficiencyRankField, PublicationField, RarityField };
