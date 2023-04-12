import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import Joi from 'joi';

const app = express();
app.use(cors());
app.use(express.json());

// const nameSchema = Joi.object({
//     username: Joi.string()
//         .alphanum()
//         .min(2)
//         .max(50)
//         .required()
// })

const port = 5000;
app.listen((port) => console.log(`Server is running at port ${port}`));

// Conexão com o Banco
const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

mongoClient.connect()
    .then(() => db = mongoClient.db())
    .catch((error) => console.log(error.message));

// Criar participante
app.post("/participants", (req, res) => {
    const {name} = req.body;
    // nameSchema.validate({username: name})

    db.collection("participants").insertOne({
        name: name, 
        lastStatus: Date.now()
    })
        .then(() => res.sendStatus(201))
        .catch((error) => console.log(error.message));
});

