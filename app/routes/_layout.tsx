import {ClientProvider, loadClientState, LoadedClientState} from "~/components/Client";
import {Outlet, useLoaderData} from "@remix-run/react";

async function loader(): Promise<{
    clientState: LoadedClientState;
}> {
    return {
        clientState: await loadClientState(),
    }
}

export default function Layout() {
    const loaderData = useLoaderData<typeof loader>()
    console.log(loaderData)
    return <ClientProvider clientState={loaderData.clientState}>
        <Outlet/>
    </ClientProvider>
}
