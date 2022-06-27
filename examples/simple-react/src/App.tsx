import React from "react";
import "./App.css";
import { useServices } from "./useServices";
import { AuthSession, ChatMessage } from "js-hashchat";

function App() {
  const { authService, chatService } = useServices();
  const [authSession, setAuthSession] = React.useState<
    AuthSession | undefined
  >();
  const [messageText, setMessageText] = React.useState<string | undefined>();
  const [lastMessage, setLastMessage] = React.useState<
    ChatMessage | undefined
  >();

  async function login() {
    const response = await authService.connect();
    if (response.data) {
      await chatService.authenticate(response.data);
      setAuthSession(response.data);
    }
  }

  async function sendMessage(text: string) {
    const payload = {
      body: {
        content: text,
      },
    };
    const response = await chatService.send(payload);
    if (response.data) {
      setLastMessage(response.data);
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        {authSession ? (
          <>
            <p>{authSession.accountId.toString()}</p>
            <input
              type="text"
              name="message"
              placeholder="Send a message"
              onChange={(event) => setMessageText(event.target.value)}
            />
            <button
              disabled={!messageText}
              onClick={() => sendMessage(messageText!)}
            >
              Send
            </button>
            {lastMessage ? <p>{JSON.stringify(lastMessage)}</p> : null}
          </>
        ) : (
          <button onClick={() => login()}>Connect</button>
        )}
      </header>
    </div>
  );
}

export default App;
