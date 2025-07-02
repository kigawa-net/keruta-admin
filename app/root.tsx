import { cssBundleHref } from "@remix-run/css-bundle";
import type { LinksFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "@remix-run/react";
import { useEffect, useState } from "react";

// Import Bootstrap CSS
import bootstrapStyles from "bootstrap/dist/css/bootstrap.min.css";

// Import KeycloakProvider and Navbar
import KeycloakProvider from "~/components/KeycloakProvider";
import Navbar from "~/components/Navbar";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: bootstrapStyles },
];

// Main App component with Keycloak integration
function AppWithKeycloak() {
  // Only render KeycloakProvider on the client side
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient ? (
    <KeycloakProvider>
      <div className="d-flex flex-column min-vh-100">
        <Navbar />
        <div className="container-fluid flex-grow-1 py-3">
          <Outlet />
        </div>
      </div>
    </KeycloakProvider>
  ) : (
    <div className="d-flex flex-column min-vh-100">
      <div className="container-fluid flex-grow-1 py-3">
        <Outlet />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <AppWithKeycloak />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
