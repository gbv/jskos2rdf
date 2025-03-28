# README for [jskos2rdf](https://github.com/gbv/jskos2rdf)

  
Converts jskos to rdf via a simple REST-API. Takes automatically care about prefixes, context.json, checks etc.  
  
This service uses [https://github.com/gbv/jsonld2rdf](https://github.com/gbv/jsonld2rdf) to serialize JSON to RDF. This is a Node service that uses [https://github.com/poolifier/poolifier](https://github.com/poolifier/poolifier) for parallelization. The service uses a dynamic thread pool. Add more CPU if you need more parallel processes, because one CPU equals one more possible process.  

  

## Requirements

*   Node.js (>= 20.18.0)
*   NPM (>= 11.0.0)
*   Ubuntu >= 22.04
*   pm2, system.d or another processmanager

  

## Installation

Download the latest version from [https://github.com/gbv/jskos2rdf/](https://github.com/gbv/jskos2rdf/). Use the "latest"-Branch, as "main" is for development.  
  

### Pull jskos2rdf
`$ git pull git@github.com:gbv/jskos2rdf.git latest`


### Install Node.js on Ubuntu

```
$ sudo apt install nodejs
$ sudo apt install npm
```

### Install pm2

`$ npm install pm2@latest -g`  

### Create & adjust the ecosystem.config.js to your needs

Change for example the port.  
```
$ cd /yourdirectory/jskos2rdf/   
$ nano ecosystem.config.js
```
add and adjust
```
module.exports = {
    apps: [
      {
        name: "jskos2rdf-prod",
        script: "app.js",
        watch: true,
        ignore_watch: ["node_modules"],
        time: true,
        restart_delay: 3000,
        env: {
          PORT: 3000,
          NODE_ENV: "production"
        }
      }
    ]
  };
```
and then save your ecosystem-file.

Then start the service  
`$ pm2 start ecosystem.config.js`  

### Make sure to automatically restart service on reboot

```
$ pm2 startup
$ pm2 save
``` 
  

### Install and configure webserver

Feel free to use nginx or other solutions  
```
$ sudo apt-get install apache2   
$ sudo a2enmod proxy proxy_http rewrite headers   
$ sudo systemctl restart apache2
```

Configure proxy pass in apache /ngninx  
```
ServerName yourdomain.com   
ServerAdmin mail@yourdomain.com      

# readme-page   
DocumentRoot /yourdirectory/jskos2rdf/   
<Directory /yourdirectory/jskos2rdf/>      
   DirectoryIndex index.html      
   AllowOverride All      
   Require all granted   
</Directory>      

# redirect to node.js   
ProxyPass "/serialize" "http://localhost:3001/serialize"   ProxyPassReverse "/serialize" "http://localhost:3001/serialize"     

LogLevel warn   

ErrorLog ${APACHE_LOG_DIR}/jskos2rdf_error.log   
CustomLog ${APACHE_LOG_DIR}/jskos2rdf_access.log combined
``` 
  

## Usage

You can use the service via GET and POST, while GET is more intended for tests (note the restrictions on GET).  
  
Parameters are:

*   "format": "turtle" or "ntriples"
*   "jskos": valid [jskos](https://gbv.github.io/jskos/)\-concept(s)

Example-[JSKOS](https://gbv.github.io/jskos/):

```
[
    {
        "uri": "http://uri.example.com/7f419c1e-5c96-473c-fdet-420447eba050",
        "type": [
            "http://www.w3.org/2004/02/skos/core#Concept"
        ],
        "@context": "https://gbv.github.io/jskos/context.json",
        "prefLabel": {
            "de": "Beispiel",
            "en": "Example"
        }
    }
]
```

  

### GET

Remember to encode your JSON in GET-Parameter: 

`GET jskos2rdf.example.com/serialize?jskos=%5B%20%7B%20%22uri%22%3A%20%22http%3A%2F%2Furi.example.co...&format=turtle`  

### POST

```
POST to https://jskos2rdf.example.com/serialize  with payload:  

{
    "jskos": [
        {
            "uri": "http://uri.example.com/7f419c1e-5c96-473c-fdet-420447eba050",
            "type": [
                "http://www.w3.org/2004/02/skos/core#Concept"
            ],
            "@context": "https://gbv.github.io/jskos/context.json",
            "prefLabel": {
                "de": "Beispiel",
                "en": "Example"
            }
        }
    ],
    "format": "turtle"
}
```

  

### Result

The appropriate content-type header is sent along with "Access-Control-Allow-Origin:\*". Both examples return:

```
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .

<http://uri.example.com/7f419c1e-5c96-473c-fdet-420447eba050> a skos:Concept ;
    skos:prefLabel "Beispiel"@de, "Example"@en .
```


Verbundzentrale des GBV (VZG)   [Impressum](https://www.gbv.de/impressum)   [https://github.com/gbv/jskos2rdf](https://github.com/gbv/jskos2rdf)