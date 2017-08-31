const fs = require('fs');
const crypto = require('crypto');
const async = require('async');
const csvtojson = require('csvtojson');

/**
 * This script appends a (headerless) manually created csv file to the generated contributions.csv
 * by default this expects a "contributions.csv" and a "manual-contributions.csv" in the root directory by default
 * hashes of the files are generated pre and post appending
 */

let appendCsv = function(filenameAppendTo, filenameAppendThis, done) {
	let result = {};
	async.waterfall([
		//validate the input csv
		function(callback) {
			validateCsv(filenameAppendThis, function(err) {
				return callback(err);
			});
		},

		//calculate hashes of the file which is appended
		function(callback) {
			calculateHash(filenameAppendThis, function(err, data) {
				if (err) {
					return callback(err);
				}
				result['appendingHash'] = data;
				return callback(null);
			});
		},

		//calculate hashes of the file target file PRE appending
		function(callback) {
			calculateHash(filenameAppendTo, function(err, data) {
				if (err) {
					return callback(err);
				}
				result['csvHashPreAppend'] = data;
				return callback(null);
			});
		},

		//do the actual appending
		function(callback) {
			appendFiles(filenameAppendTo, filenameAppendThis, function(err) {
				return callback(err);
			});
		},

		//calculate hashes of the file target file POST appending
		function(callback) {
			calculateHash(filenameAppendTo, function(err, data) {
				if (err) {
					return callback(err);
				}
				result['csvHashPostAppend'] = data;
				return callback(null);
			});
		}
	], function(err, data) {
		if (err) {
			return done(err);
		}
		return done(null, result);
	});
};

let validateCsv = function(filename, done) {
	let isValid = true;
	csvtojson({noheader: true})
		.fromFile(filename)
		.on('end_parsed', (jsonArrObj) => {
			jsonArrObj.forEach(row => {
				if (!isValidRow(row)) {
					isValid = false;
				}
			});
			if (!isValid) {
				return done(new Error('Invalid JSON'));
			} else {
				return done(null);
			}
		})
		.on('done', (err) => {
			if (err) {
				return done(err);
			}
		});
};

let isValidRow = function(row) {
	//wow such test
	return Object.keys(row).length == 11;
};

let appendFiles = function(filenameAppendTo, filenameAppendThis, done) {
	fs.readFile(filenameAppendThis, function(err, dataToAppend) {
		if (err) {
			return done(err);
		}
		fs.appendFile(filenameAppendTo, dataToAppend, function (err) {
			return done(err);
		});
	});
};

let calculateHash = function(filename, done) {
	const md5 = crypto.createHash('md5');
	const sha1 = crypto.createHash('sha1');

	fs.readFile(filename, function(err, data) {
		if (err) {
			return done(err);
		}
		return done(null, {
			'MD5': md5.update(data).digest('hex'),
			'SHA1': sha1.update(data).digest('hex')
		});
	});
};

// module.exports = appendCsv;
let appendTo = process.argv[2] || './contributions.csv';
let appendThis = process.argv[3] || './manual-contributions.csv';

appendCsv(appendTo, appendThis, function(err, data) {
	if (err) {
		console.log("Error appending CSV", err);
	} else {
		console.log("Appended " + appendThis + " to " + appendTo, data);
	}
});
