const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
const ObjectId = require('mongodb').ObjectId; //এটা করতে হবে ডিলিটের জন্য 
app.use(express.json())

require('dotenv').config();

const port = process.env.PORT || 5000;

app.use(cors())

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.SECURET_KEY}@cluster0.qgvx9.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        await client.connect();
        console.log("database Connect")

        const productCollection = client.db('wholsaleProduct').collection('products');

        //email varification by jwt api
        app.post("/login", async (req, res) => {
            const email = req.body;
            // console.log(email);
            const token = jwt.sign(email, process.env.EMAIL_ENCRIPT_KEY);
            // console.log(token);
            res.send({ token });
        })

        //product upload api
        app.post("/uploadItem", async (req, res) => {
            const product = req.body;
            // console.log(product);
            const tokenInfo = req.headers.authorization;
            // console.log(tokenInfo)

            const [email, accessToken] = tokenInfo.split(" ");
            const decoded = verifyToken(accessToken);
            if (email === decoded.email) {
                if (!product.name || !product.price) {
                    return res.send({ success: false, error: "Please fill the all information" })
                } else {
                    const result = await productCollection.insertOne(product);
                    res.send({ success: true, message: "New Product Uploaded" });
                }
            } else {
                res.send({ success: 'UnAuthorized Access' });
            }
        });

        //product collection or finding from database
        app.get('/ourProducts', async (req, res) => {
            const limit = Number(req.query.limit); //for data showing limitation by query selector

            const pageNumber = Number(req.query.pageNumber);
            const products = await productCollection.find({}).skip(limit * pageNumber).limit(limit).toArray();

            res.send(products);
        });

        //product add to secrate myItem
        app.get('/ourProducts', async (req, res) => {
            const email = req.query;
            console.log(email);
            const query = {};
            const cursor = productCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        })

        //Products Update API
        app.get('/ourProducts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId };
            const result = await productCollection.findOne(query);
            res.send(result);
        })

        app.put('/ourProducts/:id', async (req, res) => {
            const id = req.params.id;
            const updatedProduct = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updtedDoc = {
                $set: {
                    image: updatedProduct.image,
                    description: updatedProduct.description,
                    quantity: updatedProduct.quantity,
                    price: updatedProduct.price,
                }
            };
            const result = await productCollection.updateOne(filter, updtedDoc, options);
            res.send(result);
        })
        // image, description, quantity, price
        //Delete Product api
        app.delete('/ourProducts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };   //query করে আইডি ধরে ডিলিটের জন্য const ObjectId = require('mongodb').ObjectId; এটি ইমপোরর্ট করতে হবে।
            const result = await productCollection.deleteOne(query)
            res.send(result)

        })



    } finally {
        //   await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('This is st-wholesale-bd yayh!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})


function verifyToken(token) {
    let email;
    jwt.verify(token, process.env.EMAIL_ENCRIPT_KEY, function (error, decoded) {
        if (error) {
            email = 'Invalid Email';
        }
        if (decoded) {
            email = decoded;
        }
    });
    return email;
}