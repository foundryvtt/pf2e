import { isObject } from "@util";

function isModuleArt(
    record: unknown
): record is Record<string, Record<string, { actor: ImagePath; token: ImagePath }>> {
    return (
        isObject<Record<string, unknown>>(record) &&
        Object.values(record).every(
            (packToArt) =>
                isObject<Record<string, unknown>>(packToArt) &&
                Object.values(packToArt).every(
                    (art) =>
                        isObject<Record<string, unknown>>(art) &&
                        typeof art.actor === "string" &&
                        typeof art.token === "string"
                )
        )
    );
}

/**
 * Pull actor and token art from module.json files, which will replace default images on compendium actors and their
 * prototype tokens
 */
export async function registerModuleArt(): Promise<void> {
    const activeModules = [...game.modules.entries()].filter(([_key, foundryModule]) => foundryModule.active);
    for (const [moduleKey, foundryModule] of activeModules) {
        const moduleArt = foundryModule.data.flags?.[moduleKey]?.["pf2e-art"];
        if (!isModuleArt(moduleArt)) continue;

        for (const [packName, art] of Object.entries(moduleArt)) {
            const pack = game.packs.get(`pf2e.${packName}`);
            if (!pack) {
                console.warn(
                    `PF2e System | Failed pack lookup from module art registration (${moduleKey}): ${packName}`
                );
                continue;
            }

            const index = await pack.getIndex();
            for (const [actorId, paths] of Object.entries(art)) {
                const record = index.get(actorId);
                if (!record) continue;

                record.img = paths.actor;
                game.pf2e.system.moduleArt.set(`Compendium.pf2e.${packName}.${actorId}`, paths);
            }
        }
    }
}
