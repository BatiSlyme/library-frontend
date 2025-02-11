import { useEffect, useState } from "react";
import { gql, useMutation, useQuery } from '@apollo/client'

const LOGIN = gql`
    mutation login($username: String!, $password: String!){
        login(username: $username, password: $password){
            value
        } 
      }`;

const Login = ({ setToken, show }) => {
    if (!show) {
        return null;
    }
    const [login, result] = useMutation(LOGIN, {
        onError: (error) => {
            console.log(error);
            setError(error.graphQLErrors[0].message)
        }
    });
    const [error, setError] = useState(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const submit = async (event) => {
        event.preventDefault();
        login({ variables: { username, password } });
    }

    useEffect(() => {
        if (result.data) {
            console.log('token is set to ', result.data.login);
            setToken(result.data.login);
            localStorage.setItem('library-user-token', result.data.login.value);
            setError(null);
        }
    }, [result.data]);

    return (
        <div>
            {error && <div style={{ color: 'red' }}>{error}</div>}
            <h2>Login</h2>
            <form style={{ display: 'flex', flexDirection: "column", maxWidth: '200px', gap: '10px' }} onSubmit={submit}>
                username:<input type="text" onChange={(e) => setUsername(e.target.value)} />
                password:<input type="password" onChange={(e) => setPassword(e.target.value)} />
                <button type="submit" >LOGIN</button>
            </form>
        </div>
    )

}

export default Login;