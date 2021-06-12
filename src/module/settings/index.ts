import { VariantRulesSettings } from './variant-rules';
import { WorldClockSettings } from './world-clock';
import { HomebrewElements } from './homebrew';
import { StatusEffects } from '@scripts/actor/status-effects';
import { objectHasKey } from '@module/utils';
import { MigrationRunner } from '@module/migration/runner';
import { AutomationSettings } from './automation';

export function registerSettings() {
    game.settings.register('pf2e', 'worldSchemaVersion', {
        name: 'PF2E.SETTINGS.WorldSchemaVersion.Name',
        hint: 'PF2E.SETTINGS.WorldSchemaVersion.Hint',
        scope: 'world',
        config: true,
        default: MigrationRunner.LATEST_SCHEMA_VERSION,
        type: Number,
    });

    game.settings.register('pf2e', 'defaultTokenSettings', {
        name: 'PF2E.SETTINGS.DefaultTokenSettings.Name',
        hint: 'PF2E.SETTINGS.DefaultTokenSettings.Hint',
        scope: 'world',
        config: true,
        default: true,
        type: Boolean,
    });

    game.settings.register('pf2e', 'defaultTokenSettingsName', {
        name: 'PF2E.SETTINGS.DefaultTokenSettingsName.Name',
        hint: 'PF2E.SETTINGS.DefaultTokenSettingsName.Hint',
        scope: 'world',
        config: true,
        default: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
        type: Number,
        choices: {
            [CONST.TOKEN_DISPLAY_MODES.NONE]: 'TOKEN.DISPLAY_NONE',
            [CONST.TOKEN_DISPLAY_MODES.CONTROL]: 'TOKEN.DISPLAY_CONTROL',
            [CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER]: 'TOKEN.DISPLAY_OWNER_HOVER',
            [CONST.TOKEN_DISPLAY_MODES.HOVER]: 'TOKEN.DISPLAY_HOVER',
            [CONST.TOKEN_DISPLAY_MODES.OWNER]: 'TOKEN.DISPLAY_OWNER',
            [CONST.TOKEN_DISPLAY_MODES.ALWAYS]: 'TOKEN.DISPLAY_ALWAYS',
        },
    });

    game.settings.register('pf2e', 'defaultTokenSettingsBar', {
        name: 'PF2E.SETTINGS.DefaultTokenSettingsBar.Name',
        hint: 'PF2E.SETTINGS.DefaultTokenSettingsBar.Hint',
        scope: 'world',
        config: true,
        default: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
        type: Number,
        choices: {
            [CONST.TOKEN_DISPLAY_MODES.NONE]: 'TOKEN.DISPLAY_NONE',
            [CONST.TOKEN_DISPLAY_MODES.CONTROL]: 'TOKEN.DISPLAY_CONTROL',
            [CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER]: 'TOKEN.DISPLAY_OWNER_HOVER',
            [CONST.TOKEN_DISPLAY_MODES.HOVER]: 'TOKEN.DISPLAY_HOVER',
            [CONST.TOKEN_DISPLAY_MODES.OWNER]: 'TOKEN.DISPLAY_OWNER',
            [CONST.TOKEN_DISPLAY_MODES.ALWAYS]: 'TOKEN.DISPLAY_ALWAYS',
        },
    });

    game.settings.register('pf2e', 'ignoreCoinBulk', {
        name: 'PF2E.SETTINGS.IgnoreCoinBulk.Name',
        hint: 'PF2E.SETTINGS.IgnoreCoinBulk.Hint',
        scope: 'world',
        config: true,
        default: false,
        type: Boolean,
    });

    game.settings.register('pf2e', 'identifyMagicNotMatchingTraditionModifier', {
        name: 'PF2E.SETTINGS.IdentifyMagicNotMatchingTraditionModifier.Name',
        hint: 'PF2E.SETTINGS.IdentifyMagicNotMatchingTraditionModifier.Hint',
        choices: {
            0: 'PF2E.SETTINGS.IdentifyMagicNotMatchingTraditionModifier.Choices.0',
            2: 'PF2E.SETTINGS.IdentifyMagicNotMatchingTraditionModifier.Choices.2',
            5: 'PF2E.SETTINGS.IdentifyMagicNotMatchingTraditionModifier.Choices.5',
            10: 'PF2E.SETTINGS.IdentifyMagicNotMatchingTraditionModifier.Choices.10',
        },
        type: Number,
        default: 5,
        scope: 'world',
        config: true,
    });

    game.settings.register('pf2e', 'critRule', {
        name: 'PF2E.SETTINGS.CritRule.Name',
        hint: 'PF2E.SETTINGS.CritRule.Hint',
        scope: 'world',
        config: true,
        default: 'doubledamage',
        type: String,
        choices: {
            doubledamage: 'PF2E.SETTINGS.CritRule.Choices.Doubledamage',
            doubledice: 'PF2E.SETTINGS.CritRule.Choices.Doubledice',
        },
    });

    game.settings.register('pf2e', 'compendiumBrowserPacks', {
        name: 'PF2E.SETTINGS.CompendiumBrowserPacks.Name',
        hint: 'PF2E.SETTINGS.CompendiumBrowserPacks.Hint',
        default: '{}',
        type: String,
        scope: 'world',
        onChange: () => {
            game.pf2e.compendiumBrowser.loadSettings();
        },
    });

    game.settings.register('pf2e', 'pfsSheetTab', {
        name: 'PF2E.SETTINGS.PFSSheetTab.Name',
        hint: 'PF2E.SETTINGS.PFSSheetTab.Hint',
        scope: 'world',
        config: true,
        default: true,
        type: Boolean,
        onChange: () => {
            const actors = game.actors.filter((actor) => actor.type === 'character');
            const sheets = actors.flatMap((actor) => Object.values(actor.apps));
            for (const sheet of sheets) {
                sheet.render();
            }
        },
    });

    game.settings.register('pf2e', 'enabledRulesUI', {
        name: 'PF2E.SETTINGS.EnabledRulesUI.Name',
        hint: 'PF2E.SETTINGS.EnabledRulesUI.Hint',
        scope: 'world',
        config: true,
        default: false,
        type: Boolean,
    });

    game.settings.register('pf2e', 'critFumbleButtons', {
        name: game.i18n.localize('PF2E.SETTINGS.critFumbleCardButtons.name'),
        hint: game.i18n.localize('PF2E.SETTINGS.critFumbleCardButtons.hint'),
        scope: 'world',
        config: true,
        default: false,
        type: Boolean,
        onChange: () => {
            window.location.reload();
        },
    });

    game.settings.register('pf2e', 'drawCritFumble', {
        name: game.i18n.localize('PF2E.SETTINGS.critFumbleCards.name'),
        hint: game.i18n.localize('PF2E.SETTINGS.critFumbleCards.hint'),
        scope: 'world',
        config: true,
        default: false,
        type: Boolean,
        onChange: () => {
            window.location.reload();
        },
    });

    const iconChoices = {
        blackWhite: 'PF2E.SETTINGS.statusEffectType.blackWhite',
        default: 'PF2E.SETTINGS.statusEffectType.default',
        legacy: 'PF2E.SETTINGS.statusEffectType.legacy',
    };
    game.settings.register('pf2e', 'statusEffectType', {
        name: 'PF2E.SETTINGS.statusEffectType.name',
        hint: 'PF2E.SETTINGS.statusEffectType.hint',
        scope: 'world',
        config: true,
        default: 'blackWhite',
        type: String,
        choices: iconChoices,
        onChange: (iconType = '') => {
            if (objectHasKey(iconChoices, iconType)) {
                StatusEffects.migrateStatusEffectUrls(iconType);
            }
        },
    });

    game.settings.register('pf2e', 'statusEffectShowCombatMessage', {
        name: 'PF2E.SETTINGS.statusEffectShowCombatMessage.name',
        hint: 'PF2E.SETTINGS.statusEffectShowCombatMessage.hint',
        scope: 'client',
        config: true,
        default: true,
        type: Boolean,
    });

    game.settings.registerMenu('pf2e', 'automation', {
        name: 'PF2E.SETTINGS.Automation.Name',
        label: 'PF2E.SETTINGS.Automation.Label',
        hint: 'PF2E.SETTINGS.Automation.Hint',
        icon: 'fas fa-robot',
        type: AutomationSettings,
        restricted: true,
    });
    AutomationSettings.registerSettings();

    game.settings.registerMenu('pf2e', 'variantRules', {
        name: 'PF2E.SETTINGS.Variant.Name',
        label: 'PF2E.SETTINGS.Variant.Label',
        hint: 'PF2E.SETTINGS.Variant.Hint',
        icon: 'fas fa-book',
        type: VariantRulesSettings,
        restricted: true,
    });
    VariantRulesSettings.registerSettings();

    game.settings.registerMenu('pf2e', 'homebrew', {
        name: 'PF2E.SETTINGS.Homebrew.Name',
        label: 'PF2E.SETTINGS.Homebrew.Label',
        hint: 'PF2E.SETTINGS.Homebrew.Hint',
        icon: 'fas fa-beer',
        type: HomebrewElements,
        restricted: true,
    });
    HomebrewElements.registerSettings();

    game.settings.registerMenu('pf2e', 'worldClock', {
        name: game.i18n.localize(CONFIG.PF2E.SETTINGS.worldClock.name),
        label: game.i18n.localize(CONFIG.PF2E.SETTINGS.worldClock.label),
        hint: game.i18n.localize(CONFIG.PF2E.SETTINGS.worldClock.hint),
        icon: 'far fa-clock',
        type: WorldClockSettings,
        restricted: true,
    });
    WorldClockSettings.registerSettings();

    // this section starts questionable rule settings, all of them should have a 'RAI.' at the start of their name
    game.settings.register('pf2e', 'RAI.TreatWoundsAltSkills', {
        name: 'PF2E.SETTINGS.RAI.TreatWoundsAltSkills.Name',
        hint: 'PF2E.SETTINGS.RAI.TreatWoundsAltSkills.Hint',
        scope: 'world',
        config: true,
        default: true,
        type: Boolean,
    });

    // this section starts Metaknowledge settings, all of them should have a 'metagame.' at the start of their name
    game.settings.register('pf2e', 'metagame.secretDamage', {
        name: 'PF2E.SETTINGS.Metagame.SecretDamage.Name',
        hint: 'PF2E.SETTINGS.Metagame.SecretDamage.Hint',
        scope: 'world',
        config: true,
        default: false,
        type: Boolean,
    });

    game.settings.register('pf2e', 'metagame.secretCondition', {
        name: 'PF2E.SETTINGS.Metagame.SecretCondition.Name',
        hint: 'PF2E.SETTINGS.Metagame.SecretCondition.Hint',
        scope: 'world',
        config: true,
        default: false,
        type: Boolean,
    });
}
