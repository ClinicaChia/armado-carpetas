import { Router,Response,Request   } from "express"
import multer from "multer"
import fs from "fs"
import path from "path"


const { MongoClient } = require("mongodb")
const pdf = require('pdf-page-counter')
const PDFMerger = require('pdf-merger-js');
const ApiRouter = Router()
const ruta : string = "\\\\173.16.10.12\\Soportes Facturacion\\FACTURAS NUEVO SOFTWARE"
const basePath = path.join(__dirname, '../../')

require('dotenv').config()

const fields = [ "FACTURA", "AUTORIZACIONES", "HISTORIA CLINICA","APOYO DIAGNOSTICO", "APOYO DIAGNISTICO",
                 "ANEXOS", "SOPORTES", "LABORATORIOS", "SIRAS Y DOCUMENTOS", "HISTORIA CLINICA Y SOPORTES",
                  "FURIPS", "UNIFICADO","SOPORTES APOYOS DIAGNOSTICOS", "SOPORTES MANUALES",
                  "AUTORIZACION", "APOYOS DIAGNOSTICOS", "ADMINISTRACION DE MEDICAMENTOS",
                  "REGISTRO MEDICO","HOJA QUIRURGICA","REGISTRO ANESTESICO", "NOTAS ENFERMERIA",
                  "OTROS SOPORTES MANUALES"].map( (field) => {return {name: field, maxCount: 1000}} )

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, './tmp')
  },
  filename: function (_req, _file, cb) {
    cb(null, Math.round(Math.random() * 1E5)  + Date.now() + '.pdf')
  }
})

const upload = multer({ storage: storage })

const cpUpload = upload.fields(fields)

interface Params {
    eps: string,
    nombre: string,
    factura: string
}

interface mongoInstert{
  folder: string,
  eps: string,
  facturador: string,
  factura: string,
}

const Merge = async (arr: [], folder : string, name: string) => {
  let pages = 0
  const merger = new PDFMerger();

    for (let i = 0; i < arr.length; i++) {
        await merger.add(arr[i])
        const PDF_file = await pdf(arr[i])
        pages += PDF_file.numpages
    }

    await merger.save(path.join(folder, name.replace('%', pages.toString() )))

}


const getDir = ( params : Params ) => {

  const { eps, nombre, factura } = params
  let folderPath = ruta

  if(fs.existsSync( path.join(folderPath, eps) )){ //verificar si exsite la eps en las carpetas
      folderPath = path.join(folderPath, eps) // si existe se agrega la carpeta de la eps

      if(fs.existsSync( path.join(folderPath, nombre) )){ // se verifica que exista la carpeta con el nombre del facturador
          folderPath = path.join(folderPath, nombre) // si existe se agrega la carpeta del facturador
          if(fs.existsSync( path.join(folderPath, "FV"  + factura) )){
              folderPath = path.join(folderPath,"FV" +  factura) // si existe se agrega la carpeta del numero de factura
          }
          else{

            fs.mkdirSync(path.join(folderPath, "FV"+factura)) // se crea la carpeta de la factura
            folderPath = path.join(folderPath, "FV"+factura)

          } 

      }else{ // como no existe la carpeta del facturador se crea
          fs.mkdirSync(path.join(folderPath, nombre))
          folderPath = path.join(folderPath, nombre) // se agrega la carpeta del facturador
          fs.mkdirSync(path.join(folderPath, "FV"+factura)) // se crea la carpeta de la factura
          folderPath = path.join(folderPath, "FV"+factura)

      }
  }
  else{
      fs.mkdirSync(path.join(folderPath, eps)) // se crea la carpeta de la eps
      folderPath = path.join(folderPath, eps) // se agrega la carpeta de la eps
      fs.mkdirSync(path.join(folderPath, nombre)) // se crea la carpeta del facturador
      folderPath = path.join(folderPath, nombre) // se agrega la carpeta del facturador
      fs.mkdirSync(path.join(folderPath, "FV"+factura)) // se crea la carpeta de la factura
      folderPath = path.join(folderPath, "FV"+factura)
      
  }

  return folderPath
}

const saveDb = async (data : mongoInstert) => {
  

  const client = new MongoClient(process.env.MONGO_URI as string)

  const db = client.db(process.env.MONGO_DB as string )
  const collection = db.collection(process.env.MONGO_COLLECTION as string)
  await collection.insertOne(data)
   

}

ApiRouter.post('/files', cpUpload, (req : any , res : Response ,_) => {


    //crear la carpeta fv
    


    const { campos , factura , eps ,nombre , names} = req.body

    const Campos : string[] = campos.split(",")
    const Names : string[] = names.split(",")


    
    const folderPath = getDir({ eps, nombre, factura: factura })

    Campos.forEach( (campo : string,index : number) => {
       
      if(req.files[campo].length > 1){

        const paths = req.files[campo].map((file : any) => {
            return file.path
        })

        Merge(paths, folderPath, Names[index])
    }

    else{
      const filePath = path.join(basePath,req.files[campo][0].path)

      pdf(filePath).then((data : any) => {

        const pages = data.numpages
        fs.copyFileSync(filePath, path.join(folderPath, Names[index].replace('%', pages.toString()    )))
      
      
      })
    }


    })
    
    setTimeout(() => {
     
      Campos.forEach( (campo : string) => {
        req.files[campo].forEach( (file : any) => {
          try{
            
            fs.unlinkSync(file.path)
          }
          catch{
            console.log("error al eliminar el archivo")
          }
        })
      })
        
    }, 10000);
    //eliminar el archivos del temp

    const data : mongoInstert = {
      folder: folderPath,
      facturador: nombre,
      eps: eps,
      factura: factura,
    }

    saveDb(data )
    res.send('Hello from router!')
})


ApiRouter.get('/files' , upload.none(),async (req : Request , res : Response,_) => {

  const factura: string = req.query.factura as string



  const client = new MongoClient(process.env.MONGO_URI as string)
  const db = client.db(process.env.MONGO_DB as string )
  const collection = db.collection(process.env.MONGO_COLLECTION as string)
  const data = await collection.findOne({factura: factura})

  res.json(data)
  
})

export default ApiRouter