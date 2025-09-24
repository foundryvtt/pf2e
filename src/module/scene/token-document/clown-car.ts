import type { PartyPF2e } from "@actor";
import type { Rectangle } from "@common/_types.d.mts";
import { getAreaSquares } from "@module/canvas/token/aura/util.ts";
import type { ScenePF2e, TokenDocumentPF2e } from "@scene";
import { ErrorPF2e } from "@util";
import * as R from "remeda";

/** A helper class to manage a party token's loaded/unloaded state */
class PartyClownCar {
    party: PartyPF2e;

    token: TokenDocumentPF2e<ScenePF2e>;

    constructor(token: TokenDocumentPF2e<ScenePF2e>) {
        this.token = token;
        if (!this.token.scene.isOwner) throw ErrorPF2e("Cannot write to scene");

        const party = token.actor;
        if (!party?.isOfType("party")) throw ErrorPF2e("Unexpected actor type");
        this.party = party;
    }

    get scene(): ScenePF2e {
        return this.token.scene;
    }

    get memberTokens(): TokenDocumentPF2e<ScenePF2e>[] {
        return this.party.members.flatMap((m) => m.getActiveTokens(true, true));
    }

    toggleState(): Promise<void> {
        if (this.memberTokens.length > 0) {
            return this.#retrieve();
        } else {
            return this.#deposit();
        }
    }

    /** Retrieve all party-member tokens, animating their movement before finally deleting them. */
    async #retrieve(): Promise<void> {
        const tokens = this.memberTokens;
        const updates = tokens.map((t) => ({ _id: t.id, ...R.pick(this.token, ["x", "y"]) }));
        await this.scene.updateEmbeddedDocuments("Token", updates);
        await Promise.all(
            tokens.map(async (token) => {
                await token.object?.animationContexts.get(token.object.movementAnimationName)?.promise;
                return token.delete();
            }),
        );
    }

    /** Deposit all party-member tokens, avoiding sending them to the other side of walls. */
    async #deposit(): Promise<void> {
        const car = this.token;
        const placeable = car.object;
        if (!placeable) return;

        const newTokens = (
            await Promise.all(
                this.party.members.map((m) => m.getTokenDocument({ x: car.x, y: car.y, actorLink: true })),
            )
        )
            .map((t) => ({ ...t.toObject(), x: car.x, y: car.y }))
            .sort((a, b) => b.width - a.width);
        const createdTokens = await this.scene.createEmbeddedDocuments("Token", newTokens);
        const freeSpaces = this.#getDepositSpaces();
        const placementData = createdTokens.map((token) => {
            const widthPixels = token.mechanicalBounds.width;
            const square = freeSpaces.findSplice(
                (s) => Math.abs(s.x - token.x) >= widthPixels && Math.abs(s.y - token.y) >= widthPixels,
            );
            return { _id: token._id ?? "", ...R.pick(square ?? car, ["x", "y"]) };
        });
        await this.scene.updateEmbeddedDocuments("Token", placementData);
    }

    /** Get a list of squares near the party token at which member tokens can be deposited */
    #getDepositSpaces(): Rectangle[] {
        const placeable = this.token.object;
        if (!placeable) return [];
        const center = placeable.center;
        const diameter = placeable.bounds.width * 7; // Hopefully sufficient space for all tokens
        const radiusPixels = diameter / 2;
        const distance = canvas.dimensions?.distance ?? 5;
        const radius = radiusPixels / distance;
        const areaBounds = new PIXI.Rectangle(center.x - radiusPixels, center.y - radiusPixels, diameter, diameter);
        const squares = getAreaSquares({ bounds: areaBounds, radius, token: placeable }).filter((s) => s.active);
        return R.sortBy(
            squares
                .filter(
                    (s) =>
                        !(s.x === placeable.x && s.y === placeable.y) &&
                        !(s.center.x === center.x && s.center.y === center.y) &&
                        !placeable.checkCollision(s.center, { type: "move", mode: "any" }),
                )
                .reverse(), // Favor positions on the right
            (s) => canvas.grid.measurePath([center, s.center]).distance,
        );
    }
}

export { PartyClownCar };
