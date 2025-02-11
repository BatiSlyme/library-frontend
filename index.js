const { ApolloServer } = require('@apollo/server')
const { startStandaloneServer } = require('@apollo/server/standalone')
const { v1: uuid } = require('uuid')
const jwt = require('jsonwebtoken')

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

let authors = [
    {
        name: 'Robert Martin',
        id: "afa51ab0-344d-11e9-a414-719c6709cf3e",
        born: 1952,
    },
    {
        name: "Martin Fowler",
        id: "afa5b6f0-344d-11e9-a414-719c6709cf3e",
        born: 1963
    },
    {
        name: "Fyodor Dostoevsky",
        id: "afa5b6f1-344d-11e9-a414-719c6709cf3e",
        born: 1821
    },
    {
        name: "Joshua Kerievsky", // birthyear not known
        id: "afa5b6f2-344d-11e9-a414-719c6709cf3e",
    },
    {
        name: "Sandi Metz", // birthyear not known
        id: "afa5b6f3-344d-11e9-a414-719c6709cf3e",
    },
]

/*
 * It might make more sense to associate a book with its author by storing the author's id in the context of the book instead of the author's name
 * However, for simplicity, we will store the author's name in connection with the book
*/

let books = [
    {
        title: 'Clean Code',
        published: 2008,
        author: 'Robert Martin',
        id: "afa5b6f4-344d-11e9-a414-719c6709cf3e",
        genres: ['refactoring']
    },
    {
        title: 'Agile software development',
        published: 2002,
        author: 'Robert Martin',
        id: "afa5b6f5-344d-11e9-a414-719c6709cf3e",
        genres: ['agile', 'patterns', 'design']
    },
    {
        title: 'Refactoring, edition 2',
        published: 2018,
        author: 'Martin Fowler',
        id: "afa5de00-344d-11e9-a414-719c6709cf3e",
        genres: ['refactoring']
    },
    {
        title: 'Refactoring to patterns',
        published: 2008,
        author: 'Joshua Kerievsky',
        id: "afa5de01-344d-11e9-a414-719c6709cf3e",
        genres: ['refactoring', 'patterns']
    },
    {
        title: 'Practical Object-Oriented Design, An Agile Primer Using Ruby',
        published: 2012,
        author: 'Sandi Metz',
        id: "afa5de02-344d-11e9-a414-719c6709cf3e",
        genres: ['refactoring', 'design']
    },
    {
        title: 'Crime and punishment',
        published: 1866,
        author: 'Fyodor Dostoevsky',
        id: "afa5de03-344d-11e9-a414-719c6709cf3e",
        genres: ['classic', 'crime']
    },
    {
        title: 'Demons',
        published: 1872,
        author: 'Fyodor Dostoevsky',
        id: "afa5de04-344d-11e9-a414-719c6709cf3e",
        genres: ['classic', 'revolution']
    },
]

const typeDefs = `
  type Author {
    name: String!
    id: ID!
    born: Int
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

`
const addAuthor = (args) => {
    const author = { ...args, id: uuid() };
    authors = authors.concat(author);
    return author;
};

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
        allAuthors: async () => await Author.find({}),//authors,
        me: (root, args, context) => { return context.currentUser }
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
            console.log('book', book);
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

    }
}

const server = new ApolloServer({
    typeDefs,
    resolvers,
})

startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async ({ req, res }) => {
        const auth = req ? req.headers.authorization : null;
        if (auth && auth.startsWith('Bearer ')) {
            const decodedToken = jwt.verify(auth.substring(7), process.env.JWT_SECRET);
            const currentUser = await User.findById(decodedToken.id)//.populate
            return { currentUser }
        }
    },
}).then(({ url }) => {
    console.log(`Server ready at ${url}`);
});