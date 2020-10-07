import path from "path";

import type { ConfigRouteObject } from "./routes";
import { defineRoutes as _defineRoutes, getConventionalRoutes } from "./routes";

/**
 * The user-provided config in remix.config.js.
 */
export interface AppConfig {
  /**
   * The path to the `app` directory, relative to remix.config.js. Defaults to
   * "src".
   */
  appDirectory?: string;

  /**
   * The path to the browser build, relative to remix.config.js. Defaults to
   * "public/build".
   */
  browserBuildDirectory?: string;

  /**
   * The path to the `data` directory, relative to remix.config.js. Defaults to
   * "loaders".
   */
  dataDirectory?: string;

  /**
   * The port number to use for the dev server. Defaults to 8002.
   */
  devServerPort?: number;

  /**
   * The URL prefix of the browser build with a trailing slash. Defaults to
   * "/build/".
   */
  publicPath?: string;

  /**
   * A function for defining custom routes.
   */
  routes?: (defineRoutes: typeof _defineRoutes) => Promise<ConfigRouteObject[]>;

  /**
   * The path to the server build, relative to remix.config.js. Defaults to
   * "build".
   */
  serverBuildDirectory?: string;

  /* TODO: MDX options, there is no type for it, we need to make one */
  mdx: any;
}

/**
 * Fully resolved configuration object we use throughout Remix.
 */
export interface RemixConfig {
  /**
   * The absolute path to the source directory.
   */
  appDirectory: string;

  /**
   * The absolute path to the browser build.
   */
  browserBuildDirectory: string;

  /**
   * The absolute path to the `data` directory.
   */
  dataDirectory: string;

  /**
   * The port number to use for the dev server.
   */
  devServerPort: number;

  /**
   * The URL prefix of the browser build with a trailing slash.
   */
  publicPath: string;

  /**
   * The absolute path to the root of the Remix project.
   */
  rootDirectory: string;

  /**
   * An array of all available routes, nested according to route hierarchy.
   */
  routes: ConfigRouteObject[];

  /**
   * A route lookup table for the data loaders.
   */
  routeManifest: RouteManifest<ConfigRouteObject>;

  /**
   * The absolute path to the server build.
   */
  serverBuildDirectory: string;

  /* TODO: MDX has no types yet, these are the options sent to mdx */
  mdx: any;
}

/**
 * Returns a fully resolved config object from the remix.config.js in the given
 * root directory.
 */
export async function readConfig(remixRoot?: string): Promise<RemixConfig> {
  if (!remixRoot) {
    remixRoot = process.env.REMIX_ROOT || process.cwd();
  }

  let rootDirectory = path.resolve(remixRoot);
  let configFile = path.resolve(rootDirectory, "remix.config.js");

  let appConfig: AppConfig;
  try {
    appConfig = require(configFile);
  } catch (error) {
    throw new Error(`Missing remix.config.js in ${rootDirectory}`);
  }

  let appDirectory = path.resolve(
    rootDirectory,
    appConfig.appDirectory || "app"
  );

  let browserBuildDirectory = path.resolve(
    rootDirectory,
    appConfig.browserBuildDirectory || path.join("public", "build")
  );

  let dataDirectory = path.resolve(
    rootDirectory,
    appConfig.dataDirectory || "data"
  );

  let devServerPort = appConfig.devServerPort || 8002;

  let publicPath = appConfig.publicPath || "/build/";
  if (!publicPath.endsWith("/")) {
    publicPath += "/";
  }

  let routes = getConventionalRoutes(appDirectory, dataDirectory);
  if (appConfig.routes) {
    let manualRoutes = await appConfig.routes(_defineRoutes);
    routes.push(...manualRoutes);
  }

  let routeManifest = createRouteManifest(routes);

  let serverBuildDirectory = path.resolve(
    rootDirectory,
    appConfig.serverBuildDirectory || "build"
  );

  // TODO: validate routes

  let remixConfig: RemixConfig = {
    appDirectory,
    browserBuildDirectory,
    dataDirectory,
    devServerPort,
    publicPath,
    rootDirectory,
    routes,
    routeManifest,
    serverBuildDirectory,
    mdx: appConfig.mdx
  };

  return remixConfig;
}

export interface RouteManifest<RouteObject> {
  [routeId: string]: RouteObject;
}

function createRouteManifest(
  routes: ConfigRouteObject[],
  manifest: RouteManifest<ConfigRouteObject> = {}
): RouteManifest<ConfigRouteObject> {
  for (let route of routes) {
    let { children, ...rest } = route;

    manifest[route.id] = rest;

    if (children) {
      createRouteManifest(children, manifest);
    }
  }

  return manifest;
}
