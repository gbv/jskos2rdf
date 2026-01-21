const { ThreadWorker } = require('poolifier')

const fs = require('fs');

// import jsonld2rdf dynamically
async function loadJsonld2rdf() {
    const { jsonld2rdf } = await import('jsonld2rdf');
    return jsonld2rdf;
}

// import caching-routine dynamically
async function loadCache() {
    const { loadExternalJsonFilesToCache } = await import('./cache.js');
    return loadExternalJsonFilesToCache;
}

// externalFilePaths
let externalFilePaths = {
    "context": [
         // is read dynamically from jskos due to prod/dev and "extend"-parameter
    ],
    "prefix": [
        'https://gbv.github.io/jskos/prefixes.json'
    ],
    "media": [
        'http://iiif.io/api/presentation/3/context.json'
    ]
}

// cache, which is hold in RAM
let cache = {};

/* cache-structure (example)
    cache = {
        "https://gbv.github.io/jskos/prefixes.json": {
            "last_updated" : 12345679123,
            "value": Object
        },
        ..
    }
*/

// allowed serialization-formats
const allowedFormats = ['turtle', 'ntriples'];

// serialization-logic
async function serializeData(parameters) {
    let jskos = parameters?.jskos || {};
    let format = parameters?.format || '';
    
    // load jsonld2rdf and cache-routine dynamically
    const jsonld2rdf = await loadJsonld2rdf();
    const loadExternalJsonFilesToCache = await loadCache();

    // GET returns string, POST returns an object
    if(typeof jskos === 'string') {
        jskos = jskos || "";
        jskos = String(jskos).trim();
        try { 
            jskos = JSON.parse(jskos);
        } catch (error) {
            throw error('Error processing json - no valid json' + error);
        }
    }

    // simple jskos-check
    let isJSKOS = false;
    if(typeof jskos === 'object') {
        if(jskos.length > 0) {
            if(jskos.length > 0) {
                if(jskos[0]?.uri && jskos[0]?.type) {
                    isJSKOS = true;
                }
            }
        }
    }
    if(!isJSKOS) {
        throw new Error('Error processing jskos - no valid jskos');
    }

    // check parameter "format"
    format = format || "";
    format = String(format).trim().toLowerCase();
    if(!allowedFormats.includes(format)) {
        throw new Error('Error processing format-parameter - no allowed value');
    }

    // remove context-url from jskos and use cached version to increase speed

    // collect context-urls, add to externalfileslist and remove those context-urls from jskos-json    
    jskos.forEach((element) => {
        if(element['@context']) {
            if(typeof element['@context'] === 'string') {
                element['@context'] = [element['@context']]
            }
            if(Array.isArray(element['@context'])) {
                element['@context'].forEach((contextURL) => {                    
                    contextURL = contextURL.trim();
                    if(!externalFilePaths.context.includes(contextURL)) {
                        externalFilePaths.context.push(contextURL);
                    }
                });
            }
            delete element['@context'];
        }
    });

    // merge with existing urls
    externalFilePaths.context = [...new Set(externalFilePaths.context)]

    // clone, because of dynamic changes above
    const externalFilePaths2 = JSON.parse(JSON.stringify(externalFilePaths));
    // get info from cache
    const externalFileData = await loadExternalJsonFilesToCache(externalFilePaths2, cache);
    
    // merge contexts, if multiple
    let context = {};
    if(externalFileData?.context.length > 0) { 
        externalFileData.context.forEach(function(jsonData) {
            context = {...context, ...jsonData['@context']};
        });
    }

    // add media-context (iiif)
    if(externalFileData?.media.length > 0) { 
        context['media']['@context'] = externalFileData.media;
    }

    // get and merge prefixes
    let prefixes = {};
    if(externalFileData?.prefix.length > 0) {
        for (let i=0; i < externalFileData.prefix.length; i++) {    
            prefixes = {...prefixes, ...externalFileData.prefix[i]};
        }
    }

    //  serialize JSKOS to RDF
    let rdfString = '{}';
    try {
        if (format === 'ntriples') {
            rdfString = await jsonld2rdf([jskos], { context });
        } else if (format === 'turtle' || format === '') {
            rdfString = await jsonld2rdf([jskos], { context, prefixes });
        }
        // respond with RDF        
        return rdfString;
    } catch (error) {
        throw error('Error processing: ' + error.message + ' - ' + error.stack);
    }
}

module.exports = new ThreadWorker(serializeData)