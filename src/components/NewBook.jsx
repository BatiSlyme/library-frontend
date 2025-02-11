import { useState } from 'react'
import { gql, useMutation } from '@apollo/client'
import { ALL_BOOKS } from './Books';
const ADD_BOOK = gql`mutation createBook($title:String!, $author:String!, $published:Int!, $genres:[String!]!) {
  addBook(
    title :$title,
    author: $author,
    published: $published,
    genres: $genres
  ) {
    title,
    author {
      name,
      born
    }
  }
}`;

const ALL_AUTHORS = gql`
query {
   allAuthors {
    id
    name
    born
  }
}
`;
const NewBook = (props) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [published, setPublished] = useState('');
  const [genre, setGenre] = useState('');
  const [genres, setGenres] = useState([]);

  const [createBook] = useMutation(ADD_BOOK, {
    refetchQueries: [{ query: ALL_AUTHORS }, { query: ALL_BOOKS }],
    update: (cache, response) => {
      cache.updateQuery({ query: ALL_BOOKS }, ({ allBooks }) => {
        console.log('all books updated', allBooks, response.data.addBook);
        return {
          allBooks: allBooks.concat(response.data.addBook),
        }
      })
    },
  });

  if (!props.show) {
    return null
  }

  const submit = async (event) => {
    event.preventDefault()
    createBook({ variables: { title, author, published, genres } });

    console.log('add book...')

    setTitle('')
    setPublished('')
    setAuthor('')
    setGenres([])
    setGenre('')
  }

  const addGenre = () => {
    setGenres(genres.concat(genre))
    setGenre('')
  }

  return (
    <div>
      <form onSubmit={submit}>
        <div>
          title
          <input
            value={title}
            onChange={({ target }) => setTitle(target.value)}
          />
        </div>
        <div>
          author
          <input
            value={author}
            onChange={({ target }) => setAuthor(target.value)}
          />
        </div>
        <div>
          published
          <input
            type="number"
            value={published}
            onChange={({ target }) => setPublished(Number(target.value) ?? '')}
          />
        </div>
        <div>
          <input
            value={genre}
            onChange={({ target }) => setGenre(target.value)}
          />
          <button onClick={addGenre} type="button">
            add genre
          </button>
        </div>
        <div>genres: {genres.join(' ')}</div>
        <button type="submit">create book</button>
      </form>
    </div>
  )
}

export default NewBook