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

export function getAllMigrations() {
    return [
        new Migration412MigrateDyingCondition(),
        new Migration544MigrateStamina(),
        new Migration559MigrateNpcItemDamageRolls(),
        new Migration561MigrateHitpointData(),
        new Migration566MigrateNpcItemAttackEffects(),
        new Migration567MigrateClassDC(),
        new Migration571AddDefaultRarity(),
        new Migration573ActorLanguages(),
        new Migration574MigrateBulk(),
        new Migration576AddCoins(),
        new Migration578MigrateItemImagePaths(),
        new Migration579AddContainerAttributes(),
        new Migration580AddItemRarityAndLevel(),
        new Migration580MigrateOtherSpeeds(),
        new Migration582AddPotencyRune(),
        new Migration583AddHpThresholdHardness(),
        new Migration583MigrateActorBonusBulk(),
        new Migration584AddEthnicityNationality(),
        new Migration585MigrateCompendiumSettings(),
        new Migration586AddSplashDamage(),
        new Migration588NpcActionCategory(),
        new Migration589SetItemAsIdentified(),
        new Migration591SetOriginalItemName(),
        new Migration592CopyIdentificationData(),
    ];
}
