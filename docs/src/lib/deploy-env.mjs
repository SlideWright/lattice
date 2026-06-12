// Which kind of deploy is this build? — a pure helper, mirroring base-url.mjs's
// no-`import.meta` rule so it behaves identically in every context. The caller
// passes the build-time env signals (the `.astro` frontmatter has them:
// `import.meta.env.DEV`, `process.env.CF_PAGES`, `process.env.CF_PAGES_BRANCH`).
//
// "Production" is the public site: the GitHub Pages build (runs WITHOUT
// CF_PAGES), or a `main`-branch Cloudflare deploy (a future custom-domain
// production). Everything else is a preview: local `astro dev`, and the
// Cloudflare `*.pages.dev` branch deploys that serve as PR previews.
//
// @param {{ dev?: boolean, cfPages?: unknown, cfBranch?: string }} env
export const isPreviewDeploy = ({ dev, cfPages, cfBranch } = {}) =>
	Boolean(dev) || (Boolean(cfPages) && cfBranch !== 'main');

export const isProductionDeploy = (env) => !isPreviewDeploy(env);
