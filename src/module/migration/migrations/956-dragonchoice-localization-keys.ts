import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Migrate Dragon Disciple ChoiceSet label keys to use PF2E.Dragon.* */
export class Migration956DragonChoiceLocalizationKeys extends MigrationBase {
    static override version = 0.956;
    #OLD_PREFIX = "PF2E.SpecificRule.DragonDisciple.DragonChoice.";
    #NEW_PREFIX = "PF2E.Dragon.";

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        source.system = recursiveReplaceString(source.system, (s) => s.replace(this.#OLD_PREFIX, this.#NEW_PREFIX));
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system = recursiveReplaceString(source.system, (s) => s.replace(this.#OLD_PREFIX, this.#NEW_PREFIX));
    }
}
