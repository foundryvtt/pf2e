import { MigrationBase } from './base';
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
import { Migration628UpdateIdentificationData } from './628-update-identification-data';
import { Migration629SetBaseItems } from './629-set-base-items';
import { Migration630FixTalismanSpelling } from './630-fix-talisman-spelling';
import { Migration631FixSenseRuleElementSelector } from '@module/migrations/631-fix-sense-rule-element-selector';
import { Migration632DeleteOrphanedSpells } from './632-delete-orphaned-spells';
import { Migration633DeleteUnidentifiedTraits } from './633-delete-unidentified-traits';

export class Migrations {
    private static list = [
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
        Migration628UpdateIdentificationData,
        Migration629SetBaseItems,
        Migration630FixTalismanSpelling,
        Migration631FixSenseRuleElementSelector,
        Migration632DeleteOrphanedSpells,
        Migration633DeleteUnidentifiedTraits,
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
