/** Wall Configuration Sheet */
declare class WallConfig extends FormApplication {
    /** @inheritdoc */
    static get defaultOptions(): WallConfigOptions;

    get title(): string;

    protected _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
}

declare interface WallConfigOptions extends FormApplicationOptions {
    id: 'wall-config';
    editTargets: WallDocument[];
}
