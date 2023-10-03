import { MigrationBase } from "../base.ts";

/** Migrate all metagame settings from . to _ prefixes, and the visibility ones to booleans */
export class Migration797MetagameSetting extends MigrationBase {
    static override version = 0.797;

    visibilitySettings = ["showDC", "showResults"];
    settings = [
        ...this.visibilitySettings,
        "tokenSetsNameVisibility",
        "secretDamage",
        "secretCondition",
        "partyVision",
    ];

    override async migrate(): Promise<void> {
        for (const setting of this.settings) {
            const storage = game.settings.storage.get("world");
            const newKey = `metagame_${setting}`;
            const oldValue = storage.getItem(`pf2e.metagame.${setting}`) ?? null;
            const existingValueRaw = storage.getItem(`pf2e.${newKey}`) ?? null;
            if (oldValue !== null && existingValueRaw !== null) {
                const newValue = this.visibilitySettings.includes(setting)
                    ? !["gm", "owner"].includes(oldValue)
                    : oldValue;
                game.settings.set("pf2e", newKey, newValue);
            }
        }
    }
}
