import { isImageFilePath, isImageOrVideoPath, isObject } from "@util";

/** A mapping of module-provided art to be used for compendium actors and their prototype tokens */
class ModuleArt {
    readonly map: Map<CompendiumUUID, ActorArtPartial> = new Map();

    /** Pull actor and token art from module.json or separate mapping files and store in the map */
    async refresh(): Promise<void> {
        this.map.clear();
        const activeModules = [...game.modules.entries()].filter(([_key, m]) => m.active);

        for (const [moduleKey, foundryModule] of activeModules) {
            const moduleArt = await this.#getArtMap(foundryModule.flags?.[moduleKey]?.["pf2e-art"]);
            if (!moduleArt) continue;

            for (const [packName, art] of Object.entries(moduleArt)) {
                const pack = game.packs.get(`pf2e.${packName}`);
                if (!pack) {
                    console.warn(
                        `PF2e System | Failed pack lookup from module art registration (${moduleKey}): ${packName}`
                    );
                    continue;
                }

                const index = pack.indexed ? pack.index : await pack.getIndex();
                for (const [actorId, paths] of Object.entries(art)) {
                    const record = index.get(actorId);
                    if (!record) continue;

                    record.img = paths.actor;
                    const actorArtPartial: ActorArtPartial = {
                        img: paths.actor,
                        prototypeToken: {
                            texture: {
                                src: typeof paths.token === "string" ? paths.token : paths.token.img,
                            },
                        },
                    };
                    // Add supplementary data if present
                    if (typeof paths.token !== "string") {
                        if (typeof paths.token.scale === "number") {
                            actorArtPartial.prototypeToken.texture.scaleX = paths.token.scale;
                            actorArtPartial.prototypeToken.texture.scaleY = paths.token.scale;
                            actorArtPartial.prototypeToken.flags = { pf2e: { autoscale: false } };
                        }
                        if (typeof paths.token.randomImg === "boolean") {
                            actorArtPartial.prototypeToken.randomImg = paths.token.randomImg;
                        }
                    }

                    this.map.set(`Compendium.pf2e.${packName}.${actorId}`, actorArtPartial);
                }
            }
        }

        const apps = Object.values(ui.windows).filter(
            (w): w is Compendium<CompendiumDocument> => w instanceof Compendium
        );
        for (const compendium of apps) {
            compendium.render();
        }
    }

    async #getArtMap(art: unknown): Promise<ModuleArtRecord | null> {
        if (!art) {
            return null;
        } else if (this.#isModuleArt(art)) {
            return art;
        } else if (typeof art === "string") {
            // Instead of being in a module.json file, the art map is in a separate JSON file referenced by path
            try {
                const response = await fetch(art);
                if (!response.ok) {
                    console.warn(`PF2e System | Failed loading art mapping file at ${art}`);
                    return null;
                }
                const map = await response.json();
                return this.#isModuleArt(map) ? map : null;
            } catch (error) {
                if (error instanceof Error) {
                    console.warn(`PF2e System | ${error.message}`);
                }
            }
        }

        return null;
    }

    #isModuleArt(record: unknown): record is ModuleArtRecord {
        return (
            isObject(record) &&
            Object.values(record).every(
                (packToArt) =>
                    isObject(packToArt) &&
                    Object.values(packToArt).every(
                        (art: unknown) =>
                            // `art` is an object with `actor` and `token` properties, and `actor.img` is an image
                            // file path
                            isObject(art) &&
                            "actor" in art &&
                            typeof isImageFilePath(art.actor) &&
                            "token" in art &&
                            // `token` is an image/video file path, or it is an object with an image/video file path
                            // along with (optionally) `scale` and/or `randomImg`
                            (isImageOrVideoPath(art.token) ||
                                (isObject(art.token) &&
                                    "img" in art.token &&
                                    isImageOrVideoPath(art.token.img) &&
                                    (!("scale" in art.token) ||
                                        (typeof art.token.scale === "number" && art.token.scale > 0)) &&
                                    (!("randomImg" in art.token) || typeof art.token.randomImg === "boolean")))
                    )
            )
        );
    }
}

interface ModuleArtData {
    actor: ImageFilePath;
    // Token art can either be an image path or an object containing the path and a custom scale
    token: ImageFilePath | { img: ImageFilePath; scale?: number; randomImg?: boolean };
}

/** Prepared `ModuleArtData`, restructured to merge directly into actor source */
interface ActorArtPartial {
    img: ImageFilePath;
    prototypeToken: {
        flags?: {
            pf2e: {
                autoscale: false;
            };
        };
        randomImg?: boolean;
        texture: {
            src: ImageFilePath | VideoFilePath;
            scaleX?: number;
            scaleY?: number;
        };
    };
}

type ModuleArtRecord = Record<string, Record<string, ModuleArtData>>;

export { ModuleArt };
