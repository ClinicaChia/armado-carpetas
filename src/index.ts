//import express from 'express'
import express, {Response} from 'express'
import ApiRouter from './routes/api'
import bodyParser from 'body-parser'
import cors from 'cors'
import path from 'path'

const app = express()



app.use(express.json())

const PORT = 3009

app.use(cors())

app.use(express.static('public'))



app.use(bodyParser.urlencoded({ extended:false }));

app.get('/', (_,res:Response)=>{

    res.sendFile(path.join(__dirname, "../public/index.html"))
})


app.use('/api', ApiRouter)

app.listen(PORT, () => {
    console.log(`⚡️[server]: S0erver is running at http://localhost:${PORT}`);
});