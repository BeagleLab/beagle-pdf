var pdfjs = require('pdfjs-dist-for-node/build/pdf.combined.js')
var altmetrics = require('beagle-altmetrics')
var _ = require('lodash')
var doiRegex = require('doi-regex')

var response

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

var getFingerprint = function (documentObject, cb) {
  if (!documentObject) throw new Error('No pdf provided')

  pdfjs.getDocument(documentObject).then(function (pdf) {
    return cb(null, pdf.fingerprint)
  })
}

var getMetadata = function (documentObject, cb) {
  if (!documentObject) throw new Error('No pdf provided')

  pdfjs.getDocument(documentObject).then(function (pdf) {
    pdf.getMetadata().then(function (data) {
      return cb(null, data)
    })
  })
}

var readPDFText = function (documentObject, options, cb) {
  if (!documentObject) throw new Error('No pdf provided')

  pdfjs.getDocument(documentObject).then(function (pdf) {
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
                response = true
                doi = match[1]
                if (options.modules.altmetrics) altmetricsFromDoi(doi, cb)
              }
            }
          })
        })
      })
    }
    if (!response)
      return cb('Failed to find a DOI.')
  })
}

exports.pdfjs = pdfjs
exports.getFingerprint = getFingerprint
exports.getMetadata = getMetadata
exports.readPDFText = readPDFText
