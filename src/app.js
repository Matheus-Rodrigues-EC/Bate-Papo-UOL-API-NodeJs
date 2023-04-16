import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
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
    .then(() => {
        console.log("DataBase Connected...")
        db = mongoClient.db()
    })
    .catch((error) => console.log(error.message));
//------------------------------------------------------------------


// GET Participantes --------------------------------------------

app.get("/participants", async (req, res) => {
    try{
        const participants = await db.collection("participants").find().toArray()
        if(participants){
            participantsList = participants;    
            res.send(participants);
        }
    }catch(error){
        return res.status(500).send(error.message);
    }
})

// Fim GET Participantes ----------------------------------------


// POST participante ----------------------------------------------
app.post("/participants", async (req, res) => {
    const {name} = req.body;
    const time = dayjs().format('HH:mm:ss');

    // Carrega a lista de participantes
    try{
        const participants = await db.collection("participants").find().toArray()
        if(participants){
            participantsList = participants;
        }
    }catch(error){
        return res.status(500).send(error.message);
    }
    // Verifica se o nome ja está na lista de participantes
    if(participantsList.find((user) => user.name === name)){
        // console.log(`User ${name} finded`);
        return res.sendStatus(409);
    }

    // Faz a validação do nome de usuário
    if(nameSchema.validate({username: name}).error !== undefined){
        return res.sendStatus(422);
    }else{

        try{
            await db.collection("participants").insertOne({
                name: name,
                lastStatus: Date.now()
            })
            await db.collection("messages").insertOne({
                from: name, 
                to: 'Todos', 
                text: 'entra na sala...', 
                type: 'status', 
                time: time
            })
            return res.sendStatus(201)
            
        }catch(error){  
            console.log("Algum erro ocorreu ESTOU NO ELSE")
            return res.sendStatus(422);
        }
    }

})
// Fim POST participante ------------------------------------------


// GET Messages ---------------------------------------------------

app.get("/messages", async(req, res) => {
    const {user} = req.headers;
    const {limit} = req.query;
    
    if((limitSchema.validate({Limit: limit}).error)){
        return res.sendStatus(422);
    }
    
    try{
        const messages = await db.collection("messages").find( { $or: [ {to: "Todos"}, { to: user }, { from: user } ] } ).toArray()
        if(limit){
            return res.status(200).send(messages.slice(-limit));
        }else{
            return res.status(200).send(messages);
        }
    }catch(error){
        return res.sendStatus(422)
    }
})

// Fim GET Messages -----------------------------------------------


// POST Messages --------------------------------------------------

app.post("/messages", async (req, res) => {
    const { to, text, type } = req.body;
    const user = req.headers.user;
    const time = dayjs().format("H:mm:ss");
    console.log(req.headers)
    
    if(messageSchema.validate({To: to, Text: text, Type: type}).error !== undefined){
        return res.sendStatus(422);
    }
        if(!participantsList.find((participant) => participant.name === user)){
            return res.sendStatus(422);
        }

        try{
            db.collection("messages").insertOne({
                from: user, 
                to: to, 
                text: text, 
                type: type, 
                time: time
            })
            return res.sendStatus(201)
        }catch(error){
            console.log(messageSchema.validate({To: to, Text: text, Type: type}).error)
            return res.sendStatus(422)
        }
        

})

// Fim POST Messages


// POST Status

app.post("/status", async (req, res) => {
    const { user } = req.headers;
    
    if(!user){
        return res.sendStatus(404);
    }

    if(!participantsList.find((participant) => participant.name === user)){
        return res.sendStatus(404);   
    }

    try{
        await db.collection("participants").updateOne({name: user},{$set:{lastStatus:Date.now()}})
        return res.sendStatus(200);
    }catch(error){
        return res.sendStatus(404);
    }
})

// Fim POST Status


// Remoção automática AFK
// let usersAFK;
// setInterval(() => {
//     const now = Date.now() - 10000;
//     app.get("/participants", async (req, res) => {
    
//         try{
//             usersAFK = await db.collection("participants").find( { lastStatus: { $lt: now} } ).toArray()
//             console.log(usersAFK)
//             for (const participante of usersAFK) {
//                 await db.collection("participants").deleteOne({ _id: new ObjectId(usersAFK._id) });
//                 const mensagemStatus = { from: participante.from, to: 'Todos', text: 'sai da sala...', type: 'status', time: dayjs().format("HH:mm:ss") };
//                 await db.collection("messages").insertOne(mensagemStatus);
//                 console.log(`Participante ${participante.nome} removido e mensagem de status adicionada ao banco.`);
//             }
//             return res.sendStatus(202);
//         }catch(error){
//             return res.sendStatus(500);
//         }
        
//     })
//     console.log("passou 15 segundos...")
// }, 15000)

// Fim Remoção automática AFK



// Declaração da porta e configuração do servidor para ficar ouvindo na porta
const PORT = 5000;
app.listen(PORT, () => console.log(`Server is running at port ${PORT}`));
//------------------------------------------------------------------
