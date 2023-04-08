import { ScenePF2e } from "./document.ts";

export class TileDocumentPF2e<TParent extends ScenePF2e | null = ScenePF2e | null> extends TileDocument<TParent> {}
