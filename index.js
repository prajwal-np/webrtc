try{
    const express = require('express');
const { createServer } = require('https');
const { readFileSync } = require('fs');
const {v4: uuidv4} = require("uuid");
const { resolve } = require('path');
const { WebSocketServer, OPEN } = require('ws');
const app = express();
const appServer = createServer({
    cert: readFileSync(resolve(__dirname, './ssl/cert.pem')),
    key: readFileSync(resolve(__dirname, './ssl/cert.key'))
  }, app);
  
  app.use(express.static(resolve(__dirname, './public')));

  app.get('/hello',(req,res)=>{
    console.log('hello');
    res.send("hello")
  })

appServer.listen(8081);
  
const wsServer = createServer({
    cert: readFileSync(resolve(__dirname, './ssl/cert.pem')),
    key: readFileSync(resolve(__dirname, './ssl/cert.key'))
  });
  const wss = new WebSocketServer({ server: wsServer });
  wss.on("connection",(socket)=>{
    console.log("socket connect 🎉",Array.from(wss.clients).length)
    socket.on("message",(data)=>{
        const jasonMessage = JSON.parse(data);
        handleJsonMessage(socket, jasonMessage);
    })

    socket.on("close",(data)=>{
        console.log("close")
    })
  })

  const handleJsonMessage =(socket,body)=>{
    const data = body.data
    switch (body.action) {
        case 'start':
            const socketId = uuidv4();
            socket.id = socketId;
            emitMessage(socket,null,{id: socketId, action: "start"})
            emitMessage(socket,socketId,{remoteId: socketId, action: "new connection"},'broadcast')
            break;
        default:
        const remoteId = data.remoteId;
        if(!remoteId) return;
        const remotePeer = getSocketById(remoteId);
        if(body.action !== "offer"){
            delete data.remoteId;
        } else {
            data.remoteId = socket.id;            
        }
        emitMessage(remotePeer,remoteId, body, 'start');
        break;
    }
  }

  const emitMessage = (socket,remoteId, jsonMessage, type="start") => {
    if (socket.readyState === OPEN) {
        // socket.send(JSON.stringify(jsonMessage))
    type=== 'start'?  socket.send(JSON.stringify(jsonMessage)): broadCast(remoteId,jsonMessage);
    }
  };

  const broadCast = (remoteId, jsonMessage) => {
    wss.clients.forEach(client => {
        if(client.id!== remoteId){
            client.send(JSON.stringify(jsonMessage))
        }
    });
        // for (let socket in Array.from(wss.clients) ){
        //     if (socket.readyState === OPEN) {
        //          socket.send(JSON.stringify(jsonMessage));            
        //     }
        // }
  };
  const port = 8080

  const getSocketById = (socketId) =>
  Array.from(wss.clients).find((client => client.id === socketId));

wsServer.listen(port,()=>{
    console.log("running websocket")
  });

} catch(e){
    console.log(e);
};

// const express = require("express");
// const app = express();
// const port  =3000;

// app.get("/",(req,res)=>{
//     console.log("log");
//     res.send("hello");
// });
// app.listen(3000, (data,err)=>{
//     console.log(data,err)
// })