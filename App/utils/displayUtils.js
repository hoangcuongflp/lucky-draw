
const DEFINED = require('../constants/defined')



module.exports = {
    viewCandidate: (candidate) => {
        return candidate
        // return typeof candidate === 'string' ? candidate :
        //     Object.keys(candidate).map(key => {
        //         return key !== DEFINED.CANDIDATE_COLUMNS[DEFINED.CANDIDATE_COLUMNS.length - 1] ? candidate[key] : '';
        //     }).join('\n')
    },
}