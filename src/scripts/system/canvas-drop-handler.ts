/* global canvas  */

import { PF2ECharacter } from 'src/module/actor/character';
import { PF2ELoot } from 'src/module/actor/loot';
import { PF2ENPC } from 'src/module/actor/npc';
import { ActorSheetPF2e } from 'src/module/actor/sheet/base';

Hooks.on('dropCanvasData', async (c: typeof canvas, data) => {
    const target = c.tokens.placeables.find((token) => {
        const maximumX = token.x + token.hitArea.right;
        const maximumY = token.y + token.hitArea.bottom;

        if (data.x >= token.x && data.y >= token.y && data.x <= maximumX && data.y <= maximumY) {
            return token;
        }

        return null;
    });

    if (target?.actor) {
        if (!['character', 'npc', 'loot'].includes(target.actor.data.type)) {
            return true;
        }
        if (data.type === 'Item') {
            return (target.actor.sheet as ActorSheetPF2e<PF2ECharacter | PF2ENPC | PF2ELoot>).onDropItem(data);
        }
    }
    return true;
});
