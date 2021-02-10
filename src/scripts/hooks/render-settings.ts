import { WorldClock } from '../../module/system/world-clock';

export function listen() {
    Hooks.once('renderSettings', () => {
        game.pf2e.worldClock = new WorldClock();
    });
}
