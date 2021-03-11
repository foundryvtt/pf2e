import { ActorPF2e } from '@actor/base';
import { ItemPF2e } from '@item/base';
import { ConditionManager } from '../../module/conditions';
import { registerHandlebarsHelpers } from '../../module/handlebars';
import {
    AbilityModifier,
    CheckModifier,
    ModifierPF2e,
    ModifierType,
    StatisticModifier,
    ProficiencyModifier,
} from '../../module/modifiers';
import { registerSettings } from '../../module/settings';
import { CombatTrackerPF2e } from '../../module/system/combat-tracker';
import { CheckPF2e } from '../../module/system/rolls';
import { loadPF2ETemplates } from '../../module/templates';
import { PlayerConfigPF2e } from '../../module/user/player-config';
import { CompendiumDirectoryPF2e } from '../../module/apps/ui/compendium-directory';
import { StatusEffects } from '../actor/status-effects';
import { PF2ECONFIG } from '../config';
import { DicePF2e } from '../dice';
import * as MonkeyPatch from '../🐵🩹';
import { CombatPF2e } from '../../module/combat';

export function listen(): void {
    Hooks.once('init', () => {
        console.log('PF2e System | Initializing Pathfinder 2nd Edition System');

        CONFIG.PF2E = PF2ECONFIG;

        // Assign document classes.
        CONFIG.Item.entityClass = ItemPF2e;
        CONFIG.Actor.entityClass = ActorPF2e;
        CONFIG.Combat.entityClass = CombatPF2e;

        // Automatically advance world time by 6 seconds each round
        CONFIG.time.roundTime = 6;
        // Allowing a decimal on the Combat Tracker so the GM can set the order if players roll the same initiative.
        CONFIG.Combat.initiative.decimals = 1;
        // Assign the PF2e Combat Tracker
        CONFIG.ui.combat = CombatTrackerPF2e;
        // Assign the PF2e CompendiumDirectory
        CONFIG.ui.compendium = CompendiumDirectoryPF2e;

        // configure the bundled TinyMCE editor with PF2-specific options
        CONFIG.TinyMCE.extended_valid_elements = 'pf2-action[action|glyph]';
        CONFIG.TinyMCE.content_css = (CONFIG.TinyMCE.content_css ?? []).concat(
            `systems/${game.system.id}/styles/pf2e.css`,
        );
        CONFIG.TinyMCE.style_formats = (CONFIG.TinyMCE.style_formats ?? []).concat({
            title: 'Icons A D T F R',
            inline: 'span',
            classes: ['pf2-icon'],
            wrapper: true,
        });

        PlayerConfigPF2e.hookOnRenderSettings();

        registerSettings();
        loadPF2ETemplates();
        registerHandlebarsHelpers();

        // expose a few things to the global world, so that other modules can use our stuff
        // instead of being locked in our world after we started building with webpack
        // which enforced modules being private
        Object.defineProperty(window, 'DicePF2e', {
            get: function () {
                console.warn(
                    'This object is deprecated and may be removed by May, 2021. Please use game.pf2e.Dice instead.',
                );
                return DicePF2e;
            },
        });
        Object.defineProperty(window, 'PF2eStatusEffects', {
            get: function () {
                console.warn(
                    'This object is deprecated and may be removed by May, 2021. Please use game.pf2e.StatusEffects instead.',
                );
                return StatusEffects;
            },
        });
        Object.defineProperty(window, 'PF2eConditionManager', {
            get: function () {
                console.warn(
                    'This object is deprecated and may be removed by May, 2021. Please use game.pf2e.ConditionManager instead.',
                );
                return ConditionManager;
            },
        });
        Object.defineProperty(window, 'ModifierTypePF2e', {
            get: function () {
                console.warn(
                    'This object is deprecated and may be removed by May, 2021. Please use game.pf2e.ModifierType instead.',
                );
                return ModifierType;
            },
        });
        Object.defineProperty(window, 'PF2Modifier', {
            get: function () {
                console.warn(
                    'This object is deprecated and may be removed by May, 2021. Please use game.pf2e.Modifier instead.',
                );
                return ModifierPF2e;
            },
        });
        Object.defineProperty(window, 'AbilityModifier', {
            get: function () {
                console.warn(
                    'This object is deprecated and may be removed by May, 2021. Please use game.pf2e.AbilityModifier instead.',
                );
                return AbilityModifier;
            },
        });
        Object.defineProperty(window, 'ProficiencyModifier', {
            get: function () {
                console.warn(
                    'This object is deprecated and may be removed by May, 2021. Please use game.pf2e.ProficiencyModifier instead.',
                );
                return ProficiencyModifier;
            },
        });
        Object.defineProperty(window, 'StatisticModifier', {
            get: function () {
                console.warn(
                    'This object is deprecated and may be removed by May, 2021. Please use game.pf2e.StatisticModifier instead.',
                );
                return StatisticModifier;
            },
        });
        Object.defineProperty(window, 'CheckModifier', {
            get: function () {
                console.warn(
                    'This object is deprecated and may be removed by May, 2021. Please use game.pf2e.CheckModifier instead.',
                );
                return CheckModifier;
            },
        });
        Object.defineProperty(window, 'PF2Check', {
            get: function () {
                console.warn(
                    'This object is deprecated and may be removed by May, 2021. Please use game.pf2e.Check instead.',
                );
                return CheckPF2e;
            },
        });

        MonkeyPatch.patchCompendiumImports();
    });
}
