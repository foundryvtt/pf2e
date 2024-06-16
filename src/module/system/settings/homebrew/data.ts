import type { Language } from "@actor/creature/index.ts";
import { LANGUAGES_BY_RARITY, LANGUAGE_RARITIES } from "@actor/creature/values.ts";
import type { BaseWeaponType } from "@item/weapon/types.ts";
import * as R from "remeda";
import type { SetField, StringField } from "types/foundry/common/data/fields.d.ts";
import type { MenuTemplateData, SettingsTemplateData } from "../menu.ts";

const HOMEBREW_TRAIT_KEYS = [
    "creatureTraits",
    "featTraits",
    "languages",
    "spellTraits",
    "weaponCategories",
    "weaponGroups",
    "baseWeapons",
    "weaponTraits",
    "equipmentTraits",
    "environmentTypes",
] as const;

/** Homebrew elements from some of the above records are propagated to related records */
const TRAIT_PROPAGATIONS = {
    actionTraits: ["effectTraits"],
    creatureTraits: ["ancestryTraits"],
    equipmentTraits: ["armorTraits", "consumableTraits"],
    featTraits: ["actionTraits"],
    weaponTraits: ["npcAttackTraits"],
} as const;

type HomebrewTraitKey = (typeof HOMEBREW_TRAIT_KEYS)[number];
type HomebrewKey = HomebrewTraitKey | "damageTypes" | "languageRarities";
type HomebrewTraitSettingsKey = `homebrew.${HomebrewTraitKey}`;

interface HomebrewTag<T extends HomebrewTraitKey = HomebrewTraitKey> {
    id: T extends "baseWeapons"
        ? BaseWeaponType
        : T extends "languages"
          ? LanguageNotCommon
          : T extends Exclude<HomebrewTraitKey, "baseWeapons" | "languages">
            ? keyof (typeof CONFIG.PF2E)[T]
            : never;
    value: string;
}

type MainDamageCategories = "physical" | "energy";

interface CustomDamageData {
    label: string;
    category?: MainDamageCategories | null;
    icon: string | null;
}

interface HomebrewElementsSheetData extends MenuTemplateData {
    campaignSettings: Record<string, SettingsTemplateData>;
    traitSettings: Record<string, SettingsTemplateData>;
    languageRarities: LanguageSettingsSheetData;
    damageCategories: Record<MainDamageCategories, string>;
    customDamageTypes: CustomDamageData[];
}

interface LanguageSettingsSheetData {
    commonLanguage: LanguageNotCommon | null;
    common: { slug: LanguageNotCommon; label: string }[];
    uncommon: { slug: LanguageNotCommon; label: string }[];
    rare: { slug: LanguageNotCommon; label: string }[];
    secret: { slug: LanguageNotCommon; label: string }[];
}

type LanguageNotCommon = Exclude<Language, "common">;

class LanguageSettings extends foundry.abstract.DataModel<null, LanguageSettingsSchema> {
    /** Common-rarity languages: those not classified among the subsequent rarities */
    declare common: Set<LanguageNotCommon>;

    /** Homebrew languages created by the GM */
    declare homebrew: Set<LanguageNotCommon>;

    protected override _initialize(options?: Record<string, unknown>): void {
        super._initialize(options);

        const nonCommonLanguages = new Set([...this.uncommon, ...this.rare, ...this.secret, ...this.unavailable]);
        this.common = new Set(
            R.keys
                .strict(CONFIG.PF2E.languages)
                .filter((l): l is LanguageNotCommon => l !== "common" && !nonCommonLanguages.has(l)),
        );
        this.homebrew = new Set(game.settings.get("pf2e", "homebrew.languages").map((t) => t.id));
    }

    static override defineSchema(): LanguageSettingsSchema {
        const fields = foundry.data.fields;

        const languageSetField = (initial: LanguageNotCommon[]): LanguageSetField =>
            new fields.SetField(
                new fields.StringField<LanguageNotCommon, LanguageNotCommon, true, false, false>({
                    required: true,
                    nullable: false,
                    blank: false,
                    initial: undefined,
                }),
                { required: true, nullable: false, initial },
            );

        return {
            commonLanguage: new fields.StringField({
                required: true,
                nullable: true,
                blank: false,
                initial: "taldane",
            }),
            uncommon: languageSetField([...LANGUAGES_BY_RARITY.uncommon]),
            rare: languageSetField([...LANGUAGES_BY_RARITY.rare]),
            secret: languageSetField([...LANGUAGES_BY_RARITY.secret]),
            unavailable: languageSetField([]),
        };
    }

    /** Include common languages in the non-source raw object. */
    override toObject(source?: true): this["_source"];
    override toObject(source: false): RawLanguageSettings<this>;
    override toObject(source?: boolean): this["_source"] | RawLanguageSettings<this>;
    override toObject(source?: boolean): this["_source"] | RawLanguageSettings {
        const obj = super.toObject(source);
        return source
            ? obj
            : {
                  ...obj,
                  common: Array.from(this.common),
                  homebrew: Array.from(this.homebrew),
              };
    }

    /** Schema-restricting choices removes homebrew languages before they're registered: prune in ready hook instead. */
    onReady(): void {
        const source = this._source;
        for (const rarity of [...LANGUAGE_RARITIES, "unavailable"] as const) {
            if (rarity === "common") continue;
            source[rarity] = source[rarity].filter((l) => l in CONFIG.PF2E.languages);
        }
        this.reset();
    }
}

interface LanguageSettings
    extends foundry.abstract.DataModel<null, LanguageSettingsSchema>,
        ModelPropsFromSchema<LanguageSettingsSchema> {}

type LanguageSettingsSchema = {
    /** The "common" tongue of the region, rather than languages of common rarity */
    commonLanguage: StringField<LanguageNotCommon, LanguageNotCommon, true, true, true>;
    /** Languages of uncommon rarity */
    uncommon: LanguageSetField;
    /** Languages of rare rarity */
    rare: LanguageSetField;
    /** "Secret" languages (Wildsong) */
    secret: LanguageSetField;
    /** Languages not available for use on any creature */
    unavailable: LanguageSetField;
};

type LanguageSetField = SetField<
    StringField<LanguageNotCommon, LanguageNotCommon, true, false, false>,
    LanguageNotCommon[],
    Set<LanguageNotCommon>,
    true,
    false,
    true
>;

type RawLanguageSettings<TModel extends LanguageSettings = LanguageSettings> = RawObject<TModel> & {
    common: LanguageNotCommon[];
    homebrew: LanguageNotCommon[];
};

export { HOMEBREW_TRAIT_KEYS, LanguageSettings, TRAIT_PROPAGATIONS };
export type {
    CustomDamageData,
    HomebrewElementsSheetData,
    HomebrewKey,
    HomebrewTag,
    HomebrewTraitKey,
    HomebrewTraitSettingsKey,
    LanguageNotCommon,
    LanguageSettingsSheetData,
};
