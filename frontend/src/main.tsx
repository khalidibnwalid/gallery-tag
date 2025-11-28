import {
    RouterProvider,
    createHashHistory,
    createRouter,
} from "@tanstack/react-router";
import React from "react";
import ReactDOM from "react-dom/client";
import "./style.css";

import { routeTree } from "./routeTree.gen";

// wails go docs recommend using hash history
const hashHistory = createHashHistory();

const router = createRouter({ routeTree, history: hashHistory });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
}
