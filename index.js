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

async function run() {
    try {
        // Collections
        const categoryCollection = client.db('resale').collection('categories');
        const categoriesCollection = client.db('resale').collection('category');
        const productsCollection = client.db('resale').collection('products');
        const usersCollection = client.db('resale').collection('users');

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
        })

        app.get('/category', async(req, res) => {
            const categoryName = req.query.categoryName;
            // console.log(categoryName);
            // const query = {};
            // const options = await categoriesCollection.find(query).toArray();
            // // console.log(options);

            const productQuery = {categoryName: categoryName};
            const pastProduct = await productsCollection.find(productQuery).toArray();
            // console.log(pastProduct);
            // options.forEach(option => {
            //     const optionBooked = pastProduct.filter(product => product.categoryName === option.categoryName)
            //     console.log(optionBooked);
            // });
            res.send(pastProduct);
        })

        // users

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
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