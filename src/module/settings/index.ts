import { compendiumBrowser } from '../packs/compendium-browser';
import { VariantRulesSettings } from './variant-rules';
import { Migrations } from '../migrations';
import { WorldClockSettings } from './world-clock';

export function registerSettings() {
    game.settings.register('pf2e', 'worldSchemaVersion', {
        name: game.i18n.localize('PF2E.SETTINGS.WorldSchemaVersion.Name'),
        hint: game.i18n.localize('PF2E.SETTINGS.WorldSchemaVersion.Hint'),
        scope: 'world',
        config: true,
        default: Migrations.latestVersion,
        type: Number,
    });
    game.settings.register('pf2e', 'defaultTokenSettings', {
        name: game.i18n.localize('PF2E.SETTINGS.DefaultTokenSettings.Name'),
        hint: game.i18n.localize('PF2E.SETTINGS.DefaultTokenSettings.Hint'),
        scope: 'world',
        config: true,
        default: true,
        type: Boolean,
    });
    game.settings.register('pf2e', 'defaultTokenSettingsName', {
        name: game.i18n.localize('PF2E.SETTINGS.DefaultTokenSettingsName.Name'),
        hint: game.i18n.localize('PF2E.SETTINGS.DefaultTokenSettingsName.Hint'),
        scope: 'world',
        config: true,
        default: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
        type: Number,
        choices: {
            [CONST.TOKEN_DISPLAY_MODES.NONE]: game.i18n.localize('PF2E.SETTINGS.DefaultTokenSettingsName.Choices.NONE'),
            [CONST.TOKEN_DISPLAY_MODES.CONTROL]: game.i18n.localize(
                'PF2E.SETTINGS.DefaultTokenSettingsName.Choices.CONTROL',
            ),
            [CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER]: game.i18n.localize(
                'PF2E.SETTINGS.DefaultTokenSettingsName.Choices.OWNER_HOVER',
            ),
            [CONST.TOKEN_DISPLAY_MODES.HOVER]: game.i18n.localize(
                'PF2E.SETTINGS.DefaultTokenSettingsName.Choices.HOVER',
            ),
            [CONST.TOKEN_DISPLAY_MODES.OWNER]: game.i18n.localize(
                'PF2E.SETTINGS.DefaultTokenSettingsName.Choices.OWNER',
            ),
            [CONST.TOKEN_DISPLAY_MODES.ALWAYS]: game.i18n.localize(
                'PF2E.SETTINGS.DefaultTokenSettingsName.Choices.ALWAYS',
            ),
        },
    });
    game.settings.register('pf2e', 'defaultTokenSettingsBar', {
        name: game.i18n.localize('PF2E.SETTINGS.DefaultTokenSettingsBar.Name'),
        hint: game.i18n.localize('PF2E.SETTINGS.DefaultTokenSettingsBar.Hint'),
        scope: 'world',
        config: true,
        default: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
        type: Number,
        choices: {
            [CONST.TOKEN_DISPLAY_MODES.NONE]: game.i18n.localize('PF2E.SETTINGS.DefaultTokenSettingsBar.Choices.NONE'),
            [CONST.TOKEN_DISPLAY_MODES.CONTROL]: game.i18n.localize(
                'PF2E.SETTINGS.DefaultTokenSettingsBar.Choices.CONTROL',
            ),
            [CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER]: game.i18n.localize(
                'PF2E.SETTINGS.DefaultTokenSettingsBar.Choices.OWNER_HOVER',
            ),
            [CONST.TOKEN_DISPLAY_MODES.HOVER]: game.i18n.localize(
                'PF2E.SETTINGS.DefaultTokenSettingsBar.Choices.HOVER',
            ),
            [CONST.TOKEN_DISPLAY_MODES.OWNER]: game.i18n.localize(
                'PF2E.SETTINGS.DefaultTokenSettingsBar.Choices.OWNER',
            ),
            [CONST.TOKEN_DISPLAY_MODES.ALWAYS]: game.i18n.localize(
                'PF2E.SETTINGS.DefaultTokenSettingsBar.Choices.ALWAYS',
            ),
        },
    });
    game.settings.register('pf2e', 'ignoreCoinBulk', {
        name: game.i18n.localize('PF2E.SETTINGS.IgnoreCoinBulk.Name'),
        hint: game.i18n.localize('PF2E.SETTINGS.IgnoreCoinBulk.Hint'),
        scope: 'world',
        config: true,
        default: false,
        type: Boolean,
    });
    game.settings.register('pf2e', 'ignoreContainerOverflow', {
        name: game.i18n.localize('PF2E.SETTINGS.IgnoreContainerOverflow.Name'),
        hint: game.i18n.localize('PF2E.SETTINGS.IgnoreContainerOverflow.Hint'),
        scope: 'world',
        config: true,
        default: false,
        type: Boolean,
    });
    game.settings.register('pf2e', 'identifyMagicNotMatchingTraditionModifier', {
        name: game.i18n.localize('PF2E.SETTINGS.IdentifyMagicNotMatchingTraditionModifier.Name'),
        hint: game.i18n.localize('PF2E.SETTINGS.IdentifyMagicNotMatchingTraditionModifier.Hint'),
        choices: {
            0: game.i18n.localize('PF2E.SETTINGS.IdentifyMagicNotMatchingTraditionModifier.Choices.0'),
            2: game.i18n.localize('PF2E.SETTINGS.IdentifyMagicNotMatchingTraditionModifier.Choices.2'),
            5: game.i18n.localize('PF2E.SETTINGS.IdentifyMagicNotMatchingTraditionModifier.Choices.5'),
            10: game.i18n.localize('PF2E.SETTINGS.IdentifyMagicNotMatchingTraditionModifier.Choices.10'),
        },
        type: Number,
        default: 5,
        scope: 'world',
        config: true,
    });
    game.settings.register('pf2e', 'critRule', {
        name: game.i18n.localize('PF2E.SETTINGS.CritRule.Name'),
        hint: game.i18n.localize('PF2E.SETTINGS.CritRule.Hint'),
        scope: 'world',
        config: true,
        default: 'doubledamage',
        type: String,
        choices: {
            doubledamage: game.i18n.localize('PF2E.SETTINGS.CritRule.Choices.Doubledamage'),
            doubledice: game.i18n.localize('PF2E.SETTINGS.CritRule.Choices.Doubledamage'),
        },
    });
    game.settings.register('pf2e', 'compendiumBrowserPacks', {
        name: game.i18n.localize('PF2E.SETTINGS.CompendiumBrowserPacks.Name'),
        hint: game.i18n.localize('PF2E.SETTINGS.CompendiumBrowserPacks.Hint'),
        default: '{}',
        type: String,
        scope: 'world',
        onChange: () => {
            compendiumBrowser.loadSettings();
        },
    });
    game.settings.register(game.system.id, 'enabledRulesUI', {
        name: game.i18n.localize('PF2E.SETTINGS.EnabledRulesUI.Name'),
        hint: game.i18n.localize('PF2E.SETTINGS.EnabledRulesUI.Hint'),
        scope: 'world',
        config: true,
        default: false,
        type: Boolean,
    });

    game.settings.registerMenu('pf2e', 'worldClock', {
        name: game.i18n.localize(CONFIG.PF2E.SETTINGS.worldClock.name),
        label: game.i18n.localize(CONFIG.PF2E.SETTINGS.worldClock.label),
        hint: game.i18n.localize(CONFIG.PF2E.SETTINGS.worldClock.hint),
        icon: 'far fa-clock',
        type: WorldClockSettings,
        restricted: true,
    });
    WorldClockSettings.registerSettings();

    game.settings.registerMenu('pf2e', 'variantRules', {
        name: game.i18n.localize('PF2E.SETTINGS.Variant.Name'),
        label: game.i18n.localize('PF2E.SETTINGS.Variant.Label'), // The text label used in the button
        hint: game.i18n.localize('PF2E.SETTINGS.Variant.Hint'),
        icon: 'fas fa-book', // A Font Awesome icon used in the submenu button
        type: VariantRulesSettings, // A FormApplication subclass which should be created
        restricted: true, // Restrict this submenu to gamemaster only?
    });
    VariantRulesSettings.registerSettings();

    // this section starts questionable rule settings, all of them should have a 'rai.' at the start of their name
    game.settings.register('pf2e', 'RAI.TreatWoundsAltSkills', {
        name: game.i18n.localize('PF2E.SETTINGS.RAI.TreatWoundsAltSkills.Name'),
        hint: game.i18n.localize('PF2E.SETTINGS.RAI.TreatWoundsAltSkills.Hint'),
        scope: 'world',
        config: true,
        default: true,
        type: Boolean,
    });
}
