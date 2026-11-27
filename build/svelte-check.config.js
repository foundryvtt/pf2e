// Without this, svelte-check reads Svelte options from vite.config.ts by resolving it as a dev server config,
// which runs build:conditions and the Foundry proxy setup
export default {};
