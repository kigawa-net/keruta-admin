import {json, LoaderFunction} from "@remix-run/node";
import {createFetchOptions} from "~/utils/apiConfig";
import {loadClientState} from "~/components/Client";

/**
 * Server-side loader function to proxy requests to the backend API
 * This avoids CORS issues by having the server make the request instead of the client
 */
export const loader: LoaderFunction = async () => {
    const clientState = await loadClientState()
    try {
        // Construct the backend API URL
        const url = `${clientState.apiUrl}/tasks`;

        // Make the request to the backend API
        const response = await fetch(url, createFetchOptions(clientState, {method: 'GET'}));

        // Check if the request was successful
        if (!response.ok) {
            // If not, throw an error with the status text
            throw new Error(`API request failed: ${response.statusText}, body: ${await response.text()}`);
        }

        // Check the content type to ensure it's JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            // If not JSON, get the text and throw an error with details
            const text = await response.text();
            throw new Error(`API returned non-JSON response: ${text.substring(0, 100)}...`);
        }

        // Parse the response as JSON
        const data = await response.json();

        // Return the data as JSON
        return json(data);
    } catch (error) {
        // If there's an error, return a 500 status with the error message
        console.error("Error proxying request to tasks API:", error);
        return json(
            {error: {message: error instanceof Error ? error.message : "Unknown error"}},
            {status: 500}
        );
    }
};
