/** Public assets follow Vite's base path on localhost and GitHub Pages. */
export const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
