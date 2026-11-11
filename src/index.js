import "./index.scss"
import App from "./App"
import React from "react"
import ReactDOM from "react-dom"
import { BrowserRouter } from "react-router-dom"
import { Provider } from "react-redux"
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "./redux/store"
import { isTvDevice } from "./utils"

// Lets the stylesheet drop GPU-expensive effects on TV hardware.
if (isTvDevice()) {
    document.documentElement.classList.add("is-tv-device");
}

ReactDOM.render(
    <React.StrictMode>
        <Provider store={store}>
            <BrowserRouter>
                <PersistGate persistor={persistor}>
                    <App />
                </PersistGate>
            </BrowserRouter>
        </Provider>
    </React.StrictMode>,
    document.getElementById("root")
)