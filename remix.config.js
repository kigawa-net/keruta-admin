/** @type {import('@remix-run/dev').AppConfig} */
export default {
  ignoredRouteFiles: ["**/.*"],
  // appDirectory: "app",
  // assetsBuildDirectory: "public/build",
  // publicPath: "/build/",
  // serverBuildPath: "build/index.js",
  serverModuleFormat: "esm",
  future: {
    // Recommended future flags for React Router v7
    v3_fetcherPersist: true,
    v3_lazyRouteDiscovery: true,
    v3_relativeSplatPath: true,
    v3_singleFetch: true,
    v3_throwAbortReason: true,
  },
  // Add polyfills for Node.js built-in modules
  browserNodeBuiltinsPolyfill: {
    modules: {
      buffer: true,
      stream: true,
      util: true,
      crypto: true,
    }
  },
};
