import { PF2EActor } from '@actor/actor';
import { PF2CheckModifier, PF2StatisticModifier } from '../../modifiers';
import { PF2Check } from '../rolls';
import { seek } from './basic/seek';
import { climb } from './athletics/climb';
import { disarm } from './athletics/disarm';
import { forceOpen } from './athletics/force-open';
import { grapple } from './athletics/grapple';
import { highJump } from './athletics/high-jump';
import { longJump } from './athletics/long-jump';
import { shove } from './athletics/shove';
import { swim } from './athletics/swim';
import { trip } from './athletics/trip';

type ActionGlyph = 'A' | 'D' | 'T' | 'R' | 'F' | 'a' | 'd' | 't' | 'r' | 'f' | 1 | 2 | 3 | '1' | '2' | '3';
type CheckType = 'skill-check' | 'perception-check' | 'saving-throw' | 'attack-roll';

export class PF2Actions {
    static exposeActions(actions: { [key: string]: Function }) {
        // basic
        actions.seek = seek;

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
    }

    static simpleRollActionCheck(
        actors: PF2EActor | PF2EActor[],
        stat: string,
        actionGlyph: ActionGlyph,
        title: string,
        subtitle: string,
        rollOptions: string[],
        extraOptions: string[],
        traits: string[],
        checkType: CheckType,
        event: JQuery.Event,
    ) {
        // figure out actors to roll for
        const rollers: PF2EActor[] = [];
        if (actors && Array.isArray(actors) && actors.length) {
            rollers.push(...actors);
        } else if (actors instanceof PF2EActor) {
            rollers.push(actors);
        } else if (canvas.tokens.controlled.length) {
            rollers.push(...(canvas.tokens.controlled.map((token) => token.actor) as PF2EActor[]));
        } else if (game.user.character) {
            rollers.push(game.user.character);
        }

        if (rollers.length) {
            rollers.forEach((actor) => {
                const flavor = `
                    <span class="pf2-icon">${actionGlyph}</span>
                    <b>${game.i18n.localize(title)}</b>
                    <p class="compact-text">(${game.i18n.localize(subtitle)})</p>
                `.trim();
                const check = new PF2CheckModifier(flavor, getProperty(actor, stat) as PF2StatisticModifier);
                const finalOptions = actor.getRollOptions(rollOptions).concat(extraOptions).concat(traits);
                PF2Check.roll(
                    check,
                    {
                        actor,
                        type: checkType,
                        options: finalOptions,
                        traits,
                    },
                    event,
                );
            });
        } else {
            ui.notifications.warn(game.i18n.localize('PF2E.ActionsCheck.WarningNoActor'));
        }
    }
}
