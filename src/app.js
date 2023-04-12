import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import Joi from 'joi';
import dayjs from 'dayjs';

const app = express();
app.use(cors());
app.use(express.json());

const nameSchema = Joi.object({
    username: Joi.string()
        .alphanum()
        .min(2)
        .max(50)
        .required()
})

// Declaração da porta e configurando o servidor para ficar ouvindo nessa porta
const port = 5000;
app.listen((port) => console.log(`Server is running at port ${port}`));
//------------------------------------------------------------------


// Conexão com o Banco
const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

mongoClient.connect()
    .then(() => db = mongoClient.db())
    .catch((error) => console.log(error.message));
//------------------------------------------------------------------


// Criar participante ----------------------------------------------
app.post("/participants", (req, res) => {
    const {nameP} = req.body;
    const time = dayjs().format('HH:mm:ss');
    const participantList = [];

// Verifica se o nome ja existe no banco ---------------------------
    if(nameSchema.validate({username: nameP}).error === undefined){  
        db.collection("participants").find().toArray()
            .then(() => participantList = mongoClient.db())
            .catch((error) => console.log(error.message));

        participantList.filter((user) => {
            if(user.name === nameP){
                res.sendStatus(409);
                return;
            }
        });
// Fim Verifica se o nome ja existe no banco------------------------


// Adiciona o participante na lista de participantes----------------
        db.collection("participants").insertOne({
            name: nameP, 
            lastStatus: Date.now()
        })
            .then(() => {
                // res.sendStatus(201);
// Envia a mensagem de status que o participante entrou na sala ----
                db.collection("messages").insertOne({
                    from: nameP, 
                    to: 'Todos', 
                    text: 'entra na sala...', 
                    type: 'status', 
                    time: time
                })
                .then(() => res.sendStatus(201))
                .catch((error) => {res.status(500).send(error.message); return;});
// Fim Envia a mensagem de status que o participante entrou na sala -
            })
            .catch((error) => console.log(error.message));
// Fim Adiciona o participante na lista de participantes -----------
    }else{
        res.sendStatus(422);
    }

});
// Fim Criar participante ------------------------------------------
