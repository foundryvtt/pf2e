import { MigrationBase } from "./base";
import { MigrationRunner } from "./runner";
import { Migration600Reach } from "./migrations/600-reach";
import { Migration601SplitEffectCompendia } from "./migrations/601-migrate-effect-compendia";
import { Migration602UpdateDiehardFeat } from "./migrations/602-update-diehard-feat";
import { Migration603ResetQuickRollDefault } from "./migrations/603-reset-quick-roll-default";
import { Migration604FixClassItem } from "./migrations/604-fix-class-items";
import { Migration605CatchUpToTemplateJSON } from "./migrations/605-catch-up-to-template-json";
import { Migration606SignatureSpells } from "./migrations/606-signature-spells";
import { Migration607MeleeItemDamageRolls } from "./migrations/607-melee-item-damage-rolls";
import { Migration608DeletePersistedKits } from "./migrations/608-delete-persisted-kits";
import { Migration609LootActorTraits } from "./migrations/609-loot-actor-traits";
import { Migration610SetHeritageFeatType } from "./migrations/610-set-heritage-feat-type";
import { Migration611UpdateToughnessMountainsStoutness } from "./migrations/611-update-toughness-mountains-stoutness";
import { Migration612NormalizeRarities } from "./migrations/612-normalize-rarities";
import { Migration613RemoveAmmoCharges } from "./migrations/613-remove-ammo-charges";
import { Migration614NumifyMeleeBonuses } from "./migrations/614-numify-melee-bonuses";
import { Migration615RemoveInstinctTrait } from "./migrations/615-remove-instinct-trait";
import { Migration616MigrateFeatPrerequisites } from "./migrations/616-migrate-feat-prerequisites";
import { Migration617FixUserFlags } from "./migrations/617-fix-user-flags";
import { Migration618MigrateItemImagePaths } from "./migrations/618-migrate-item-img-paths";
import { Migration619TraditionLowercaseAndRemoveWandScroll } from "./migrations/619-remove-wand-and-scroll-tradition";
import { Migration620RenameToWebp } from "./migrations/620-rename-to-webp";
import { Migration621RemoveConfigSpellSchools } from "./migrations/621-remove-config-spell-schools";
import { Migration622RemoveOldTokenEffectIcons } from "./migrations/622-remove-old-token-effect-icons";
import { Migration623NumifyPotencyRunes } from "./migrations/623-numify-potency-runes";
import { Migration624RemoveTokenEffectIconFlags } from "./migrations/624-removed-token-effect-icon-flags";
import { Migration625EnsurePresenceOfSaves } from "./migrations/625-ensure-presence-of-saves";
import { Migration626UpdateSpellCategory } from "./migrations/626-update-spell-category";
import { Migration627LowerCaseSpellSaves } from "./migrations/627-lowercase-spell-saves";
import { Migration628UpdateIdentificationData } from "./migrations/628-update-identification-data";
import { Migration629SetBaseItems } from "./migrations/629-set-base-items";
import { Migration630FixTalismanSpelling } from "./migrations/630-fix-talisman-spelling";
import { Migration631FixSenseRuleElementSelector } from "./migrations/631-fix-sense-rule-element-selector";
import { Migration632DeleteOrphanedSpells } from "./migrations/632-delete-orphaned-spells";
import { Migration633DeleteUnidentifiedTraits } from "./migrations/633-delete-unidentified-traits";
import { Migration634PurgeMartialItems } from "./migrations/634-purge-martial-items";
import { Migration635NumifyACAndQuantity } from "./migrations/635-numify-ac-and-quantity";
import { Migration636NumifyArmorData } from "./migrations/636-numify-armor-data";
import { Migration637CleanMeleeItems } from "./migrations/637-clean-melee-items";
import { Migration638SpellComponents } from "./migrations/638-spell-components";
import { Migration639NormalizeLevelAndPrice } from "./migrations/639-normalize-level-and-price";
import { Migration640CantripsAreNotZeroLevel } from "./migrations/640-cantrips-are-not-zero-level";
import { Migration641SovereignSteelValue } from "./migrations/641-sovereign-steel-value";
import { Migration642TrackSchemaVersion } from "./migrations/642-track-schema-version";
import { Migration643HazardLevel } from "./migrations/643-hazard-level";
import { Migration644SpellcastingCategory } from "./migrations/644-spellcasting-category";
import { Migration645TokenImageSize } from "./migrations/645-token-image-size";
import { Migration646UpdateInlineLinks } from "./migrations/646-update-inline-links";
import { Migration647FixPCSenses } from "./migrations/647-fix-pc-senses";
import { Migration648RemoveInvestedProperty } from "./migrations/648-remove-invested-property";
import { Migration649FocusToActor } from "@module/migration/migrations/649-focus-to-actor";
import { Migration650StringifyWeaponProperties } from "./migrations/650-stringify-weapon-properties";
import { Migration651EphemeralFocusPool } from "./migrations/651-ephemeral-focus-pool";
import { Migration652KillHalcyonTradition } from "@module/migration/migrations/652-kill-halcyon-tradition";
import { Migration653AEstoREs } from "./migrations/653-aes-to-res";
import { Migration654ActionTypeAndCount } from "@module/migration/migrations/654-action-type-count";
import { Migration655CreatureTokenSizes } from "./migrations/655-creature-token-sizes";
import { Migration656OtherFocusPoolSources } from "./migrations/656-other-focus-pool-sources";
import { Migration657RemoveSetProperty } from "./migrations/657-remove-set-property";
import { Migration658MonkUnarmoredProficiency } from "./migrations/658-monk-unarmored-proficiency";
import { Migration659MultipleDamageRows } from "./migrations/659-multiple-damage-rows";
import { Migration660DerivedSpellTraits } from "./migrations/660-derived-spell-traits";
import { Migration661NumifyVehicleDimensions } from "./migrations/661-numify-vehicle-dimensions";
import { Migration662LinkToActorSizeDefaults } from "./migrations/662-link-to-actor-size-defaults";
import { Migration663FixSpellDamage } from "./migrations/663-fix-spell-damage";
import { Migration664DeleteCUBConditions } from "./migrations/664-delete-cub-conditions";
import { Migration665HandwrapsCorrections } from "./migrations/665-handwraps-corrections";
import { Migration666UsageAndStowingContainers } from "./migrations/666-usage-and-stowing-containers";
import { Migration667HPSubProperties } from "./migrations/667-hp-subproperties";
import { Migration668ArmorSpeedPenalty } from "./migrations/668-armor-speed-penalty";
import { Migration669NPCAttackEffects } from "./migrations/669-npc-attack-effects";
import { Migration670NoCustomTrait } from "./migrations/670-no-custom-trait";
import { Migration670AncestryVision } from "./migrations/670-ancestry-vision";
import { Migration671NoPCItemsOnNonPCs } from "./migrations/671-no-pc-items-on-non-pcs";
import { Migration672RemoveNPCBaseProperties } from "./migrations/672-remove-npc-base-properties";
import { Migration673RemoveBulwarkREs } from "./migrations/673-remove-bulwark-res";
import { Migration674StableHomebrewTagIDs } from "./migrations/674-stable-homebrew-tag-ids";
import { Migration675FlatModifierAEsToREs } from "./migrations/675-flat-modifier-aes-to-res";
import { Migration676ReplaceItemsWithRELikeAEs } from "./migrations/676-replace-items-with-re-like-aes";
import { Migration677RuleValueDataRefs } from "./migrations/677-rule-value-data-refs";
import { Migration678SeparateNPCAttackTraits } from "./migrations/678-separate-npc-attack-traits";
import { Migration679TowerShieldSpeedPenalty } from "./migrations/679-tower-shield-speed-penalty";
import { Migration680SetWeaponHands } from "./migrations/680-set-weapon-hands";
import { Migration681GiantLanguageToJotun } from "./migrations/681-giant-language-to-jotun";
import { Migration682BiographyFields } from "./migrations/682-biography-fields";
import { Migration683FlavorTextToPublicNotes } from "./migrations/683-flavortext-to-public-notes";
import { Migration684RationsToConsumable } from "./migrations/684-rations-to-consumable";
import { Migration685FixMeleeUsageTraits } from "./migrations/685-fix-melee-usage-traits";
import { Migration686HeroPointsToResources } from "./migrations/686-hero-points-to-resources";
import { Migration687FamiliarityAEsToREs } from "./migrations/687-familiarity-aes-to-res";
import { Migration688ClampSpellLevel } from "./migrations/688-clamp-spell-level";
import { Migration689EncumberanceActiveEffects } from "./migrations/689-encumberance-aes";
import { Migration690InitiativeTiebreakItems } from "./migrations/690-tiebreak-items";
import { Migration691WeaponRangeAbilityCategoryGroup } from "./migrations/691-weapon-range-ability-category-group";
import { Migration692CraftingEntryFeatReplacement } from "./migrations/692-crafting-entry-feat-replacement";
import { Migration693ArmorCategoryGroup } from "./migrations/693-armor-category-group";
import { Migration694RetireSystemTokenSettings } from "./migrations/694-retire-system-token-settings";
import { Migration695SummonToSummoned } from "./migrations/695-summon-to-summoned";
import { Migration696FlatAbilityModifiers } from "./migrations/696-flat-ability-modifiers";
import { Migration697WeaponReachTrait } from "./migrations/697-weapon-reach-trait";
export { MigrationRunner } from "./runner";

