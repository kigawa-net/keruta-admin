import {ActionFunction, json, LoaderFunction} from "@remix-run/node";
import {createFetchOptions, getApiUrl} from "~/utils/apiConfig";
import {loadClientState} from "~/components/Client";

/**
 * Generic server-side API proxy
 * This route handles all requests to /api/* and proxies them to the backend API
 * It avoids CORS issues by having the server make the request instead of the client
 */

/**
 * Handle GET requests
 */
export const loader: LoaderFunction = async ({request, params}) => {
    const clientState = await loadClientState()
    try {
        // Get the endpoint from the URL parameters (the * in api.*)
        const endpoint = params["*"];
        if (!endpoint) {
            return json({error: {message: "No endpoint specified"}}, {status: 400});
        }

        // Construct the backend API URL
        const url = `${getApiUrl()}/${endpoint}`;

        // Make the request to the backend API
        const response = await fetch(url, createFetchOptions(clientState, {method: 'GET'}));

        // Check if the request was successful
        if (!response.ok) {
            // If not, throw an error with the status text
            throw new Error(`API request failed: ${response.statusText}`);
        }

        // Parse the response as JSON
        const data = await response.json();

        // Return the data as JSON
        return json(data);
    } catch (error) {
        // If there's an error, return a 500 status with the error message
        console.error("Error proxying request to API:", error);
        return json(
            {error: {message: error instanceof Error ? error.message : "Unknown error"}},
            {status: 500}
        );
    }
};

/**
 * Handle POST, PUT, DELETE requests
 */
export const action: ActionFunction = async ({request, params}) => {
    const clientState = await loadClientState()
    try {
        // Get the endpoint from the URL parameters (the * in api.*)
        const endpoint = params["*"];
        if (!endpoint) {
            return json({error: {message: "No endpoint specified"}}, {status: 400});
        }

        // Construct the backend API URL
        const url = `${getApiUrl()}/${endpoint}`;

        // Get the request method and body
        const method = request.method;
        const body = await request.text();

        // Create fetch options with the appropriate method and body
        const options = createFetchOptions(clientState, {
            method,
            body: body.length > 0 ? body : undefined,
        });

        // Make the request to the backend API
        const response = await fetch(url, options);

        // Check if the request was successful
        if (!response.ok) {
            // If not, throw an error with the status text
            throw new Error(`API request failed: ${response.statusText}`);
        }

        // Parse the response as JSON
        const data = await response.json();

        // Return the data as JSON
        return json(data);
    } catch (error) {
        // If there's an error, return a 500 status with the error message
        console.error("Error proxying request to API:", error);
        return json(
            {error: {message: error instanceof Error ? error.message : "Unknown error"}},
            {status: 500}
        );
    }
};
