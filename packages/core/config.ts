import path from "path";
import type { MdxOptions } from "@mdx-js/mdx";

import type { ConfigRouteObject, RouteManifest, DefineRoutes } from "./routes";
import {
  createRouteManifest,
  defineRoutes as _defineRoutes,
  getConventionalRoutes
} from "./routes";

/**
 * The user-provided config in remix.config.js.
 */
export interface AppConfig {
  /**
   * The path to the `app` directory, relative to remix.config.js. Defaults to
   * "app".
   */
  appDirectory?: string;

  /**
   * A function for defining custom routes, in addition to those already defined
   * using the filesystem convention in `app/routes`.
   */
  routes?: (defineRoutes: DefineRoutes) => Promise<ReturnType<DefineRoutes>>;

  /**
   * The path to the `loaders` directory, relative to remix.config.js. Defaults to
   * "loaders".
   */
  loadersDirectory?: string;

  /**
   * The path to the browser build, relative to remix.config.js. Defaults to
   * "public/build".
   */
  browserBuildDirectory?: string;

  /**
   * The URL prefix of the browser build with a trailing slash. Defaults to
   * "/build/".
   */
  publicPath?: string;

  /**
   * The path to the server build, relative to remix.config.js. Defaults to
   * "build".
   */
  serverBuildDirectory?: string;

  /**
   * The port number to use for the dev server. Defaults to 8002.
   */
  devServerPort?: number;

  /**
   * Options to use when compiling MDX.
   */
  mdx?: MdxOptions;
}

/**
 * Fully resolved configuration object we use throughout Remix.
 */
export interface RemixConfig {
  /**
   * The absolute path to the root of the Remix project.
   */
  rootDirectory: string;

  /**
   * The absolute path to the source directory.
   */
  appDirectory: string;

  /**
   * An array of all available routes, nested according to route hierarchy.
   */
  routes: ConfigRouteObject[];

  /**
   * A route lookup table for the data loaders.
   */
  routeManifest: RouteManifest;

  /**
   * The absolute path to the `loaders` directory.
   */
  loadersDirectory: string;

  /**
   * The absolute path to the browser build.
   */
  browserBuildDirectory: string;

  /**
   * The URL prefix of the browser build with a trailing slash.
   */
  publicPath: string;

  /**
   * The absolute path to the server build.
   */
  serverBuildDirectory: string;

  /**
   * The port number to use for the dev server.
   */
  devServerPort: number;

  /**
   * Options to use when compiling MDX.
   */
  mdx?: MdxOptions;
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

  let loadersDirectory = path.resolve(
    rootDirectory,
    appConfig.loadersDirectory || "loaders"
  );

  let devServerPort = appConfig.devServerPort || 8002;

  let publicPath = appConfig.publicPath || "/build/";
  if (!publicPath.endsWith("/")) {
    publicPath += "/";
  }

  let routes = getConventionalRoutes(appDirectory, loadersDirectory);
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
    devServerPort,
    loadersDirectory,
    mdx: appConfig.mdx,
    publicPath,
    rootDirectory,
    routes,
    routeManifest,
    serverBuildDirectory
  };

  return remixConfig;
}
