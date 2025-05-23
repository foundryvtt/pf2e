import type { Rarity } from "./data.ts";
import fields = foundry.data.fields;

class RarityField extends fields.StringField<Rarity, Rarity, true, false, true> {
    constructor() {
        const rarityChoices: Record<Rarity, string> = CONFIG.PF2E.rarityTraits;
        super({ required: true, nullable: false, choices: rarityChoices, initial: "common" });
    }
}

class PublicationField extends fields.SchemaField<
    PublicationSchema,
    SourceFromSchema<PublicationSchema>,
    ModelPropsFromSchema<PublicationSchema>,
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
                choices: ["OGL", "ORC", "PFI"],
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
    license: fields.StringField<"ORC" | "OGL" | "PFI", "ORC" | "OGL" | "PFI", true, false, true>;
    remaster: fields.BooleanField;
};

export { PublicationField, RarityField };
