/**
 * Ambient Sound Config Sheet
 *
 * @param sound             The sound object being configured
 * @param options           Additional application rendering options
 * @param options.preview   Configure a preview version of a sound which is not yet saved
 */
declare class AmbientSoundConfig<
    TDocument extends AmbientSoundDocument<Scene | null>,
> extends DocumentSheet<TDocument> {
    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
}
