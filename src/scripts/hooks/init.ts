import { ActorPF2e } from '@actor/base';
import { ItemPF2e } from '@item/base';
import { MystifiedTraits } from '@item/data/values';
import { ActiveEffectPF2e } from '@module/active-effect';
import { CompendiumDirectoryPF2e } from '@module/apps/ui/compendium-directory';
import { TokenPF2e } from '@module/canvas/token';
import { ChatMessagePF2e } from '@module/chat-message';
import { CombatPF2e } from '@module/combat';
import { CombatantPF2e } from '@module/combatant';
import { ConditionManager } from '@module/conditions';
import { FolderPF2e } from '@module/folder';
import { registerHandlebarsHelpers } from '@module/handlebars';
import { MacroPF2e } from '@module/macro';
import {
    AbilityModifier,
    CheckModifier,
    ModifierPF2e,
    MODIFIER_TYPE,
    ProficiencyModifier,
    StatisticModifier,
} from '@module/modifiers';
import { registerSettings } from '@module/settings';
import { CombatTrackerPF2e } from '@module/system/combat-tracker';
import { CheckPF2e } from '@module/system/rolls';
import { loadPF2ETemplates } from '@module/templates';
import { TokenDocumentPF2e } from '@module/token-document';
import { PlayerConfigPF2e } from '@module/user/player-config';
import { StatusEffects } from '../actor/status-effects';
import { PF2ECONFIG } from '../config';
import { DicePF2e } from '../dice';

export function listen(): void {
    Hooks.once('init', () => {
        console.log('PF2e System | Initializing Pathfinder 2nd Edition System');

        CONFIG.PF2E = PF2ECONFIG;
        CONFIG.debug.ruleElement ??= false;

        // Assign document and Canvas classes
        CONFIG.Item.documentClass = ItemPF2e;
        CONFIG.ActiveEffect.documentClass = ActiveEffectPF2e;
        CONFIG.Actor.documentClass = ActorPF2e;
        CONFIG.ChatMessage.documentClass = ChatMessagePF2e;
        CONFIG.Combat.documentClass = CombatPF2e;
        CONFIG.Combatant.documentClass = CombatantPF2e;
        CONFIG.Folder.documentClass = FolderPF2e;
        CONFIG.Macro.documentClass = MacroPF2e;
        CONFIG.Token.documentClass = TokenDocumentPF2e;
        CONFIG.Token.objectClass = TokenPF2e;

        // Automatically advance world time by 6 seconds each round
        CONFIG.time.roundTime = 6;
        // Allowing a decimal on the Combat Tracker so the GM can set the order if players roll the same initiative.
        CONFIG.Combat.initiative.decimals = 1;

        // Assign the PF2e Sidebar subclasses
        CONFIG.ui.combat = CombatTrackerPF2e;
        CONFIG.ui.compendium = CompendiumDirectoryPF2e;

        // configure the bundled TinyMCE editor with PF2-specific options
        CONFIG.TinyMCE.extended_valid_elements = 'pf2-action[action|glyph]';
        CONFIG.TinyMCE.content_css = CONFIG.TinyMCE.content_css.concat(
            `systems/${game.system.id}/styles/pf2e.css`,
            `systems/${game.system.id}/styles/tinymce.css`,
        );
        CONFIG.TinyMCE.style_formats = (CONFIG.TinyMCE.style_formats ?? []).concat({
            title: 'PF2E',
            items: [
                {
                    title: 'Icons A D T F R',
                    inline: 'span',
                    classes: ['pf2-icon'],
                    wrapper: true,
                },
                {
                    title: 'Inline Header',
                    block: 'h4',
                    classes: 'inline-header',
                },
                {
                    title: 'Info Block',
                    block: 'section',
                    classes: 'info',
                    wrapper: true,
                    exact: true,
                    merge_siblings: false,
                },
                {
                    title: 'Stat Block',
                    block: 'section',
                    classes: 'statblock',
                    wrapper: true,
                    exact: true,
                    merge_siblings: false,
                },
                {
                    title: 'Trait',
                    block: 'section',
                    classes: 'traits',
                    wrapper: true,
                },
                {
                    title: 'Written Note',
                    block: 'p',
                    classes: 'message',
                },
            ],
        });

        PlayerConfigPF2e.hookOnRenderSettings();
        MystifiedTraits.compile();

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
        Object.defineProperty(window, 'PF2ModifierType', {
            get: function () {
                console.warn(
                    'This object is deprecated and may be removed by May, 2021. Please use game.pf2e.ModifierType instead.',
                );
                return MODIFIER_TYPE;
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
        Object.defineProperty(window, 'PF2StatisticModifier', {
            get: function () {
                console.warn(
                    'This object is deprecated and may be removed by May, 2021. Please use game.pf2e.StatisticModifier instead.',
                );
                return StatisticModifier;
            },
        });
        Object.defineProperty(window, 'PF2CheckModifier', {
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
    });
}
