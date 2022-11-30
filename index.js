const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
        const categoriesCollection = client.db('resale').collection('category');
        const productsCollection = client.db('resale').collection('products');
        const usersCollection = client.db('resale').collection('users');
        const ordersCollection = client.db('resale').collection('orders');
        const paymentsCollection = client.db('resale').collection('payments');
        const wishListsCollection = client.db('resale').collection('wishList');

        // Admin verify
        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'Forbidden access' })
            }
            next();
        };

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

        app.get('/products', async (req, res) => {
            const query = {};
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        });

        // advertise products
        app.get('/advertiseproducts', async (req, res) => {
            const query = { isAdvertised: true };
            const advertiseproducts = await productsCollection.find(query).toArray();
            res.send(advertiseproducts);
        });

        // category wise Product
        app.get('/category', async (req, res) => {
            const categoryName = req.query.categoryName;
            const productQuery = { categoryName: categoryName };
            const pastProduct = await productsCollection.find(productQuery).toArray();
            res.send(pastProduct);
        });

        // get my product
        app.get('/products/myproducts', async (req, res) => {
            const email = req.query.email;
            const query = { email };
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        })

        app.post('/products', verifyJWT, async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        });

        // delete product
        app.delete('/product/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(filter);
            res.send(result);
        });

        // get jwt token
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);

            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '7d' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' });
        });

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


        app.get('/users/seller/:role', async (req, res) => {
            const role = req.params.role;
            const query = { role: role }
            if (role === "seller") {
                const user = await usersCollection.find(query).toArray();
                res.send(user);
            }
            else {
                const user = await usersCollection.find({}).toArray();
                res.send(user);
            }
        });



        app.get('/users/buyer/:role', async (req, res) => {
            const role = req.params.role;
            const query = { role: role };
            if (role === "buyer") {
                const user = await usersCollection.find(query).toArray();
                res.send(user);
            }
            else {
                const user = await usersCollection.find({}).toArray();
                res.send(user);
            }
        });


        // check admin
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        });

        app.get('/isadvertised', async (req, res) => {
            const query = { isAdvertised };
            const advertised = await productsCollection.find();
        })

        // make admin
        app.put('/users/admin/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        // make Verify Seller.
        app.put('/products/verifySeller/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email };
            const updatedDoc = {
                $set: {
                    verify: 'verified'
                },
            };
            const options = { upsert: true };
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            const product = await productsCollection.updateOne(filter, updatedDoc, options);

            res.send(result);
        });

        // check seller
        app.get('/users/sellers/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role === 'seller' });
        });

        // check verify Seller

        app.get('/users/verify/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isVerify: user?.verify === 'verified' });
        });

        // check buyer
        app.get('/users/buyers/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isBuyer: user?.role === 'buyer' });
        });

        app.delete('/users/seller/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        });

        app.delete('/users/buyer/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        });

        // orders

        app.get('/orders', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                res.status(403).send({ message: 'Forbidden Access' });
            }

            const query = { email: email };
            const orders = await ordersCollection.find(query).toArray();
            res.send(orders);
        });

        app.get('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const order = await ordersCollection.findOne(query);
            res.send(order);
        });

        app.post('/orders', verifyJWT, async (req, res) => {
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
        });

        // wishList

        app.get('/wishlist', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                res.status(403).send({ message: 'Forbidden Access' });
            }

            const query = { email: email };
            const wishlist = await wishListsCollection.find(query).toArray();
            res.send(wishlist);
        })

        app.post('/wishlist', verifyJWT, async (req, res) => {
            const wishlist = req.body;
            const query = {
                productName: wishlist.productName,
                email: wishlist.email,
                userName: wishlist.userName
            }

            const wishlisted = await wishListsCollection.find(query).toArray();

            if (wishlisted.length) {
                const message = `${wishlist.productName} is already added to wishlist`;
                return res.send({ acknowledged: false, message });
            }

            const result = await wishListsCollection.insertOne(wishlist);
            res.send(result);
        });

        app.delete('/wishlist/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await wishListsCollection.deleteOne(filter);
            res.send(result);
        });

        // payments
        // payment-intent
        app.post('/create-payment-intent', async (req, res) => {
            const order = req.body;
            const price = order.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ],
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        // advertise 
        app.put('/products/advertise/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    isAdvertised: true
                },
            };
            const options = { upsert: true };
            const result = await productsCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        // payment post
        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.orderId;
            const filter = {
                _id: ObjectId(id)
            };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await ordersCollection.updateOne(filter, updatedDoc);
            const productPayment = await productsCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

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