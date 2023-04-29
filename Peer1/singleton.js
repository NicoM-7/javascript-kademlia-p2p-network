let crypto = require('crypto');

//Generate random numbers within assigned ranges for timeStamp
let timestamp = Math.floor(Math.random() * 999) + 1;

//Fields to be used as getters and setters
let peerIp = "";
let peerPort = 0;
let peerName = "";
let peerID = "";
let distrubtedHashTable = new Array(160).fill(null);

module.exports = {

    init: function (ip, port, name) { //Initializes server timer, timeStamp increments by 1 every 10ms as well as the peer ip, port, name and id

        peerIp = ip;
        peerPort = port;
        peerName = name;

        //Generate Hex Id using peer ip and port
        let sha1 = crypto.createHash('sha1')
        sha1.update(peerIp + ':' + peerPort.toString())
        peerID = sha1.digest('hex');

        //Used for timestamps, increments by 1 every 10ms
        setInterval(function () {
            timestamp += 1;
            if (timestamp > Math.pow(2, 32)) {
                timestamp = Math.floor(Math.random() * 999) + 1;
            }
        }, 10);
    },

    //get timestamp
    getTimestamp: function () {
        return Math.floor(timestamp);
    },

    //get peer name
    getPeerName: function () {
        return peerName;
    },

    //get peer id
    getPeerID: function () {
        return peerID;
    },

    //get peer ip
    getPeerIp: function () {
        return peerIp;
    },

    //get peer port
    getPeerPort: function () {
        return peerPort;
    },

    //helper method used to generate id on the spot
    generatePeerID: function (tempIp, tempPort) {
        let sha2 = crypto.createHash('sha1');
        sha2.update(tempIp + ':' + tempPort.toString());
        tempPeerID = sha2.digest('hex');
        return tempPeerID;
    },

    //set dht to new dht
    setDHT: function (dht) {
        distrubtedHashTable = dht;
    },

    //get dht
    getDHT: function () {
        return distrubtedHashTable;
    }
};
