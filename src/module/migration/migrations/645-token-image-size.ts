import { ActorPF2e } from '@actor';
import { ActorSourcePF2e } from '@actor/data';
import { MigrationBase } from '../base';

/** Restore saved token images and sizes from old versions of the respective rule elements */
export class Migration645TokenImageSize extends MigrationBase {
    static override version = 0.645;

    imageOverrides: Map<string, VideoPath> = new Map();

    sizeOverrides: Map<string, { height: number; width: number }> = new Map();

    isTokenImageFlag(flag: unknown): flag is VideoPath {
        return typeof flag === 'string';
    }

    isTokenSizeFlag(flag: unknown): flag is { height: number; width: number } {
        return (
            flag instanceof Object &&
            'height' in flag &&
            typeof flag['height'] === 'number' &&
            'width' in flag &&
            typeof flag['width'] === 'number'
        );
    }

    override async updateActor(actorSource: ActorSourcePF2e) {
        const flags: Record<string, Record<string, Record<string, unknown> | null>> = actorSource.flags;
        const originalImg = flags.pf2e?.token?.img;
        if (this.isTokenImageFlag(originalImg)) {
            this.imageOverrides.set(actorSource._id, originalImg);
        }

        const originalSize = flags.pf2e?.token?.size;
        if (this.isTokenSizeFlag(originalSize)) {
            this.sizeOverrides.set(actorSource._id, originalSize);
        }

        if (typeof flags.pf2e?.token === 'object') {
            if ('game' in globalThis) flags.pf2e['-=token'] = null;
            delete flags.pf2e.token;
        }
    }

    override async updateToken(
        tokenSource: foundry.data.TokenSource,
        actor: Readonly<ActorPF2e | null>,
    ): Promise<void> {
        tokenSource.img = this.imageOverrides.get(actor?.id ?? '') ?? tokenSource.img;
        const sizeOverride = this.sizeOverrides.get(actor?.id ?? '');
        tokenSource.height = sizeOverride?.height ?? tokenSource.height;
        tokenSource.width = sizeOverride?.width ?? tokenSource.width;
    }
}
