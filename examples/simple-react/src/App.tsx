import React from "react";
import "./App.css";
import { useServices } from "./useServices";

function App() {
  const { authService, chatService } = useServices();

  async function login() {
    const response = await authService.connect();
    if (response.data) {
      await chatService.authenticate(response.data);
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        {authService.authSession ? (
          <p>authService.authSession.accountId.toString()</p>
        ) : (
          <button onClick={() => login()}>Connect</button>
        )}
      </header>
    </div>
  );
}

export default App;
