import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { SettingsPage } from "./components/settings";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<SettingsPage />
	</React.StrictMode>,
);
