import { PartyPF2e } from "@actor";
import { ScenePF2e, TokenDocumentPF2e } from "@scene";
import { ErrorPF2e } from "@util";
import * as R from "remeda";
import { getAreaSquares } from "./aura/util.ts";

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

    async #retrieve(): Promise<void> {
        const tokens = this.memberTokens;
        await Promise.all(
            tokens.map((t) => {
                const rotation = 180 + (t.rotation % 360);
                const displayAttributes = t.object?.mesh.getDisplayAttributes();
                const context: SceneTokenModificationContext<ScenePF2e> = displayAttributes
                    ? { animation: { a0: { ...displayAttributes, rotation } } }
                    : {};

                return t.update({ x: this.token.x, y: this.token.y }, context);
            })
        );

        for (const token of tokens) {
            await token.object?._animation;
        }
        await this.scene.deleteEmbeddedDocuments(
            "Token",
            tokens.map((t) => t.id)
        );
    }

    async #deposit(): Promise<void> {
        const { token } = this;
        const placeable = token.object;
        if (!placeable) return;

        const newTokens = (
            await Promise.all(this.party.members.map((m) => m.getTokenDocument({ x: token.x, y: token.y })))
        ).map((t) => ({ ...t.toObject(), x: token.x, y: token.y }));
        const createdTokens = await this.scene.createEmbeddedDocuments("Token", newTokens);

        const freeSpaces = this.#getDepositSpaces();
        if (freeSpaces.length >= createdTokens.length) {
            const placementData = createdTokens.map((t, index) => ({
                _id: t._id!,
                ...R.pick(freeSpaces[index], ["x", "y"]),
            }));
            await this.scene.updateEmbeddedDocuments("Token", placementData);
        }
    }

    /** Get a list of squares near the party token at which member tokens can be deposited */
    #getDepositSpaces(): Rectangle[] {
        const placeable = this.token.object;
        if (!placeable) return [];
        const { center } = placeable;
        const diameter = placeable.bounds.width * 5;
        const radiusPixels = diameter / 2;
        const radius = radiusPixels / (canvas.dimensions?.distance ?? 5);
        const areaBounds = new PIXI.Rectangle(
            placeable.center.x - radiusPixels,
            placeable.center.y - radiusPixels,
            diameter,
            diameter
        );
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
                        s.x !== placeable.x &&
                        s.y !== placeable.y &&
                        s.center.x !== center.x &&
                        s.center.y !== center.y &&
                        !placeable.checkCollision(s.center, { type: "move", mode: "any" })
                )
                .reverse(), // Favor positions on the right
            (s) => canvas.grid.measureDistance(center, s.center)
        );
    }
}

export { PartyClownCar };
