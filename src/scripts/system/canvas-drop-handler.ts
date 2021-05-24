import { ActorPF2e } from '@actor/base';
import { ActorSheetPF2e } from 'src/module/actor/sheet/base';

Hooks.on('dropCanvasData', async (canvas: Canvas<ActorPF2e>, data) => {
    const target = canvas.tokens.placeables.find((token) => {
        const maximumX = token.x + token.hitArea.right;
        const maximumY = token.y + token.hitArea.bottom;

        if (data.x >= token.x && data.y >= token.y && data.x <= maximumX && data.y <= maximumY) {
            return true;
        }

        return false;
    });

    if (target?.actor) {
        if (['character', 'npc', 'loot'].includes(target.actor.type)) {
            const sheet = target.actor.sheet as ActorSheetPF2e<ActorPF2e>;
            if (data.type === 'Item') {
                await sheet.onDropItem(data);
                return true;
            }
        }
    }
    return false;
});
