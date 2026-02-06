import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import RootErrorBoundary from "@/components/RootErrorBoundary";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
);
