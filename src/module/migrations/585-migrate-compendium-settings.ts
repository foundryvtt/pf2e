import { MigrationBase } from './base';

export class Migration585MigrateCompendiumSettings extends MigrationBase {
    static version = 0.585;

    async migrate() {
        for (const scope of ['FeatBrowser', 'SpellBrowser', 'InventoryBrowser', 'BestiaryBrowser', 'ActionBrowser']) {
            game.settings.register(scope, 'settings', {
                name: 'Feat Browser Settings',
                default: '{}',
                type: String,
                scope: 'world',
            });
        }

        game.settings.set(
            'pf2e',
            'compendiumBrowserPacks',
            JSON.stringify({
                action: JSON.parse(game.settings.get('ActionBrowser', 'settings')),
                bestiary: JSON.parse(game.settings.get('BestiaryBrowser', 'settings')),
                equipment: JSON.parse(game.settings.get('InventoryBrowser', 'settings')),
                feat: JSON.parse(game.settings.get('FeatBrowser', 'settings')),
                spell: JSON.parse(game.settings.get('SpellBrowser', 'settings')),
            }),
        );
        game.pf2e.compendiumBrowser.initCompendiumList();
    }
}
