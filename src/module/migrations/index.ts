import { MigrationBase } from './base';
import { Migration412MigrateDyingCondition } from './412-migrate-dying-condition';
import { Migration544MigrateStamina } from './544-migrate-stamina';
import { Migration559MigrateNpcItemDamageRolls } from './559-migrate-npc-item-damage-rolls';
import { Migration561MigrateHitpointData } from './561-migrate-hitpoint-data';
import { Migration566MigrateNpcItemAttackEffects } from './566-migrate-npc-item-attack-effects';
import { Migration567MigrateClassDC } from './567-migrate-class-dc';
import { Migration571AddDefaultRarity } from './571-default-rarity';
import { Migration573ActorLanguages } from './573-migrate-actor-languages';
import { Migration574MigrateBulk } from './574-migrate-bulk';
import { Migration576AddCoins } from './576-add-coins';
import { Migration578MigrateItemImagePaths } from './578-migrate-item-image-paths';
import { Migration579AddContainerAttributes } from './579-add-container-attributes';
import { Migration580AddItemRarityAndLevel } from './580-add-item-rarity-and-level';
import { Migration580MigrateOtherSpeeds } from './580-migrate-other-speeds';
import { Migration582AddPotencyRune } from './582-add-potency-rune';
import { Migration583AddHpThresholdHardness } from './583-add-hp-threshold-hardness';
import { Migration583MigrateActorBonusBulk } from './583-migrate-actor-bonus-bulk';
import { Migration584AddEthnicityNationality } from './584-add-ethnicity-nationality';
import { Migration585MigrateCompendiumSettings } from './585-migrate-compendium-settings';
import { Migration586AddSplashDamage } from './586-add-splash-damage';
import { Migration588NpcActionCategory } from './588-migrate-npc-action-category';
import { Migration589SetItemAsIdentified } from './589-set-item-as-identified';
import { Migration591SetOriginalItemName } from './591-set-original-item-name';
import { Migration592CopyIdentificationData } from './592-copy-identification-data';
import { Migration593AddAncestryItem } from './593-make-ancestry-item';
import { Migration594AddBackgroundItem } from './594-make-background-item';
import { Migration595AddItemSize } from './595-item-sizes';
import { Migration596SetSlugSourceIds } from './596-set-slugs-and-sourceIds';
import { Migration597MakeTraitTraitsArrays } from './597-make-trait-traits-string-arrays';
import { Migration598AddClassItem } from './598-make-class-item';
import { Migration599AddTraditionTraits } from './599-add-tradition-traits-to-generated-scrolls-wands';
import { Migration600Reach } from './600-reach';
import { Migration601SplitEffectCompendia } from './601-migrate-effect-compendia';
import { Migration602UpdateDiehardFeat } from './602-update-diehard-feat';
import { Migration603ResetQuickRollDefault } from './603-reset-quick-roll-default';
import { Migration604FixClassItem } from './604-fix-class-items';
import { Migration605CatchUpToTemplateJSON } from './605-catch-up-to-template-json';
import { Migration606SignatureSpells } from './606-signature-spells';
import { Migration607MeleeItemDamageRolls } from './607-melee-item-damage-rolls';
import { Migration608DeletePersistedKits } from './608-delete-persisted-kits';
import { Migration609LootActorTraits } from './609-loot-actor-traits';
import { Migration610SetHeritageFeatType } from './610-set-heritage-feat-type';
import { Migration611UpdateToughnessMountainsStoutness } from './611-update-toughness-mountains-stoutness';
import { Migration612NormalizeRarities } from './612-normalize-rarities';
import { Migration613RemoveAmmoCharges } from '@module/migrations/613-remove-ammo-charges';
import { Migration614NumifyMeleeBonuses } from './614-numify-melee-bonuses';
import { Migration615RemoveInstinctTrait } from '@module/migrations/615-remove-instinct-trait';
import { Migration616MigrateFeatPrerequisites } from './616-migrate-feat-prerequisites';
import { Migration617FixUserFlags } from './617-fix-user-flags';
import { Migration618MigrateItemImagePaths } from '@module/migrations/618-migrate-item-img-paths';
import { Migration619TraditionLowercaseAndRemoveWandScroll } from './619-remove-wand-and-scroll-tradition';
import { Migration620RenameToWebp } from './620-rename-to-webp';
import { Migration621RemoveConfigSpellSchools } from './621-remove-config-spellSchools';
import { Migration622RemoveOldTokenEffectIcons } from '@module/migrations/622-remove-old-token-effect-icons';
import { Migration623NumifyPotencyRunes } from './623-numify-potency-runes';
import { Migration624RemoveTokenEffectIconFlags } from '@module/migrations/624-removed-token-effect-icon-flags';
import { Migration625EnsurePresenceOfSaves } from './625-ensure-presence-of-saves';
import { Migration626UpdateSpellCategory } from './626-update-spell-category';
import { Migration627LowerCaseSpellSaves } from './627-lowercase-spell-saves';

export class Migrations {
    private static list = [
        Migration412MigrateDyingCondition,
        Migration544MigrateStamina,
        Migration559MigrateNpcItemDamageRolls,
        Migration561MigrateHitpointData,
        Migration566MigrateNpcItemAttackEffects,
        Migration567MigrateClassDC,
        Migration571AddDefaultRarity,
        Migration573ActorLanguages,
        Migration574MigrateBulk,
        Migration576AddCoins,
        Migration578MigrateItemImagePaths,
        Migration579AddContainerAttributes,
        Migration580AddItemRarityAndLevel,
        Migration580MigrateOtherSpeeds,
        Migration582AddPotencyRune,
        Migration583AddHpThresholdHardness,
        Migration583MigrateActorBonusBulk,
        Migration584AddEthnicityNationality,
        Migration585MigrateCompendiumSettings,
        Migration586AddSplashDamage,
        Migration588NpcActionCategory,
        Migration589SetItemAsIdentified,
        Migration591SetOriginalItemName,
        Migration592CopyIdentificationData,
        Migration593AddAncestryItem,
        Migration594AddBackgroundItem,
        Migration595AddItemSize,
        Migration596SetSlugSourceIds,
        Migration597MakeTraitTraitsArrays,
        Migration598AddClassItem,
        Migration599AddTraditionTraits,
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
    ];

    static get latestVersion(): number {
        return Math.max(...this.list.map((Migration) => Migration.version));
    }

    static constructAll(): MigrationBase[] {
        return this.list.map((Migration) => new Migration());
    }

    static constructForWorld(version: number): MigrationBase[] {
        return this.list.filter((Migration) => Migration.version > version).map((Migration) => new Migration());
    }
}
