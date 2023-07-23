import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

export class Migration603ResetQuickRollDefault extends MigrationBase {
    static override version = 0.603;

    override async updateUser(userData: foundry.documents.UserSource): Promise<void> {
        const flags = userData.flags;
        if (
            isObject<Record<string, unknown>>(flags.PF2e) &&
            isObject<Record<string, unknown>>(flags.PF2e.settings) &&
            typeof flags.PF2e.settings.quickD20roll === "boolean"
        ) {
            flags.PF2e.settings.quickD20roll = false;
        }
    }
}
