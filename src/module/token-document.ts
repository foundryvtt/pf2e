import { ActorPF2e } from '@actor/index';
import { TokenPF2e } from './canvas/token';

export class TokenDocumentPF2e extends TokenDocument<ActorPF2e> {}

export interface TokenDocumentPF2e {
    readonly _object: TokenPF2e | null;
}
