
const express = require('express')

const swaggerUi = require('swagger-ui-express');
const coinRouter = require('./routes/coinroute')
const swaggerDocument = require('./documentation.json');
const path = require('path')

PORT = process.env.PORT || 8030

const app = express()

if(swaggerDocument.servers && swaggerDocument.servers.length > 0){
	const serverUrl = process.env.SERVER_URL || `http://localhost:${PORT}`;
	swaggerDocument.servers[0].url =`${serverUrl}/api/v1`
}

app.use("/api/v1", coinRouter)

app.use('/api/documentation', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/',(req,res)=>{
	res.sendFile(path.join(__dirname,"static","readme.html"))
})

app.get('/personas',(req,res)=>{
	res.sendFile(path.join(__dirname,"static","personas.html"))
})

app.get('/api/codesnippets',(req,res)=>{
	res.sendFile(path.join(__dirname,"static","snippets.html"))
})
app.listen(PORT,()=>console.log('server started at localhost port :'+PORT))