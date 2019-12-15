const csv = require('csv-parser');
const fs = require('fs');
const crypto = require('crypto');
const DEFINED = require('../constants/defined')
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const _ = require('lodash');

module.exports = {
    csvToArray: (filePath) => {
        return new Promise((resolve) => {
            const data = []
            fs.createReadStream(filePath)
                .pipe(csv(DEFINED.CANDIDATE_COLUMNS.map(col => col.id)))
                .on('data', row => data.push(row))
                .on('end', () => {
                    resolve(data.filter(item => item.fullname !== DEFINED.CANDIDATE_COLUMNS[0].title));
                });
        });
    },
    writeCandidates: (array, filePath) => {
        const csvWriter = createCsvWriter({
            path: filePath,
            header: DEFINED.CANDIDATE_COLUMNS
        });
        return csvWriter.writeRecords(_.uniq(array))
    },
    generateToken: (candidate) => {
        return crypto.createHash('sha256').update(JSON.stringify(candidate)).digest('base64');
    },
}