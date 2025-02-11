import { gql, useLazyQuery, useQuery } from '@apollo/client';
import { useEffect, useState } from 'react';

export const ALL_BOOKS = gql`
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

const Books = (props) => {
  const [selectedGenre, setSelectedGenre] = useState();
  const [genresSet, setGenresSet] = useState([]);

  //used for filtering with react
  const [filteredBooks, setFilteredBooks] = useState(undefined);
  //--------------------------

  const { data, loading, error, refetch } = useQuery(ALL_BOOKS, {
    variables: { genre: selectedGenre }
  });

  useEffect(() => {
    if (data && data.allBooks && (genresSet.length === 0)) {
      const uniqueGenres = new Set();
      data.allBooks.forEach((book) => {
        book.genres.forEach(genre => uniqueGenres.add(genre));
      });
      uniqueGenres.add('all genres');
      setGenresSet([...uniqueGenres]);
    }
  }, [data, genresSet]);

  useEffect(() => {
    if (selectedGenre) {
      refetch({ genre: (selectedGenre === 'all genres' ? undefined : selectedGenre) });
    }
  }, [selectedGenre, refetch]);

  const filterByGenre = (event) => {
    const filter = event.target.textContent;
    setSelectedGenre(filter);

    // if (filter === 'all genres') {
      // const uniqueGenres = new Set();
      // data.allBooks.forEach((book) => {
      //   book.genres.forEach(genre => uniqueGenres.add(genre));
      // });
      // uniqueGenres.add('all genres');
      // setGenresSet([...uniqueGenres]);
      // setSelectedGenre
      //filter with react
      // setFilteredBooks(undefined);
    // }
    // setFilteredBooks(data.allBooks.filter(book => book.genres.includes(filter)));
  };

  if (!props.show) {
    return null;
  }

  if (loading) {
    return <div>loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h2>books</h2>
      <table>
        <tbody>
          <tr>
            <th></th>
            <th>author</th>
            <th>published</th>
          </tr>
          {(/*filteredBooks ||*/ data.allBooks).map((a) => (
            <tr key={a.title}>
              <td>{a.title}</td>
              <td>{a.author.name}</td>
              <td>{a.published}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        {genresSet.map((genre) => (
          <button
            style={{
              margin: '3px',
              border: genre === selectedGenre ? `3px solid blue` : '1px solid black'
            }}
            onClick={filterByGenre}
            key={genre}>{genre}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Books;