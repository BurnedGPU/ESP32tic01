const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Conexión a MongoDB con mejor configuración
const MONGODB_URI = 'mongodb+srv://cristophervasquez1:Tics1614@cluster0.eirobel.mongodb.net/pastillero?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
});

const db = mongoose.connection;

db.on('error', (error) => {
    console.error('Error de conexión a MongoDB:', error);
});

db.once('open', () => {
    console.log('Conectado a MongoDB Atlas correctamente');
    console.log('Base de datos: pastillero');
    console.log('Colección: modulo 1');
});

db.on('disconnected', () => {
    console.log(' Desconectado de MongoDB');
});

// Esquema para pastillas
const pastillaSchema = new mongoose.Schema({
    nombre: String,
    intervalSeconds: Number,
    modulo: Number,
    timestamp: { type: Date, default: Date.now }
});

// Esquema para estadísticas
const estadisticaSchema = new mongoose.Schema({
    modulo: Number,
    dispensionPastilla: Date,
    recogidaPastilla: Date,
    timestamp: { type: Date, default: Date.now }
});

// Colección correcta: "modulo 1"
const Pastilla = mongoose.model('Pastilla', pastillaSchema, 'modulo 1');
// Modelo para la colección estadisticas
const Estadistica = mongoose.model('Estadistica', estadisticaSchema, 'estadisticas');

// 1. RUTA PARA AGREGAR LAS 2 PASTILLAS DE UNA VEZ
app.post('/api/agregar-todas', async (req, res) => {
    try {
        console.log('Agregando las 2 pastillas...');
        console.log('Estado de conexión:', mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado');
        
        // Verificar conexión antes de insertar
        if (mongoose.connection.readyState !== 1) {
            throw new Error('No hay conexión a la base de datos');
        }

        // Las 3 pastillas diferentes
        const pastillas = [
            {
                nombre: "Paracetamol",
                intervalSeconds: 15,
                modulo: 1,
            },
            {
                nombre: "Ibuprofeno", 
                intervalSeconds: 8,
                modulo: 2,
            },
        ];
        
        console.log('Intentando insertar pastillas en "modulo 1"...');
        const resultado = await Pastilla.insertMany(pastillas);
        console.log('InsertMany exitoso. Documentos insertados:', resultado.length);
        
        console.log('2 pastillas agregadas correctamente ');
        res.json({
            success: true,
            message: '2 pastillas agregadas a la base de datos en colección pastillero',
            data: resultado
        });
        
    } catch (error) {
        console.error('Error en POST /api/agregar-todas:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: 'Revisa la conexión a MongoDB Atlas'
        });
    }
});

// Buscar pastillas de los modulos
// Ver todas las pastillas separadas por módulo
app.get('/api/pastillas', async (req, res) => {
    try {
        console.log('Obteniendo todas las pastillas de "modulo 1" y "modulo 2"...');
        
        // Obtener todas las pastillas y separarlas por módulo
        const pastillas = await Pastilla.find().sort({ timestamp: -1 });
        
        // Separar en módulo 1 y módulo 2
        const modulo1 = pastillas.filter(p => p.modulo === 1);
        const modulo2 = pastillas.filter(p => p.modulo === 2);
        
        console.log(`Encontradas ${modulo1.length} pastillas en módulo 1 y ${modulo2.length} en módulo 2`);
        res.json({
            success: true,
            data: {
                modulo1: modulo1,
                modulo2: modulo2
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


app.post("/api/publicarDatos", async (req, res) => {
    try {
        console.log('Body recibido:', req.body);
        console.log('Headers:', req.headers);
        
        // Verificar si body existe
        if (!req.body) {
            return res.status(400).json({
                success: false,
                error: 'No se recibieron datos JSON'
            });
        }

        const { modulo, "dispension pastilla": dispensionPastilla, "Recogida pastilla": recogidaPastilla } = req.body;
        
        console.log('Datos parseados:', { modulo, dispensionPastilla, recogidaPastilla });

        // Validar campos requeridos
        if (modulo === undefined || !dispensionPastilla || !recogidaPastilla) {
            return res.status(400).json({
                success: false,
                error: 'Faltan campos requeridos: modulo, dispension pastilla, Recogida pastilla',
                received: req.body
            });
        }

        // Crear nuevo documento
        const nuevaEstadistica = new Estadistica({
            modulo: modulo,
            dispensionPastilla: new Date(dispensionPastilla),
            recogidaPastilla: new Date(recogidaPastilla)
        });

        // Guardar en la base de datos
        const resultado = await nuevaEstadistica.save();

        console.log('Datos guardados en estadisticas:', resultado);

        res.json({
            success: true,
            message: 'Datos guardados correctamente en estadisticas',
            data: resultado
        });

    } catch (error) {
        console.error('Error en /api/publicarDatos:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// NUEVO MÉTODO: ELIMINAR TODOS LOS DATOS DE LA COLECCIÓN ESTADÍSTICAS
app.delete('/api/limpiar-estadisticas', async (req, res) => {
    try {
        console.log('Eliminando todos los datos de la colección estadisticas...');
        
        // Verificar conexión
        if (mongoose.connection.readyState !== 1) {
            throw new Error('No hay conexión a la base de datos');
        }

        // Eliminar todos los documentos de la colección estadisticas
        const resultado = await Estadistica.deleteMany({});
        
        console.log(`Estadísticas eliminadas: ${resultado.deletedCount} documentos`);

        res.json({
            success: true,
            message: `Se eliminaron ${resultado.deletedCount} registros de estadísticas correctamente`,
            deletedCount: resultado.deletedCount
        });

    } catch (error) {
        console.error('Error en DELETE /api/limpiar-estadisticas:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

//base
app.get('/', (req, res) => {
    res.json({ 
        message: ' API Pastillero Avanzado - CONEXIÓN A "modulo 1"',
        endpoints: {
            agregarTodas: 'POST /api/agregar-todas',
            buscarPastilla: 'GET /api/pastilla/:nombre',
            verTodas: 'GET /api/pastillas',
            diagnostico: 'GET /api/diagnostico',
            limpiar: 'DELETE /api/limpiar',
            limpiarEstadisticas: 'DELETE /api/limpiar-estadisticas' // Nuevo endpoint agregado
        },
        ejemplos: {
            agregar: 'POST http://localhost:5000/api/agregar-todas',
            buscar: 'GET http://localhost:5000/api/pastilla/Paracetamol',
            diagnosticar: 'GET http://localhost:5000/api/diagnostico',
            verTodas: 'GET http://localhost:5000/api/pastillas',
            limpiarEstadisticas: 'DELETE http://localhost:5000/api/limpiar-estadisticas' // Ejemplo agregado
        },
        coleccion: 'modulo 1'
    });
});

const PORT = 5000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`💊 API Pastillero en http://localhost:${PORT}`);
    console.log(`🌐 Accesible desde red local en: http://192.168.1.24:${PORT}`);
    console.log(`📡 ESP32 puede conectarse ahora!`);
});