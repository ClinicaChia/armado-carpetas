"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
//import express from 'express'
const express_1 = __importDefault(require("express"));
const api_1 = __importDefault(require("./routes/api"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
const PORT = 3009;
app.use((0, cors_1.default)());
app.use(express_1.default.static('public'));
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.get('/', (_, res) => {
    res.sendFile(path_1.default.join(__dirname, "../public/index.html"));
});
app.use('/api', api_1.default);
app.listen(PORT, () => {
    console.log(`⚡️[server]: S0erver is running at http://localhost:${PORT}`);
});
