import type { ActorPF2e } from '@actor/base';
import { SKILL_EXPANDED } from '@actor/data/values';
import { ensureProficiencyOption, CheckModifier, StatisticModifier, ModifierPF2e } from '../../modifiers';
import { CheckPF2e } from '../rolls';
import { seek } from './basic/seek';
import { balance } from './acrobatics/balance';
import { maneuverInFlight } from './acrobatics/maneuver-in-flight';
import { squeeze } from './acrobatics/squeeze';
import { tumbleThrough } from './acrobatics/tumble-through';
import { climb } from './athletics/climb';
import { disarm } from './athletics/disarm';
import { forceOpen } from './athletics/force-open';
import { grapple } from './athletics/grapple';
import { highJump } from './athletics/high-jump';
import { longJump } from './athletics/long-jump';
import { shove } from './athletics/shove';
import { swim } from './athletics/swim';
import { trip } from './athletics/trip';
import { createADiversion } from './deception/create-a-diversion';
import { feint } from './deception/feint';
import { impersonate } from './deception/impersonate';
import { lie } from './deception/lie';
import { gatherInformation } from './diplomacy/gather-information';
import { makeAnImpression } from './diplomacy/make-an-impression';
import { request } from './diplomacy/request';
import { coerce } from './intimidation/coerce';
import { demoralize } from './intimidation/demoralize';

type CheckType = 'skill-check' | 'perception-check' | 'saving-throw' | 'attack-roll';

export type ActionGlyph = 'A' | 'D' | 'T' | 'R' | 'F' | 'a' | 'd' | 't' | 'r' | 'f' | 1 | 2 | 3 | '1' | '2' | '3';

export interface ActionDefaultOptions {
    event: JQuery.Event;
    actors?: ActorPF2e | ActorPF2e[];
    glyph?: ActionGlyph;
    modifiers?: ModifierPF2e[];
}

export interface SkillActionOptions extends ActionDefaultOptions {
    skill?: string;
}

export class ActionsPF2e {
    static exposeActions(actions: { [key: string]: Function }) {
        // basic
        actions.seek = seek;

        // acrobatics
        actions.balance = balance;
        actions.maneuverInFlight = maneuverInFlight;
        actions.squeeze = squeeze;
        actions.tumbleThrough = tumbleThrough;

        // athletics
        actions.climb = climb;
        actions.disarm = disarm;
        actions.forceOpen = forceOpen;
        actions.grapple = grapple;
        actions.highJump = highJump;
        actions.longJump = longJump;
        actions.shove = shove;
        actions.swim = swim;
        actions.trip = trip;

        // deception
        actions.createADiversion = createADiversion;
        actions.feint = feint;
        actions.impersonate = impersonate;
        actions.lie = lie;

        // diplomacy
        actions.gatherInformation = gatherInformation;
        actions.makeAnImpression = makeAnImpression;
        actions.request = request;

        // intimidation
        actions.coerce = coerce;
        actions.demoralize = demoralize;
    }

    static resolveStat(stat: string): {
        checkType: CheckType;
        property: string;
        stat: string;
        subtitle: string;
    } {
        switch (stat) {
            case 'perception':
                return {
                    checkType: 'perception-check',
                    property: 'data.data.attributes.perception',
                    stat,
                    subtitle: 'PF2E.ActionsCheck.perception',
                };
            default:
                return {
                    checkType: 'skill-check',
                    property: `data.data.skills.${SKILL_EXPANDED[stat]?.shortform ?? stat}`,
                    stat,
                    subtitle: `PF2E.ActionsCheck.${stat}`,
                };
        }
    }

    static simpleRollActionCheck(
        actors: ActorPF2e | ActorPF2e[] | undefined,
        statName: string,
        actionGlyph: ActionGlyph | undefined,
        title: string,
        subtitle: string,
        modifiers: ModifierPF2e[] | undefined,
        rollOptions: string[],
        extraOptions: string[],
        traits: string[],
        checkType: CheckType,
        event: JQuery.Event,
    ) {
        // figure out actors to roll for
        const rollers: ActorPF2e[] = [];
        if (Array.isArray(actors)) {
            rollers.push(...actors);
        } else if (actors) {
            rollers.push(actors);
        } else if (canvas.tokens.controlled.length) {
            rollers.push(...(canvas.tokens.controlled.map((token) => token.actor) as ActorPF2e[]));
        } else if (game.user.character) {
            rollers.push(game.user.character);
        }

        if (rollers.length) {
            rollers.forEach((actor) => {
                let flavor = '';
                if (actionGlyph) {
                    flavor += `<span class="pf2-icon">${actionGlyph}</span> `;
                }
                flavor += `<b>${game.i18n.localize(title)}</b>`;
                flavor += ` <p class="compact-text">(${game.i18n.localize(subtitle)})</p>`;
                const stat = getProperty(actor, statName) as StatisticModifier;
                const check = new CheckModifier(flavor, stat, modifiers ?? []);
                const finalOptions = actor.getRollOptions(rollOptions).concat(extraOptions).concat(traits);
                ensureProficiencyOption(finalOptions, stat.rank ?? -1);
                CheckPF2e.roll(
                    check,
                    {
                        actor,
                        type: checkType,
                        options: finalOptions,
                        notes: stat.notes ?? [],
                        traits,
                        title: `${game.i18n.localize(title)} - ${game.i18n.localize(subtitle)}`,
                    },
                    event,
                );
            });
        } else {
            ui.notifications.warn(game.i18n.localize('PF2E.ActionsWarning.NoActor'));
        }
    }
}
