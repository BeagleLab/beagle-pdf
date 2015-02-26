var pdfjs = require('pdfjs-dist-for-node/build/pdf.combined.js')
var altmetrics = require('beagle-altmetrics')
var _ = require('lodash')
var doiRegex = require('doi-regex')

var altmetricsFromDoi = function (doi, cb) {
  response = true
  return altmetrics.getDataFromDoi(doi, function (err, data) {
    if (err !== null) {
      console.error(err)
      // What does process do?
      process.exit(-1)
    }

    return cb(null, data)
  })
}

var response

var readPDF = function (documentObject, options, cb) {
  if (!documentObject) {
    console.log('No pdf')
    throw new Error('no pdf');
  }

  pdfjs.getDocument(documentObject).then(function (pdf) {
    // May not be useful at the moment.
    pdf.getMetadata().then(function (data) {
      console.log('Metadata:', data)
    })

    var numPages = pdf.numPages
    // Define vars where they won't be redefined in each loop in if statements
    var doi, match

    for (var i = 1; i <= numPages; i++) {
      pdf.getPage(i).then(function (page) {
        page.getTextContent().then(function (textContent) {
          _.each(textContent.items, function (item) {
            // TODO match[2] tracks .t001, .g001, etc. Capture these, they may be relevant
            // to research.
            if (doiRegex.groups(item.str))
              match = doiRegex.groups(item.str)

            if (match && !response) {
              if (!doi) {
                // Only call once, for now. TODO Multiple DOIs
                doi = match[1]
                var response = true
                if (options.modules.altmetrics) altmetricsFromDoi(doi, cb)
              }
            }
          })
        })
      })
    }

    if (!response) { return cb(null, null) }
  })
}

exports.pdfjs = pdfjs
exports.readPDF = readPDF
