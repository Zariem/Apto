// standard upkeep file to ping out host site every 280s to keep our bot running
const http = require('http');
const express = require('express');
const app = express();

app.get("/", (request, response) => {
    console.log(Date.now() + " Apto got pinged!");
    response.sendStatus(200);
});

app.listen(process.env.PORT);

setInterval(() => {
    http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
}, 280000);
