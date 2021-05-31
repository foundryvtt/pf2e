import { LocalizePF2e } from '@system/localize';
import { registerSheets } from '../register-sheets';
import { ActorPF2e } from '@actor/base';
import { PF2CheckDC } from '@system/check-degree-of-success';
import { calculateXP } from '@scripts/macros/xp';
import { launchTravelSheet } from '@scripts/macros/travel/travel-speed-sheet';
import { rollActionMacro, rollItemMacro } from '@scripts/macros/hotbar';
import { raiseAShield } from '@scripts/macros/raise-a-shield';
import { steelYourResolve } from '@scripts/macros/steel-your-resolve';
import { encouragingWords } from '@scripts/macros/encouraging-words';
import { earnIncome } from '@scripts/macros/earn-income';
import { DicePF2e } from '@scripts/dice';
import {
    AbilityModifier,
    CheckModifier,
    ModifierPF2e,
    MODIFIER_TYPE,
    ProficiencyModifier,
    StatisticModifier,
} from '@module/modifiers';
import { CheckPF2e } from '@system/rolls';
import { RuleElements } from '@module/rules/rules';
import { ConditionManager } from '@module/conditions';
import { StatusEffects } from '@scripts/actor/status-effects';
import { EffectPanel } from '@module/system/effect-panel';
import { EffectTracker } from '@module/system/effect-tracker';
import { Rollable } from '@actor/data/base';

function resolveActors(): ActorPF2e[] {
    const actors: ActorPF2e[] = [];
    if (canvas.tokens.controlled.length) {
        actors.push(...(canvas.tokens.controlled.map((token) => token.actor) as ActorPF2e[]));
    } else if (game.user.character) {
        actors.push(game.user.character);
    }
    return actors;
}

function registerGlobalDCInjection() {
    const selectorShowDC = '[data-pf2-dc]:not([data-pf2-dc=""])[data-pf2-show-dc]:not([data-pf2-show-dc=""])';
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            mutation.addedNodes.forEach((node) => {
                if (!(node instanceof HTMLElement)) return;
                node.querySelectorAll(selectorShowDC).forEach((element) => {
                    if (!(element instanceof HTMLElement)) return;
                    const dc = element.dataset.pf2Dc!.trim()!;
                    const role = element.dataset.pf2ShowDc!.trim();
                    if (['all', 'owner'].includes(role) || (role === 'gm' && game.user.isGM)) {
                        element.innerHTML = game.i18n.format('PF2E.DCWithValue', {
                            dc,
                            text: element.innerHTML,
                        });
                    }
                });
            });
        }
    });
    observer.observe(window.document.body, { childList: true, subtree: true });
}

function registerPF2ActionClickListener() {
    $<HTMLBodyElement>('body').on('click', (event) => {
        let target = event.target;
        if (
            target?.matches(
                '[data-pf2-action]:not([data-pf2-action=""]), [data-pf2-action]:not([data-pf2-action=""]) *',
            )
        ) {
            target = target.closest('[data-pf2-action]:not([data-pf2-action=""])')!;
            const { pf2Action, pf2Glyph, pf2Variant } = target.dataset ?? {};
            const action = game.pf2e.actions[pf2Action ?? ''];
            if (pf2Action && action) {
                action({
                    event,
                    glyph: pf2Glyph,
                    variant: pf2Variant,
                });
            } else {
                console.warn(`PF2e System | Skip executing unknown action '${pf2Action}'`);
            }
        } else if (
            target?.matches(
                '[data-pf2-saving-throw]:not([data-pf2-saving-throw=""]), [data-pf2-saving-throw]:not([data-pf2-saving-throw=""]) *',
            )
        ) {
            target = target.closest('[data-pf2-saving-throw]:not([data-pf2-saving-throw=""])')!;
            const actors = resolveActors();
            if (actors.length) {
                const { pf2SavingThrow, pf2Dc, pf2Traits, pf2Label } = target.dataset ?? {};
                actors.forEach((actor) => {
                    const savingThrow = actor.data.data.saves[pf2SavingThrow ?? ''] as Rollable | undefined;
                    if (pf2SavingThrow && savingThrow) {
                        const dc = Number.isInteger(Number(pf2Dc))
                            ? ({ label: pf2Label, value: Number(pf2Dc), visibility: 'gm' } as PF2CheckDC)
                            : undefined;
                        const options = actor.getRollOptions(['all', 'saving-throw', pf2SavingThrow]);
                        if (pf2Traits) {
                            const traits = pf2Traits
                                .split(',')
                                .map((trait) => trait.trim())
                                .filter((trait) => !!trait);
                            options.push(...traits);
                        }
                        savingThrow.roll({ event, options, dc });
                    } else {
                        console.warn(`PF2e System | Skip rolling unknown saving throw '${pf2SavingThrow}'`);
                    }
                });
            }
        }
    });
}

/**
 * This runs after game data has been requested and loaded from the servers, so entities exist
 */
export function listen() {
    Hooks.once('setup', () => {
        /** @todo: Find the new correct place to put this */
        // // Set local mystery-man icon
        // CONST.DEFAULT_TOKEN = 'systems/pf2e/icons/default-icons/mystery-man.svg';

        LocalizePF2e.ready = true;

        // Register actor and item sheets
        registerSheets();

        // register global DC injection
        registerGlobalDCInjection();

        // register click listener for elements with a data-pf2-action attribute
        registerPF2ActionClickListener();

        // Exposed objects for macros and modules
        Object.defineProperty(globalThis.game, 'pf2e', { value: {} });
        game.pf2e.actions = {
            earnIncome,
            raiseAShield,
            steelYourResolve,
            encouragingWords,
        };
        game.pf2e.rollItemMacro = rollItemMacro;
        game.pf2e.rollActionMacro = rollActionMacro;
        game.pf2e.gm = {
            calculateXP,
            launchTravelSheet,
        };
        game.pf2e.Dice = DicePF2e;
        game.pf2e.StatusEffects = StatusEffects;
        game.pf2e.ConditionManager = ConditionManager;
        game.pf2e.ModifierType = MODIFIER_TYPE;
        game.pf2e.Modifier = ModifierPF2e;
        game.pf2e.AbilityModifier = AbilityModifier;
        game.pf2e.ProficiencyModifier = ProficiencyModifier;
        game.pf2e.StatisticModifier = StatisticModifier;
        game.pf2e.CheckModifier = CheckModifier;
        game.pf2e.Check = CheckPF2e;
        game.pf2e.RuleElements = RuleElements;

        // Start system sub-applications
        game.pf2e.effectPanel = new EffectPanel();
        game.pf2e.effectTracker = new EffectTracker();
    });
}
