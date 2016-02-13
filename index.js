/*jslint node: true*/
var http = require('http'),
    url = require('url'),
    fs = require('fs'),
    path = require('path'),
    querystring = require('querystring'),
    parseXmlString = require('xml2js').parseString,
    baseDirectory = __dirname + '/www',
    error404 = baseDirectory + '/404.html',
    indexFile = 'index.html';

var mimeTypes = {
    ".html": "text/html",
    ".xml": "text/xml",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".map": "application/json",
    ".eot": "application/vnd.ms-fontobject",
    ".svg": "image/svg+xml",
    ".ttf": "application/x-font-ttf",
    ".woff": "application/x-font-woff",
    ".ico": "image/x-icon",
    ".png": "image/png"
};

function serveStatic(requestUrl, response) {
    'use strict';
    var fsPath = baseDirectory + requestUrl.pathname;
    if (fsPath.endsWith('/')) {
        fsPath = fsPath + indexFile;
    }

    fs.exists(fsPath, (exists) => {
        try {
            if (exists) {
                response.writeHead(200, {
                    'Content-Type': mimeTypes[path.extname(fsPath)] || 'text/plain'
                });
                fs.createReadStream(fsPath).pipe(response);
            } else {
                fs.exists(error404, (hasErrorFile) => {
                    if (hasErrorFile) {
                        response.writeHead(404, {
                            'Content-Type': mimeTypes[path.extname(error404)] || 'text/plain'
                        });
                        response.setHeader('Content-Type', mimeTypes[path.extname(error404)] || 'text/plain');
                        fs.createReadStream(error404).pipe(response);
                    } else {
                        response.writeHead(404);
                        response.end();
                    }
                });
            }
        } catch (e) {
            console.log(e);
            response.writeHead(500);
            response.end();
        }
    });
}

function getDkaGamesAPIOpts(contentLength) {
    var ops = url.parse('http://dkmgames.com/sudoku/SudokuPlusServer.aspx');
    ops.method = 'POST';
    ops.headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': contentLength
    };
    return ops;
}

var apiActions = {
    'dk_puzzles': (requestUrl, request, response) => {
        var params = querystring.stringify({
            max: 10,
            action: 'ArchiveList',
            difficulty: 2
        });
        var req = http.request(getDkaGamesAPIOpts(params.length), (res) => {
            if (res.statusCode === 200) {
                var body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () =>
                    parseXmlString(body.slice(4), (err, result) => {
                        if (err) {
                            console.log(err);
                            response.writeHead(500);
                            response.end();
                        } else {
                            response.writeHead(200, {
                                'Content-Type': 'application/json'
                            });
                            response.write(JSON.stringify(result.ArchiveList.puzzle.map((p) => p['$'])));
                            response.end();
                        }
                    })
                );
            } else {
                console.log('remore returned: ${res.statusCode}');
                response.writeHead(500);
                response.end();
            }
        });
        req.on('error', (e) => {
            console.log('problem with request: ${e.message}');
            response.writeHead(500);
            response.end();
        });
        req.write(params);
        req.end();
    },
    'dk_puzzle': (requestUrl, request, response) => {
        var params = querystring.stringify({
            seed: path.basename(requestUrl.pathname),
            action: 'GenPuzzle'
        });
        var req = http.request(getDkaGamesAPIOpts(params.length), (res) => {
            if (res.statusCode === 200) {
                var body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    parseXmlString(body.slice(4), (err, result) => {
                        if (err) {
                            console.log(err);
                            response.writeHead(500);
                            response.end();
                        } else {
                            response.writeHead(200, {
                                'Content-Type': 'application/json'
                            });
                            response.write(JSON.stringify(
                                result.Sudoku.Grid[0].GridRow
                                .sort((a, b) => a['$'].row - b['$'].row)
                                .map((r) => r.cell.map((c) => c['$']))));
                            response.end();
                        }
                    });
                })
            } else {
                console.log('remore returned: ${res.statusCode}');
                response.writeHead(500);
                response.end();
            }
        });
        req.on('error', (e) => {
            console.log('problem with request: ${e.message}');
            response.writeHead(500);
            response.end();
        });
        req.write(params);
        req.end();

    }
}


http.createServer(function (request, response) {
    'use strict';
    var requestUrl = url.parse(request.url);

    request.on('error', function (err) {
        console.error(err);
    });

    if (requestUrl.pathname.startsWith('/api/')) {
        var handler = apiActions[requestUrl.pathname.toLowerCase().replace(/^\/api\/(\w+).*/, '$1')];
        if (handler && typeof handler === 'function') {
            try {
                handler(requestUrl, request, response);
            } catch (e) {
                console.log(e);
                response.writeHead(500);
                response.end();
            }
        } else {
            response.writeHead(404);
            response.end();
        }
    } else {
        serveStatic(requestUrl, response);
    }

}).listen(9753);
