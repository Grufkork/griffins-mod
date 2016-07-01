var fname = "build.json";
var fs = require("fs");
console.log("Reading file...")
fs.readFile(fname, function(err, data){
    if(err){
        return console.error(err);
    }
    console.log("File read");
    console.log("Parsing file...");
    var parsedData = JSON.parse(data);
    console.log("Parsed file");
    var array = [];
    console.log("Creating map array...");
    for(var y = 0; y < parsedData.ySize; y++){
        var arrayToPush=[];
        for(var x = 0; x < parsedData.xSize; x++){
            arrayToPush.push(0);
        }
        array.push(arrayToPush);
    }
    console.log("Created map array");
    console.log("Adding map array top parsed file...");
    parsedData.map=array;
    console.log("Added map array to parsed file");
    console.log("Stringifying and writing parsed file to map.json...");
    fs.writeFile(fname, JSON.stringify(parsedData));
    console.log("Stringified and written file to map.json");
    console.log("Map successfully updated/generated");
});
