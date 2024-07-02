const express = require('express');
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000
require('dotenv').config()
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser');

//middleware
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())

//CarDoctor
//l8JdXl4jvRnGiYmY

//middlewares
const logger = async (req, res, next) => {
    console.log('called', req.host, req.orginalUrl);
    next()
}

const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token
    if(!token){
        return res.status(401).send({message: 'unauthorized access'})
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=> {
        if(err){
            return res.status(401).send({message : 'unauthorized'})
        }
        console.log('value of the token', decoded);
        req.user = decoded
        next()
    })
}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rtlua5u.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const serviceCollection = client.db('carDoctor').collection("services")
        const bookingCollection = client.db('carDoctor').collection('booking')


        //JWT
        app.post('/jwt', logger, async(req, res)=>{
            const user = req.body
            console.log(user)
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h'
            })
            res
            .cookie('token', token, {
                httpOnly: true,
                secure: false
            })
            .send({success: true})
        })



        app.get('/services',logger, async (req, res) => {
            const filter = req.query.sort
           const search = req.query.search
            console.log(filter);
            const query = {
                title : {
                    '$regex' : search,
                    '$options': 'i'
                }
            }
            const options = {
                sort: {
                    price : filter=== 'asc' ? 1 : -1
                }
            }
            const cursor = serviceCollection.find(query, options)
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get(`/service/:id`, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const options = {
                projection: { title: 1, price: 1, service_id: 1, img: 1 },
            };
            const result = await serviceCollection.findOne(query, options)
            res.send(result)
        })

        app.get('/bookings',logger,verifyToken, async (req, res) => {
            console.log("user in the valid token",req.user);
            if(req.query.email !== req.user.email){
                return res.status(403).send({message: 'forbidden access'})
            }
            let query = {}
            if (req.query.email) {
                query = { email: req.query.email }
            }
            const result = await bookingCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/booking', async (req, res) => {
            const order = req.body
            const result = await bookingCollection.insertOne(order)
            res.send(result)
        })


        app.patch('/bookings/:id', async (req, res) => {
            const updateBooking = req.body
            // console.log(updateBooking);
            const id =  req.params.id
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                  status: updateBooking.status
                },
              };
              const result = await bookingCollection.updateOne(query, updateDoc)
              res.send(result)
        })


        app.delete('/booking/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.deleteOne(query)
            res.send(result)
        })




        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('doctor is running')
})

app.listen(port, () => {
    console.log(`server is running on the ${port}`);
})