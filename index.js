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
      // TODO What does process do?
      // process.exit(-1)
    }

    return cb(null, data)
  })
}

var getFingerprint = function (documentObject, cb) {
  if (!documentObject) throw new Error('No pdf provided')

  pdfjs.getDocument(documentObject).then(function (pdf) {
    return cb(null, pdf.fingerprint)
  }).catch(function (err) {
    return cb(err)
  })
}

var getMetadata = function (documentObject, cb) {
  if (!documentObject) throw new Error('No pdf provided')

  pdfjs.getDocument(documentObject).then(function (pdf) {
    return pdf.getMetadata()
  }).then(function (data) {
    return cb(null, data)
  }).catch(function (err) {
    // Unable to get Document or metadata
    return cb(err)
  })
}

var readPDFText = function (documentObject, options, cb) {
  if (!documentObject) throw new Error('No pdf provided')

  pdfjs.getDocument(documentObject).then(function (pdf) {
    var numPages = pdf.numPages
    // Define vars where they won't be redefined in each loop in if statements
    var doi
    var match
    var j = 0

    for (var i = 1; i <= numPages; i++) {
      pdf.getPage(i).then(function (page) {
        return page.getTextContent()
      }).then(function (textContent) {
        _.each(textContent.items, function (item) {
          // TODO match[2] tracks .t001, .g001, etc. Capture these, they may be relevant
          // to research.
          match = doiRegex.groups(item.str)
          if (match && !doi) {
            // Only call once, for now. TODO Multiple DOIs
            doi = match[1]
            if (options.modules.altmetrics) {
              altmetricsFromDoi(doi, cb)
            }
          }
        })
        j++
        if (j === numPages && !doi) {
          cb('Failed to find a DOI.')
        }
      }).catch(function (err) {
        return cb(err)
      })
    }
  }).catch(function (err) {
    // Unable to get document
    return cb(err)
  })
}

var getHightlightCoords = function () {
  var pageIndex = window.PDFViewerApplication.pdfViewer.currentPageNumber - 1
  var page = window.PDFViewerApplication.pdfViewer.pages[pageIndex]
  var pageRect = page.canvas.getClientRects()[0]
  var selectionRects = window.getSelection().getRangeAt(0).getClientRects()
  var viewport = page.viewport
  var selected = _.map(selectionRects, function (r) {
    return viewport.convertToPdfPoint(r.left - pageRect.left, r.top - pageRect.top).concat(
       viewport.convertToPdfPoint(r.right - pageRect.left, r.bottom - pageRect.top))
  })
  return {page: pageIndex, coords: selected}
}

var showHighlight = function (selected, cb) {
  var pageIndex = selected.page
  if (pageIndex === window.PDFViewerApplication.pdfViewer._currentPageNumber - 1) {
    var page = window.PDFViewerApplication.pdfViewer.pages[pageIndex]
    var pageElement = page.canvas.parentElement
    var viewport = page.viewport
    selected.coords.forEach(function (rect) {
      var bounds = viewport.convertToViewportRectangle(rect)
      var el = document.createElement('div')
      el.setAttribute('style', 'position: absolute; background-color: rgba(238, 170, 0, .2);' +
        'left:' + Math.min(bounds[0], bounds[2]) + 'px; top:' + Math.min(bounds[1], bounds[3]) + 'px;' +
        'width:' + Math.abs(bounds[0] - bounds[2]) + 'px; height:' + Math.abs(bounds[1] - bounds[3]) + 'px;')
      pageElement.appendChild(el)
      return cb()
    })
  }
  return
}

exports.pdfjs = pdfjs
exports.getFingerprint = getFingerprint
exports.getMetadata = getMetadata
exports.readPDFText = readPDFText
exports.getHightlightCoords = getHightlightCoords
exports.showHighlight = showHighlight
