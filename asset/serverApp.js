var express = require('express'),
    path = require('path'),
    request = require('request'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    fs = require('fs'),
    url = require('url');

var indexFile = path.resolve(__dirname + '/_Layout.cshtml');
var servicePath = path.resolve("..");
var apps = {};
var appPath = __dirname.replace(servicePath, '').replace(/\\+/gi, '/');

function startServer(chainId) {
  var app = express();
  apps[chainId] = app;
  
  // Configuration
  app.set('views', servicePath + path.sep);
  app.engine('html', require('ejs').renderFile);
  app.use('/proxy', function (req, res) {
    var newUrl = 'http://clientapix.gsn2.com/api/v1' + req.url.replace('/proxy', '');
    req.pipe(request({ uri: newUrl, method: req.method })).pipe(res);
  });

  app.use(bodyParser());
  app.use(methodOverride());
  app.use('/app', express.static(servicePath + path.sep + 'app'));
  app.use('/content', express.static(servicePath + path.sep + 'content'));

  // routes
  app.get('/no-javascript.html', function (request, response) {
    response.render('no-javascript.html');
  });

  app.get('/unsupported-browser.html', function (request, response) {
    response.render('unsupported-browser.html');
  });

  app.get('*', function (request, response) {
    var myPath = url.parse(request.url).pathname.toLowerCase();
    if (myPath.indexOf('.') > 0 && myPath.indexOf('.aspx') < 0) {
      if (!fs.existsSync(path)) {
        response.status(404).send(myPath + ' not found.');
        return;
      }
    }
    
    fs.readFile(indexFile, 'utf8', function (err, str) {
      str = str.replace('@if (this.ViewBag.CanDebug == "true") {@Scripts.Render("~/gsncore")}', '')
      str = str.replace('@Gsn.Digital.Web.MvcApplication.ProxyMasterUrl', 'http://clientapix.gsn2.com/api/v1');
      str = str.replace('@ViewBag.FavIcon',  appPath  + '/' + chainId + 'images/favicon.ico');
      str = str.replace('@ViewBag.Title', chainId);
      str = str.replace('@RenderSection("htmlhead", false)', '<link href="' + appPath + '/' + chainId + '/styles/app.css" rel="stylesheet" />');
      str = str.replace('@RenderBody()', '<script>\n' +
  '(function (globalConfig) {  try {\n' +
  'globalConfig.data = { "ContentBaseUrl": "' + appPath  + '/' + chainId + '", "Version": null, "ChainId": ' + chainId + ' };\n' +
  '} catch (e) { }\n' +
  '})(window.globalConfig || {});\n' +
  '</script>\n' +                                                                                                           
  '<script src="/app/' + chainId + '/storeApp.js"></script>\n' +
  '<script src="http://clientapix.gsn2.com/api/v1/store/siteconfig/' + chainId + '?callback=globalConfigCallback"></script>\n' 
  // + '<script src="http://localhost:35729/livereload.js"></script>'
      );
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.write(str);
      response.end();
    });  
    
  });

  
  // Start server
  var port = 3000 + parseInt(chainId);
  app.listen(port, function() {
    console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
  });
}

// skip first two arguments
if (process.argv.length <= 2) {
  console.log('\n\nError: chain id(s) are required.\n');
  console.log('Example: \n node ' + path.basename(__filename) + ' chainId1 chainId2 chainId3 ...');
  console.log('\n');
}
else {
  process.argv.forEach(function (val, index, array) {
    // skip first two arguments
    if (index > 1)
    {  
      startServer(val);
    }
  });
}
