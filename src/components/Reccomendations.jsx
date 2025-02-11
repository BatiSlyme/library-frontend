import { gql, useLazyQuery, useQuery } from "@apollo/client";
import { useEffect } from "react";

const USER = gql`
query{
  me {
    favoriteGenre
  }
}
`;

const ALL_BOOKS = gql`
  query getBooks($genre: String) {
    allBooks(genre: $genre) {
      title
      genres
      published
      author {
        name
        born
      }
    }
  }
`;

const Recommendations = ({ show, isLogged }) => {
    if (!show) {
        return null;
    }

    const { data: userData, loading: userLoading, error: userError } = useQuery(USER, { skip: !isLogged });
    const [getBooks, { data: booksData, loading: booksLoading, error: booksError }] = useLazyQuery(ALL_BOOKS);

    useEffect(() => {
        if (userData && userData.me) {
            getBooks({ variables: { genre: userData.me.favoriteGenre } });
        }
    }, [userData, getBooks]);

    if (userLoading || booksLoading) {
        return <div>loading...</div>;
    }

    if (userError) {
        return <div>Error: {userError.message}</div>;
    }

    if (booksError) {
        return <div>Error: {booksError.message}</div>;
    }
    return (
        <div>
            <h2>Recommendations</h2>
            <h3>books in your favorite genre: {userData.me.favoriteGenre} </h3>
            {booksData && booksData.allBooks.length > 0 && <table>
                <tbody>
                    <tr>
                        <th></th>
                        <th>author</th>
                        <th>published</th>
                    </tr>
                    {booksData && booksData.allBooks && booksData.allBooks.map((a) => (
                        <tr key={a.title}>
                            <td>{a.title}</td>
                            <td>{a.author.name}</td>
                            <td>{a.published}</td>
                        </tr>
                    ))}
                </tbody>
            </table>}
        </div>
    )
}

export default Recommendations;