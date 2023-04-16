import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import Joi from 'joi';
import dayjs from 'dayjs';
import dotenv from 'dotenv';

dotenv.config();

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

const messageSchema = Joi.object({
    To: Joi.string()
        .alphanum()
        .min(1)
        .required(),
    
    Text: Joi.string()
        .min(1)
        .required(),
    
    Type: Joi.string()
        .valid("message", "private_message")
        .required()
})

const limitSchema = Joi.object({
    Limit: Joi.number()
        .min(1)
        // .pattern(new RegExp('^[0-9]+$'))
})

// Conexão com o Banco
const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;
let participantsList;

mongoClient.connect()
    .then(() => console.log("DataBase Connected..."))
    .catch((error) => console.log(error.message));
//------------------------------------------------------------------


// GET Participantes --------------------------------------------

app.get("/participants", (req, res) => {
    db = mongoClient.db()
    db.collection("participants").find().toArray()
        .then((participants) => {
            participantsList = participants;
            res.send(participants);
            // console.log(participantsList);
        })
        .catch((error) => {
            res.status(500).send(error.message);
            return;
        });
})

// Fim GET Participantes ----------------------------------------


// POST participante ----------------------------------------------
app.post("/participants", (req, res) => {
    const {name} = req.body;
    const time = dayjs().format('HH:mm:ss');

    if(nameSchema.validate({username: name}).error === undefined){
// Faz a validação do nome de usuário
        if(participantsList.find((user) => user.name === name)){
            // console.log(`User ${name} finded`);
            return res.sendStatus(409);
        }else{
            db.collection("participants").insertOne({
                name: name,
                lastStatus: Date.now()
            })
            .then(() => {
                db.collection("messages").insertOne({
                    from: name, 
                    to: 'Todos', 
                    text: 'entra na sala...', 
                    type: 'status', 
                    time: time
                })
                res.sendStatus(201)
            })
            .catch(() => {
                console.log("Algum erro ocorreu ESTOU NO ELSE")
                
            });
        }
    }else{
        res.sendStatus(422);
    }

})
// Fim POST participante ------------------------------------------


// GET Messages ---------------------------------------------------

app.get("/messages", (req, res) => {
    const {user} = req.headers;
    const {limit} = req.query;
    
    if((limitSchema.validate({Limit: limit}).error)){
        return res.sendStatus(422);
    }
    else{
        db.collection("messages").find( { $or: [ {to: "Todos"}, { to: user }, { from: user } ] } ).toArray()
        .then((messages) => {
            if(limit){
                return res.status(200).send(messages.slice(-limit));
            }else{
                return res.status(200).send(messages);
            }
        })
        .catch(() => {return res.sendStatus(422)})
    }
})

// Fim GET Messages -----------------------------------------------


// POST Messages --------------------------------------------------

app.post("/messages", (req, res) => {
    const { to, text, type } = req.body;
    const { user } = req.headers;
    const time = dayjs().format("H:mm:ss");
    
    if(messageSchema.validate({To: to, Text: text, Type: type}).error === undefined){
        if(participantsList.find((participant) => participant.name === user)){
            db.collection("messages").insertOne({
                from: user, 
                to: to, 
                text: text, 
                type: type, 
                time: time
            })
            .then(() => {return res.sendStatus(201)})
            .catch(() => {return res.sendStatus(422)});
        }else{
            // console.log(messageSchema.validate({To: to, Text: text, Type: type}.error));
            return res.sendStatus(422);
        }
    }else{
        return res.sendStatus(422);
    }

})

// Fim POST Messages


// POST Status

app.post("/status", (req, res) => {
    const { user } = req.headers;
    // console.log(user);
    if(user){
        if(participantsList.find((participant) => participant.name === user)){
            db.collection("participants").updateOne({name: user},{$set:{lastStatus:Date.now()}})
            // WriteResult({ "nMatched" : 1, "nUpserted" : 0, "nModified" : 1 })
                .then(() => res.status(200).send("Deu certo aqui oh"))
                .catch()
        }else{
            res.sendStatus(404);
        }
    }else{
        res.sendStatus(404)
    }
})

// Fim POST Status




// Declaração da porta e configuração do servidor para ficar ouvindo na porta
const PORT = 5000;
app.listen(PORT, () => console.log(`Server is running at port ${PORT}`));
//------------------------------------------------------------------
