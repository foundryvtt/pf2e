import { ActorPF2e } from '@actor/base';
import { ItemPF2e } from '@item/base';
import { MystifiedTraits } from '@item/data/values';
import { ActiveEffectPF2e } from '@module/active-effect';
import { CompendiumDirectoryPF2e } from '@module/apps/ui/compendium-directory';
import { FogExplorationPF2e } from '@module/fog-exploration';
import { AmbientLightPF2e, LightingLayerPF2e, MeasuredTemplatePF2e, SightLayerPF2e, TokenPF2e } from '@module/canvas';
import { ChatMessagePF2e } from '@module/chat-message';
import { CombatPF2e } from '@module/combat';
import { CombatantPF2e } from '@module/combatant';
import { FolderPF2e } from '@module/folder';
import { registerHandlebarsHelpers } from '@module/handlebars';
import { MacroPF2e } from '@module/macro';
import { AmbientLightDocumentPF2e, MeasuredTemplateDocumentPF2e, ScenePF2e, TokenDocumentPF2e } from '@module/scene';
import { SceneConfigPF2e } from '@module/scene/sheet';
import { registerSettings } from '@module/settings';
import { EncounterTrackerPF2e } from '@module/apps/ui/encounter-tracker';
import { loadPF2ETemplates } from '@module/templates';
import { TokenConfigPF2e } from '@module/scene/token-config';
import { PlayerConfigPF2e } from '@module/user/player-config';
import { PF2ECONFIG } from '../config';
import { UserPF2e } from '@module/user';
import { JournalSheetPF2e } from '@module/journal-entry/sheet';
import { ConditionManager } from '@system/condition-manager';

export const Init = {
    listen: (): void => {
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
            CONFIG.FogExploration.documentClass = FogExplorationPF2e;
            CONFIG.Folder.documentClass = FolderPF2e;
            CONFIG.JournalEntry.sheetClass = JournalSheetPF2e;
            CONFIG.Macro.documentClass = MacroPF2e;

            CONFIG.Scene.documentClass = ScenePF2e;
            CONFIG.Scene.sheetClass = SceneConfigPF2e;

            CONFIG.User.documentClass = UserPF2e;

            CONFIG.AmbientLight.documentClass = AmbientLightDocumentPF2e;
            CONFIG.AmbientLight.layerClass = LightingLayerPF2e;
            CONFIG.AmbientLight.objectClass = AmbientLightPF2e;

            CONFIG.MeasuredTemplate.documentClass = MeasuredTemplateDocumentPF2e;
            CONFIG.MeasuredTemplate.objectClass = MeasuredTemplatePF2e;

            CONFIG.Token.documentClass = TokenDocumentPF2e;
            CONFIG.Token.objectClass = TokenPF2e;
            CONFIG.Token.sheetClass = TokenConfigPF2e;

            CONFIG.Canvas.layers.lighting = LightingLayerPF2e;
            CONFIG.Canvas.layers.sight = SightLayerPF2e;

            // Automatically advance world time by 6 seconds each round
            CONFIG.time.roundTime = 6;
            // Allowing a decimal on the Combat Tracker so the GM can set the order if players roll the same initiative.
            CONFIG.Combat.initiative.decimals = 1;

            // Assign the PF2e Sidebar subclasses
            CONFIG.ui.combat = EncounterTrackerPF2e;
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

            Object.defineProperty(globalThis.game, 'pf2e', { value: {} });
            game.pf2e.ConditionManager = ConditionManager.init();
        });
    },
};
