import { CharacterDetails } from "@actor/character/data.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ABCFeatureEntryData } from "@item/abc/data.ts";
import { AncestrySource, BackgroundSource, ClassSource, ItemSourcePF2e, KitSource } from "@item/data/index.ts";
import { KitEntryData } from "@item/kit/data.ts";
import { MigrationBase } from "../base.ts";

export class Migration620RenameToWebp extends MigrationBase {
    static override version = 0.62;

    private regexp = /(\/?systems\/pf2e\/[^"]+)\.(?:jpg|png)\b/;

    private renameToWebP<T extends string>(imgPath: T): T;
    private renameToWebP(imgPath: undefined): undefined;
    private renameToWebP<T extends string>(imgPath: T | undefined): T | undefined;
    private renameToWebP<T extends string>(imgPath: T | undefined): T | undefined {
        if (typeof imgPath === "string" && this.regexp.test(imgPath)) {
            return imgPath.replace(this.regexp, "$1.webp") as T;
        }
        return imgPath?.replace("icons/svg/mystery-man.svg", "systems/pf2e/icons/default-icons/mystery-man.svg") as T;
    }

    private isABCK(itemData: ItemSourcePF2e): itemData is AncestrySource | BackgroundSource | ClassSource | KitSource {
        const ITEMS_WITH_ITEMS = ["ancestry", "background", "class", "kit"];
        return ITEMS_WITH_ITEMS.includes(itemData.type);
    }

    override async updateActor(actorData: ActorSourcePF2e): Promise<void> {
        actorData.img = this.renameToWebP(actorData.img);

        if (typeof actorData.prototypeToken?.texture.src === "string") {
            actorData.prototypeToken.texture.src = this.renameToWebP(actorData.prototypeToken.texture.src);
        }

        // Icons for active effects
        for (const effect of actorData.effects ?? []) {
            effect.icon = this.renameToWebP(effect.icon);
        }

        if (actorData.type === "character") {
            const details: CharacterDetails & { deity?: { image: string } } = actorData.system.details;
            if (details.deity) {
                details.deity.image = this.renameToWebP(details.deity.image);
            }
        }
    }

    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        itemData.img = this.renameToWebP(itemData.img);

        // Icons for active effects
        for (const effect of itemData.effects ?? []) {
            effect.icon = this.renameToWebP(effect.icon);
        }

        if (this.isABCK(itemData)) {
            const embedData = itemData.system.items;
            const embeds = Object.values(embedData).filter(
                (maybeEmbed): maybeEmbed is KitEntryData | ABCFeatureEntryData => !!maybeEmbed
            );
            for (const embed of embeds) {
                embed.img = this.renameToWebP(embed.img);
                if ("items" in embed && embed.items) {
                    const deepEmbeds = Object.values(embed.items).filter((maybeDeepEmbed) => !!maybeDeepEmbed);
                    for (const deepEmbed of deepEmbeds) {
                        deepEmbed.img = this.renameToWebP(deepEmbed.img);
                    }
                }
            }
        }
    }

    override async updateMacro(macroData: foundry.documents.MacroSource): Promise<void> {
        macroData.img = this.renameToWebP(macroData.img);
    }

    override async updateTable(tableData: foundry.documents.RollTableSource): Promise<void> {
        tableData.img = this.renameToWebP(tableData.img);
        for (const result of tableData.results) {
            result.img = this.renameToWebP(result.img);
        }
    }

    override async updateToken(tokenData: foundry.documents.TokenSource): Promise<void> {
        tokenData.texture.src = this.renameToWebP(tokenData.texture.src);
        tokenData.effects = tokenData.effects.filter((texture) => !this.regexp.test(texture));
    }

    override async updateUser(userData: foundry.documents.UserSource): Promise<void> {
        userData.img = this.renameToWebP(userData.img);
    }
}
