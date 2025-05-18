import Scene from "@client/documents/scene.mjs";
import { FormFooterButton } from "../_types.mjs";
import {
    DocumentSheetConfiguration,
    DocumentSheetRenderContext,
    DocumentSheetV2,
    HandlebarsApplicationMixin,
    HandlebarsRenderOptions,
    HandlebarsTemplatePart,
} from "../api/_module.mjs";
import SceneConfig from "../sheets/scene-config.mjs";

interface GridConfigContext<TScene extends Scene = Scene> extends DocumentSheetRenderContext {
    scene: TScene;
    gridTypes: Record<string, string>;
    scale: number;
    pixelsLabel: string;
    buttons: FormFooterButton[];
}

/** A tool for fine-tuning the grid in a Scene */
export default class GridConfig<TScene extends Scene = Scene> extends HandlebarsApplicationMixin(DocumentSheetV2) {
    constructor(options: DocumentSheetConfiguration);

    static override DEFAULT_OPTIONS: DeepPartial<DocumentSheetConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    /** Track the Scene Configuration sheet reference. */
    sheet: SceneConfig<TScene>;

    override _prepareContext(options: HandlebarsRenderOptions): Promise<GridConfigContext<TScene>>;
}
