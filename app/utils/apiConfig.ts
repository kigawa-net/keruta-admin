import {LoadedClientState} from "~/components/Client";

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
export function createFetchOptions(client: LoadedClientState, options: RequestInit = {}): RequestInit {

    if (client.state == "unauthorized") {
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
