import { climb } from './athletics/climb';
import { PF2EActor } from '@actor/actor';
import { PF2CheckModifier, PF2StatisticModifier } from '../../modifiers';
import { PF2Check } from '../rolls';
import { forceOpen } from './athletics/force-open';
import { grapple } from './athletics/grapple';

type ActionGlyph = 'A' | 'D' | 'T' | 'R' | 'F' | 'a' | 'd' | 't' | 'r' | 'f' | 1 | 2 | 3 | '1' | '2' | '3';
type CheckType = 'skill-check' | 'saving-throw' | 'attack-roll';

export class PF2Actions {
    static exposeActions(actions: { [key: string]: Function }) {
        // athletics
        actions.climb = climb;
        actions.forceOpen = forceOpen;
        actions.grapple = grapple;
    }

    static simpleRollActionCheck(
        actor: PF2EActor,
        stat: PF2StatisticModifier,
        actionGlyph: ActionGlyph,
        title: string,
        subtitle: string,
        rollOptions: string[],
        extraOptions: string[],
        traits: string[],
        checkType: CheckType,
        event: JQuery.Event,
    ) {
        const flavor = `<span class="pf2-icon">${actionGlyph}</span>
            <b>${game.i18n.localize(title)}</b>
            <p class="compact-text">(${game.i18n.localize(subtitle)})</p>`;
        const check = new PF2CheckModifier(flavor, stat);
        const finalOptions = actor.getRollOptions(rollOptions).concat(extraOptions);
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
    }
}