export class Migrations {
    private static list = [
        Migration600Reach,
        Migration601SplitEffectCompendia,
        Migration602UpdateDiehardFeat,
        Migration603ResetQuickRollDefault,
        Migration604FixClassItem,
        Migration605CatchUpToTemplateJSON,
        Migration606SignatureSpells,
        Migration607MeleeItemDamageRolls,
        Migration608DeletePersistedKits,
        Migration609LootActorTraits,
        Migration610SetHeritageFeatType,
        Migration611UpdateToughnessMountainsStoutness,
        Migration612NormalizeRarities,
        Migration613RemoveAmmoCharges,
        Migration614NumifyMeleeBonuses,
        Migration615RemoveInstinctTrait,
        Migration616MigrateFeatPrerequisites,
        Migration617FixUserFlags,
        Migration618MigrateItemImagePaths,
        Migration619TraditionLowercaseAndRemoveWandScroll,
        Migration620RenameToWebp,
        Migration621RemoveConfigSpellSchools,
        Migration622RemoveOldTokenEffectIcons,
        Migration623NumifyPotencyRunes,
        Migration624RemoveTokenEffectIconFlags,
        Migration625EnsurePresenceOfSaves,
        Migration626UpdateSpellCategory,
        Migration627LowerCaseSpellSaves,
        Migration628UpdateIdentificationData,
        Migration629SetBaseItems,
        Migration630FixTalismanSpelling,
        Migration631FixSenseRuleElementSelector,
        Migration632DeleteOrphanedSpells,
        Migration633DeleteUnidentifiedTraits,
        Migration634PurgeMartialItems,
        Migration635NumifyACAndQuantity,
        Migration636NumifyArmorData,
        Migration637CleanMeleeItems,
        Migration638SpellComponents,
        Migration639NormalizeLevelAndPrice,
        Migration640CantripsAreNotZeroLevel,
        Migration641SovereignSteelValue,
        Migration642TrackSchemaVersion,
        Migration643HazardLevel,
        Migration644SpellcastingCategory,
        Migration645TokenImageSize,
        Migration646UpdateInlineLinks,
        Migration647FixPCSenses,
        Migration648RemoveInvestedProperty,
        Migration649FocusToActor,
        Migration650StringifyWeaponProperties,
        Migration651EphemeralFocusPool,
        Migration652KillHalcyonTradition,
        Migration653AEstoREs,
        Migration654ActionTypeAndCount,
        Migration655CreatureTokenSizes,
        Migration656OtherFocusPoolSources,
        Migration657RemoveSetProperty,
        Migration658MonkUnarmoredProficiency,
        Migration659MultipleDamageRows,
        Migration660DerivedSpellTraits,
        Migration661NumifyVehicleDimensions,
        Migration662LinkToActorSizeDefaults,
        Migration663FixSpellDamage,
        Migration664DeleteCUBConditions,
        Migration665HandwrapsCorrections,
        Migration666UsageAndStowingContainers,
        Migration667HPSubProperties,
        Migration668ArmorSpeedPenalty,
        Migration669NPCAttackEffects,
        Migration670NoCustomTrait,
        Migration670AncestryVision,
        Migration671NoPCItemsOnNonPCs,
        Migration672RemoveNPCBaseProperties,
        Migration673RemoveBulwarkREs,
        Migration674StableHomebrewTagIDs,
        Migration675FlatModifierAEsToREs,
        Migration676ReplaceItemsWithRELikeAEs,
        Migration677RuleValueDataRefs,
        Migration678SeparateNPCAttackTraits,
        Migration679TowerShieldSpeedPenalty,
        Migration680SetWeaponHands,
        Migration681GiantLanguageToJotun,
        Migration682BiographyFields,
        Migration683FlavorTextToPublicNotes,
        Migration684RationsToConsumable,
        Migration685FixMeleeUsageTraits,
        Migration686HeroPointsToResources,
        Migration687FamiliarityAEsToREs,
        Migration688ClampSpellLevel,
        Migration689EncumberanceActiveEffects,
        Migration690InitiativeTiebreakItems,
        Migration691WeaponRangeAbilityCategoryGroup,
        Migration692CraftingEntryFeatReplacement,
        Migration693ArmorCategoryGroup,
        Migration694RetireSystemTokenSettings,
        Migration695SummonToSummoned,
        Migration696FlatAbilityModifiers,
        Migration697WeaponReachTrait,
    ];

    static get latestVersion(): number {
        return Math.max(...this.list.map((Migration) => Migration.version));
    }

    static constructAll(): MigrationBase[] {
        return this.list.map((Migration) => new Migration());
    }

    static constructFromVersion(version: number = MigrationRunner.RECOMMENDED_SAFE_VERSION): MigrationBase[] {
        return this.list.filter((Migration) => Migration.version > version).map((Migration) => new Migration());
    }

    static constructRange(min: number, max = Infinity): MigrationBase[] {
        return this.list
            .filter((Migration) => Migration.version >= min && Migration.version <= max)
            .map((Migration) => new Migration());
    }
}
