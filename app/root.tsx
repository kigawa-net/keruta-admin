import {cssBundleHref} from "@remix-run/css-bundle";
import type {LinksFunction} from "@remix-run/node";
import {Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData,} from "@remix-run/react";

// Import Bootstrap CSS
import bootstrapStyles from "bootstrap/dist/css/bootstrap.min.css";

// Import Navbar
import Navbar from "~/components/Navbar";
import {ClientProvider, loadClientState, LoadedClientState} from "~/components/Client";

export const links: LinksFunction = () => [
    ...(cssBundleHref ? [{rel: "stylesheet", href: cssBundleHref}] : []),
    {rel: "stylesheet", href: bootstrapStyles},
];

// Main App component
function AppLayout() {
    const loaderData = useLoaderData<typeof loader>()
    return (
        <ClientProvider clientState={loaderData.clientState}>
            <div className="d-flex flex-column min-vh-100">
                <Navbar/>
                <div className="container-fluid flex-grow-1 py-3">
                    <Outlet/>
                </div>
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
