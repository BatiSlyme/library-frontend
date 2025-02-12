const { ApolloServer } = require('@apollo/server')
const { expressMiddleware } = require('@apollo/server/express4')
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer')
const { makeExecutableSchema } = require('@graphql-tools/schema')
const { WebSocketServer } = require('ws')
const { useServer } = require('graphql-ws/lib/use/ws')
const express = require('express')
const cors = require('cors')
const http = require('http')
const jwt = require('jsonwebtoken')

const { PubSub } = require('graphql-subscriptions')
const pubsub = new PubSub()

const mongoose = require('mongoose')
mongoose.set('strictQuery', false)
const Book = require('./models/book');
const Author = require('./models/author');
const User = require('./models/user');
const { GraphQLError } = require('graphql')
require('dotenv').config()

const MONGODB_URI = process.env.MONGODB_URI;

console.log('connecting to', MONGODB_URI)

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('connected to MongoDB')
    })
    .catch((error) => {
        console.log('error connection to MongoDB:', error.message)
    })

mongoose.set('debug', true);

const typeDefs = `
  type Author {
    name: String!
    id: ID!
    born: Int
    book: Book
  }

  type Book {
    title: String!
    published: Int!
    author: Author!
    id: ID!
    genres: [String!]!
  }

  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }
  
  type Token {
    value: String!
  }
  
  type Query {
    bookCount: Int
    authorCount: Int
    allBooks(author: String, genre: String): [Book!]!
    allAuthors:[Author!]!
    me: User
  }

  type Mutation {
    addBook(
        title: String!
        published: Int!
        author: String!
        genres: [String!]!
    ): Book
    addAuthor(
        name: String!
        born: Int
    ): Author
    editAuthor(
        name: String!
        setBornTo: Int!
    ): Author
    createUser(
        username: String!
        favoriteGenre: String!
    ): User
    login(
        username: String!
        password: String!
    ): Token
  }

  type Subscription {
    bookAdded: Book!
  }   

`



const resolvers = {
    Query: {
        bookCount: async (root, args) => (await Book.find({})).length, //books.length,
        authorCount: async () => (await Author.find({})).length, //authors.length,
        allBooks: async (root, args) => {
            let filter = {};
            if (args.genre && args.genre.length > 0) {
                filter = { genres: { $in: args.genre } }
            }
            const author = await Author.findOne({ name: args.author });
            if (author) {
                filter.author = author._id;
            }


            console.log('filter', filter);
            const book = await Book.find(filter).populate('author');;
            return book;
            // return books
            // if (args.genre) {
            //     return books.filter(f => f.genres.includes(args.genre));
            // }
            // return books.filter(f => f.author === args.author);
        },
        allAuthors: async () => {
            return await Author.find({})
        },//authors,
        me: (root, args, context) => { return context.currentUser }
    },
    authorBookCount: async (root) => {

    },

    Mutation: {
        addAuthor: async (root, args) => {
            const author = new Author({ ...args });
            // return addAuthor(args);
            try {
                await author.save();
            } catch (error) {
                throw new GraphQLError('Saving author failed', {
                    extensions: {
                        code: 'BAD_USER_INPUT',
                        invalidArgs: args.name,
                        error
                    }
                })
            }
            return author;
        },
        addBook: async (root, args, context) => {
            const currentUser = context.currentUser;
            if (!currentUser) {
                console.log('no token');
                throw new GraphQLError('not authenticated', {
                    extensions: {
                        code: 'UNAUTHENTICATED'
                    }
                })
            }

            const author = await Author.findOne({ name: args.author });
            const book = new Book({ ...args, author: author })

            try {
                await book.save();
            } catch (error) {
                console.log('bad data');
                throw new GraphQLError('Saving book failed', {
                    extensions: {
                        code: 'BAD_USER_INPUT',
                        invalidArgs: args.name,
                        error
                    }
                })
            }
            // if (!authors.includes(args.author)) {
            //     addAuthor({ name: args.author });
            // }
            // const book = { ...args, id: uuid() };
            // books = books.concat(book);
            pubsub.publish('BOOK_ADDED', { bookAdded: book })

            return book;
        },
        editAuthor: async (root, args, context) => {

            const currentUser = context.currentUser;
            if (!currentUser) {
                throw new GraphQLError('not authenticated', {
                    extensions: {
                        code: 'UNAUTHENTICATED'
                    }
                })
            }

            const author = await Author.findOne({ name: args.name });
            author.born = args.setBornTo;
            try {
                await author.save();
            } catch (error) {
                throw new GraphQLError('Saving book failed', {
                    extensions: {
                        code: 'BAD_USER_INPUT',
                        invalidArgs: args.name,
                        error
                    }
                })
            }
            // authors = authors.map(f => f.name === args.name ? { ...f, born: args.setBornTo } : f);
        },
        login: async (root, args) => {
            const user = await User.findOne({ username: args.username });
            if (!user || args.password !== 'secret') {
                throw new GraphQLError('wrong credentials',
                    {
                        extensions: { code: 'BAD_USER_INPUT' }
                    });
            }
            const userForToken = {
                username: user.username,
                id: user._id
            }

            return { value: jwt.sign(userForToken, process.env.JWT_SECRET) }

        },
        createUser: async (root, args) => {
            const user = await new User({ username: args.username, favoriteGenre: args.favoriteGenre });
            try {
                return await user.save();
            } catch (error) {
                throw new GraphQLError('Creating user failed', {
                    extensions: {
                        code: 'BAD_USER_INPUT',
                        error
                    }
                });
            }
        }

    },
    Subscription: {
        bookAdded: {
            subscribe: () => pubsub.asyncIterableIterator('BOOK_ADDED')
        },
    },
}

// setup is now within a function
const start = async () => {
    const app = express();
    const httpServer = http.createServer(app);

    const wsServer = new WebSocketServer({
        server: httpServer,
        path: '/',
    });

    const schema = makeExecutableSchema({ typeDefs, resolvers });
    const serverCleanup = useServer({ schema }, wsServer);

    const server = new ApolloServer({
        schema: makeExecutableSchema({ typeDefs, resolvers }),
        plugins: [
            ApolloServerPluginDrainHttpServer({ httpServer }),
            {
                async serverWillStart() {
                    return {
                        async drainServer() {
                            await serverCleanup.dispose();
                        },
                    };
                },
            },
        ],
    });

    await server.start();

    app.use(
        '/',
        cors(),
        express.json(),
        expressMiddleware(server, {
            context: async ({ req }) => {
                const auth = req ? req.headers.authorization : null
                if (auth && auth.startsWith('Bearer ')) {
                    const decodedToken = jwt.verify(auth.substring(7), process.env.JWT_SECRET);
                    const currentUser = await User.findById(decodedToken.id);
                    return { currentUser };
                }
            },
        }),
    );

    const PORT = 4000;
    httpServer.listen(PORT, () => {
        console.log(`Server is now running on http://localhost:${PORT}`);
    });

}

start();