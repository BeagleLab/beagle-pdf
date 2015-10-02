var pdfjs = require('pdfjs-dist-for-node/build/pdf.combined.js')
var altmetrics = require('beagle-altmetrics')
var _ = require('lodash')
var doiRegex = require('doi-regex')
var async = require('async')
var Promise = require('bluebird')

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
    pdf.getMetadata().then(function (data) {
      return cb(null, data)
    })
  })
}

var readPDFText = function (documentObject, options, cb) {
  if (!documentObject) throw new Error('No pdf provided')

  function getAllDOIMatches (item, cb) {
    // TODO match[2] tracks .t001, .g001, etc. Capture these, they may be relevant
    // to research.
    var match = doiRegex.groups(item.str)

    if (match) {
      cb(null, match)
      // This used to be in this function, but will be factored out
      // if (options.modules.altmetrics) {
      //   altmetricsFromDoi(doi, cb)
      // }
    } else {
      cb(null)
    }
  }

  function getStringsFromPage (pdf, pageNum, callback) {
    pdf.getPage(pageNum + 1).then(function (page) {
      page.getTextContent().then(function (textContent) {
        async.map(textContent.items, getAllDOIMatches, function (err, result) {
          if (err) {
            callback(err)
          }

          callback(null, result)
        })
      })
    })
  }

  var mapIteratorCallback = function (arrayItem, cb) {
    return cb(null, arrayItem)
  }

  // There is likely something wrong with this.
  async.map(
    pdfjs.getDocument(documentObject).then(function (pdf) {
      return async.times(pdf.numPages, getStringsFromPage.bind(null, pdf), function (err, results) {
        if (err) {
          return cb('Error getting DOIs')
        }
        // This sucessrully returns arrays of strings from each page.
        return cb(null, _.filter(results))
      })
    })
  , mapIteratorCallback
  , function (err, finalResult) {
    if (err) { console.log('err', err)}
    // This should be async, but it isn't.
    console.log('Final Result is not async, and should be:', finalResult)
    // This error should happen if there are NO results
    //   cb('Failed to find a DOI.')
    // console.log('hello')
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
      return cb && cb()
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
