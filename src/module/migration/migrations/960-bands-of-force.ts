import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Remaster bracers-of-armor slugs to bands of force. */
export class Migration960BandsOfForce extends MigrationBase {
    static override version = 0.96;

    #replaceStrings<T extends object>(data: T): T {
        return recursiveReplaceString(data, (value) =>
            value
                .replace(/(?<![\w/.-])bracers-of-armor(?:-iii|-ii|-i)?(?![\w.-])/g, (slug) => {
                    switch (slug) {
                        case "bracers-of-armor-iii":
                            return "bands-of-force-major";
                        case "bracers-of-armor-ii":
                            return "bands-of-force-greater";
                        default:
                            return "bands-of-force";
                    }
                })
                .replaceAll("BracersOfArmor", "BandsOfForce"),
        );
    }

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        source.system = this.#replaceStrings(source.system);
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system = this.#replaceStrings(source.system);
    }
}
