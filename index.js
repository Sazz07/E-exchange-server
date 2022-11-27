const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const port = process.env.PORT || 5000;

const app = express();

// middle ware
app.use(cors());
app.use(express.json());

// mongo 

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xn0uv.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('Unauthorized accesss');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN,
        function (err, decoded) {
            if (err) {
                return res.status(403).send({ message: 'Forbidden Access' })
            }
            req.decoded = decoded;
            next();
        })
};

async function run() {
    try {
        // Collections
        const categoryCollection = client.db('resale').collection('categories');
        const categoriesCollection = client.db('resale').collection('category');
        const productsCollection = client.db('resale').collection('products');
        const usersCollection = client.db('resale').collection('users');
        const ordersCollection = client.db('resale').collection('orders');

        app.get('/categories', async (req, res) => {
            const query = {};
            const categories = await categoriesCollection.find(query).toArray();
            res.send(categories);
        });

        app.get('/category/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const category = await categoriesCollection.findOne(query);
            res.send(category);
        });

        // product

        app.get('/category', async (req, res) => {
            const categoryName = req.query.categoryName;
            // console.log(categoryName);
            // const query = {};
            // const options = await categoriesCollection.find(query).toArray();
            // // console.log(options);

            const productQuery = { categoryName: categoryName };
            const pastProduct = await productsCollection.find(productQuery).toArray();
            // console.log(pastProduct);
            // options.forEach(option => {
            //     const optionBooked = pastProduct.filter(product => product.categoryName === option.categoryName)
            //     console.log(optionBooked);
            // });
            res.send(pastProduct);
        });

        app.post('/products', async(req, res) =>{
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        })

        // get jwt token
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);

            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '7d' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        })

        // users
        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        // orders

        app.get('/orders', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if(email !== decodedEmail) {
                res.status(403).send({message: 'Forbidden Access'});
            }

            const query = {email: email};
            const orders = await ordersCollection.find(query).toArray();
            res.send(orders);
        })

        app.post('/orders', async (req, res) => {
            const order = req.body;
            const query = {
                productName: order.productName,
                email: order.email,
                userName: order.userName
            }

            const ordered = await ordersCollection.find(query).toArray();

            if (ordered.length) {
                const message = `You have already ordered ${order.productName}`;
                return res.send({ acknowledged: false, message });
            }
            const result = await ordersCollection.insertOne(order);
            res.send(result);
        })


    }
    finally {

    }
}
run().catch(console.log);







app.get('/', async (req, res) => {
    res.send('Resale Server is running nicely.......');
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})