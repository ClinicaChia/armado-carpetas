"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const { MongoClient } = require("mongodb");
const pdf = require('pdf-page-counter');
const PDFMerger = require('pdf-merger-js');
const ApiRouter = (0, express_1.Router)();
const ruta = "\\\\173.16.10.12\\Soportes Facturacion\\FACTURAS NUEVO SOFTWARE";
const basePath = path_1.default.join(__dirname, '../../');
require('dotenv').config();
const fields = ["FACTURA", "AUTORIZACIONES", "HISTORIA CLINICA", "APOYO DIAGNOSTICO", "APOYO DIAGNISTICO",
    "ANEXOS", "SOPORTES", "LABORATORIOS", "SIRAS Y DOCUMENTOS", "HISTORIA CLINICA Y SOPORTES",
    "FURIPS", "UNIFICADO", "SOPORTES APOYOS DIAGNOSTICOS", "SOPORTES MANUALES",
    "AUTORIZACION", "APOYOS DIAGNOSTICOS", "ADMINISTRACION DE MEDICAMENTOS",
    "REGISTRO MEDICO", "HOJA QUIRURGICA", "REGISTRO ANESTESICO", "NOTAS ENFERMERIA",
    "OTROS SOPORTES MANUALES"].map((field) => { return { name: field, maxCount: 1000 }; });
const storage = multer_1.default.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, './tmp');
    },
    filename: function (_req, _file, cb) {
        cb(null, +Math.round(Math.random() * 1E5) + Date.now() + '.pdf');
    }
});
const upload = (0, multer_1.default)({ storage: storage });
const cpUpload = upload.fields(fields);
const Merge = (arr, folder, name) => __awaiter(void 0, void 0, void 0, function* () {
    let pages = 0;
    const merger = new PDFMerger();
    for (let i = 0; i < arr.length; i++) {
        yield merger.add(arr[i]);
        const PDF_file = yield pdf(arr[i]);
        pages += PDF_file.numpages;
    }
    yield merger.save(path_1.default.join(folder, name.replace('%', pages.toString())));
});
const getDir = (params) => {
    const { eps, nombre, factura } = params;
    let folderPath = ruta;
    if (fs_1.default.existsSync(path_1.default.join(folderPath, eps))) { //verificar si exsite la eps en las carpetas
        folderPath = path_1.default.join(folderPath, eps); // si existe se agrega la carpeta de la eps
        if (fs_1.default.existsSync(path_1.default.join(folderPath, nombre))) { // se verifica que exista la carpeta con el nombre del facturador
            folderPath = path_1.default.join(folderPath, nombre); // si existe se agrega la carpeta del facturador
            if (fs_1.default.existsSync(path_1.default.join(folderPath, "FV" + factura))) {
                folderPath = path_1.default.join(folderPath, "FV" + factura); // si existe se agrega la carpeta del numero de factura
            }
            else {
                fs_1.default.mkdirSync(path_1.default.join(folderPath, "FV" + factura)); // se crea la carpeta de la factura
                folderPath = path_1.default.join(folderPath, "FV" + factura);
            }
        }
        else { // como no existe la carpeta del facturador se crea
            fs_1.default.mkdirSync(path_1.default.join(folderPath, nombre));
            folderPath = path_1.default.join(folderPath, nombre); // se agrega la carpeta del facturador
            fs_1.default.mkdirSync(path_1.default.join(folderPath, "FV" + factura)); // se crea la carpeta de la factura
            folderPath = path_1.default.join(folderPath, "FV" + factura);
        }
    }
    else {
        fs_1.default.mkdirSync(path_1.default.join(folderPath, eps)); // se crea la carpeta de la eps
        folderPath = path_1.default.join(folderPath, eps); // se agrega la carpeta de la eps
        fs_1.default.mkdirSync(path_1.default.join(folderPath, nombre)); // se crea la carpeta del facturador
        folderPath = path_1.default.join(folderPath, nombre); // se agrega la carpeta del facturador
        fs_1.default.mkdirSync(path_1.default.join(folderPath, "FV" + factura)); // se crea la carpeta de la factura
        folderPath = path_1.default.join(folderPath, "FV" + factura);
    }
    return folderPath;
};
const saveDb = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const client = new MongoClient(process.env.MONGO_URI);
    const db = client.db(process.env.MONGO_DB);
    const collection = db.collection(process.env.MONGO_COLLECTION);
    yield collection.insertOne(data);
});
ApiRouter.post('/files', cpUpload, (req, res, _) => {
    //crear la carpeta fv
    const { campos, factura, eps, nombre, names } = req.body;
    const Campos = campos.split(",");
    const Names = names.split(",");
    const folderPath = getDir({ eps, nombre, factura: factura });
    Campos.forEach((campo, index) => {
        if (req.files[campo].length > 1) {
            const paths = req.files[campo].map((file) => {
                return file.path;
            });
            Merge(paths, folderPath, Names[index]);
        }
        else {
            const filePath = path_1.default.join(basePath, req.files[campo][0].path);
            pdf(filePath).then((data) => {
                const pages = data.numpages;
                fs_1.default.copyFileSync(filePath, path_1.default.join(folderPath, Names[index].replace('%', pages.toString())));
            });
        }
    });
    setTimeout(() => {
        Campos.forEach((campo) => {
            req.files[campo].forEach((file) => {
                try {
                    fs_1.default.unlinkSync(file.path);
                }
                catch (_a) {
                    console.log("error al eliminar el archivo");
                }
            });
        });
    }, 10000);
    //eliminar el archivos del temp
    const data = {
        folder: folderPath,
        facturador: nombre,
        eps: eps,
        factura: factura,
    };
    saveDb(data);
    res.send('Hello from router!');
});
ApiRouter.get('/files', upload.none(), (req, res, _) => __awaiter(void 0, void 0, void 0, function* () {
    const factura = req.query.factura;
    const client = new MongoClient(process.env.MONGO_URI);
    const db = client.db(process.env.MONGO_DB);
    const collection = db.collection(process.env.MONGO_COLLECTION);
    const data = yield collection.findOne({ factura: factura });
    res.json(data);
}));
exports.default = ApiRouter;
