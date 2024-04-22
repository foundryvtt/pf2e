import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { recursiveReplaceString } from "@util";
import { MigrationBase } from "../base.ts";

/** Remove links to removed vision features to prevent broken links **/
export class Migration926RemoveVisionFeatureLinks extends MigrationBase {
    static override version = 0.926;

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        source.system.description = recursiveReplaceString(source.system.description, (s) =>
            s
                .replaceAll("@UUID[Compendium.pf2e.ancestryfeatures.Item.HHVQDp61ehcpdiU8]{Darkvison}", "Darkvision")
                .replaceAll(
                    "@UUID[Compendium.pf2e.ancestryfeatures.Item.DRtaqOHXTRtGRIUT]{Low-Light Vision}",
                    "Low-Light Vision",
                )
                .replaceAll("@UUID[Compendium.pf2e.ancestryfeatures.HHVQDp61ehcpdiU8]{Darkvison}", "Darkvision")
                .replaceAll(
                    "@UUID[Compendium.pf2e.ancestryfeatures.DRtaqOHXTRtGRIUT]{Low-Light Vision}",
                    "Low-Light Vision",
                )
                .replaceAll("@Compendium[pf2e.ancestryfeatures.HHVQDp61ehcpdiU8]{Darkvison}", "Darkvision")
                .replaceAll(
                    "@Compendium[pf2e.ancestryfeatures.DRtaqOHXTRtGRIUT]{Low-Light Vision}",
                    "Low-Light Vision",
                ),
        );
    }
}
