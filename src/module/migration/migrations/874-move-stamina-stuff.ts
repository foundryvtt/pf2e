import { CharacterSystemSource } from "@actor/character/data.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { isObject, recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Move stamina/resolve and update setting to be a boolean. */
export class Migration874MoveStaminaStuff extends MigrationBase {
    static override version = 0.874;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type !== "character") return;

        const variantEnabled =
            "game" in globalThis &&
            game.settings.storage.get("world").find((s) => s.key === "pf2e.staminaVariant")?.value !== '"0"' &&
            game.settings.get("pf2e", "staminaVariant");
        const systemSource: PCSystemSourceWithOldStaminaData = source.system;

        if (isObject<{ value: unknown }>(systemSource.attributes.sp)) {
            const value = Math.floor(Number(systemSource.attributes.sp.value)) || 0;
            if (value > 0 && variantEnabled) systemSource.attributes.hp.sp = { value };

            delete systemSource.attributes.sp;
            systemSource.attributes["-=sp"] = null;
        }

        if (isObject<{ value: unknown }>(systemSource.attributes.resolve)) {
            const value = Math.floor(Number(systemSource.attributes.resolve.value)) || 0;
            if (value > 0 && variantEnabled) systemSource.resources.resolve = { value };

            delete systemSource.attributes.resolve;
            systemSource.attributes["-=resolve"] = null;
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system.rules = recursiveReplaceString(source.system.rules, (text) =>
            text
                .replace(/^system\.attributes\.sp\.max$/, "system.attributes.hp.sp.max")
                .replace(/^system\.attributes\.resolve.max$/, "system.resources.resolve.max"),
        );
    }

    override async migrate(): Promise<void> {
        const staminaVariant = game.settings.storage.get("world").find((s) => s.key === "pf2e.staminaVariant");
        // Pre-V11, this setting was being stored as a string
        if (["1", '"1"'].includes(staminaVariant?._source.value ?? "")) {
            await game.settings.set("pf2e", "staminaVariant", true);
        } else if (staminaVariant) {
            await game.settings.set("pf2e", "staminaVariant", false);
        }

        // Aayyy, while we're at it:
        const pwolVariant = game.settings.storage.get("world").find((s) => s.key === "pf2e.proficiencyVariant");
        if (pwolVariant?._source.value === '"ProficiencyWithoutLevel"') {
            await game.settings.set("pf2e", "proficiencyVariant", true);
        } else if (staminaVariant) {
            await game.settings.set("pf2e", "proficiencyVariant", false);
        }
    }
}

type PCSystemSourceWithOldStaminaData = CharacterSystemSource & {
    attributes: {
        sp?: unknown;
        resolve?: unknown;
        "-=resolve"?: null;
        "-=sp"?: null;
    };
};
