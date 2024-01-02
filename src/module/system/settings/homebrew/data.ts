import type { Language } from "@actor/creature/index.ts";
import { LANGUAGES_BY_RARITY } from "@actor/creature/values.ts";
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
] as const;

/** Homebrew elements from some of the above records are propagated to related records */
const TRAIT_PROPAGATIONS = {
    creatureTraits: ["ancestryTraits"],
    equipmentTraits: ["armorTraits", "consumableTraits"],
    featTraits: ["actionTraits"],
    weaponTraits: ["npcAttackTraits"],
} as const;

type HomebrewTraitKey = (typeof HOMEBREW_TRAIT_KEYS)[number];
type HomebrewKey = HomebrewTraitKey | "damageTypes";
type HomebrewTraitSettingsKey = `homebrew.${HomebrewTraitKey}`;

interface HomebrewTag<T extends HomebrewTraitKey = HomebrewTraitKey> {
    id: T extends "baseWeapons"
        ? BaseWeaponType
        : T extends Exclude<HomebrewTraitKey, "baseWeapons">
          ? keyof ConfigPF2e["PF2E"][T]
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
    traitSettings: Record<string, SettingsTemplateData>;
    damageCategories: Record<MainDamageCategories, string>;
    customDamageTypes: CustomDamageData[];
}

type LanguageNotCommon = Exclude<Language, "common">;

class LanguageRaritiesData extends foundry.abstract.DataModel<null, LanguageRaritiesSchema> {
    /** Common-rarity languages: those not classified among the subsequent rarities */
    declare common: Set<LanguageNotCommon>;

    protected override _initialize(options?: Record<string, unknown>): void {
        super._initialize(options);

        this.common = new Set(
            R.keys
                .strict(CONFIG.PF2E.languages)
                .filter(
                    (l): l is LanguageNotCommon =>
                        l !== "common" && !this.uncommon.has(l) && !this.rare.has(l) && !this.secret.has(l),
                ),
        );
    }

    static override defineSchema(): LanguageRaritiesSchema {
        const fields = foundry.data.fields;

        const languageSetField = (initial: LanguageNotCommon[]): LanguageSetField =>
            new fields.SetField(
                new fields.StringField<LanguageNotCommon, LanguageNotCommon, true, false, false>({
                    required: true,
                    nullable: false,
                    choices: () => R.omit(CONFIG.PF2E.languages, ["common"]),
                    initial: undefined,
                }),
                {
                    required: true,
                    nullable: false,
                    initial,
                },
            );

        return {
            commonLanguage: new fields.StringField({
                required: true,
                nullable: false,
                choices: () => R.omit(CONFIG.PF2E.languages, ["common"]),
                initial: "taldane",
            }),
            uncommon: languageSetField([...LANGUAGES_BY_RARITY.uncommon]),
            rare: languageSetField([...LANGUAGES_BY_RARITY.rare]),
            secret: languageSetField([...LANGUAGES_BY_RARITY.secret]),
            hidden: languageSetField([]),
        };
    }
}

interface LanguageRaritiesData
    extends foundry.abstract.DataModel<null, LanguageRaritiesSchema>,
        ModelPropsFromSchema<LanguageRaritiesSchema> {}

type LanguageRaritiesSchema = {
    /** The "common" tongue of the region, rather than languages of common rarity */
    commonLanguage: StringField<LanguageNotCommon, LanguageNotCommon, true, false, true>;
    /** Languages of uncommon rarity */
    uncommon: LanguageSetField;
    /** Languages of rare rarity */
    rare: LanguageSetField;
    /** "Secret" languages (Wildsong) */
    secret: LanguageSetField;
    /** Languages hidden from player view in the language selector */
    hidden: LanguageSetField;
};

type LanguageSetField = SetField<
    StringField<LanguageNotCommon, LanguageNotCommon, true, false, false>,
    LanguageNotCommon[],
    Set<LanguageNotCommon>,
    true,
    false,
    true
>;

export { HOMEBREW_TRAIT_KEYS, LanguageRaritiesData, TRAIT_PROPAGATIONS };
export type {
    CustomDamageData,
    HomebrewElementsSheetData,
    HomebrewKey,
    HomebrewTag,
    HomebrewTraitKey,
    HomebrewTraitSettingsKey,
    LanguageNotCommon,
};
