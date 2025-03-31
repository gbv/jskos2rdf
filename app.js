import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';

import { DynamicThreadPool, PoolEvents, availableParallelism } from 'poolifier';

const app = express();
const port = process.env.PORT || 3001;

const contentTypes = {
    ntriples: 'application/n-triples',
    turtle: 'text/turtle',
    json: 'application/json'
};

app.use(bodyParser.json({ limit: '50mb' }));

// Worker-pool with fixed number of threads
const pool = new DynamicThreadPool(Math.floor(availableParallelism() / 2), availableParallelism(), './serializeWorker.cjs', {
    errorHandler: (e) => console.error('Threadworker-error:', e),
    onlineHandler: () => console.log('Threadworker is online')
});

// POST-route with workerthreads
app.post('/serialize', async (req, res) => {
    try {
        const parameters = req.body
        const result = await pool.execute(parameters);
        res.set('Content-Type', contentTypes[parameters.format] || 'application/json');
        res.set('Access-Control-Allow-Origin', '*');
        res.send(result);
    } catch (error) {
        res.status(500).send('{"error": "Error with serialization. ' + error + '"}');
    }
});

// GET-Route with workerthreads
app.get('/serialize', async (req, res) => {
    try {
        const parameters = req.query
        const result = await pool.execute(parameters);
        res.set('Content-Type', contentTypes[parameters.format] || 'application/json');
        res.set('Access-Control-Allow-Origin', '*');
        res.send(result);
    } catch (error) {
        res.set('Content-Type', contentTypes['json']);
        res.status(500).send('{"error": "Error with serialization. ' + error + '"}');
    }
});

// listen to port and offer to apache-proxypass
app.listen(port, () => {
    console.log(`Node.js JSKOS2RDF serialization service running on http://localhost:${port}/serialize`);
});