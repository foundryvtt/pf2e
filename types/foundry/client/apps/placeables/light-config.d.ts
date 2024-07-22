/**
 * Light Source Configuration Sheet
 *
 * @param light     The AmbientLight object for which settings are being configured
 * @param options   LightConfig ui options (see Application)
 */
declare class LightConfig<TDocument extends AmbientLightDocument<Scene | null>> extends DocumentSheet<TDocument> {
    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
}
