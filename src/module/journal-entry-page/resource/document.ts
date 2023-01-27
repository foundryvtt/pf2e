import { JournalEntryPagePF2e } from "../base";
import { ResourcePageData } from "./data";

class ResourcePagePF2e extends JournalEntryPagePF2e {}
interface ResourcePagePF2e {
    readonly data: ResourcePageData;
    readonly system: ResourcePageData["system"];
}

export { ResourcePagePF2e };
