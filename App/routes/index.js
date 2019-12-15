const express = require('express'),
    router = express.Router();
const _ = require('lodash'),
    io = require('../lib/io');
const utils = require('../utils');
const path = require('path');

const candidatesPath = '../data/candidates.csv';

const settingList = ["isWithoutReplacement", "numberOfDraws", "fontSize"];
const config = require('../conf');
let candidates = config.preloadCandidates;

let settings = {
    isWithoutReplacement: false,
    numberOfDraws: 1,
    fontSize: 24
};

function deriveNumberOfDrawsAndEmit(candidates) {
    const newNDraws = Math.max(1, Math.min(candidates.length, settings.numberOfDraws));
    if (newNDraws !== settings.numberOfDraws) {
        settings.numberOfDraws = newNDraws;
        io.emitSettings(settings);
    }
}

router.post("/api/addCandidate", function (req, res) {
    const candidate = req.body['candidate'];
    if (candidate && candidate.length) {
        utils.fileUtils.csvToArray(path.join(__dirname, candidatesPath)).then(candidates => {
            candidates.push({
                fullname: candidate[0] && candidate[0].trim(),
                organization: candidate[1] && candidate[1].trim(),
                employee_code: candidate[2] && candidate[2].trim(),
                vg_code: candidate[3] && candidate[3].trim(),
                email: candidate[4] && candidate[4].trim(),
            });
            utils.fileUtils.writeCandidates(candidates, path.join(__dirname, candidatesPath)).then(() => {
                boardcastCandidates(candidates);
                deriveNumberOfDrawsAndEmit(candidates);
                res.end();
            });
        })
    }
});

router.post("/api/addCandidates", function (req, res) {
    const val = req.body['candidates'];
    const candidatesData = (val || []).map(candidate => {
        return {
            fullname: candidate[0] && candidate[0].trim(),
            organization: candidate[1] && candidate[1].trim(),
            employee_code: candidate[2] && candidate[2].trim(),
            vg_code: candidate[3] && candidate[3].trim(),
            email: candidate[4] && candidate[4].trim(),
        }

    })
    utils.fileUtils.writeCandidates(candidatesData, path.join(__dirname, candidatesPath)).then(() => {
        boardcastCandidates(candidatesData);
        deriveNumberOfDrawsAndEmit(candidatesData);
        res.end();
    });
});

router.post('/api/removeCandidate', function (req, res) {
    const candidate = req.body['candidate'];
    console.log('remove', candidate)
    utils.fileUtils.csvToArray(path.join(__dirname, candidatesPath)).then(candidates => {
        const candidatesData = _.filter(candidates, can => can.employee_code !== candidate.employee_code && can.email !== candidate.email);
        utils.fileUtils.writeCandidates(candidatesData, path.join(__dirname, candidatesPath)).then(() => {
            boardcastCandidates(candidatesData);
            deriveNumberOfDrawsAndEmit(candidatesData);
            res.end();
        });
    })
});

router.post('/api/clearCandidates', function (req, res) {
    candidates = [];
    boardcastCandidates(candidates);
    deriveNumberOfDrawsAndEmit(candidates);
    res.end();
});

router.post("/api/settings", (req, res) => {

    const settingsBody = req.body;
    settings = _.pick({ ...settings, ...settingsBody }, settingList);
    io.emitSettings(settings);
    res.end();
});

router.get('/api/rand', function (req, res) {
    utils.fileUtils.csvToArray(path.join(__dirname, candidatesPath)).then(candidates => {
        const result = [];
        for (let i = 0; i < settings.numberOfDraws; i++) {

            const randomNumber = _.random(candidates.length - 1),
                poorMan = candidates[randomNumber];
            result.push(poorMan);
            if (settings.isWithoutReplacement) {
                candidates = _.without(candidates, poorMan);
            }
        }

        io.emitRandResult(result);
        if (settings.isWithoutReplacement) {
            boardcastCandidates(candidates);
        }
        res.end();
    })
});

router.get('/api/configs', (req, res) => {
    const password = req.headers['Authorization'] || req.headers['authorization'];
    const token = req.query['token'];
    console.log('token', token)
    let candidate;
    if (token || password === config.adminPassword) {
        utils.fileUtils.csvToArray(path.join(__dirname, candidatesPath)).then(candidates => {
            if(token){
                candidate = candidates.find(can => utils.fileUtils.generateToken(can) === token);
                console.log(utils.fileUtils.generateToken(candidates[0]))
                candidates = candidate ? candidates.filter(can => candidate.employee_code !== can.employee_code
                    && candidate.organization === can.organization) : [];
            }
            res.json({
                candidates,
                candidate,
                ...settings
            });
        })
    } else if(!token && password !== config.adminPassword){
        res.status(401).send({ error: 'invalid_password', message: 'Sai mật khẩu' });
    }
});

var boardcastCandidates = function (candidates) {
    io.emitCandidates(candidates);
};

module.exports = router;
