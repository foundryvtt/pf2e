import type { AmbientLightDocumentPF2e, ScenePF2e, TokenDocumentPF2e } from '.';

export interface SceneDataPF2e<T extends ScenePF2e>
    extends foundry.data.SceneData<
        T,
        TokenDocumentPF2e,
        AmbientLightDocumentPF2e,
        AmbientSoundDocument,
        DrawingDocument,
        MeasuredTemplateDocument,
        NoteDocument,
        TileDocument,
        WallDocument
    > {
    flags: {
        pf2e: {
            [key: string]: unknown;
            syncDarkness: 'enabled' | 'disabled' | 'default';
        };
        [key: string]: Record<string, unknown>;
    };
}
