import { MigrationBase } from "./base";
import { MigrationRunner } from "./runner";
import * as Migrations from "./migrations";
export { MigrationRunner } from "./runner";

export class MigrationList {
    private static list = [
        Migrations.Migration600Reach,
        Migrations.Migration601SplitEffectCompendia,
        Migrations.Migration602UpdateDiehardFeat,
        Migrations.Migration603ResetQuickRollDefault,
        Migrations.Migration604FixClassItem,
        Migrations.Migration605CatchUpToTemplateJSON,
        Migrations.Migration606SignatureSpells,
        Migrations.Migration607MeleeItemDamageRolls,
        Migrations.Migration608DeletePersistedKits,
        Migrations.Migration609LootActorTraits,
        Migrations.Migration610SetHeritageFeatType,
        Migrations.Migration611UpdateToughnessMountainsStoutness,
        Migrations.Migration612NormalizeRarities,
        Migrations.Migration613RemoveAmmoCharges,
        Migrations.Migration614NumifyMeleeBonuses,
        Migrations.Migration615RemoveInstinctTrait,
        Migrations.Migration616MigrateFeatPrerequisites,
        Migrations.Migration617FixUserFlags,
        Migrations.Migration618MigrateItemImagePaths,
        Migrations.Migration619TraditionLowercaseAndRemoveWandScroll,
        Migrations.Migration620RenameToWebp,
        Migrations.Migration621RemoveConfigSpellSchools,
        Migrations.Migration622RemoveOldTokenEffectIcons,
        Migrations.Migration623NumifyPotencyRunes,
        Migrations.Migration624RemoveTokenEffectIconFlags,
        Migrations.Migration625EnsurePresenceOfSaves,
        Migrations.Migration626UpdateSpellCategory,
        Migrations.Migration627LowerCaseSpellSaves,
        Migrations.Migration628UpdateIdentificationData,
        Migrations.Migration629SetBaseItems,
        Migrations.Migration630FixTalismanSpelling,
        Migrations.Migration631FixSenseRuleElementSelector,
        Migrations.Migration632DeleteOrphanedSpells,
        Migrations.Migration633DeleteUnidentifiedTraits,
        Migrations.Migration634PurgeMartialItems,
        Migrations.Migration635NumifyACAndQuantity,
        Migrations.Migration636NumifyArmorData,
        Migrations.Migration637CleanMeleeItems,
        Migrations.Migration638SpellComponents,
        Migrations.Migration639NormalizeLevelAndPrice,
        Migrations.Migration640CantripsAreNotZeroLevel,
        Migrations.Migration641SovereignSteelValue,
        Migrations.Migration642TrackSchemaVersion,
        Migrations.Migration643HazardLevel,
        Migrations.Migration644SpellcastingCategory,
        Migrations.Migration645TokenImageSize,
        Migrations.Migration646UpdateInlineLinks,
        Migrations.Migration647FixPCSenses,
        Migrations.Migration648RemoveInvestedProperty,
        Migrations.Migration649FocusToActor,
        Migrations.Migration650StringifyWeaponProperties,
        Migrations.Migration651EphemeralFocusPool,
        Migrations.Migration652KillHalcyonTradition,
        Migrations.Migration653AEstoREs,
        Migrations.Migration654ActionTypeAndCount,
        Migrations.Migration655CreatureTokenSizes,
        Migrations.Migration656OtherFocusPoolSources,
        Migrations.Migration657RemoveSetProperty,
        Migrations.Migration658MonkUnarmoredProficiency,
        Migrations.Migration659MultipleDamageRows,
        Migrations.Migration660DerivedSpellTraits,
        Migrations.Migration661NumifyVehicleDimensions,
        Migrations.Migration662LinkToActorSizeDefaults,
        Migrations.Migration663FixSpellDamage,
        Migrations.Migration664DeleteCUBConditions,
        Migrations.Migration665HandwrapsCorrections,
        Migrations.Migration666UsageAndStowingContainers,
        Migrations.Migration667HPSubProperties,
        Migrations.Migration668ArmorSpeedPenalty,
        Migrations.Migration669NPCAttackEffects,
        Migrations.Migration670NoCustomTrait,
        Migrations.Migration670AncestryVision,
        Migrations.Migration671NoPCItemsOnNonPCs,
        Migrations.Migration672RemoveNPCBaseProperties,
        Migrations.Migration673RemoveBulwarkREs,
        Migrations.Migration674StableHomebrewTagIDs,
        Migrations.Migration675FlatModifierAEsToREs,
        Migrations.Migration676ReplaceItemsWithRELikeAEs,
        Migrations.Migration677RuleValueDataRefs,
        Migrations.Migration678SeparateNPCAttackTraits,
        Migrations.Migration679TowerShieldSpeedPenalty,
        Migrations.Migration680SetWeaponHands,
        Migrations.Migration681GiantLanguageToJotun,
        Migrations.Migration682BiographyFields,
        Migrations.Migration683FlavorTextToPublicNotes,
        Migrations.Migration684RationsToConsumable,
        Migrations.Migration685FixMeleeUsageTraits,
        Migrations.Migration686HeroPointsToResources,
        Migrations.Migration687FamiliarityAEsToREs,
        Migrations.Migration688ClampSpellLevel,
        Migrations.Migration689EncumberanceActiveEffects,
        Migrations.Migration690InitiativeTiebreakItems,
        Migrations.Migration691WeaponRangeAbilityCategoryGroup,
        Migrations.Migration692CraftingEntryFeatReplacement,
        Migrations.Migration693ArmorCategoryGroup,
        Migrations.Migration694RetireSystemTokenSettings,
        Migrations.Migration695SummonToSummoned,
        Migrations.Migration696FlatAbilityModifiers,
        Migrations.Migration697WeaponReachTrait,
        Migrations.Migration698RemoveDerivedActorTraits,
        Migrations.Migration699ItemDescriptionEmptyString,
        Migrations.Migration700SingleClassFeatures,
        Migrations.Migration701ModifierNameToSlug,
        Migrations.Migration702REFormulasAtInstanceLevel,
        Migrations.Migration703SpellDamageStructure,
        Migrations.Migration704MartialProficiencyRE,
        Migrations.Migration705GunslingerCatchUp,
        Migrations.Migration706FormulasAtInstanceLevelEverythingElse,
        Migrations.Migration707BracketedFormulasAtInstanceLevel,
        Migrations.Migration708SpecificRuleLabel,
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
