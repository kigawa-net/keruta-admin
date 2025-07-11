import {createContext, ReactNode, useContext} from "react";
import {getAuthToken} from "~/utils/backendConfig.server";

const ClientContext = createContext<ClientState>({
    state: "loading"
})
export async function loadClientState(): Promise<LoadedClientState> {
    const authToken = getAuthToken();
    if (!authToken) {
        return {
            state: "unauthorized"
        }
    }
    return {
        state: "authorized",
        authToken,
    }
}
export function ClientProvider(
    {
        children,
        clientState,
    }: {
        children: ReactNode;
        clientState: LoadedClientState;
    }
) {
    return <ClientContext.Provider value={clientState} children={children}/>
}

export function useClient() {
    return useContext(ClientContext)
}

export interface AuthorizedClientState {
    state: "authorized",
    authToken: string
}

export interface UnauthorizedClientState {
    state: "unauthorized"
}

export interface LoadingClientState {
    state: "loading"

}

export type LoadedClientState = AuthorizedClientState | UnauthorizedClientState
export type ClientState = LoadedClientState | LoadingClientState
