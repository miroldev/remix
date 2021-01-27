import fs from "fs";
import path from "path";

import type { ConfigRouteObject, DefineRoute } from "./routes";
import { defineRoutes, createRouteId } from "./routes";
import { isModuleFile } from "./rollup/routeModules";
import { isStylesFile } from "./rollup/styles";

/**
 * Defines routes using the filesystem convention in `app/routes`. The rules are:
 *
 * - Route paths are derived from the file path. A `.` in the filename indicates
 *   a `/` in the URL (a "nested" URL, but no route nesting). A `$` in the
 *   filename indicates a dynamic URL segment.
 * - Subdirectories are used for nested routes.
 *
 * For example, a file named `app/routes/gists/$username.tsx` creates a route
 * with a path of `gists/:username`.
 */
export function defineConventionalRoutes(
  layoutRouteId: string, // filename, no extension
  appDir: string
): ConfigRouteObject[] {
  let routeFiles: {
    [routeId: string]: {
      module?: string;
      styles?: string;
    };
  } = {};

  function findOrCreateFiles(file: string): typeof routeFiles[string] {
    let id = createRouteId(file);
    return routeFiles[id] || (routeFiles[id] = {});
  }

  function defineNestedRoutes(
    defineRoute: DefineRoute,
    parentRouteId?: string
  ) {
    let routeIds = Object.keys(routeFiles);
    let childRouteIds = routeIds.filter(
      id => findParentRouteId(routeIds, id) === parentRouteId
    );

    for (let routeId of childRouteIds) {
      let routePath = createRoutePath(
        routeId.slice((parentRouteId || "routes").length + 1)
      );
      let { module, styles } = routeFiles[routeId];

      if (module) {
        defineRoute(routePath, module, { styles }, () => {
          defineNestedRoutes(defineRoute, routeId);
        });
      } else {
        throw new Error(
          `There is a styles file for route "${routeId}", but no module`
        );
      }
    }
  }

  // First, find all route modules & styles in app/routes
  visitFiles(path.join(appDir, "routes"), file => {
    let files = findOrCreateFiles(path.join("routes", file));

    if (isModuleFile(file)) {
      files.module = path.join("routes", file);
    } else if (isStylesFile(file)) {
      files.styles = path.join("routes", file);
    } else {
      throw new Error(
        `Invalid route component file: ${path.join(appDir, "routes", file)}`
      );
    }
  });

  function defineLayoutRoutes(layoutRouteName: string) {
    // "__" to get our Object.keys(routeManifest).sort() in components.tsx to
    // put layouts first 😟
    let id = "__" + layoutRouteName;
    let routes = defineRoutes(defineNestedRoutes);

    // Add the root route id to the first level routes
    for (let shallowRoute of routes) {
      shallowRoute.parentId = id;
    }

    return [
      {
        id,
        path: "/",
        moduleFile: findRootRouteModule(appDir, layoutRouteName),
        // TODO: could use this instead of special casing global.css
        // stylesFile: path.join(appDir, "global.css"),
        children: routes
      }
    ];
  }

  return defineLayoutRoutes(layoutRouteId);
}

function findRootRouteModule(appDir: string, name: string) {
  let potentialNames = ["js", "jsx", "tsx"].map(ext => `${name}.${ext}`);

  for (let name of potentialNames) {
    let rootPath = path.join(appDir, name);
    if (fs.existsSync(rootPath)) {
      return name;
    }
  }
  throw new Error(
    "No root route module found. Please create a file at `<appDir>/root.{js,jsx,tsx}`"
  );
}

function createRoutePath(routeId: string): string {
  let path = routeId.replace(/\$/g, ":").replace(/\./g, "/");
  return /\b\/?index$/.test(path) ? path.replace(/\/?index$/, "") : path;
}

function findParentRouteId(
  routeIds: string[],
  childRouteId: string
): string | undefined {
  return (
    routeIds
      .slice(0)
      .sort(byLongestFirst)
      // FIXME: this will probably break with two routes like foo/ and foo-bar/,
      // we use `startsWith` with we also need to factor in the segment `/`
      // boundaries. There are bugs in React Router NavLink with this too.
      // Probably need to ditch all uses of `startsWith` in route matching.
      .find(id => childRouteId.startsWith(`${id}/`))
  );
}

function byLongestFirst(a: string, b: string): number {
  return b.length - a.length;
}

function visitFiles(
  dir: string,
  visitor: (file: string) => void,
  baseDir = dir
): void {
  for (let filename of fs.readdirSync(dir)) {
    let file = path.resolve(dir, filename);
    let stat = fs.lstatSync(file);

    if (stat.isDirectory()) {
      visitFiles(file, visitor, baseDir);
    } else if (stat.isFile()) {
      visitor(path.relative(baseDir, file));
    }
  }
}
