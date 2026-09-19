import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="container">
      <h1>NieR Save Editor</h1>
      <p>Tauri 2 + React + TypeScript 脚手架已就绪。</p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="环境自检：输入任意文字"
        />
        <button type="submit">调用 Rust greet</button>
      </form>
      <p>{greetMsg}</p>
    </main>
  );
}

export default App;
