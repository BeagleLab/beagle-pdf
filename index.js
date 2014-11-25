var pdfjs = require('pdfjs-dist-for-node/build/pdf.combined.js');
var altmetrics = require('../beagle-altmetrics');
var accum = require('accum-transform');

var readPDF = function(documentObject) {

  console.log('Inside pdf module');

  if (!documentObject) {
    console.log("No pdf");
    throw new Error("no pdf"); 
  }

  console.log('Document object', documentObject);

  pdfjs.getDocument(documentObject).then(function(pdf) {
    
    console.log('This works');

    //May not be useful at the moment.
    pdf.getMetadata().then(function(data){
      console.log('Metadata:', data);
    });

    numPages = pdf.numPages;
    // Define vars where they won't be redefined in each loop in if statements
    var response, pageInfo, doi, match;
    // The most robust RegExp for doi matching I could find and edit for javascript
    var myRe = new RegExp('doi\\:(10[.][0-9]{4,}(?:[.][0-9]+)*/(?:(?!["&\'<>])\\S)+)(\\.[a-zA-Z]{1}[0-9]{3})', 'g');
    for (i = 0; i <= numPages; i++) {
      pdf.getPage(i).then(function(page) {   
        page.getTextContent().then(function(textContent) {
          _.each(textContent.items, function(item){
            // TODO match[2] tracks .t001, .g001, etc. Capture these, they may be relevant
            // to research. 
            match = myRe.exec(item.str);
            if (match && !response) {
              if (!doi) {
                // Only call once, for now. TODO Multiple DOIs
                doi = match[1]; 
                altmetrics.getDataFromDoi(match[1], function(err, data){
                  if (err !== null) {
                    console.error(err);
                    // What does process do?
                    process.exit(-1); 
                  }

                  console.log(data);

                  return data;
                });
                response = true;
              }
            }
          });
        });
      }); //jshint ignore:line
    }
  });
};

exports.pdfjs = pdfjs;
exports.readPDF = readPDF;
