
import { gql, useMutation, useQuery } from '@apollo/client'
import { useEffect, useState } from 'react';
import Select from 'react-select';

const ALL_AUTHORS = gql`
query {
   allAuthors {
    id
    name
    born
  }
}
`;

const SET_BORNYEAR = gql`mutation setAge($name:String!,$setBornTo:Int!)
{
editAuthor(
        name: $name,
        setBornTo: $setBornTo
    ){
        name
      }
}
`;

const Authors = (props) => {
  if (!props.show) {
    return null;
  }
  const [name, setName] = useState('');
  const [born, setBorn] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);

  useEffect(() => {
    console.log('option changed to ', selectedOption);
  }, [selectedOption]);
  const authors = useQuery(ALL_AUTHORS);
  const [setBornYear] = useMutation(SET_BORNYEAR, {
    refetchQueries: [{ query: ALL_AUTHORS }]
  });

  if (authors.loading) {
    return <div>loading...</div>;
  }
  const submit = (event) => {
    event.preventDefault();
    console.log(name, born);

    setBornYear({ variables: { name, setBornTo: Number(born) } });
  }

  if (authors.data) {
    const options = authors.data.allAuthors.map((a) => ({ value: a.name, label: a.name }));
    return (
      <div>
        <h2>authors</h2>
        <table>
          <tbody>
            <tr>
              <th></th>
              <th>born</th>
              <th>books</th>
            </tr>
            {authors.data.allAuthors.map((a) => (
              <tr key={a.name}>
                <td>{a.name}</td>
                <td>{a.born}</td>
                <td>{a.bookCount}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>Set birth year</h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', maxWidth: '20%', gap: '10px' }} about='Author born'>
          <Select
            options={options}
            onChange={(target) => {
              // This is where the onChange callback is called
              // with the selected option as its argument
              setSelectedOption(target)
              setName(target.value);
            }}
            defaultValue={selectedOption}
          />
          <div>Born: <input type="number" onChange={({ target }) => setBorn(Number(target.value) ?? '')} /></div>
          <button type='submit'> submit </button>
        </form>
      </div>
    );
  }

};


export default Authors
