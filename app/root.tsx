import type {LinksFunction} from "@remix-run/node";
import {Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData,} from "@remix-run/react";

// Import Bootstrap CSS
import bootstrapStyles from "bootstrap/dist/css/bootstrap.min.css";

import {ClientProvider, loadClientState, LoadedClientState} from "~/components/Client";

export const links: LinksFunction = () => [
    {rel: "stylesheet", href: bootstrapStyles},
];

// Main App component
function AppLayout() {
    const loaderData = useLoaderData<typeof loader>()
    return (
        <ClientProvider clientState={loaderData.clientState}>
            <div className="min-vh-100">
                <Outlet/>
            </div>
        </ClientProvider>
    );
}

export async function loader(): Promise<{ clientState: LoadedClientState }> {
    const clientState = await loadClientState()
    return {clientState}
}

export default function App() {
    return (
        <html lang="ja">
            <head>
                <meta charSet="utf-8"/>
                <meta name="viewport" content="width=device-width, initial-scale=1"/>
                <Meta/>
                <Links/>
            </head>
            <body>
                <AppLayout/>
                <ScrollRestoration/>
                <Scripts/>
                <LiveReload/>
            </body>
        </html>
    );
}
