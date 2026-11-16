import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";
import "./styles.css";
import App from "./App";
import { Lineup } from "./scene/Lineup";

const lineup = import.meta.env.DEV && new URLSearchParams(window.location.search).has("lineup");

createRoot(document.getElementById("root")!).render(lineup ? <Lineup /> : <App />);
