/**
 * Playlist Configuration Sheet
 *
 * @param object    The Playlist being edited
 * @param options   Additional application rendering options
 */
declare class PlaylistConfig extends FormApplication<Playlist> {
    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
}
