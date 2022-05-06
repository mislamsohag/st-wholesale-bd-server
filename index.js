const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
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

            // const count=await productCollection.estimatedDocumentCount();

            res.send(products);
        });


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