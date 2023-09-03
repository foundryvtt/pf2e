import type { PartyPF2e } from "@actor";
import { getAreaSquares } from "@module/canvas/token/aura/util.ts";
import type { ScenePF2e, TokenDocumentPF2e } from "@scene";
import { SceneTokenModificationContextPF2e } from "@scene/token-document/document.ts";
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

        await Promise.all(
            tokens.map((token) => {
                const spin = token.x > this.token.x ? "left" : "right";
                const context: SceneTokenModificationContextPF2e = token.object?.mesh ? { animation: { spin } } : {};
                return token.update({ x: this.token.x, y: this.token.y }, context);
            })
        );

        await Promise.all(
            tokens.map(async (token) => {
                await token.object?._animation;
                return token.delete();
            })
        );
    }

    /** Deposit all party-member tokens, avoiding sending them to the other side of walls. */
    async #deposit(): Promise<void> {
        const { token } = this;
        const placeable = token.object;
        if (!placeable) return;

        const newTokens = (
            await Promise.all(this.party.members.map((m) => m.getTokenDocument({ x: token.x, y: token.y })))
        ).map((t) => ({ ...t.toObject(), x: token.x, y: token.y }));
        const createdTokens = await this.scene.createEmbeddedDocuments("Token", newTokens);

        const freeSpaces = this.#getDepositSpaces();
        const placementData = createdTokens.map((t, index) => ({
            _id: t._id!,
            ...R.pick(freeSpaces.at(index) ?? token, ["x", "y"]),
        }));
        await this.scene.updateEmbeddedDocuments("Token", placementData);
    }

    /** Get a list of squares near the party token at which member tokens can be deposited */
    #getDepositSpaces(): Rectangle[] {
        const placeable = this.token.object;
        if (!placeable) return [];
        const { center } = placeable;
        const diameter = placeable.bounds.width * 7;
        const radiusPixels = diameter / 2;
        const radius = radiusPixels / (canvas.dimensions?.distance ?? 5);
        const areaBounds = new PIXI.Rectangle(center.x - radiusPixels, center.y - radiusPixels, diameter, diameter);
        const squares = getAreaSquares({
            token: placeable,
            center,
            radiusPixels,
            radius,
            bounds: areaBounds,
            traits: new Set(),
        }).filter((s) => s.active);

        return R.sortBy(
            squares
                .filter(
                    (s) =>
                        !(s.x === placeable.x && s.y === placeable.y) &&
                        !(s.center.x === center.x && s.center.y === center.y) &&
                        !placeable.checkCollision(s.center, { type: "move", mode: "any" })
                )
                .reverse(), // Favor positions on the right
            (s) => canvas.grid.measureDistance(center, s.center)
        );
    }
}

export { PartyClownCar };
