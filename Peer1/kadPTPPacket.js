module.exports = {

    //Initializes a packet using the following parameters as fields
    init: function (messageType, numberOfPeers, senderName, peerIPs, peerPorts) {

        //Creates a byte array of size depending on number of ip's and ports as well as the sender name length
        const packet = new Uint8Array(4 + stringToBytes(senderName).length + (peerIPs.length * 6));

        //Set bits in packet for specific values
        storeBitPacket(packet, 7, 0, 4);
        storeBitPacket(packet, messageType, 4, 8);
        storeBitPacket(packet, numberOfPeers, 12, 8);
        storeBitPacket(packet, stringToBytes(senderName).length, 20, 12);

        //Set the bytes for each character in the sender name
        for (let i = 0; i < stringToBytes(senderName).length; i++) {
            storeBitPacket(packet, stringToBytes(senderName)[i], 32 + (8 * i), 8);
        }

        //Set one byte equal to each part in an ip split by the . and 2 bytes for each port number
        for (let i = 0; i < peerIPs.length; i++) {
            for (let j = 0; j < 4; j++) {
                storeBitPacket(packet, parseInt(peerIPs[i].split(".")[j]), 32 + (48 * i) + (stringToBytes(senderName).length * 8) + (8 * j), 8);
            }
            storeBitPacket(packet, parseInt(peerPorts[i]), 64 + (stringToBytes(senderName).length * 8) + (48 * i), 16);
        }

        return packet;
    },

    //Call init to build packet
    getPacket: function (messageType, numberOfPeers, senderNameLength, senderName, peerIPs, peerPorts) {
        return this.init(messageType, numberOfPeers, senderNameLength, senderName, peerIPs, peerPorts);
    }
};

const stringToBytes = (str) => {
    var ch,
        st,
        re = [];
    for (var i = 0; i < str.length; i++) {
        ch = str.charCodeAt(i); // get char
        st = []; // set up "stack"
        do {
            st.push(ch & 0xff); // push byte to stack
            ch = ch >> 8; // shift value down by 1 byte
        } while (ch);
        // add stack contents to result
        // done because chars have "wrong" endianness
        re = re.concat(st.reverse());
    }
    // return an array of bytes
    return re;
}

const storeBitPacket = (packet, value, offset, length) => {
    let lastBitPosition = offset + length - 1;
    let number = value.toString(2);
    let j = number.length - 1;
    for (var i = 0; i < number.length; i++) {
        let bytePosition = Math.floor(lastBitPosition / 8);
        let bitPosition = 7 - (lastBitPosition % 8);
        if (number.charAt(j--) == "0") {
            packet[bytePosition] &= ~(1 << bitPosition);
        } else {
            packet[bytePosition] |= 1 << bitPosition;
        }
        lastBitPosition--;
    }
}

function printPacketBit(packet) {
    var bitString = "";

    for (var i = 0; i < packet.length; i++) {
        // To add leading zeros
        var b = "00000000" + packet[i].toString(2);
        // To print 4 bytes per line
        if (i > 0 && i % 4 == 0) bitString += "\n";
        bitString += " " + b.substr(b.length - 8);
    }
    console.log(bitString);
}