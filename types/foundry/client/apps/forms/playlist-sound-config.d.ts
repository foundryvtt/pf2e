/**
 * Playlist Sound Configuration Sheet
 *
 * @param sound     The sound object being configured
 * @param options   Additional application rendering options
 */
declare class PlaylistSoundConfig extends FormApplication {
    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
}
