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


// Criar participante ----------------------------------------------
app.post("/participants", (req, res) => {
    const {name} = req.body;
    const time = dayjs().format('HH:mm:ss');

    if(nameSchema.validate({username: name}).error === undefined){  
        // Verifica se o nome ja existe no banco ---------------------------
        participantsList.find((user) => {
            if(user.name === name){
                res.sendStatus(409);
                return;
            }
        });
// Fim Verifica se o nome ja existe no banco------------------------


// Adiciona o participante na lista de participantes----------------
        db.collection("participants").insertOne({
            name: name, 
            lastStatus: Date.now()
        })
            .then(() => {
                // res.sendStatus(201);
// Envia a mensagem de status que o participante entrou na sala ----
                db.collection("messages").insertOne({
                    from: name, 
                    to: 'Todos', 
                    text: 'entra na sala...', 
                    type: 'status', 
                    time: time
                })
                .then()
                .catch();
// Fim Envia a mensagem de status que o participante entrou na sala -
            })
            .catch((error) => {
                res.status(500).send(error.message); 
                return;
            });

            db.collection("participants").find().toArray()
            .then((participants) => {
                participantsList = participants;
            })
            .catch((error) => {
                res.status(500).send(error.message);
                return;
            });
// Fim Adiciona o participante na lista de participantes -----------
    }else{
        res.sendStatus(422);
    }

});
// Fim Criar participante ------------------------------------------

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


// Declaração da porta e configuração do servidor para ficar ouvindo na porta
const PORT = 5000;
app.listen(PORT, () => console.log(`Server is running at port ${PORT}`));
//------------------------------------------------------------------
