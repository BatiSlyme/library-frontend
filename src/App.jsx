import { useState } from "react";
import Authors from "./components/Authors";
import Books from "./components/Books";
import NewBook from "./components/NewBook";
import Login from "./components/Login";
import { useApolloClient } from "@apollo/client";
import Recommendations from "./components/Reccomendations";


const App = () => {
  const [page, setPage] = useState("authors");
  const [token, setToken] = useState(null);
  const client = useApolloClient()

  const logout = () => {
    setToken(null);
    localStorage.clear();
    client.clearStore();
  }

  return (
    <div>
      <button onClick={() => setPage("authors")}>authors</button>
      <button onClick={() => setPage("books")}>books</button>

      {token && <button onClick={() => setPage("add")}>add book</button>}
      {!token && <button onClick={() => setPage("login")}>login</button>}
      {token && <button onClick={() => setPage("recommendations")}>recommendations</button>}
      {token && <button onClick={logout}>logout</button>}


      <Authors show={page === "authors"} />
      <Books show={page === "books"} isLogged={Boolean(token)} />
      {token && <NewBook show={page === "add"} />}
      {!token && <Login setToken={setToken} show={page === 'login'} />}
      {token && <Recommendations show={page === 'recommendations'} isLogged={Boolean(token)} />}
    </div >
  );
};

export default App;
