import { FoundryUtils } from "../utils.ts";

export class MockScene {
    _source: Partial<foundry.documents.SceneSource> & { _id: string; name: string };

    constructor(data: Partial<foundry.documents.SceneSource>) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this._source = { _id: FoundryUtils.randomID(), name: "", ...data } as any;
        this._source.tokens = [];
    }

    get id(): string {
        return this._source._id;
    }

    get name(): string {
        return this._source.name ?? "";
    }

    addToken(token: Partial<foundry.documents.TokenSource>): void {
        this._source.tokens ??= [];

        this._source.tokens.push({
            _id: "",
            flags: {},
            x: 0,
            y: 0,
            height: 100,
            width: 100,
            brightLight: 0,
            dimLight: 0,
            lightAlpha: 0,
            lightAngle: 0,
            lightAnimation: { type: "", speed: 0, intensity: 0 },
            lightColor: "",
            name: "test",
            displayName: 10,
            texture: {
                src: "icons/svg/mystery-man.svg",
                scaleX: 1,
                scaleY: 1,
            } as unknown as foundry.documents.TokenSource["texture"],
            elevation: 0,
            lockRotation: false,
            effects: [] as VideoFilePath[],
            overlayEffect: "",
            vision: false,
            dimSight: 0,
            brightSight: 0,
            sightAngle: 0,
            hidden: false,
            actorId: "",
            actorLink: false,
            delta: {},
            disposition: 0,
            displayBars: 0,
            bar1: { attribute: "" },
            bar2: { attribute: "" },
            ...token,
        } as foundry.documents.TokenSource);
    }

    update(changes: object): void {
        for (const [k, v] of Object.entries(changes)) {
            global.setProperty(this._source, k, v);
        }
    }

    updateEmbeddedEntity(entityType: string, changes: { _id: string }): void {
        let obj: foundry.documents.TokenSource | undefined;
        if (entityType === "Token") {
            obj = this._source.tokens?.find((x) => x._id === changes._id);
        }
        for (const [k, v] of Object.entries(changes)) {
            global.setProperty(obj!, k, v);
        }
    }
}
