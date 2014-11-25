#!/usr/bin/env node

if (process.argv.length < 2) {
  console.error("Usage: " + process.argv[1] + " <url-to-pdf>")
  process.exit(-1)
}

var pdf = require('./index')

// parse input
var path = process.argv[2]

// pretty printing.
var pretty = function (data) {
  // data is a json object
  return JSON.stringify(data, undefined, 2)
}

// make call as a callback
pdf.readPDF(path, function(err, data) {
  if (err != null) {
    console.error(err)
    process.exit(-1)
  }

  data = pretty(data)
  process.stdout.write(data)
})
