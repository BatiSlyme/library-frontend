import { useState } from "react";
import Authors from "./components/Authors";
import Books, { ALL_BOOKS } from "./components/Books";
import NewBook, { BOOK_ADDED } from "./components/NewBook";
import Login from "./components/Login";
import { useApolloClient, useQuery, useMutation, useSubscription } from "@apollo/client";
import Recommendations from "./components/Reccomendations";

export const updateCache = (cache, query, addedBook) => {
  // helper that is used to eliminate saving same person twice
  const uniqByName = (a) => {
    let seen = new Set()
    return a.filter((item) => {
      let k = item.name
      return seen.has(k) ? false : seen.add(k)
    })
  }

  cache.updateQuery(query, ({ allBooks }) => {
    return {
      allBooks: uniqByName(allBooks.concat(addedBook)),
    }
  })

  // Log the cache after the update
  console.log("Cache after update:", cache.readQuery(query));
}

const App = () => {
  const [page, setPage] = useState("authors");
  const [token, setToken] = useState(null);
  const client = useApolloClient()

  useSubscription(BOOK_ADDED, {
    onData: (({ data }) => {
      const bookAdded = data.data.bookAdded;
      alert(`New book added: ${bookAdded.title}`);
      console.log('client.cahce:', client.cache);
      updateCache(client.cache, { query: ALL_BOOKS }, bookAdded);
      // Log the cache directly after the update
      const cachedData = client.cache.readQuery({ query: ALL_BOOKS });
      console.log("Cache directly after update:", cachedData);
    })
  });

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
