import {
    ApplicationConfiguration,
    ApplicationRenderContext,
    ApplicationTabsConfiguration,
} from "@client/applications/_types.mjs";
import AVMaster from "@client/av/master.mjs";
import {
    ApplicationV2,
    HandlebarsApplicationMixin,
    HandlebarsRenderOptions,
    HandlebarsTemplatePart,
} from "../../api/_module.mjs";

interface AVConfigConfiguration extends ApplicationConfiguration {
    /** The AVMaster instance being configured */
    webrtc?: AVMaster;
}

/**
 * Audio/Video Conferencing Configuration Sheet
 */
export default class AVConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(options: DeepPartial<AVConfigConfiguration>);

    webrtc: AVMaster;

    static override DEFAULT_OPTIONS: DeepPartial<AVConfigConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    static override TABS: Record<string, ApplicationTabsConfiguration>;

    protected _configureRenderParts(options: HandlebarsRenderOptions): Record<string, HandlebarsTemplatePart>;

    protected override _prepareContext(options: HandlebarsRenderOptions): Promise<ApplicationRenderContext>;

    protected override _preparePartContext(
        partId: string,
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<ApplicationRenderContext>;

    protected override _onRender(context: ApplicationRenderContext, options: HandlebarsRenderOptions): Promise<void>;
}

export {};
