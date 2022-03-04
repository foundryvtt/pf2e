import { FeatPF2e } from "@item";
import { ItemSourcePF2e } from "@item/data";
import { ErrorPF2e } from "@util";
import { fromUUIDs } from "@util/from-uuids";
import { MigrationBase } from "../base";

/** Ensure `crafting` property in character system data has the correct structure */
export class Migration723UpdateMountainStanceDocuments extends MigrationBase {
    static override version = 0.723;

    private slugPattern = /^mountain-(?:quake|stance|stronghold)$/;

    private stanceFeats = (async (): Promise<Record<string, FeatPF2e | undefined>> => {
        const feats: unknown[] = await fromUUIDs([
            "Compendium.pf2e.feats-srd.ZL5UU9quCTvcWzfY",
            "Compendium.pf2e.feats-srd.hO4sKslTrSQMLbGx",
            "Compendium.pf2e.feats-srd.n2hawNmzW7DBn1Lm",
        ]);
        if (!(feats.length === 3 && feats.every((f): f is FeatPF2e & { slug: string } => f instanceof FeatPF2e))) {
            throw ErrorPF2e("Unexpected error retrieving feats");
        }

        return feats.reduce((record: Record<string, FeatPF2e>, f) => ({ ...record, [f.slug]: f }), {});
    })();

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (!(source.type === "feat" && source.data.slug && this.slugPattern.test(source.data.slug))) {
            return;
        }

        const feat = (await this.stanceFeats)[source.data.slug];
        if (feat) source.data.description.value = feat.description;
    }

    override async updateMacro(source: foundry.data.MacroSource): Promise<void> {
        if (source.type === "script" && source.command.includes("Stance: Mountain Stance")) {
            source.command = String.raw`const actors = canvas.tokens.controlled.flatMap((token) => token.actor ?? []);
if (actors.length === 0 && game.user.character) actors.push(game.user.character);
if (actors.length === 0) {
    const message = game.i18n.localize("PF2E.ErrorMessage.NoTokenSelected");
    return ui.notifications.error(message);
}

const ITEM_UUID = "Compendium.pf2e.feat-effects.gYpy9XBPScIlY93p"; // Stance: Mountain Stance
const source = (await fromUuid(ITEM_UUID)).toObject();
source.flags = mergeObject(source.flags ?? {}, { core: { sourceId: ITEM_UUID } });

for (const actor of actors) {
    const existing = actor.itemTypes.effect.find((e) => e.data.flags.core?.sourceId === ITEM_UUID);
    if (existing) {
        await existing.delete();
    } else {
        await actor.createEmbeddedDocuments("Item", [source]);
    }
}`;
        }
    }
}
