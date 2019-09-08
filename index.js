var fs = require("fs")
var filename = "test.html"
var express = require("express")
var app = express()
const port = 1337 || process.env.PORT
var multer = require("multer")
var bodyParser = require("body-parser")
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
        console.log(file)
        cb(null, req.query.key+makeid(20)+".html")
  }
})
function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}  
var upload = multer({ storage: storage })

const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fileMetadata = require('file-metadata');

app.use(bodyParser.json())

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.post('/upload', upload.array("docs[]", 3), function (req, res, next) {
    console.log('get files', req.files)
    res.json({type: "ok"})
})

app.get("/original", (req, res) => {
    fs.readFile(filename, 'utf-8', function(err, data){
        if(err) throw err;
        res.send(data)
    })
})

app.get("/get_metadata", (req, res) => {
    var arr = [];
    fs.readdir("uploads", (err, files) => {
        files = files.sort(function(a, b) {
            return fs.statSync("uploads/" + a).mtime.getTime() - 
                   fs.statSync("uploads/" + b).mtime.getTime();
        });
        files.map((item, i) => {
            fileMetadata('uploads/'+item).then(data => {
                if(item.indexOf(req.query.key) !== -1){
                    arr.push(data)
                }
                if(i === files.length-1){
                    res.json(arr)
                }
            })
        })
    });
})

app.get("/get_doc", (req, res) => {
    fs.readFile("uploads/"+req.query.filename, 'utf-8', (err, data) => {
        if(err) throw err;
        res.send(data)
    })
})

app.get("/", (req, res) => {
    console.log(req.query.filename)
    fs.readdir("uploads", (err, files) => {
        files = files.sort(function(a, b) {
            return fs.statSync("uploads/" + a).mtime.getTime() - 
                   fs.statSync("uploads/" + b).mtime.getTime();
        });
        var arr = files.filter((item) => item.indexOf(req.query.key) !== -1)
        fs.readFile(`uploads/${arr[0]}`, 'utf8', function(err, original_data) {
            if (err) throw err;
            
            var counter = 0;

            const dom_original = new JSDOM(original_data);
            var original_elements = dom_original.window.document.body.getElementsByTagName("*");
        
            const dom = new JSDOM(original_data);
            var array = [];
            
            var elements = dom.window.document.body.getElementsByTagName("*");
            fs.readFile(`uploads/${req.query.filename}`, 'utf8', function(err, other_data) {
                if (err) throw err;
                const dom1 = new JSDOM(other_data.replace(/<br>/g, ''));
                var elements_other = dom1.window.document.body.getElementsByTagName("*");
                // counter = (elements_other - original_elements) < 0 ? (elements_other - original_elements) * -1 : (elements_other - original_elements)
                var rows_original;
                var rows_other;
                find = false;
                for(var i = 0; i < elements.length; i++) {
                    if(elements_other[i]){
                        var current = elements[i].innerHTML.replace(/(\r\n|\n|\r)/gm, ""), current_other = elements_other[i].innerHTML.replace(/(\r\n|\n|\r)/gm, "");
                        if(elements[i].localName === "img"){
                            if(elements[i].src !== elements_other[i].src){
                                elements_other[i].style.border = "2px solid blue"
                            }
                        }
                        if(current !== current_other){
                            if(current_other === ""){
                                console.log("aaaasdf123s")
                            }
                            // console.log(current.innerText, current_other.innerText)
                            switch(current_other){
                                 case "":
                                    console.log("cur", current)
                                    elements_other[i].innerHTML = `${current}`
                                    elements_other[i].className = "empty"
                                    // elements_other[i].innerText = "current"
                                    elements_other[i].style.textDecoration = "line-through";
                                    elements_other[i].style.textDecorationColor = "red";
                                    break;
                                default:
                                    if(elements_other[i-1].innerHTML.replace(/(\r\n|\n|\r)/gm, "") === ""){
                                        elements_other[i].innerHTML = `${current}`
                                        elements_other[i].className = "empty"
                                        elements_other[i].style.textDecoration = "line-through";
                                        elements_other[i].style.textDecorationColor = "red";
                                    }else{
                                        elements_other[i].className = "change"
                                        elements_other[i].style.textDecoration = "underline"
                                        elements_other[i].style.textDecorationColor = "blue";
                                    }
                            }
                            // console.log(current.innerHTML)
                         }
                    }
                }
                // console.log()
                res.send(dom1.window.document.documentElement.outerHTML)
            })
        });
    })
})

app.post("/add_doc", (req, res) => {
    fs.writeFile(`uploads/${req.body.key}${makeid(10)}.html`, req.body.html, function(err) {
        if(err) {
            return console.log(err);
        }
        res.json({type: "ok"})
    });     
})

app.listen(port, () => {
    console.log("Server listening on port ", port)
})