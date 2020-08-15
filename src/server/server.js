import express from "express";
import React from "react";
import ReactDomServer from "react-dom/server";
import fs from "fs";

import App from "../components/App";
import data from "./data/time_series.json";

const server = express();
server.use(express.static("dist"));
server.use(express.json());

server.get("/", (req, res) => {
  const initialMarkup = ReactDomServer.renderToString(<App />);

  res.send(`
    <html>
            <head>
            <title>Sample React App</title>
            </head>
            <body>
            <div id="mountNode">${initialMarkup}</div>
            <script src="/main.js"></script>
            </body>
            </html>
            `);
});

server.get("/data", (req, res) => {
  res.send(data.data);
});

server.put("/data", (req, res) => {
  fs.writeFile(
    "./src/server/data/time_series.json",
    JSON.stringify(req.body),
    (err) => {
      if (err) return console.log(err);
    }
  );
  res.send(JSON.stringify(req.body));
});

server.listen(4242, () => console.log("Server is running..."));
