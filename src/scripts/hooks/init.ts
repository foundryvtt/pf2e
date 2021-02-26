import { PF2EActor } from '@actor/actor';
import { PF2EItem } from '@item/item';
import { PF2eConditionManager } from '../../module/conditions';
import { registerHandlebarsHelpers } from '../../module/handlebars';
import {
    AbilityModifier,
    PF2CheckModifier,
    PF2Modifier,
    PF2ModifierType,
    PF2StatisticModifier,
    ProficiencyModifier,
} from '../../module/modifiers';
import { registerActors } from '../../module/register-actors';
import { registerSheets } from '../../module/register-sheets';
import { registerSettings } from '../../module/settings';
import { PF2eCombatTracker } from '../../module/system/combat-tracker';
import { PF2Check } from '../../module/system/rolls';
import { loadPF2ETemplates } from '../../module/templates';
import { PlayerConfigPF2e } from '../../module/user/player-config';
import { CompendiumDirectoryPF2e } from '../../module/apps/ui/compendium-directory';
import { PF2eStatusEffects } from '../actor/status-effects';
import { PF2ECONFIG } from '../config';
import { DicePF2e } from '../dice';
import * as MonkeyPatch from '../🐵🩹';
import { PF2ECombat } from '../../module/combat';

export function listen(): void {
    Hooks.once('init', () => {
        console.log('PF2e System | Initializing Pathfinder 2nd Edition System');

        CONFIG.PF2E = PF2ECONFIG;

        // Assign document classes.
        CONFIG.Item.entityClass = PF2EItem;
        CONFIG.Actor.entityClass = PF2EActor;
        CONFIG.Combat.entityClass = PF2ECombat;

        // Automatically advance world time by 6 seconds each round
        CONFIG.time.roundTime = 6;
        // Allowing a decimal on the Combat Tracker so the GM can set the order if players roll the same initiative.
        CONFIG.Combat.initiative.decimals = 1;
        // Assign the PF2e Combat Tracker
        CONFIG.ui.combat = PF2eCombatTracker;
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
        registerActors();
        registerSheets();
        registerHandlebarsHelpers();

        // expose a few things to the global world, so that other modules can use our stuff
        // instead of being locked in our world after we started building with webpack
        // which enforced modules being private
        window.DicePF2e = DicePF2e;
        window.PF2eStatusEffects = PF2eStatusEffects;
        window.PF2eConditionManager = PF2eConditionManager;
        window.PF2ModifierType = PF2ModifierType;
        window.PF2Modifier = PF2Modifier;
        window.AbilityModifier = AbilityModifier;
        window.ProficiencyModifier = ProficiencyModifier;
        window.PF2StatisticModifier = PF2StatisticModifier;
        window.PF2CheckModifier = PF2CheckModifier;
        window.PF2Check = PF2Check;

        MonkeyPatch.patchCompendiumImports;
    });
}
