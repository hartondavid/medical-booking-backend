// app.js

import express from "express"
import dotenv from 'dotenv'
import apiRouter from './src/routes/apiRoute.mjs'
import cors from 'cors'

const app = express();

dotenv.config()

app.set('trust proxy', true);

app.use(cors({
    origin: '*', // Allow any origin
    exposedHeaders: ['X-Auth-Token', 'X-Message', 'Content-Disposition'], // Expose the custom header

}));
// Serve static files from the 'public' directory
app.use(express.static('public'));

// Middleware to parse x-www-form-urlencoded data
app.use(express.urlencoded({ extended: true }));

// Other middlewares
app.use(express.json());

app.use('/api/', apiRouter)

export default app;