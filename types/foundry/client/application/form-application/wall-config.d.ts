/** Wall Configuration Sheet */
declare class WallConfig extends FormApplication {
    static override get defaultOptions(): WallConfigOptions;

    override get title(): string;

    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
}

declare interface WallConfigOptions extends FormApplicationOptions {
    id: "wall-config";
    editTargets: WallDocument[];
}
