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

// Conexão com o Banco
const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;
let participantsList;

mongoClient.connect()
    .then(() => console.log("DataBase Connected..."))
    .catch((error) => console.log(error.message));
//------------------------------------------------------------------


// Listar Participantes --------------------------------------------

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

// Fim Listar Participantes ----------------------------------------


// Criar participante ----------------------------------------------
app.post("/participants", (req, res) => {
    const {name} = req.body;
    const time = dayjs().format('HH:mm:ss');

    if(nameSchema.validate({username: name}).error === undefined){
// Faz a validação do nome de usuário
        if(participantsList.find((user) => user.name === name)){
            // console.log(`User ${name} finded`);
            return res.sendStatus(409);
        }else{
            // createParticipant(name);
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

function createParticipant(name){
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
// Fim Criar participante ------------------------------------------










// Declaração da porta e configuração do servidor para ficar ouvindo na porta
const PORT = 5000;
app.listen(PORT, () => console.log(`Server is running at port ${PORT}`));
//------------------------------------------------------------------
