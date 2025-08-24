import type WallDocument from "@client/documents/wall.d.mts";
import type { Point } from "@common/_types.d.mts";
import * as R from "remeda";

export class DoorControlPF2e extends fc.containers.DoorControl {
    /** Require that a door is in reach for a player to operate it. */
    protected override _onMouseDown(
        event: PIXI.FederatedPointerEvent,
    ): Promise<WallDocument | undefined> | boolean | void {
        const wall = this.wall;
        const wallDoc = wall.document;
        const requiresReach = game.pf2e.settings.automation.reachEnforcement.has("doors");
        if (event.button !== 0 || !requiresReach || wallDoc.isOwner || !game.user.can("WALL_DOORS") || game.paused) {
            return super._onMouseDown(event);
        }
        const testPoints: Point[] = [
            { x: wallDoc.c[0], y: wallDoc.c[1] },
            { x: wallDoc.c[2], y: wallDoc.c[3] },
            this.center,
        ];
        const isInReach = R.unique(
            [canvas.tokens.controlled, game.user.character?.getActiveTokens(true, false) ?? []].flat(),
        ).some((token) => {
            const actor = token.actor;
            if (!actor?.isOwner || !actor.isOfType("creature", "party")) return false;
            const reach = actor.system.attributes.reach;
            // Treat zero-reach creatures as having a reach of five feet to avoid issues with legal grid spaces,
            // such as a wall positioned at an adjacent square's edge with no way for a familiar to move within reach
            // of the door).
            const manipulate = Math.max(reach.manipulate, 5);
            return testPoints.some((p) => token.distanceTo(p) <= manipulate);
        });
        if (isInReach) return super._onMouseDown(event);
        else ui.notifications.warn("PF2E.Wall.Door.OutOfReach", { localize: true });
    }
}
