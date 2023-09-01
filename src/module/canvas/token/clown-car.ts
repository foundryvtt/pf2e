import { PartyPF2e } from "@actor";
import { ScenePF2e, TokenDocumentPF2e } from "@scene";
import { ErrorPF2e } from "@util";

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
            return this.#load();
        } else {
            return this.#unload();
        }
    }

    async #load(): Promise<void> {
        const tokenIds = this.memberTokens.map((t) => t.id);
        await this.scene.deleteEmbeddedDocuments("Token", tokenIds);
    }

    async #unload(): Promise<void> {
        const { token } = this;
        const distance = canvas.dimensions?.size ?? 100;
        const newTokens = (
            await Promise.all(
                this.party.members.map((m, index) =>
                    m.getTokenDocument({
                        x: token.x + (index + 1) * distance,
                        y: token.y,
                    })
                )
            )
        ).map((t) => t.toObject());

        await this.scene.createEmbeddedDocuments("Token", newTokens);
    }
}

export { PartyClownCar };
