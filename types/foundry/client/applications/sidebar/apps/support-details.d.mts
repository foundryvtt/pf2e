import { ApplicationConfiguration, ApplicationRenderContext } from "@client/applications/_module.mjs";
import {
    ApplicationV2,
    HandlebarsApplicationMixin,
    HandlebarsRenderOptions,
    HandlebarsTemplatePart,
} from "../../api/_module.mjs";

/**
 * A bundle of metrics for Support
 */
interface SupportReportData {
    coreVersion: string;
    systemVersion: string;
    activeModuleCount: number;
    performanceMode: string;
    screen: string;
    viewport: string;
    os: string;
    client: string;
    gpu: string;
    maxTextureSize: number | string;
    sceneDimensions: string;
    grid: number;
    padding: number;
    walls: number;
    lights: number;
    sounds: number;
    tiles: number;
    tokens: number;
    actors: number;
    items: number;
    journals: number;
    tables: number;
    playlists: number;
    packs: number;
    messages: number;
    hasViewedScene: boolean;
    worldScripts: string[];
    largestTexture: { width: number; height: number; src?: string };
}

export default class SupportDetails extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    protected override _preparePartContext(
        partId: string,
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<ApplicationRenderContext>;

    /**
     * Marshal information on Documents that failed validation and format it for display.
     */
    protected _getDocumentValidationErrors(): object[];

    /**
     * Marshal package-related warnings and errors and format it for display.
     */
    protected _getModuleIssues(): object[];

    /**
     * Collects a number of metrics that is useful for Support
     */
    static generateSupportReport(): Promise<SupportReportData>;

    /**
     * Get a WebGL renderer information string
     * @param gl The rendering context
     * @returns The unmasked renderer string
     */
    static getWebGLRendererInfo(gl: WebGLRenderingContext): string;
}

export {};
