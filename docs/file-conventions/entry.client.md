---
title: entry.client
toc: false
---

# entry.client

By default, Remix will handle hydrating your app on the client for you. If you want to customize this behavior, you can run `npx remix reveal` to generate a `app/entry.client.tsx` (or `.jsx`) that will take precedence. This file is the entry point for the browser and is responsible for hydrating the markup generated by the server in your [server entry module][server-entry-module], however you can also initialize any other client-side code here.

[server-entry-module]: ./entry.server
