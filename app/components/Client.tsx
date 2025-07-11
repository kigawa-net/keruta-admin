import {createContext, ReactNode, useContext} from "react";
import {getApiUrl, getAuthToken, getBackendUrl} from "~/utils/backendConfig.server";

const ClientContext = createContext<ClientState>({
    state: "loading"
})

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

export async function loadClientState(): Promise<LoadedClientState> {
    const authToken = getAuthToken();
    const backendUrl = getBackendUrl()
    const apiUrl = getApiUrl()
    if (!authToken) {
        return {
            state: "unauthorized",
            backendUrl,
            apiUrl,
        }
    }
    return {
        state: "authorized",
        authToken,
        backendUrl,
        apiUrl,
    }
}

export interface AuthorizedClientState {
    state: "authorized",
    authToken: string,
    backendUrl: string,
    apiUrl: string,
}

export type UnauthorizedClientState = Omit<AuthorizedClientState, "authToken" | "state"> & {
    state: "unauthorized"
}

export interface LoadingClientState {
    state: "loading"

}

export type LoadedClientState = AuthorizedClientState | UnauthorizedClientState
export type ClientState = LoadedClientState | LoadingClientState
