import fs from 'fs';

// cache-configuration
const cacheDuration = 60 * 60 * 1000; // duration in ms
const localFallbackDir = 'localFallback';

// is valid json?
function isValidJson(jsonValue) {
    return typeof jsonValue === "object" && jsonValue !== null && Object.keys(jsonValue).length > 0;
}

// save json to ram-cache
function saveToCache(cache, url ,jsonData) {
    cache[url] = {};
    cache[url].last_updated = Date.now();
    cache[url].value = jsonData;
    
}

// load files from url with caching and json-parsing
export async function loadExternalJsonFilesToCache(urlGroups, cache) {
    const result = {};

    for (const key of Object.keys(urlGroups)) {
        const urls = urlGroups[key];

        if(!result[key]) {
            result[key] = [];
        }

        // check all urls for cache. If cache is ok, than do not fetch from url        
        for (let urlIndex=0; urlIndex < urls.length; urlIndex++) {    
            const url = urls[urlIndex];
            if(cache[url]) {
                let cacheAge = cache[url].last_updated;
                if ((Date.now() - cacheAge) < cacheDuration) {
                    try {
                        const jsonValue = cache[url].value;
                        // check if it is valid json and not empty
                        if(isValidJson(jsonValue)) {
                            result[key].push(jsonValue);
                            continue;
                        }
                    } catch (error) {
                        throw error('json from cache is not valid! ' + error);
                    }
                }
                else {
                }
            }
        
            let jsonData;
            // if error with url, fetch or fetched json, fall back to local copy
            let getLocalCopy = false; 

            try {
                const response = await fetch(url, { method: 'GET' });

                if (!response.ok) {
                    getLocalCopy = true;
                }

                if(response.ok) {
                    try { 
                        jsonData = await response.json();
                    } catch (parseError) {
                        getLocalCopy = true;
                    }
                }

                // is valid json?
                if(!isValidJson(jsonData)) {
                    getLocalCopy = true;
                }
                if(isValidJson && getLocalCopy == false) {
                    // save to variable for processing
                    result[key].push(jsonData);
                    // save json to ram-cache
                    saveToCache(cache, url ,jsonData);
                }
            } catch (error) {
                getLocalCopy = true;
            }
            // fallback to local copy
            if(getLocalCopy == true) {
                const encodedURL = encodeURIComponent(url);
                const fallbackPath = localFallbackDir + '/' + encodedURL;
                if (fs.existsSync(fallbackPath)) {
                    jsonData = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
                    // save to variable for processing
                    result[key].push(jsonData);
                    // save json to ram-cache
                    saveToCache(cache, url ,jsonData);
                }
            }
        }
    }
    return result;
}