import {LoadedClientState, ClientState} from "~/components/Client";

/**
 * Default fetch options for API requests
 */
export const defaultFetchOptions: RequestInit = {
    headers: {
        'Content-Type': 'application/json',
    },
    mode: 'cors',
    credentials: 'include',
};


/**
 * Create fetch options with authentication if available
 * @param client
 * @param options Additional fetch options to include
 * @returns Fetch options with authentication headers if available
 */
export function createFetchOptions(client: ClientState, options: RequestInit = {}): RequestInit {
    // Type guard: if loading state, return default options
    if (client.state === "loading") {
        return {...defaultFetchOptions, ...options};
    }

    if (client.state === "unauthorized") {
        return {...defaultFetchOptions, ...options};
    }

    return {
        ...defaultFetchOptions,
        ...options,
        headers: {
            ...defaultFetchOptions.headers,
            ...options.headers,
            'Authorization': `Bearer ${client.authToken}`,
        },
    };
}
