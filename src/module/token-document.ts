import { ActorPF2e } from '@actor/index';

export class TokenDocumentPF2e extends TokenDocument<ActorPF2e> {}

export type TokenPF2e = Token<TokenDocumentPF2e> & { statusEffectChanged?: boolean };
